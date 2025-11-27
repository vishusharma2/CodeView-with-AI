import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");

  const createNewRoom = (e) => {
    e.preventDefault();
    const id = uuidv4();
    setRoomId(id);
    toast.success("New Room Created!");
  };

  const joinRoom = () => {
    if (!roomId.trim() || !username.trim()) {
      toast.error("Room ID and Username are required!");
      return;
    }

    navigate(`/editor/${roomId}`, {
      state: { username },
    });
  };

  const handleInputEnter = (e) => {
    if (e.code === "Enter") joinRoom();
  };

  return (
    <div className="homePageWrapper">
      <div className="formWrapper">
        <img
          className="homePageLogo"
          src="/code-view-logo1.png"
          alt="Logo"
        />

        <h1 className="neonTitle">CODEVIEW</h1>
        <p className="neonSubtitle">Collaborative Code Editor</p>

        <h4 className="mainLabel">Paste Invitation ROOM ID</h4>

        <div className="inputGroup">
          <input
            type="text"
            className="inputBox"
            placeholder="ROOM ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            onKeyUp={handleInputEnter}
          />

          <input
            type="text"
            className="inputBox"
            placeholder="USERNAME"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyUp={handleInputEnter}
          />

          <button onClick={joinRoom} className="btn joinBtn neonBtn">
            <span className="btnText">Join Room</span>
            <span className="btnGlow"></span>
          </button>

          <span className="createInfo">
            If you don't have an invite, create&nbsp;
            <button onClick={createNewRoom} className="createNewBtn neonLink">
              New Room
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

export default Home;
