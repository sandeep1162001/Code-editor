import { useEffect, useState, memo } from "react";
import io from "socket.io-client";
import Editor from "@monaco-editor/react";
import { v4 as uuid } from "uuid";
import { toast } from "react-toastify";
import { debounce } from "lodash";
import FileTree from "./components/FileTree";

const backendURL = "http://localhost:5000";
const EditorMemo = memo(Editor);

export default function App() {
  const [socket, setSocket] = useState(null);
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("// start code here");
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState("");
  const [outPut, setOutPut] = useState("");
  const [version, setVersion] = useState("*");
  const [userInput, setUserInput] = useState("");
  const [fileTree, setFileTree] = useState({});
  const [selectedFilePath, setSelectedFilePath] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // --- Connect to socket server ---
  useEffect(() => {
    const newSocket = io(backendURL);
    setSocket(newSocket);

    newSocket.on("connect", () => {
      // console.log("Connected:", newSocket.id);
      if (joined && roomId && userName) {
        newSocket.emit("join", { roomId, userName });
      }
    });

    // newSocket.on("disconnect", () => toast.warn("Disconnected from server"));

    return () => newSocket.disconnect();
  }, []);

  // Socket event listeners 
  useEffect(() => {
    if (!socket) return;

    socket.on("userJoined", (list) => {
      console.log("Updated users list:", list);
      setUsers(list);
    });

    socket.on("codeUpdate", (newCode) => {
      if (!selectedFilePath) setCode(newCode);
    });

    socket.on("userTyping", (user) => {
      if (user) {
        setTyping(`${user.slice(0, 8)}... is typing`);
        setTimeout(() => setTyping(""), 2000);
      }
    });

    socket.on("languageUpdate", setLanguage);

    socket.on("codeResponse", (res) => {
      setOutPut(res?.run?.output || "No output");
    });

    return () => socket.removeAllListeners();
  }, [socket, selectedFilePath]);

  // Fetch initial file tree when joined
  useEffect(() => {
    if (joined && roomId) {
      fetch(`${backendURL}/files?roomId=${roomId}`)
        .then((res) => res.json())
        .then(setFileTree)
        .catch(() => toast.error("Failed to load file tree"));
    }
  }, [joined, roomId]);

  // Join room
  const joinRoom = () => {
    if (!roomId.trim() || !userName.trim()) {
      toast.error("Room ID and username are required");
      return;
    }
    if (!/^[a-zA-Z0-9-]+$/.test(roomId)) {
      toast.error("Invalid Room ID format");
      return;
    }
    if (socket?.connected) {
      setIsLoading(true);
      socket.emit("join", { roomId, userName });
      setJoined(true);
      setIsLoading(false);
    } else {
      toast.error("Not connected to server");
    }
  };

  // Run code
  const runCode = () => {
    if (!socket?.connected) {
      toast.error("Not connected to server");
      return;
    }
    const supportedLanguages = ["javascript", "python", "java", "cpp"];
    if (!supportedLanguages.includes(language)) {
      toast.error("Unsupported language");
      return;
    }
    setIsLoading(true);
    socket.emit("compileCode", { code, roomId, language, version, input: userInput });
    // result will come via "codeResponse"
    setIsLoading(false);
  };

  // Handle code change
  const debouncedCodeChange = debounce((v) => {
    if (v === undefined) return;
    socket?.emit("codeChange", { roomId, code: v });
    socket?.emit("typing", { roomId, userName });
    if (selectedFilePath) {
      socket?.emit("file:change", { roomId, path: selectedFilePath, content: v });
    }
  }, 500);

  // Select a file to edit
  const handleSelectFile = async (path) => {
    setIsLoading(true);
    try {
      setSelectedFilePath(path);
      const res = await fetch(
        `${backendURL}/files/content?roomId=${roomId}&path=${encodeURIComponent(path)}`
      );
      const data = await res.json();
      if (data.error) {
        toast.error(`Error: ${data.error}`);
        return;
      }
      setCode(data.content);
    } catch (err) {
      toast.error("Failed to load file");
    } finally {
      setIsLoading(false);
    }
  };

  // Room Join UI 
  if (!joined) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e] text-gray-300">
        <div className="bg-[#252526] p-6 rounded-lg shadow-lg w-80">
          <h1 className="text-lg mb-4 font-semibold">Join Code Room</h1>
          <input
            className={`w-full mb-2 p-2 rounded bg-[#1e1e1e] border ${
              roomId && /^[a-zA-Z0-9-]+$/.test(roomId) ? "border-gray-600" : "border-red-600"
            } text-white`}
            placeholder="Room Id"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            disabled={isLoading}
          />
          <button
            onClick={() => setRoomId(uuid())}
            className="w-full mb-2 bg-blue-600 hover:bg-blue-500 p-2 rounded"
            disabled={isLoading}
          >
            Create Id
          </button>
          <input
            className={`w-full mb-4 p-2 rounded bg-[#1e1e1e] border ${
              userName ? "border-gray-600" : "border-red-600"
            } text-white`}
            placeholder="Your Name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            disabled={isLoading}
          />
          <button
            onClick={joinRoom}
            className="w-full bg-green-600 hover:bg-green-500 p-2 rounded"
            disabled={isLoading || !roomId || !userName}
          >
            {isLoading ? "Joining..." : "Join Room"}
          </button>
        </div>
      </div>
    );
  }

  //Main App 
  return (
    <div className="flex h-screen bg-[#1e1e1e] text-gray-300 ">
      {/* File Tree */}
      <div className="w-34 md:w-54 border-r border-gray-700 overflow-auto">
        <FileTree
          tree={fileTree}
          setTree={setFileTree}
          onSelect={handleSelectFile}
          roomId={roomId}
          socket={socket}
        />
      </div>

      {/* Editor + IO */}
      <div className="flex-1 flex flex-col overflow-auto">
        <div className="flex-1">
          <EditorMemo
            height="100%"
            language={language}
            value={code}
            theme="vs-dark"
            onChange={(v) => {
              setCode(v);
              debouncedCodeChange(v);
            }}
          />
        </div>
        <div className="flex h-48 border-t border-white">
          <textarea
            className="flex-1 bg-[#1e1e1e] p-2 border border-white text-white"
            placeholder="Enter input..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            disabled={isLoading}
          />
          <textarea
            className="flex-1 bg-[#1e1e1e] p-2 border border-white text-white"
            placeholder="Output..."
            value={outPut}
            readOnly
          />
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-34 md:w-54 border-l border-gray-700 p-5 overflow-auto">
        <h2 className="text-xl font-semibold pb-5">Room:<br /> {roomId}</h2>
        <button
          onClick={() => navigator.clipboard.writeText(roomId)}
          className="bg-blue-400 hover:bg-blue-500 px-4 py-1 rounded"
          disabled={isLoading}
        >
          Copy ID
        </button>
        <h3 className="mt-4 text-xl font-semibold">Users:</h3>
        <ul className="text-md max-h-40 overflow-auto">
          {users.length > 0 ? (
            users.map((u, i) => <li key={i}>{u}</li>)
          ) : (
            <li className="text-gray-500">No users</li>
          )}
        </ul>
        {typing && <p className="text-md mt-2 italic text-white">{typing}</p>}
        <div className="p-2 flex flex-col mt-7 justify-between border-t border-gray-700">
          <select
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              socket?.emit("languageChange", { roomId, language: e.target.value });
            }}
            className="bg-[#252526] p-1 rounded text-white mb-5"
            disabled={isLoading}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>
          <button
            onClick={runCode}
            className="bg-green-600 hover:bg-green-500 px-4 py-1 rounded"
            disabled={isLoading}
          >
            {isLoading ? "Running..." : "Run"}
          </button>
        </div>
      </div>
    </div>
  );
}
