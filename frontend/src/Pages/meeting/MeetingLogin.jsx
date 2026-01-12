import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Room-chat.css";
import toast from "react-hot-toast";

const MeetingLogin = () => {
  const [roomCode, setRoomCode] = useState("");
  const navigate = useNavigate();

  // snippet: when user submits
const handleFormSubmit = (ev) => {
  ev.preventDefault();
  const code = roomCode.trim();
  const user = username?.trim();
  if (!code || !user) {
    toast.error("Room code and username required");
    return;
  }
  // store username in localStorage so refresh doesn't lose it
  localStorage.setItem("username", user);
  navigate(`/room/${code}`, { state: { username: user } });
};

  return (
    <div className="home-page">
      <form onSubmit={handleFormSubmit} className="form">
        <div>
          <label>Enter Room Code</label>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            placeholder="Enter Room Code"
            required
          />
        </div>

        <button type="submit">Join Room</button>
      </form>
    </div>
  );
};

export default MeetingLogin;
