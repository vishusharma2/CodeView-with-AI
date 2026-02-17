import React, { useState, useRef, useEffect } from 'react';
import ACTIONS from '../Actions';

const ChatPanel = ({ isOpen, onClose, socketRef, roomId, username, isHost, messages, activityLogs, typingUsers, onSendMessage, onClearLogs }) => {
  const [activeTab, setActiveTab] = useState('chat');
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const activityEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      activityEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activityLogs, activeTab]);

  // Focus input when panel opens
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
    <div className="chat-panel">
      <div className="chat-panel-header">
        <div className="chat-tabs">
          <button
            className={`chat-tab ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            💬 Chat
          </button>
          {isHost && (
            <button
              className={`chat-tab ${activeTab === 'activity' ? 'active' : ''}`}
              onClick={() => setActiveTab('activity')}
            >
              📋 Logs
            </button>
          )}
        </div>
        <button className="chat-close-btn" onClick={onClose}>×</button>
      </div>

      {activeTab === 'chat' ? (
        <>
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-empty">No messages yet. Say hello! 👋</div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.username === username ? 'own' : ''}`}>
                <div className="chat-msg-header">
                  <span className="chat-msg-user">{msg.username === username ? 'You' : msg.username}</span>
                  <span className="chat-msg-time">{formatTime(msg.timestamp)}</span>
                </div>
                <div className="chat-msg-text">{msg.message}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {typingUsers.length > 0 && (
            <div className="chat-typing">
              <span className="typing-dots">
                <span></span><span></span><span></span>
              </span>
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </div>
          )}

          <div className="chat-input-bar">
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button onClick={sendMessage} disabled={!inputValue.trim()}>
              Send
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="chat-messages activity-list">
            {activityLogs.length === 0 && (
              <div className="chat-empty">No activity yet.</div>
            )}
            {activityLogs.map((log, i) => (
              <div key={i} className="activity-item">
                <span className="activity-icon">{getActivityIcon(log.type)}</span>
                <div className="activity-body">
                  <span className="activity-user">{log.username}</span>
                  <span className="activity-detail">{log.details}</span>
                </div>
                <span className="activity-time">{formatTime(log.timestamp)}</span>
              </div>
            ))}
            <div ref={activityEndRef} />
          </div>
          <div className="chat-input-bar">
            <button className="clear-logs-btn" onClick={onClearLogs}>
              🗑️ Clear Logs
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatPanel;
