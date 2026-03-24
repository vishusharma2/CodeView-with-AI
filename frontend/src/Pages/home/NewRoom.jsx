import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import logger from '../../utils/logger';

const NewRoom = () => {
  const navigate = useNavigate();
  const [roomId] = useState(uuidv4());
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const createRoom = async () => {
    if (!username.trim() || !password.trim()) {
      toast.error("Username and Password are required!");
      return;
    }

    setLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
      const response = await fetch(`${backendUrl}/api/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roomId, password, username }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.token) {
          localStorage.setItem("codeview-token", data.token);
        }
        toast.success("Room created successfully!");
        navigate(`/editor/${roomId}`, {
          state: { username },
        });
      } else {
        toast.error(data.error || "Failed to create room");
      }
    } catch (error) {
      logger.error("Error creating room:", error);
      toast.error("Failed to create room. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      toast.success("Room ID copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleInputEnter = (e) => {
    if (e.code === "Enter") createRoom();
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
            backgroundImage: 'linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            animation: 'gridScroll 20s linear infinite',
          }} />

        {/* Floating orbs */}
        <div className="absolute w-[400px] h-[400px] rounded-full top-[10%] right-[10%] opacity-25"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5), transparent 70%)', filter: 'blur(80px)', animation: 'floatOrb1 9s ease-in-out infinite' }} />
        <div className="absolute w-[300px] h-[300px] rounded-full bottom-[15%] left-[10%] opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.5), transparent 70%)', filter: 'blur(70px)', animation: 'floatOrb2 11s ease-in-out infinite' }} />

        {/* Content */}
        <div className="relative z-10 px-16 max-w-[560px]" style={{ animation: 'slideInLeft 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-[12px] font-semibold tracking-[1.5px] uppercase"
            style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', color: '#a78bfa', animation: 'fadeInUp 0.6s ease 0.2s both' }}>
            <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" style={{ animation: 'pulse 2s infinite' }} />
            New Workspace
          </div>

          <h1 className="text-[48px] font-bold leading-[1.1] mb-6 tracking-[-1px]"
            style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif", animation: 'fadeInUp 0.6s ease 0.3s both' }}>
            <span className="text-white">Create Your </span>
            <span style={{ background: 'linear-gradient(135deg, #8b5cf6, #a855f7, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Coding Room
            </span>
          </h1>

          <p className="text-[16px] leading-[1.7] mb-10 text-[rgba(255,255,255,0.55)]"
            style={{ animation: 'fadeInUp 0.6s ease 0.4s both' }}>
            Set up a secure, password-protected room instantly. Invite your team and start building something amazing together.
          </p>

          {/* Feature cards grid */}
          <div className="grid grid-cols-2 gap-3" style={{ animation: 'fadeInUp 0.6s ease 0.5s both' }}>
            {[
              { icon: '🔒', title: 'Encrypted', desc: 'Password protected rooms' },
              { icon: '⚡', title: 'Instant', desc: 'No setup required' },
              { icon: '👥', title: 'Team Ready', desc: 'Unlimited collaborators' },
              { icon: '🤖', title: 'AI Powered', desc: 'Nova AI assistant built-in' },
            ].map((feat, i) => (
              <div key={i} className="p-4 rounded-xl transition-all duration-300 cursor-default group"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  animation: `fadeInUp 0.4s ease ${0.6 + i * 0.1}s both`,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.08)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div className="text-[20px] mb-2">{feat.icon}</div>
                <div className="text-[13px] font-semibold text-white mb-1">{feat.title}</div>
                <div className="text-[11px] text-[rgba(255,255,255,0.35)]">{feat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== RIGHT PANEL — Form ===== */}
      <div className="flex-1 flex items-center justify-center relative px-6"
        style={{ background: 'linear-gradient(180deg, #080b1f 0%, #0d1030 50%, #080b1f 100%)' }}>

        {/* Subtle glow */}
        <div className="absolute w-[300px] h-[300px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.4), transparent 70%)', filter: 'blur(80px)' }} />

        <div className="w-full max-w-[420px] relative z-10" style={{ animation: 'slideInRight 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>

          {/* Logo */}
          <div className="flex items-center justify-center mb-10" style={{ animation: 'fadeInUp 0.5s ease 0.1s both' }}>
            <img src="/logo.png" alt="CodeView" className="h-[70px]" style={{ filter: 'drop-shadow(0 0 20px rgba(139,92,246,0.3))' }} />
          </div>

          {/* Heading */}
          <div className="text-center mb-10" style={{ animation: 'fadeInUp 0.5s ease 0.2s both' }}>
            <h2 className="text-[32px] font-bold tracking-[-0.5px] mb-2" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>Create Room</h2>
            <p className="text-[14px] text-[rgba(255,255,255,0.4)]">Set up your collaborative workspace</p>
          </div>

          {/* Form */}
          <div className="flex flex-col gap-4" style={{ animation: 'fadeInUp 0.5s ease 0.3s both' }}>

            {/* Room ID (with copy) */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[1.5px] text-[rgba(255,255,255,0.35)] mb-2">Room ID <span className="normal-case tracking-normal text-[rgba(255,255,255,0.2)]">(auto-generated)</span></label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className={`${inputClasses} opacity-60 cursor-not-allowed text-[13px]`}
                  value={roomId}
                  disabled
                />
                <button
                  onClick={copyRoomId}
                  className="px-4 rounded-xl text-[12px] font-semibold transition-all duration-300 border-none cursor-pointer shrink-0"
                  style={{
                    background: copied ? 'rgba(40,200,64,0.15)' : 'rgba(255,255,255,0.06)',
                    color: copied ? '#28c840' : 'rgba(255,255,255,0.5)',
                    border: `1px solid ${copied ? 'rgba(40,200,64,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  {copied ? '✓' : '📋'}
                </button>
              </div>
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

            {/* Password */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[1.5px] text-[rgba(255,255,255,0.35)] mb-2">Room Password</label>
              <input
                type="password"
                className={inputClasses}
                placeholder="Set a secure password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={handleInputEnter}
              />
            </div>

            {/* Create button */}
            <button
              onClick={createRoom}
              disabled={loading}
              className="w-full mt-2 py-4 px-6 rounded-xl text-[15px] font-semibold cursor-pointer transition-all duration-300 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed border-none text-white"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                boxShadow: '0 4px 20px rgba(139,92,246,0.3)',
              }}
              onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 30px rgba(139,92,246,0.4)'; }}
              onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 20px rgba(139,92,246,0.3)'; }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Creating...
                </span>
              ) : "Create Room →"}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8" style={{ animation: 'fadeInUp 0.5s ease 0.4s both' }}>
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
            <span className="text-[12px] text-[rgba(255,255,255,0.25)] uppercase tracking-[1px]">or</span>
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
          </div>

          {/* Join existing room */}
          <button
            onClick={() => navigate("/join")}
            className="w-full py-4 px-6 rounded-xl text-[14px] font-semibold cursor-pointer transition-all duration-300 border-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.6)',
              animation: 'fadeInUp 0.5s ease 0.5s both',
            }}
            onMouseEnter={e => { e.target.style.background = 'rgba(139,92,246,0.1)'; e.target.style.borderColor = 'rgba(139,92,246,0.3)'; e.target.style.color = '#a78bfa'; }}
            onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.04)'; e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.color = 'rgba(255,255,255,0.6)'; }}
          >
            🔗 Join Existing Room
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
          50% { transform: translate(-30px, -20px) scale(1.15); }
        }
        @keyframes floatOrb2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(25px, 15px) scale(1.1); }
        }
        @keyframes gridScroll {
          0% { transform: translate(0, 0); }
          100% { transform: translate(60px, 60px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
};

export default NewRoom;
