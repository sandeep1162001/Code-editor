import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || "http://localhost:5173" }
});

// In-memory data
const rooms = new Map();       // { roomId => { users:Set, code:String, output:String } }
const fileTrees = new Map();   // { roomId => treeObject }

// Utility functions
function cleanTree(node) {
  if (typeof node === "object" && node !== null && !Array.isArray(node)) {
    Object.keys(node).forEach(key => {
      if (!/^[a-zA-Z0-9._-]+$/.test(key)) {
        throw new Error(`Invalid file/folder name: ${key}`);
      }
      const val = node[key];
      if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        cleanTree(val);
      } else if (typeof val !== "string") {
        node[key] = "";
      }
    });
  }
}

function validatePath(path) {
  return /^[a-zA-Z0-9._/-]+$/.test(path);
}

//  API ROUTES 

// Get file tree
app.get("/files", (req, res) => {
  try {
    const { roomId } = req.query;
    if (!roomId) return res.status(400).json({ error: "Room ID required" });
    if (!fileTrees.has(roomId)) fileTrees.set(roomId, {});
    const tree = fileTrees.get(roomId);
    cleanTree(tree);
    res.json(tree);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get file content
app.get("/files/content", (req, res) => {
  try {
    const { roomId, path } = req.query;
    if (!roomId || !path) return res.status(400).json({ error: "roomId and path required" });
    if (!validatePath(path)) return res.status(400).json({ error: "Invalid path" });

    const tree = fileTrees.get(roomId) || {};
    const parts = path.split("/");
    let current = tree;
    for (let part of parts) {
      current = current?.[part];
    }
    if (typeof current !== "string") return res.status(404).json({ error: "File not found or invalid" });
    res.json({ content: current });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create folder
app.post("/folders", (req, res) => {
  try {
    const { roomId, path } = req.body;
    if (!roomId || !path) return res.status(400).json({ error: "roomId and folder path required" });
    if (!validatePath(path)) return res.status(400).json({ error: "Invalid folder path" });

    if (!fileTrees.has(roomId)) fileTrees.set(roomId, {});
    const tree = fileTrees.get(roomId);

    const parts = path.split("/");
    let current = tree;
    for (let part of parts) {
      if (!current[part] || typeof current[part] !== "object") {
        current[part] = {};
      }
      current = current[part];
    }

    io.to(roomId).emit("file:refresh");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create file
app.post("/files", (req, res) => {
  try {
    const { roomId, path } = req.body;
    if (!roomId || !path) return res.status(400).json({ error: "roomId and file path required" });
    if (!validatePath(path)) return res.status(400).json({ error: "Invalid file path" });

    if (!fileTrees.has(roomId)) fileTrees.set(roomId, {});
    const tree = fileTrees.get(roomId);

    const parts = path.split("/");
    const fileName = parts.pop();
    let current = tree;
    for (let part of parts) {
      if (!current[part] || typeof current[part] !== "object") {
        current[part] = {};
      }
      current = current[part];
    }
    if (current[fileName]) return res.status(400).json({ error: "File already exists" });

    current[fileName] = "";
    io.to(roomId).emit("file:refresh");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete file/folder
app.delete("/files", (req, res) => {
  try {
    const { roomId, path } = req.body;
    if (!roomId || !path) return res.status(400).json({ error: "roomId and path required" });
    if (!validatePath(path)) return res.status(400).json({ error: "Invalid path" });

    const tree = fileTrees.get(roomId);
    if (!tree) return res.status(404).json({ error: "Room not found" });

    const parts = path.split("/");
    const fileName = parts.pop();
    let current = tree;
    for (let part of parts) {
      current = current?.[part];
      if (!current) return res.status(404).json({ error: "Path not found" });
    }

    if (!current[fileName]) return res.status(404).json({ error: "File/folder not found" });
    delete current[fileName];
    io.to(roomId).emit("file:refresh");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SOCKET.IO EVENTS 
io.on("connection", (socket) => {
  let currentRoom = null;
  let currentUser = null;

  // Joining a room
  socket.on("join", ({ roomId, userName }) => {
    if (!/^[a-zA-Z0-9-]+$/.test(roomId) || !userName) return;
    currentRoom = roomId;
    currentUser = userName;
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, { users: new Set(), code: "// start code here" });
    }
    if (!fileTrees.has(roomId)) fileTrees.set(roomId, {});
    rooms.get(roomId).users.add(userName);

    console.log(`${userName} joined ${roomId}`);
    socket.emit("codeUpdate", rooms.get(roomId).code);
    io.to(roomId).emit("userJoined", Array.from(rooms.get(roomId).users));
  });

  // File content change
  socket.on("file:change", ({ roomId, path, content }) => {
    if (!validatePath(path)) return;
    const tree = fileTrees.get(roomId);
    if (!tree) return;
    const parts = path.split("/");
    const fileName = parts.pop();
    let current = tree;
    for (let part of parts) current = current[part];
    current[fileName] = content;
    io.to(roomId).emit("file:refresh");
  });

  // Code change
  socket.on("codeChange", ({ roomId, code }) => {
    if (rooms.has(roomId)) rooms.get(roomId).code = code;
    socket.to(roomId).emit("codeUpdate", code);
  });

  // Typing indicator
  socket.on("typing", ({ roomId, userName }) => {
    socket.to(roomId).emit("userTyping", userName);
  });

  // Language change
  socket.on("languageChange", ({ roomId, language }) => {
    io.to(roomId).emit("languageUpdate", language);
  });

  // Compile code (Run button)
  socket.on("compileCode", async ({ code, roomId, language, version, input }) => {
    if (!rooms.has(roomId)) return;
    try {
      const response = await axios.post(
        "https://emkc.org/api/v2/piston/execute",
        { language, version, files: [{ content: code }], stdin: input || "" },
        { timeout: 10000 }
      );
      rooms.get(roomId).output = response.data?.run?.output || "";
      io.to(roomId).emit("codeResponse", response.data);
    } catch (error) {
      console.error("Compile error:", error.message);
      io.to(roomId).emit("codeResponse", { run: { output: `Error: ${error.message}` } });
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    if (currentRoom && currentUser && rooms.has(currentRoom)) {
      const room = rooms.get(currentRoom);
      room.users.delete(currentUser);
      io.to(currentRoom).emit("userJoined", Array.from(room.users));
      if (room.users.size === 0) {
        rooms.delete(currentRoom);
        fileTrees.delete(currentRoom);
      }
    }
    console.log(`${currentUser || "User"} disconnected`);
  });
});

server.listen(5000, () => console.log("Server running on port 5000"));
