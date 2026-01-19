import React, { useState, useRef, useEffect } from 'react';

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
              <svg width="16" height="16" viewBox="0 0 256 256">
                <path d="M215 116H41a8 8 0 0 1 0-16h174a8 8 0 0 1 0 16z" fill="#858eff"/>
                <path d="M213 116H43l18.038 126.263A16 16 0 0 0 76.877 256h102.247a16 16 0 0 0 15.839-13.737L213 116z" fill="#6770e6"/>
                <path fill="#5861c7" d="M179.944 250H76.056c-7.23 0-13.464-4.682-15.527-11.303l.509 3.565A16 16 0 0 0 76.877 256h102.247a16 16 0 0 0 15.839-13.737l.509-3.565c-2.063 6.62-8.297 11.302-15.528 11.302zM82.665 136h-.93c-4.141 0-7.377 3.576-6.965 7.697l8.6 86A7 7 0 0 0 90.335 236h.93c4.141 0 7.377-3.576 6.965-7.697l-8.6-86A7 7 0 0 0 82.665 136zM165.165 236h-.93c-4.141 0-7.377-3.576-6.965-7.697l8.6-86a7 7 0 0 1 6.965-6.303h.93c4.141 0 7.377 3.576 6.965 7.697l-8.6 86a7 7 0 0 1-6.965 6.303zM128.5 136h-1a7 7 0 0 0-7 7v86a7 7 0 0 0 7 7h1a7 7 0 0 0 7-7v-86a7 7 0 0 0-7-7z"/>
                <path fill="#69ebfc" d="M148.364 100V12.121C148.364 5.427 142.937 0 136.242 0H60.485C53.79 0 48.364 5.427 48.364 12.121V100h100z"/>
                <path fill="#d476e2" d="M208.364 100V42.121c0-6.694-5.427-12.121-12.121-12.121h-75.758c-6.694 0-12.121 5.427-12.121 12.121V100h100z"/>
              </svg>
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
