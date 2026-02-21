import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [joining, setJoining] = useState(false);

  const createNewRoom = (e) => {
    e.preventDefault();
    navigate("/new-room");
  };

  const joinRoom = async () => {
    if (!roomId.trim() || !username.trim()) {
      toast.error("Room ID and Username are required!");
      return;
    }

    setJoining(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
      const response = await fetch(`${backendUrl}/api/rooms/${roomId.trim()}/exists`);
      const data = await response.json();

      if (!data.exists) {
        toast.error("Room not found! Please check the Room ID.");
        return;
      }

      navigate(`/verify-password/${roomId}`, {
        state: { username },
      });
    } catch (error) {
      toast.error("Failed to verify room. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  const handleInputEnter = (e) => {
    if (e.code === "Enter") joinRoom();
  };

  return (
    <div className="flex items-center justify-center text-white h-screen bg-[linear-gradient(135deg,#0a0e27_0%,#1a0b2e_50%,#160e30_100%)] relative overflow-hidden">
      <div className="bg-[var(--glass-bg)] backdrop-blur-[30px] p-12 rounded-3xl shadow-[0_20px_60px_var(--shadow-color),0_0_0_1px_var(--glass-border)] w-[480px] max-w-[90%] border border-[var(--glass-border)] relative z-1">
        <img
          className="h-[135px] mx-auto block mb-6"
          src="/logo.png"
          alt="Logo"
        />

        <h1 className="font-['Space_Grotesk',_'Inter',_sans-serif] text-[56px] font-bold text-center m-0 mb-2 -tracking-[1px] bg-[linear-gradient(135deg,var(--text-primary)_0%,var(--text-secondary)_100%)] bg-clip-text text-transparent">CODEVIEW</h1>
        <p className="text-[15px] font-medium text-center mb-10 tracking-[0.5px] text-[var(--text-secondary)]">Collaborative Code Editor</p>

        <h4 className="mb-2 mt-0 text-[13px] font-semibold text-center text-[var(--text-secondary)] uppercase tracking-[1.5px]">Paste Invitation ROOM ID</h4>

        <div className="flex flex-col gap-4">
          <input
            type="text"
            className="py-4 px-5 rounded-xl outline-none border-[1.5px] border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-[15px] font-medium transition-all duration-200 placeholder:text-[var(--text-muted)] placeholder:font-normal placeholder:tracking-[0.3px] focus:border-[var(--accent)] focus:bg-[var(--bg-hover)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
            placeholder="ROOM ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            onKeyUp={handleInputEnter}
          />

          <input
            type="text"
            className="py-4 px-5 rounded-xl outline-none border-[1.5px] border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-[15px] font-medium transition-all duration-200 placeholder:text-[var(--text-muted)] placeholder:font-normal placeholder:tracking-[0.3px] focus:border-[var(--accent)] focus:bg-[var(--bg-hover)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
            placeholder="USERNAME"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyUp={handleInputEnter}
          />

          <button
            onClick={joinRoom}
            className="w-full border-none py-4 px-6 rounded-xl text-[15px] font-semibold cursor-pointer transition-all duration-200 relative overflow-hidden tracking-[0.3px] bg-indigo-500 text-white hover:bg-violet-600 hover:-translate-y-px hover:shadow-[0_12px_24px_rgba(99,102,241,0.3)] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={joining}
          >
            <span className="relative z-2">{joining ? "Checking..." : "Join Room"}</span>
          </button>

          <span className="mx-auto mt-8 text-center text-sm font-normal text-[var(--text-secondary)]">
            If you don't have an invite, create&nbsp;
            <button
              onClick={createNewRoom}
              className="bg-transparent border-none text-indigo-500 no-underline font-semibold cursor-pointer p-0 text-sm tracking-[0.3px] transition-all duration-200 hover:text-indigo-400 hover:underline"
            >
              New Room
            </button>
          </span>
        </div>
      </div>

      <footer className="fixed bottom-0 z-10">
        <h4 className="text-[var(--text-secondary)] text-[13px] font-normal">© 2026 CodedView. All rights reserved.</h4>
      </footer>
    </div>
  );
};

export default Home;
