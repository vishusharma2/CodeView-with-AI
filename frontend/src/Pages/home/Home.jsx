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

  const inputClasses = "w-full py-4 px-5 rounded-xl outline-none border-[1.5px] border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-white text-[15px] font-medium transition-all duration-300 placeholder:text-[rgba(255,255,255,0.3)] placeholder:font-normal focus:border-[#6366f1] focus:bg-[rgba(99,102,241,0.06)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]";

  return (
    <div className="flex h-screen text-white bg-[#060918] overflow-hidden">

      {/* ===== LEFT PANEL — Animated Visual ===== */}
      <div className="hidden lg:flex w-[55%] relative items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0a0e27 0%, #1a0b2e 40%, #0f1135 100%)' }}>

        {/* Animated grid background */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            animation: 'gridScroll 20s linear infinite',
          }} />

        {/* Floating orbs */}
        <div className="absolute w-[350px] h-[350px] rounded-full top-[15%] left-[10%] opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.5), transparent 70%)', filter: 'blur(80px)', animation: 'floatOrb1 8s ease-in-out infinite' }} />
        <div className="absolute w-[250px] h-[250px] rounded-full bottom-[20%] right-[15%] opacity-25"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5), transparent 70%)', filter: 'blur(60px)', animation: 'floatOrb2 10s ease-in-out infinite' }} />

        {/* Content */}
        <div className="relative z-10 px-16 max-w-[560px]" style={{ animation: 'slideInLeft 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-[12px] font-semibold tracking-[1.5px] uppercase"
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', animation: 'fadeInUp 0.6s ease 0.2s both' }}>
            <span className="w-2 h-2 rounded-full bg-[#6366f1]" style={{ animation: 'pulse 2s infinite' }} />
            Live Collaboration
          </div>

          <h1 className="text-[48px] font-bold leading-[1.1] mb-6 tracking-[-1px]"
            style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif", animation: 'fadeInUp 0.6s ease 0.3s both' }}>
            <span className="text-white">Join a </span>
            <span style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Coding Session
            </span>
          </h1>

          <p className="text-[16px] leading-[1.7] mb-10 text-[rgba(255,255,255,0.55)]"
            style={{ animation: 'fadeInUp 0.6s ease 0.4s both' }}>
            Enter your room credentials and start collaborating in real-time with your team. Write, review, and debug code together.
          </p>

          {/* Floating code terminal mockup */}
          <div className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(15,17,40,0.8)',
              border: '1px solid rgba(99,102,241,0.15)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(99,102,241,0.08)',
              animation: 'fadeInUp 0.6s ease 0.5s both, floatCard 6s ease-in-out infinite 0.5s',
            }}>
            {/* Terminal header */}
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
              <span className="ml-3 text-[11px] text-[rgba(255,255,255,0.3)] font-mono">terminal — collaborative</span>
            </div>
            {/* Terminal body */}
            <div className="px-5 py-4 font-mono text-[13px] leading-[1.8]">
              <div><span className="text-[#28c840]">→</span> <span className="text-[#818cf8]">codeview</span> join --room <span className="text-[#fbbf24]">abc123</span></div>
              <div className="text-[rgba(255,255,255,0.35)]">&nbsp;&nbsp;Connecting to room...</div>
              <div><span className="text-[#28c840]">✓</span> Connected as <span className="text-[#a78bfa]">@developer</span></div>
              <div><span className="text-[#28c840]">✓</span> 3 collaborators online</div>
              <div className="mt-1"><span className="text-[#28c840]">→</span> <span className="text-[rgba(255,255,255,0.5)]">Ready to code</span><span className="inline-block w-[2px] h-4 bg-[#6366f1] ml-1 align-middle" style={{ animation: 'blink 1s step-end infinite' }} /></div>
            </div>
          </div>

          {/* Feature pills */}
          <div className="flex gap-3 mt-8 flex-wrap" style={{ animation: 'fadeInUp 0.6s ease 0.7s both' }}>
            {['Real-time Sync', 'Video Calls', 'AI Assistant'].map((feat, i) => (
              <span key={i} className="px-4 py-2 rounded-full text-[12px] font-medium tracking-wide"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                {feat}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ===== RIGHT PANEL — Form ===== */}
      <div className="flex-1 flex items-center justify-center relative px-6"
        style={{ background: 'linear-gradient(180deg, #080b1f 0%, #0d1030 50%, #080b1f 100%)' }}>

        {/* Subtle glow behind form */}
        <div className="absolute w-[300px] h-[300px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.4), transparent 70%)', filter: 'blur(80px)' }} />

        <div className="w-full max-w-[420px] relative z-10" style={{ animation: 'slideInRight 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>

          {/* Logo */}
          <div className="flex items-center justify-center mb-10" style={{ animation: 'fadeInUp 0.5s ease 0.1s both' }}>
            <img src="/logo.png" alt="CodeView" className="h-[70px]" style={{ filter: 'drop-shadow(0 0 20px rgba(99,102,241,0.3))' }} />
          </div>

          {/* Heading */}
          <div className="text-center mb-10" style={{ animation: 'fadeInUp 0.5s ease 0.2s both' }}>
            <h2 className="text-[32px] font-bold tracking-[-0.5px] mb-2" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>Join Room</h2>
            <p className="text-[14px] text-[rgba(255,255,255,0.4)]">Enter your credentials to start coding</p>
          </div>

          {/* Form */}
          <div className="flex flex-col gap-4" style={{ animation: 'fadeInUp 0.5s ease 0.3s both' }}>

            {/* Room ID */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[1.5px] text-[rgba(255,255,255,0.35)] mb-2">Room ID</label>
              <input
                type="text"
                className={inputClasses}
                placeholder="Paste your invitation room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                onKeyUp={handleInputEnter}
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[1.5px] text-[rgba(255,255,255,0.35)] mb-2">Username</label>
              <input
                type="text"
                className={inputClasses}
                placeholder="Choose a display name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyUp={handleInputEnter}
              />
            </div>

            {/* Join button */}
            <button
              onClick={joinRoom}
              disabled={joining}
              className="w-full mt-2 py-4 px-6 rounded-xl text-[15px] font-semibold cursor-pointer transition-all duration-300 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed border-none text-white"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
              }}
              onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 30px rgba(99,102,241,0.4)'; }}
              onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 20px rgba(99,102,241,0.3)'; }}
            >
              {joining ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Checking...
                </span>
              ) : "Join Room →"}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8" style={{ animation: 'fadeInUp 0.5s ease 0.4s both' }}>
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
            <span className="text-[12px] text-[rgba(255,255,255,0.25)] uppercase tracking-[1px]">or</span>
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
          </div>

          {/* Create new room button */}
          <button
            onClick={createNewRoom}
            className="w-full py-4 px-6 rounded-xl text-[14px] font-semibold cursor-pointer transition-all duration-300 border-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.6)',
              animation: 'fadeInUp 0.5s ease 0.5s both',
            }}
            onMouseEnter={e => { e.target.style.background = 'rgba(99,102,241,0.1)'; e.target.style.borderColor = 'rgba(99,102,241,0.3)'; e.target.style.color = '#818cf8'; }}
            onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.04)'; e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.color = 'rgba(255,255,255,0.6)'; }}
          >
            ✨ Create New Room
          </button>

          {/* Footer */}
          <p className="text-center mt-10 text-[12px] text-[rgba(255,255,255,0.2)]"
            style={{ animation: 'fadeInUp 0.5s ease 0.6s both' }}>
            © 2026 CodeView. All rights reserved.
          </p>
        </div>
      </div>

      {/* Keyframe styles */}
      <style>{`
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatOrb1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -20px) scale(1.1); }
        }
        @keyframes floatOrb2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-25px, 15px) scale(1.15); }
        }
        @keyframes floatCard {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes gridScroll {
          0% { transform: translate(0, 0); }
          100% { transform: translate(60px, 60px); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
};

export default Home;
