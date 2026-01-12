import React, { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import logger from '../../utils/logger';

const PasswordVerify = () => {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const location = useLocation();
  const initialUsername = location.state?.username || "";
  
  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const verifyPassword = async () => {
    if (!username.trim()) {
      toast.error("Username is required!");
      return;
    }

    if (!password.trim()) {
      toast.error("Password is required!");
      return;
    }

    setLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
      const response = await fetch(`${backendUrl}/api/rooms/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roomId, password }),
      });

      const data = await response.json();

      if (data.valid) {
        toast.success("Password verified!");
        navigate(`/editor/${roomId}`, {
          state: { username },
        });
      } else {
        toast.error("Info entered is wrong");
        setPassword("");
      }
    } catch (error) {
      logger.error("Error verifying password:", error);
      toast.error("Failed to verify password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputEnter = (e) => {
    if (e.code === "Enter") verifyPassword();
  };

  return (
    <div className="flex items-center justify-center color-[#fff] h-[100vh] bg-[linear-gradient(135deg,#0a0e27_0%,#1a0b2e_50%,#160e30_100%)] position-relative overflow-hidden">
      <div className="formWrapper">
        <img
          className="homePageLogo"
          src="/logo.png"
          alt="Logo"
        />

        <h1 className="neonTitle">VERIFY ACCESS</h1>
        <p className="neonSubtitle">Enter Credentials</p>

        <h4 className="mainLabel">Room ID: {roomId.substring(0, 8)}...</h4>

        <div className="inputGroup">
          <input
            type="text"
            className="inputBox"
            placeholder="USERNAME"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyUp={handleInputEnter}
            autoFocus={!initialUsername}
          />

          <input
            type="password"
            className="inputBox"
            placeholder="ROOM PASSWORD"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyUp={handleInputEnter}
            autoFocus={!!initialUsername}
          />

          <button 
            onClick={verifyPassword} 
            className="btn joinBtn neonBtn"
            disabled={loading}
          >
            <span className="btnText">
              {loading ? "Verifying..." : "Verify & Join"}
            </span>
            <span className="btnGlow"></span>
          </button>

          <span className="createInfo">
            Wrong room?&nbsp;
            <button 
              onClick={() => navigate("/")} 
              className="createNewBtn neonLink"
            >
              Go Back
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

export default PasswordVerify;
