import { useState, useEffect, memo } from "react";
import { toast } from "react-toastify";

const backendURL = "http://localhost:5000";

// Recursive file/folder component
const FileTreeNode = memo(({ fileName, nodes, onSelect, path, onAdd, onDelete }) => {
  const isDir = nodes && typeof nodes === "object" && !Array.isArray(nodes);
  const [expanded, setExpanded] = useState(path.split("/").length <= 2);

  const handleClick = (e) => {
    e.stopPropagation();
    if (isDir) {
      setExpanded(prev => !prev);
    } else {
      onSelect(path);
    }
  };

  return (
    <div className="ml-4">
      <div
        onClick={handleClick}
        className="flex justify-between items-center cursor-pointer hover:bg-gray-700 px-2 py-1 rounded"
      >
        <span className={isDir ? "font-semibold" : "italic"}>{fileName}</span>
        {isDir && fileName !== "node_modules" && (
          <div className="flex gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onAdd(path, "file"); }}
              className="text-xs bg-blue-600 px-2 rounded hover:bg-blue-500"
            >
              + File
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onAdd(path, "folder"); }}
              className="text-xs bg-green-600 px-2 rounded hover:bg-green-500"
            >
              + Folder
            </button>
            {fileName !== "/" && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(path); }}
                className="text-xs bg-red-600 px-2 rounded hover:bg-red-500"
              >
                Delete
              </button>
            )}
          </div>
        )}
        {!isDir && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(path); }}
            className="text-xs bg-red-600 px-2 rounded hover:bg-red-500"
          >
            Delete
          </button>
        )}
      </div>

      {expanded && isDir && fileName !== "node_modules" && (
        <ul className="ml-2 mt-1 space-y-1">
          {Object.keys(nodes).map((child) => (
            <li key={path ? `${path}/${child}` : child}>
              <FileTreeNode
                fileName={child}
                nodes={nodes[child]}
                path={path ? `${path}/${child}` : child}
                onSelect={onSelect}
                onAdd={onAdd}
                onDelete={onDelete}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export default function FileTree({ tree, setTree, onSelect, roomId, socket }) {
  const [showInput, setShowInput] = useState(null); // { path, type }
  const [inputName, setInputName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch initial tree when room changes
  useEffect(() => {
    if (!roomId) return;
    fetch(`${backendURL}/files?roomId=${roomId}`)
      .then(res => res.json())
      .then(setTree)
      .catch(() => toast.error("Failed to fetch file tree"));
  }, [roomId, setTree]);

  // Listen for live updates
  useEffect(() => {
    if (!socket?.connected) return;
    const refreshFiles = () => {
      fetch(`${backendURL}/files?roomId=${roomId}`)
        .then(res => res.json())
        .then((data) => {
          if (JSON.stringify(tree) !== JSON.stringify(data)) {
            setTree(data);
          }
        })
        .catch(() => toast.error("Failed to refresh files"));
    };
    socket.on("file:refresh", refreshFiles);
    return () => socket.off("file:refresh", refreshFiles);
  }, [socket, roomId, setTree, tree]);

  // Create file/folder
  const handleAdd = async (parentPath, type) => {
    if (!inputName.trim()) {
      toast.error(`Enter a valid ${type} name`);
      return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(inputName)) {
      toast.error(`Invalid ${type} name. Only a-z, 0-9, ., -, _ allowed.`);
      return;
    }

    const fullPath = parentPath ? `${parentPath}/${inputName}` : inputName;
    setIsLoading(true);
    try {
      const url = `${backendURL}/${type === "folder" ? "folders" : "files"}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, path: fullPath }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(`Error creating ${type}: ${data.error || "Unknown error"}`);
        return;
      }
      setShowInput(null);
      setInputName("");
      // No manual setTree — socket handles refresh
    } catch (err) {
      toast.error(`Error creating ${type}: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete file/folder
  const handleDelete = async (path) => {
    if (!confirm(`Delete ${path}?`)) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${backendURL}/files`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, path }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(`Error deleting: ${data.error || "Unknown error"}`);
        return;
      }
      // Socket handles refresh
    } catch (err) {
      toast.error(`Error deleting: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {showInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg w-80">
            <h2 className="text-lg mb-2 font-semibold text-white">
              Create {showInput.type}
            </h2>
            <input
              type="text"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              placeholder={`Enter ${showInput.type} name`}
              className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 mb-2"
              disabled={isLoading}
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleAdd(showInput.path, showInput.type)}
                className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded"
                disabled={isLoading}
              >
                {isLoading ? "Creating..." : "Create"}
              </button>
              <button
                onClick={() => setShowInput(null)}
                className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded"
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <FileTreeNode
        fileName="/"
        path=""
        nodes={tree}
        onSelect={onSelect}
        onAdd={(path, type) => setShowInput({ path, type })}
        onDelete={handleDelete}
      />
    </>
  );
}
