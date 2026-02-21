import React, { useState, useEffect } from "react";
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
  const [checkingRoom, setCheckingRoom] = useState(true);

  // Check if the room actually exists before showing the verify form
  useEffect(() => {
    const checkRoom = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
        const response = await fetch(`${backendUrl}/api/rooms/${roomId}/exists`);
        const data = await response.json();
        if (!data.exists) {
          navigate("/not-found", { replace: true });
          return;
        }
      } catch (error) {
        logger.error("Error checking room existence:", error);
        navigate("/not-found", { replace: true });
        return;
      }
      setCheckingRoom(false);
    };
    checkRoom();
  }, [roomId, navigate]);

  // Show nothing while checking (prevents form flash)
  if (checkingRoom) return null;

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
        body: JSON.stringify({ roomId, password, username }),
      });

      const data = await response.json();

      if (data.valid) {
        // Store JWT token
        localStorage.setItem("codeview-token", data.token);
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

  const inputClasses = "py-4 px-5 rounded-xl outline-none border-[1.5px] border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-[15px] font-medium transition-all duration-200 placeholder:text-[var(--text-muted)] placeholder:font-normal placeholder:tracking-[0.3px] focus:border-[var(--accent)] focus:bg-[var(--bg-hover)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]";

  return (
    <div className="flex items-center justify-center text-white h-screen bg-[linear-gradient(135deg,#0a0e27_0%,#1a0b2e_50%,#160e30_100%)] relative overflow-hidden">
      <div className="bg-[var(--glass-bg)] backdrop-blur-[30px] p-12 rounded-3xl shadow-[0_20px_60px_var(--shadow-color),0_0_0_1px_var(--glass-border)] w-[480px] max-w-[90%] border border-[var(--glass-border)] relative z-1">
        <img
          className="h-[135px] mx-auto block mb-6"
          src="/logo.png"
          alt="Logo"
        />

        <h1 className="font-['Space_Grotesk',_'Inter',_sans-serif] text-[56px] font-bold text-center m-0 mb-2 -tracking-[1px] bg-[linear-gradient(135deg,var(--text-primary)_0%,var(--text-secondary)_100%)] bg-clip-text text-transparent">VERIFY ACCESS</h1>
        <p className="text-[15px] font-medium text-center mb-10 tracking-[0.5px] text-[var(--text-secondary)]">Enter Credentials</p>

        <h4 className="mb-2 mt-0 text-[13px] font-semibold text-center text-[var(--text-secondary)] uppercase tracking-[1.5px]">Room ID: {roomId.substring(0, 8)}...</h4>

        <div className="flex flex-col gap-4">
          <input
            type="text"
            className={inputClasses}
            placeholder="USERNAME"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyUp={handleInputEnter}
            autoFocus={!initialUsername}
          />

          <input
            type="password"
            className={inputClasses}
            placeholder="ROOM PASSWORD"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyUp={handleInputEnter}
            autoFocus={!!initialUsername}
          />

          <button
            onClick={verifyPassword}
            className="w-full border-none py-4 px-6 rounded-xl text-[15px] font-semibold cursor-pointer transition-all duration-200 relative overflow-hidden tracking-[0.3px] bg-indigo-500 text-white hover:bg-violet-600 hover:-translate-y-px hover:shadow-[0_12px_24px_rgba(99,102,241,0.3)] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            <span className="relative z-2">
              {loading ? "Verifying..." : "Verify & Join"}
            </span>
          </button>

          <span className="mx-auto mt-8 text-center text-sm font-normal text-[var(--text-secondary)]">
            Wrong room?&nbsp;
            <button
              onClick={() => navigate("/")}
              className="bg-transparent border-none text-indigo-500 no-underline font-semibold cursor-pointer p-0 text-sm tracking-[0.3px] transition-all duration-200 hover:text-indigo-400 hover:underline"
            >
              Go Back
            </button>
          </span>
        </div>
      </div>

      <footer className="fixed bottom-0 z-10">
        <h4 className="text-[var(--text-secondary)] text-[13px] font-normal">© 2024 CodedView. All rights reserved.</h4>
      </footer>
    </div>
  );
};

export default PasswordVerify;
