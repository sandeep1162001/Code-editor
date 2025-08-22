# 🚀 Live Code Editor  

Welcome to the **Live Code Editor** project!  
This is a lightweight, user-friendly code editor designed to provide a seamless coding experience. It supports:  

- Live code sharing with multiple users  
- Syntax highlighting  
- Multiple language support  
- File/folder structure management  
- Real-time editing  

---

## 📂 Project Structure  

```

Code-editor/
├── backend/            # Node.js/Express backend
├── frontend/
│   └── code-editor/    # React frontend
└── README.md

````

---

## 📑 Table of Contents  

- [Getting Started](#-getting-started)  
- [Backend Setup](#-backend-setup)  
- [Frontend Setup](#-frontend-setup)  
- [Usage](#-usage)  
- [Features](#-features)  
- [Tech Stack](#-tech-stack)  
- [Contributing](#-contributing)  
- [License](#-license)  

---

## ✅ Getting Started  

### Prerequisites  
- [Node.js](https://nodejs.org/)  
- npm (comes with Node.js)  

---

## 🧪 Backend Setup  

```bash
cd backend
npm install
npm run dev
````

🔐 Create a **.env** file inside the `backend/` directory:

```env
FRONTEND_URL=http://localhost:5173
```

---

## 🎨 Frontend Setup

```bash
cd frontend/code-editor
npm install
npm run dev
```

🔐 Create a **.env** file inside the `frontend/code-editor/` directory:

```env
REACT_APP_BACKEND_URL=http://localhost:5000
```

---

## ▶️ Usage

1. Run the backend and frontend using the above commands.
2. Open the editor in your browser.
3. Create a coding room, write, and edit your code in real-time with others.

**Example Test Snippet:**

```javascript
function helloWorld() {
  console.log("Hello, Code Editor!");
}
helloWorld();
```

---

## ✨ Features

* **Live Code Sharing** – Multiple users can collaborate in real-time.
* **Syntax Highlighting** – Supports popular languages like JavaScript, Python, Java, etc.
* **File/Folder Management** – Create, edit, and manage project structures.
* **User-Friendly Interface** – Intuitive design for both beginners and professionals.
* **Real-Time Collaboration** – Built with WebSockets for seamless interaction.

---

## 🛠 Tech Stack

| Layer       | Technology          |
| ----------- | ------------------- |
| Frontend    | React.js            |
| Backend     | Node.js, Express.js |
| Code Editor | Monaco Editor       |
| Real-time   | Socket.IO           |

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a new branch (`git checkout -b feature-name`)
3. Commit your changes (`git commit -m "Add feature"`)
4. Push to the branch (`git push origin feature-name`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the **MIT License**.

```
