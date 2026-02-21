import React, { useState, useRef, useEffect } from 'react';
import { TrashIcon } from '../icons';

const NovaAI = ({ isOpen, onClose, code, language }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m Nova AI, your coding assistant. Ask me anything about your code!' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

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
      const token = localStorage.getItem('codeview-token');
      const response = await fetch(`${backendUrl}/api/nova-ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
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
    <div className="fixed inset-0 bg-black/50 z-[1000] flex justify-end" onClick={onClose}>
      <div className="nova-ai-panel w-[400px] max-w-[100vw] h-full bg-[var(--bg-primary)] flex flex-col shadow-[-4px_0_20px_rgba(0,0,0,0.3)]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
            <span className="text-xl"><img src="../logo-nova-ai.png" alt="AI" className="w-[25px] h-[25px] rounded-[5px]" /></span>
            <span>Nova AI</span>
            <span className="text-[10px] py-0.5 px-1.5 bg-indigo-500 rounded text-white">Beta</span>
          </div>
          <div className="flex gap-2">
            <button onClick={clearChat} title="Clear chat" className="bg-transparent border-none text-[var(--text-secondary)] cursor-pointer text-base py-1 px-2 rounded transition-all duration-200 hover:bg-white/10 hover:text-[var(--text-primary)]">
              <TrashIcon />
            </button>
            <button onClick={onClose} className="bg-transparent border-none text-[var(--text-secondary)] cursor-pointer text-base py-1 px-2 rounded transition-all duration-200 hover:bg-white/10 hover:text-[var(--text-primary)]">×</button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {messages.map((msg, idx) => (
            <div key={idx} className={`nova-message flex gap-2.5 items-start ${msg.role}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0 ${msg.role === 'user' ? 'bg-indigo-500' : 'bg-[var(--bg-tertiary)]'}`}>
                {msg.role === 'assistant' ? <img src="../logo-nova-ai.png" alt="AI" className="w-[25px] h-[25px] rounded" /> : '👤'}
              </div>
              <div className={`message-content flex-1 py-2.5 px-3.5 rounded-xl text-[13px] leading-relaxed ${msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'}`}>
                <pre className="m-0 whitespace-pre-wrap break-words font-[inherit]">{msg.content}</pre>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="nova-message assistant flex gap-2.5 items-start">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-base bg-[var(--bg-tertiary)] shrink-0"><img src="../logo-nova-ai.png" alt="AI" className="w-[25px] h-[25px] rounded" /></div>
              <div className="message-content flex-1 py-2.5 px-3.5 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] text-[13px] leading-relaxed">
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
        <div className="nova-input-container flex items-end gap-2 p-3 border-t border-[var(--border-default)] bg-[var(--bg-secondary)]">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Nova AI about your code..."
            rows={2}
            disabled={isLoading}
            className="flex-1 min-w-0 h-10 max-h-20 py-2.5 px-3 border border-[var(--border-default)] rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-[13px] resize-none outline-none font-[inherit] overflow-hidden focus:border-indigo-500"
          />
          <button 
            onClick={sendMessage} 
            disabled={isLoading || !input.trim()}
            className="w-10 h-10 p-0 bg-indigo-500 border-none rounded-lg text-white cursor-pointer text-base transition-colors duration-200 shrink-0 flex items-center justify-center hover:enabled:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '...' : '➤'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NovaAI;
