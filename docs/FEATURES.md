# CodeView — Feature Documentation

A comprehensive guide to every feature in CodeView.

---

## Table of Contents

- [Room Management](#room-management)
- [Code Editor](#code-editor)
- [Multi-File System](#multi-file-system)
- [Code Execution](#code-execution)
- [Nova AI Assistant](#nova-ai-assistant)
- [Video Calling](#video-calling)
- [Shared Whiteboard](#shared-whiteboard)
- [Real-time Chat](#real-time-chat)
- [Activity Logs](#activity-logs)
- [Collaboration Features](#collaboration-features)
- [Landing Pages](#landing-pages)
- [Theme System](#theme-system)

---

## Room Management

### Creating a Room
- Navigate to **`/new-room`** to create a new room.
- Each room gets a unique UUID-based Room ID.
- A **password** is required — it's hashed with bcrypt and stored in MongoDB.
- The creator is redirected to the editor after room creation.

### Joining a Room
- Navigate to **`/join`** and enter an existing Room ID.
- Users are redirected to **`/verify-password/:roomId`** to authenticate.
- On successful password verification, a **JWT token** is issued (valid for 24 hours).
- The token is stored in `localStorage` and sent with all subsequent API requests.

### Room Validation
- Visiting a URL with a non-existent Room ID redirects to the **404 page** instead of showing the verify form.
- The frontend calls `GET /api/rooms/:roomId/exists` on mount to check room validity.

### Auto-Expiry
- Rooms and their associated data (files, annotations) automatically expire after **24 hours** of inactivity.
- Expiry is handled via MongoDB TTL indexes.

---

## Code Editor

Built on **Monaco Editor** — the same editor that powers VS Code.

### Real-time Code Sync
- Every keystroke emits a `CODE_CHANGE` socket event.
- All connected users receive the update and their editor is patched in real-time.
- A `codeRef` keeps the latest code in memory for instant file switching.

### Language Support (30+)
JavaScript, TypeScript, Python, Java, C, C++, C#, Go, Rust, Ruby, PHP, Swift, Kotlin, Dart, R, Perl, Lua, Scala, Haskell, Elixir, Clojure, SQL, HTML, CSS, Markdown, JSON, XML, YAML, Shell/Bash, PowerShell, and more.

### Syntax Highlighting
- Full Monaco Editor tokenization for all supported languages.
- Language is auto-detected from the file extension.

### IntelliSense & Autocomplete
- Language-specific keyword suggestions (e.g., `console`, `document`, `import` for JS).
- Built-in function completions with descriptions.
- Custom completion provider registered for each language.

### HTML Boilerplate
- In any `.html` file, type `!` and press Enter to auto-insert a full HTML5 boilerplate template including `DOCTYPE`, `head`, `meta` tags, and `body`.

### Live Cursor Tracking
- Each user's cursor position is broadcast via `CURSOR_POSITION` events.
- Cursors appear as colored vertical bars with the user's name label.
- Each user gets a unique color from a predefined palette.

---

## Multi-File System

### File Operations
- **Create**: Click the `+` button in the file sidebar → enter a file name with extension.
- **Delete**: Hover over a file → click the `×` button. Broadcasts deletion to all users.
- **Switch**: Click any file in the sidebar to switch. Current file content is saved to state before switching.

### Supported Extensions
`.js`, `.jsx`, `.ts`, `.tsx`, `.py`, `.java`, `.c`, `.cpp`, `.cs`, `.go`, `.rs`, `.rb`, `.php`, `.swift`, `.kt`, `.dart`, `.r`, `.pl`, `.lua`, `.scala`, `.hs`, `.ex`, `.clj`, `.sql`, `.html`, `.css`, `.md`, `.json`, `.xml`, `.yaml`, `.yml`, `.sh`, `.ps1`, `.txt`

### File Persistence
- Files are saved to MongoDB via `PUT /api/rooms/:roomId/files/:fileName`.
- Saving is **debounced** (2-second delay) to avoid excessive API calls.
- Files are loaded from the backend when joining a room.

### HTML Preview with Linked Files
When running an HTML file, CodeView automatically:
1. Resolves `<link rel="stylesheet" href="style.css">` tags → inlines the CSS from matching room files.
2. Resolves `<script src="app.js">` tags → inlines the JS from matching room files.
3. Auto-injects any remaining CSS files that weren't explicitly linked.

This means you can write standard HTML with external file references and it works seamlessly in the preview.

---

## Code Execution

### Judge0 API
- Primary code execution engine.
- Supports **30+ languages** with proper language ID mapping.
- Submissions are polled for results (compile → execute → return output).

### JDoodle API
- Fallback execution engine.
- Used when Judge0 is unavailable or rate-limited.

### Shared Output
- When any user runs code, the output is **broadcast to all users** in the room.
- The output panel shows:
  - **Who** executed the code
  - **Status** (success/error)
  - **stdout** and **stderr** output
  - **Compilation errors** (for compiled languages)
  - **Execution time** and **memory usage**
  - **Plot images** (for Python matplotlib, returned as base64)

### HTML Preview
- HTML files render in a sandboxed `<iframe>` instead of being sent to Judge0.
- CSS and JS files from the room are auto-linked (see Multi-File System above).
- The preview is also broadcast to all users.

---

## Nova AI Assistant

Powered by **Google Gemini API**.

### AI Chat Panel
- Slide-out panel accessible from the navbar.
- Send natural language questions about your code.
- Nova has context about your **current file content** and **language**.
- Responses are rendered with proper code formatting.

### Inline AI Suggestions
- As you type, Nova can provide **ghost text** suggestions in the editor.
- Suggestions appear as faded text after your cursor.
- Press **Tab** to accept a suggestion.
- Powered by the `/api/ai/suggest` endpoint.

### Chat History
- Conversation history persists throughout the session.
- Clear button to reset the conversation.

---

## Video Calling

Built with **native WebRTC** — no third-party video services.

### Starting a Call
- Click the video camera icon in the navbar.
- An invitation is sent to **all users** in the room via Socket.IO.

### Invite System
- Other users see a modal with the caller's name and accept/decline buttons.
- Accepting establishes a direct peer-to-peer WebRTC connection.
- Declining records the choice — the user can request to rejoin later.

### Individual Leave
- Any participant can leave the call without ending it for others.
- Only when the **last person** leaves does the call end for everyone.

### Rejoin Requests
- After leaving or declining, a user can request to rejoin.
- The request goes to the **host** for approval.
- Limited to **3 rejoin attempts** per session.

### PiP Video Window
- Video appears in a **floating, draggable** Picture-in-Picture window.
- Draggable from any edge with viewport boundary clamping.
- Minimize/restore and close controls.
- Shows local and remote video streams.

### WebRTC Signaling
- **Offer/Answer** exchange via Socket.IO (`WEBRTC_OFFER`, `WEBRTC_ANSWER`).
- **ICE candidates** relayed through the signaling server.
- STUN servers used for NAT traversal.

---

## Shared Whiteboard

### Drawing
- Freehand drawing canvas with customizable brush color and size.
- Drawings are broadcast in real-time via `WHITEBOARD_DRAW` events.
- All users see strokes appear as they're drawn.

### Multi-Page Notebook
- Vertically scrollable pages — like a real notebook.
- Click the `+` button between pages to insert a new page.
- Each page maintains its own drawing state.

### Per-Page Clear
- Hover over a page to reveal the clear button.
- Clearing one page doesn't affect others.
- Clear events are synced to all users.

### Persistence
- Annotations are saved to MongoDB via the `/api/rooms/:roomId/annotations` endpoint.
- Restored automatically when a user joins or reconnects.
- Inactive annotations are auto-cleaned after **10 minutes**.

---

## Real-time Chat

### Messaging
- Send and receive instant messages with all room participants.
- Messages show the **sender's name**, **timestamp**, and **message text**.
- Your own messages are visually distinguished with a green accent.

### Typing Indicators
- When you're typing, an animated bouncing dots indicator appears:
  - Next to your name in the **sidebar user list**.
  - In the **chat panel** typing area.
- Typing state is broadcast via `TYPING_START` / `TYPING_STOP` events.
- Auto-stops after a brief inactivity timeout.

### Slide-out Panel
- Chat opens as a slide-out panel from the right side.
- Tabbed interface with **Chat** and **Logs** (host-only) tabs.
- Panel slides in/out with smooth CSS animation.

---

## Activity Logs

**Host-only feature** — only the first user to join the room (the host) sees the Logs tab.

### Tracked Events
| Event | Description |
|-------|-------------|
| 👤 User joined | A new user connected to the room |
| 👋 User left | A user disconnected |
| 📄 File created | A new file was added to the room |
| 🗑️ File deleted | A file was removed |
| ▶️ Code executed | Someone ran code (with file name) |
| 🌐 Language changed | Editor language was switched |
| 📹 Video call started | A video call was initiated |
| ✅ Video call joined | A user accepted the call |
| ❌ Video call declined | A user declined the call |
| 👋 Video call left | A user left the call |
| 🎨 Whiteboard cleared | A whiteboard page was cleared |
| 💬 Chat message sent | A message was sent in chat |

### Log Management
- Every log entry includes a **precise timestamp**.
- Host can **clear all logs** with one click.
- Logs are **automatically deleted** when the room empties (all users disconnect).

---

## Collaboration Features

### Connected Users Sidebar
- Left sidebar shows all currently connected users.
- Each user has a **color-coded avatar** (first letter of username).
- Animated typing indicators appear next to users who are actively coding.

### Host Detection
- The **first user** to join the room is designated as the host.
- Host has exclusive access to the **Activity Logs** tab.
- Host can approve or deny **video call rejoin requests**.

### Real-time Notifications
- Toast notifications when users **join** or **leave** the room.
- Notifications for file creation/deletion by other users.
- Video call invite notifications with accept/decline actions.

---

## Landing Pages

### Landing Page (`/`)
- Hero section with animated gradient background.
- Feature highlights with icons and descriptions.
- Call-to-action buttons to join or create a room.

### Features Page (`/features`)
- Detailed feature cards with visual descriptions.
- Organized by category (Editor, Collaboration, AI, etc.).

### How It Works (`/how-it-works`)
- Step-by-step guide for new users.
- Visual walkthrough of the room creation and collaboration flow.

### Contact Page (`/contact`)
- Developer profile cards with social links.
- GitHub, LinkedIn, email, and portfolio links.

### 404 Page
- Custom animated 404 page with glitch text effects.
- Floating particles and scanline animations.
- Link back to the home page.

---

## Theme System

### Dark Theme (Default)
- Premium dark UI with carefully curated color palette.
- CSS custom properties for consistent theming.
- Glassmorphism effects on cards and modals.

### Light Theme
- Toggle via the sun/moon icon in the editor navbar.
- Theme preference managed via React Context (`ThemeContext`).
- All components respond to theme changes via CSS variables.

### CSS Architecture
- Global theme variables defined in `App.css` (`--bg-primary`, `--text-primary`, etc.).
- Component-specific styles use Tailwind CSS utility classes.
- Animations and scrollbar styles kept in CSS (not expressible in Tailwind).

---

*Last updated: April 2026*