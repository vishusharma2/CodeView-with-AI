# CodeView — Real-time Collaborative Code Editor

<p align="center">
  <img src="frontend/public/logo.png" alt="CodeView Logo" width="280" />
</p>

<p align="center">
  <strong>Code together, build together.</strong><br>
  A modern collaborative code editor with real-time sync, video calls, AI assistance, shared whiteboard, and more.
</p>

<p align="center">
  <a href="#-features">Features</a> &bull;
  <a href="#%EF%B8%8F-tech-stack">Tech Stack</a> &bull;
  <a href="#-getting-started">Getting Started</a> &bull;
  <a href="#-project-structure">Project Structure</a> &bull;
  <a href="#-documentation">Docs</a> &bull;
  <a href="#-contributors">Contributors</a>
</p>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Real-time Code Editing** | Every keystroke synced instantly via Socket.IO with live cursor tracking |
| **Multi-file Support** | Create, delete, and switch between files — HTML/CSS/JS auto-linked on preview |
| **30+ Languages** | JavaScript, Python, Java, C++, Go, Rust, Ruby, PHP, and more with syntax highlighting |
| **Code Execution** | Run code directly in the browser via Judge0 / JDoodle APIs with shared output |
| **Nova AI Assistant** | AI-powered chat and inline code suggestions powered by Google Gemini |
| **Video Calling** | Peer-to-peer WebRTC video calls with invite system and PiP floating window |
| **Shared Whiteboard** | Multi-page drawing canvas synced across all users in real-time |
| **Room Chat** | Instant messaging with typing indicators and slide-out panel |
| **Activity Logs** | Host-only comprehensive log of all room events with timestamps |
| **Password-Protected Rooms** | Secure rooms with passwords, JWT auth, and 24h auto-expiry |
| **Landing Pages** | Polished landing, features, how-it-works, and contact pages |
| **Dark Theme** | Premium dark UI with glassmorphism, smooth animations, and light theme toggle |

> 📖 See [docs/FEATURES.md](docs/FEATURES.md) for detailed feature documentation.

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Monaco Editor, Tailwind CSS |
| **Backend** | Node.js, Express |
| **Real-time** | Socket.IO |
| **Video** | WebRTC (native, no third-party) |
| **Database** | MongoDB (Mongoose) |
| **AI** | Google Gemini API |
| **Code Execution** | Judge0 API / JDoodle API |
| **Auth** | JWT + bcrypt |
| **Deployment** | Vercel (frontend), Render (backend) |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- **MongoDB** instance (local or Atlas)
- **Google Gemini API key** — for Nova AI
- **Judge0 or JDoodle API key** — for code execution

### Installation

```bash
# 1. Clone
git clone https://github.com/vishusharma2/CodeView-with-AI.git
cd CodeView-with-AI

# 2. Install backend
cd backend && npm install

# 3. Install frontend
cd ../frontend && npm install
```

### Environment Variables

**`backend/.env`**

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
JUDGE0_API_KEY=your_judge0_api_key
JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
```

**`frontend/.env`**

```env
VITE_BACKEND_URL=http://localhost:5000
```

### Run Locally

```bash
# Terminal 1 — Backend
cd backend && npm start

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 📁 Project Structure

```
codeview-main/
|-- frontend/
|   |-- src/
|       |-- components/
|       |   |-- Editor.jsx
|       |   |-- ChatPanel.jsx
|       |   |-- NovaAI.jsx
|       |   |-- Whiteboard.jsx
|       |   |-- SimpleWebRTC.jsx
|       |   |-- PiPVideoWindow.jsx
|       |   |-- VideoCallModal.jsx
|       |   |-- Output.jsx
|       |   |-- Navbar.jsx
|       |   |-- AnimatedRoutes.jsx
|       |   +-- Icons.jsx
|       |-- Pages/
|       |   |-- landing/
|       |   |-- home/
|       |   |-- editor/
|       |   |-- meeting/
|       |   +-- notfound/
|       |-- context/
|       |-- services/
|       |-- Actions.js
|       +-- App.jsx
|-- backend/
|   |-- server.js
|   |-- socket/
|   |   +-- socketHandler.js
|   |-- middleware/
|   |   +-- auth.js
|   |-- routes/
|   |   |-- roomRoutes.js
|   |   |-- fileRoutes.js
|   |   |-- executeRoutes.js
|   |   |-- novaAiRoutes.js
|   |   |-- aiRoutes.js
|   |   +-- annotationRoutes.js
|   |-- models/
|   |   |-- Room.js
|   |   +-- Annotation.js
|   |-- judge0Config.js
|   +-- jdoodleConfig.js
|-- docs/
|   +-- FEATURES.md
+-- README.md
```

<details>
<summary><strong>File Descriptions</strong></summary>

| File | Description |
|------|-------------|
| **Frontend — Components** | |
| `Editor.jsx` | Monaco editor with cursor sync & IntelliSense |
| `ChatPanel.jsx` | Chat + activity logs slide-out panel |
| `NovaAI.jsx` | AI assistant panel (Google Gemini) |
| `Whiteboard.jsx` | Multi-page shared whiteboard |
| `SimpleWebRTC.jsx` | WebRTC video call logic |
| `PiPVideoWindow.jsx` | Draggable Picture-in-Picture video window |
| `VideoCallModal.jsx` | Video call invite/accept/decline modal |
| `Output.jsx` | Code execution output & HTML preview panel |
| **Frontend — Pages** | |
| `landing/` | Landing, Features, HowItWorks, Contact pages |
| `home/` | Join room, Create room, Password verify |
| `editor/` | Main collaborative editor page |
| `meeting/` | Meeting room pages |
| `notfound/` | 404 page with glitch effects |
| **Backend — Core** | |
| `server.js` | Express + Socket.IO server |
| `socketHandler.js` | All socket event handlers |
| `auth.js` | JWT authentication middleware |
| **Backend — Routes** | |
| `roomRoutes.js` | Room CRUD + password verification |
| `fileRoutes.js` | Multi-file management |
| `executeRoutes.js` | Code execution endpoint |
| `novaAiRoutes.js` | Nova AI chat endpoint |
| `aiRoutes.js` | AI inline suggestions endpoint |
| `annotationRoutes.js` | Whiteboard annotation storage |
| **Backend — Models** | |
| `Room.js` | Room schema (roomId, password, files) |
| `Annotation.js` | Whiteboard annotation schema |

</details>

---

## 📖 Documentation

Detailed feature documentation is available at **[docs/FEATURES.md](docs/FEATURES.md)**.

---

## 👥 Contributors

| | Name | Role | Links |
|---|------|------|-------|
| 🟣 | **Vishu Sharma** | Creator & Full-Stack Developer | [GitHub](https://github.com/vishusharma2) · [LinkedIn](https://www.linkedin.com/in/vis-sha/) · [Portfolio](https://portfolio-sigma-ruddy-79.vercel.app/) |
| 🟢 | **Priyanka Kumari** | Full-Stack Developer & Partner | [GitHub](https://github.com/Priyanka7081) · [LinkedIn](https://www.linkedin.com/in/priyanka-fullstack-developer/) |
| 🔵 | **Shivam Kumar** | Developer & Partner | [GitHub](https://github.com/Shivam1327) · [LinkedIn](https://www.linkedin.com/in/shivamkr1327/) |

---

## 📄 License

This project is for educational and portfolio purposes.

---

<p align="center">Built with ❤️ by the CodeView team</p>