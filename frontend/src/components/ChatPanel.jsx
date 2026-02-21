import React, { useState, useRef, useEffect } from 'react';
import ACTIONS from '../Actions';

const ChatPanel = ({ isOpen, onClose, socketRef, roomId, username, isHost, messages, activityLogs, typingUsers, onSendMessage, onClearLogs }) => {
  const [activeTab, setActiveTab] = useState('chat');
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const activityEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      activityEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activityLogs, activeTab]);

  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, activeTab]);

  const sendMessage = () => {
    const text = inputValue.trim();
    if (!text) return;
    onSendMessage(text);
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'join': return '👋';
      case 'leave': return '🚪';
      case 'file-create': return '📄';
      case 'file-delete': return '🗑️';
      case 'file-open': return '📂';
      case 'code-run': return '▶️';
      case 'code-change': return '✏️';
      case 'language-change': return '🌐';
      case 'video-call': return '📞';
      case 'whiteboard': return '🎨';
      case 'chat': return '💬';
      default: return '📌';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="chat-panel fixed right-0 top-0 bottom-0 w-[360px] bg-[#0f1117] border-l border-white/[0.08] z-[1100] flex flex-col shadow-[-4px_0_20px_rgba(0,0,0,0.4)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex gap-1">
          <button
            className={`px-3.5 py-1.5 bg-transparent border-none text-white/40 text-[13px] font-medium cursor-pointer rounded-md transition-all duration-150 hover:text-white/70 hover:bg-white/5 ${activeTab === 'chat' ? '!text-white !bg-indigo-500/20' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            💬 Chat
          </button>
          {isHost && (
            <button
              className={`px-3.5 py-1.5 bg-transparent border-none text-white/40 text-[13px] font-medium cursor-pointer rounded-md transition-all duration-150 hover:text-white/70 hover:bg-white/5 ${activeTab === 'activity' ? '!text-white !bg-indigo-500/20' : ''}`}
              onClick={() => setActiveTab('activity')}
            >
              📋 Logs
            </button>
          )}
        </div>
        <button
          className="bg-transparent border-none text-white/40 text-xl cursor-pointer w-7 h-7 flex items-center justify-center rounded transition-all duration-150 hover:text-white hover:bg-white/10"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      {activeTab === 'chat' ? (
        <>
          {/* Messages */}
          <div className="chat-messages flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {messages.length === 0 && (
              <div className="text-center text-white/30 text-[13px] py-10 px-5">No messages yet. Say hello! 👋</div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg rounded-lg py-2 px-3 border-l-2 ${msg.username === username ? 'border-l-green-500/50 bg-green-500/[0.06]' : 'border-l-indigo-500/40 bg-white/[0.04]'}`}>
                <div className="flex justify-between mb-1">
                  <span className={`text-[11px] font-semibold ${msg.username === username ? 'text-green-500/90' : 'text-indigo-500/90'}`}>
                    {msg.username === username ? 'You' : msg.username}
                  </span>
                  <span className="text-[10px] text-white/25">{formatTime(msg.timestamp)}</span>
                </div>
                <div className="text-[13px] text-white/80 leading-snug break-words">{msg.message}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="chat-typing px-4 py-1.5 text-xs text-white/35 flex items-center gap-1.5">
              <span className="typing-dots">
                <span></span><span></span><span></span>
              </span>
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </div>
          )}

          {/* Input bar */}
          <div className="flex items-center gap-2 p-3 border-t border-white/[0.06] bg-white/[0.02]">
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 min-w-0 w-full bg-white/[0.06] border border-white/[0.08] rounded-lg py-2.5 px-3.5 text-slate-200 text-[13px] outline-none transition-colors duration-200 focus:border-indigo-500/40 placeholder:text-white/20 box-border"
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim()}
              className="shrink-0 py-2.5 px-[18px] bg-indigo-500/80 border-none rounded-lg text-white text-[13px] font-medium cursor-pointer transition-all duration-150 whitespace-nowrap hover:enabled:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Activity Logs */}
          <div className="chat-messages flex-1 overflow-y-auto p-3 flex flex-col gap-0.5">
            {activityLogs.length === 0 && (
              <div className="text-center text-white/30 text-[13px] py-10 px-5">No activity yet.</div>
            )}
            {activityLogs.map((log, i) => (
              <div key={i} className="flex items-center gap-2 py-2 px-2.5 rounded-md bg-white/[0.02] transition-colors duration-150 hover:bg-white/[0.04]">
                <span className="text-sm shrink-0">{getActivityIcon(log.type)}</span>
                <div className="flex-1 min-w-0 text-xs leading-snug">
                  <span className="font-semibold text-indigo-500/90 mr-1">{log.username}</span>
                  <span className="text-white/50">{log.details}</span>
                </div>
                <span className="text-[10px] text-white/20 shrink-0">{formatTime(log.timestamp)}</span>
              </div>
            ))}
            <div ref={activityEndRef} />
          </div>
          <div className="flex items-center gap-2 p-3 border-t border-white/[0.06] bg-white/[0.02]">
            <button
              className="w-full py-2 bg-red-500/15 border border-red-500/20 rounded-lg text-red-400 text-[13px] cursor-pointer transition-all duration-150 hover:bg-red-500/25"
              onClick={onClearLogs}
            >
              🗑️ Clear Logs
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatPanel;
