import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const NewRoom = () => {
  const navigate = useNavigate();
  const [roomId] = useState(uuidv4());
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const createRoom = async () => {
    if (!username.trim() || !password.trim()) {
      toast.error("Username and Password are required!");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roomId, password }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Room created successfully!");
        navigate(`/editor/${roomId}`, {
          state: { username },
        });
      } else {
        toast.error(data.error || "Failed to create room");
      }
    } catch (error) {
      console.error("Error creating room:", error);
      toast.error("Failed to create room. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputEnter = (e) => {
    if (e.code === "Enter") createRoom();
  };

  return (
    <div className="flex items-center justify-center color-[#fff] h-[100vh] bg-[linear-gradient(135deg,#0a0e27_0%,#1a0b2e_50%,#160e30_100%)] position-relative overflow-hidden">
      <div className="formWrapper">
        <img
          className="homePageLogo"
          src="/code-view-logo1.png"
          alt="Logo"
        />

        <h1 className="neonTitle">CREATE ROOM</h1>
        <p className="neonSubtitle">Secure Collaborative Space</p>

        <h4 className="mainLabel">Setup Your Room</h4>

        <div className="inputGroup">
          <input
            type="text"
            className="inputBox"
            placeholder="ROOM ID (AUTO-GENERATED)"
            value={roomId}
            disabled
            style={{ opacity: 0.7, cursor: "not-allowed" }}
          />

          <input
            type="text"
            className="inputBox"
            placeholder="USERNAME"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyUp={handleInputEnter}
          />

          <input
            type="password"
            className="inputBox"
            placeholder="ROOM PASSWORD"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyUp={handleInputEnter}
          />

          <button 
            onClick={createRoom} 
            className="btn joinBtn neonBtn"
            disabled={loading}
          >
            <span className="btnText">
              {loading ? "Creating..." : "Create Room"}
            </span>
            <span className="btnGlow"></span>
          </button>

          <span className="createInfo">
            Already have a room?&nbsp;
            <button 
              onClick={() => navigate("/")} 
              className="createNewBtn neonLink"
            >
              Join Room
            </button>
          </span>
        </div>
      </div>

      <footer>
        <h4 className="footerText">© 2024 CodedView. All rights reserved.</h4>
      </footer>
    </div>
  );
};

export default NewRoom;
