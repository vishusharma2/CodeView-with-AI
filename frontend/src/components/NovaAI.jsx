import React, { useState, useRef, useEffect } from 'react';
import { TrashIcon } from '../icons';

const NovaAI = ({ isOpen, onClose, code, language }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m Nova AI, your coding assistant. Ask me anything about your code!' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/nova-ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          code: code || '',
          language: language || 'javascript'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Sorry, I encountered an error. Please try again.' 
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Failed to connect to Nova AI. Please check your connection.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      { role: 'assistant', content: 'Chat cleared! How can I help you?' }
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="nova-ai-overlay" onClick={onClose}>
      <div className="nova-ai-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="nova-header">
          <div className="nova-title">
            <span className="nova-icon"><img src="../logo-nova-ai.png" alt="AI" style={{ width: '25px', height: '25px', borderRadius: '5px' }} /></span>
            <span>Nova AI</span>
            <span className="nova-badge">Beta</span>
          </div>
          <div className="nova-actions">
            <button onClick={clearChat} title="Clear chat" className="nova-clear-btn">
              <TrashIcon />
            </button>
            <button onClick={onClose} className="nova-close-btn">×</button>
          </div>
        </div>

        {/* Messages */}
        <div className="nova-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`nova-message ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'assistant' ? <img src="../logo-nova-ai.png" alt="AI" style={{ width: '25px', height: '25px', borderRadius: '4px' }} /> : '👤'}
              </div>
              <div className="message-content">
                <pre>{msg.content}</pre>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="nova-message assistant">
              <div className="message-avatar"><img src="../logo-nova-ai.png" alt="AI" style={{ width: '25px', height: '25px', borderRadius: '4px' }} /></div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="nova-input-container">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Nova AI about your code..."
            rows={2}
            disabled={isLoading}
          />
          <button 
            onClick={sendMessage} 
            disabled={isLoading || !input.trim()}
            className="nova-send-btn"
          >
            {isLoading ? '...' : '➤'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NovaAI;
