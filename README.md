Live Code

Welcome to the Live Code Editor project! This is a lightweight, user-friendly code editor designed to provide a seamless coding experience. It supports live code sharing with multiple users, syntax highlighting, multiple language support, file/folder structure support and edit code.

Folder Structure
Code editor/
├── backend/              # Node.js/Express backend
├── frontend/
│   └── code-editor/     # React frontend
└── README.md

Table of Contents

Installation
Usage
Features
Contributing
License

🚀 Getting Started
✅ Prerequisites
Node.js 
npm (comes with Node.js)

🧪 Backend Setup
cd backend
npm install
npm run dev

🔐 Create a .env file inside the backend/ directory. Example:

FRONTEND_URL=http://localhost:5173

🎨 Frontend Setup
cd frontend/code-editor
npm install
npm run dev

🔐 Create a .env file inside the backend/ directory. Example:

REACT_APP_BACKEND_URL=http://localhost:5000

Usage

Launch the Live Code Editor by running the command above.
Open the editor in your preferred browser.
Start coding! Use the interface to create coding room , write and edit your code.

Example:
// Sample code snippet to test the editor
function helloWorld() {
  console.log("Hello, Code Editor!");
}

Features

Live code sharing: It supports live code sharing for multiple users.
Syntax Highlighting: Supports popular programming languages like JavaScript, Python, Java, etc.
File/Folder: It supports creating different files and folders for different code snippets.
User-Friendly Interface: Intuitive design for beginners and professionals alike.
Multiple Users: It allows multiple users to code together live.

Tech Stack
Layer	Technology
Frontend	React.js
Backend	Node.js, Express.js
code editor   Monacco editor
real-time	Socket.IO
