import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import Draggable from 'react-draggable';
import ACTIONS from "../../Actions";
import Client from '../../components/Client';
import Editor from '../../components/Editor';
import Output from '../../components/Output';
import Whiteboard from '../../components/Whiteboard';
import NovaAI from '../../components/NovaAI';
import VideoCallModal from '../../components/VideoCallModal';
import SimpleWebRTC from '../../components/SimpleWebRTC';
import { initSocket } from "../../socket";
import logger from '../../utils/logger';
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams
}
  from 'react-router-dom';

// THIS IS MAIN PAGE  

// Valid file extensions mapping
const VALID_EXTENSIONS = {
  '.js': 'javascript',
  '.py': 'python',
  '.java': 'java',
  '.cpp': 'cpp',
  '.c': 'c',
  '.rb': 'ruby',
  '.php': 'php',
  '.go': 'go',
  '.rs': 'rust',
  '.ts': 'typescript',
  '.html': 'html',
  '.css': 'css'
};

const EditorPage = () => {
  const socketRef = useRef(null);
  const codeRef = useRef(null);
  const location = useLocation();
  const { roomId } = useParams();
  const reactNavigator = useNavigate();
  const [clients, setClients] = useState([]);
  const [username, setUsername] = useState('');
  const [isUsernameSet, setIsUsernameSet] = useState(false);
  const [output, setOutput] = useState([]);
  const [show, setShow] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const saveTimeoutRef = useRef(null);
  
  // Multi-file state
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileError, setNewFileError] = useState('');
  
  // Video call states
  const [inVideoCall, setInVideoCall] = useState(false);
  const [videoCallParticipants, setVideoCallParticipants] = useState([]);
  const [showVideoCallInvite, setShowVideoCallInvite] = useState(false);
  const [videoCallInitiator, setVideoCallInitiator] = useState('');
  const [showVideoWindow, setShowVideoWindow] = useState(false);
  const [isVideoMinimized, setIsVideoMinimized] = useState(false);

  // View mode: 'code' or 'whiteboard'
  const [viewMode, setViewMode] = useState('code');

  // Nova AI state
  const [showNovaAI, setShowNovaAI] = useState(false);


  useEffect(() => {
    // Check if username exists in location.state or sessionStorage
    const storedUsername = sessionStorage.getItem(`username_${roomId}`);
    const currentUsername = location.state?.username || storedUsername;
    
    if (currentUsername) {
      setUsername(currentUsername);
      setIsUsernameSet(true);
      // Store in sessionStorage for page refreshes
      sessionStorage.setItem(`username_${roomId}`, currentUsername);
    } else {
      // If no username, redirect to password verification
      // This handles the case when someone directly accesses the editor URL
      reactNavigator(`/verify-password/${roomId}`);
    }
  }, [roomId, location.state, reactNavigator]);

  // Load files when username is set
  useEffect(() => {
    if (!isUsernameSet || !roomId) return;
    
    const loadFiles = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
        const response = await fetch(`${backendUrl}/api/rooms/${roomId}/files`);
        if (response.ok) {
          const data = await response.json();
          if (data.files && data.files.length > 0) {
            setFiles(data.files);
            setActiveFile(data.files[0]);
            codeRef.current = data.files[0].content;
            logger.log('Loaded files for room:', data.files.length);
          }
        }
      } catch (err) {
        logger.error('Failed to load files:', err);
      }
    };

    loadFiles();
  }, [isUsernameSet, roomId]);

  useEffect(() => {
    if (!isUsernameSet || !username) return;

    const init = async () => {
      socketRef.current = await initSocket();
      socketRef.current.on('connect_error', (err) => handleErrors(err));
      socketRef.current.on('connect_failed', (err) => handleErrors(err));

      function handleErrors(e) {
        logger.log('socket error', e);
        toast.error('Socket connection failed, try again later.');
        reactNavigator('/');
      }

      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: username,
      });


      // LIsting for joined event

      socketRef.current.on(
        ACTIONS.JOINED,
        ({ clients, username, socketId }) => {
          if (username !== location.state?.username) {
            toast.success(`${username} joined the room.`);
            logger.log(`${username} joined`);
          }
          // If Joined room person is show in your editor page
          setClients(clients);
          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            code: codeRef.current,
            socketId,
          });
        }
      );


      // Listining for disconnected


      socketRef.current.on(
        ACTIONS.DISCONNECTED,
        ({ socketId, username }) => {
          toast.success(`${username} left the room.`);
          setClients((prev) => {
            return prev.filter(
              (client) => client.socketId !== socketId
            );
          });
          // Remove from video call participants if they were in the call
          setVideoCallParticipants((prev) => prev.filter(p => p !== username));
        });

      // Video call event listeners
      socketRef.current.on(ACTIONS.VIDEO_CALL_INVITE, ({ initiator }) => {
        logger.log('📞 Received VIDEO_CALL_INVITE from:', initiator);
        setVideoCallInitiator(initiator);
        setShowVideoCallInvite(true);
      });

      socketRef.current.on(ACTIONS.VIDEO_CALL_RESPONSE, ({ username: respondent, accepted }) => {
        logger.log('📞 Received VIDEO_CALL_RESPONSE:', respondent, accepted);
        if (accepted) {
          setVideoCallParticipants((prev) => [...new Set([...prev, respondent])]);
          toast.success(`${respondent} joined the video call`);
        } else {
          toast(`${respondent} declined the video call`, { icon: '📵' });
        }
      });

      socketRef.current.on(ACTIONS.VIDEO_CALL_LEAVE, ({ username: leavingUser }) => {
        logger.log('👋 [VIDEO] Received VIDEO_CALL_LEAVE:', leavingUser);
        // Remove user from participants list
        setVideoCallParticipants((prev) => prev.filter(p => p !== leavingUser));
        toast(`${leavingUser} left the video call`, { icon: '👋' });
      });

      socketRef.current.on(ACTIONS.VIDEO_CALL_END, () => {
        setInVideoCall(false);
        setVideoCallParticipants([]);
        setShowVideoWindow(false);
        toast('Video call ended', { icon: '📞' });
      });
    };

    init();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.off(ACTIONS.JOINED);
        socketRef.current.off(ACTIONS.DISCONNECTED);
        socketRef.current.off(ACTIONS.VIDEO_CALL_INVITE);
        socketRef.current.off(ACTIONS.VIDEO_CALL_RESPONSE);
        socketRef.current.off(ACTIONS.VIDEO_CALL_END);
      }
    };
  }, [isUsernameSet, username, roomId]);

  // Save file content to backend (debounced)
  const saveFileToBackend = (content) => {
    if (!activeFile) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
        await fetch(`${backendUrl}/api/rooms/${roomId}/files/${encodeURIComponent(activeFile.name)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        });
        logger.log('File saved:', activeFile.name);
      } catch (err) {
        logger.error('Failed to save file:', err);
      }
    }, 2000);
  };

  // Create new file
  const createFile = async () => {
    const name = newFileName.trim();
    
    if (!name) {
      setNewFileError('File name is required');
      return;
    }
    
    if (!name.includes('.')) {
      setNewFileError('File extension is required (e.g., main.js)');
      return;
    }
    
    const ext = name.substring(name.lastIndexOf('.')).toLowerCase();
    if (!VALID_EXTENSIONS[ext]) {
      setNewFileError(`Invalid extension. Valid: ${Object.keys(VALID_EXTENSIONS).join(', ')}`);
      return;
    }
    
    // Save current file content before switching to new file
    if (activeFile && codeRef.current !== undefined) {
      const currentContent = codeRef.current;
      setFiles(prev => prev.map(f => 
        f.name === activeFile.name ? { ...f, content: currentContent } : f
      ));
      saveFileToBackend(currentContent);
    }
    
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
      const response = await fetch(`${backendUrl}/api/rooms/${roomId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setNewFileError(data.error || 'Failed to create file');
        return;
      }
      
      // Add new file to list and switch to it
      const newFile = data.file;
      setFiles(prev => [...prev, newFile]);
      setActiveFile(newFile);
      codeRef.current = '';
      setShowNewFileModal(false);
      setNewFileName('');
      setNewFileError('');
      toast.success(`Created ${name}`);
    } catch (err) {
      logger.error('Create file error:', err);
      setNewFileError('Failed to create file');
    }
  };

  // Delete file
  const deleteFile = async (fileName) => {
    if (files.length <= 1) {
      toast.error('Cannot delete the last file');
      return;
    }
    
    if (!window.confirm(`Delete ${fileName}?`)) return;
    
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
      const response = await fetch(`${backendUrl}/api/rooms/${roomId}/files/${encodeURIComponent(fileName)}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setFiles(prev => prev.filter(f => f.name !== fileName));
        if (activeFile?.name === fileName) {
          const remaining = files.filter(f => f.name !== fileName);
          setActiveFile(remaining[0] || null);
          codeRef.current = remaining[0]?.content || '';
        }
        toast.success(`Deleted ${fileName}`);
      }
    } catch (err) {
      logger.error('Delete file error:', err);
      toast.error('Failed to delete file');
    }
  };

  // Switch to a different file
  const switchFile = (file) => {
    if (activeFile?.name === file.name) return; // Already on this file
    
    // Save current file content to files array before switching
    if (activeFile && codeRef.current !== undefined) {
      const currentContent = codeRef.current;
      setFiles(prev => prev.map(f => 
        f.name === activeFile.name ? { ...f, content: currentContent } : f
      ));
      // Also save to backend
      saveFileToBackend(currentContent);
    }
    
    // Find the file from current files state to get latest content
    const targetFile = files.find(f => f.name === file.name) || file;
    setActiveFile(targetFile);
    codeRef.current = targetFile.content || '';
  };

  async function copyRoomId() {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success('Room ID has been copied to your clipboard');
    } catch (err) {
      toast.error('Could not copy the Room Id');
      logger.error(err);
    }
  }

  function leaveRoom() {
    // End video call if user is in one
    if (inVideoCall) {
      socketRef.current.emit(ACTIONS.VIDEO_CALL_END, { roomId });
    }
    reactNavigator('/');
  }

  const startVideoCall = async () => {
    if (inVideoCall) {
      toast.error('You are already in a video call');
      return;
    }

    try {
      logger.log('📞 Starting video call, emitting VIDEO_CALL_INVITE to room:', roomId);
      logger.log('📞 Socket connected:', socketRef.current.connected);
      logger.log('📞 Socket ID:', socketRef.current.id);
      
      // Notify all other members about the video call
      socketRef.current.emit(ACTIONS.VIDEO_CALL_INVITE, {
        roomId,
        initiator: username,
      });

      // Add self to participants
      setInVideoCall(true);
      setVideoCallParticipants([username]);
      setShowVideoWindow(true);

      // Broadcast that initiator accepted
      logger.log('📞 Emitting VIDEO_CALL_RESPONSE (accepted) for:', username);
      socketRef.current.emit(ACTIONS.VIDEO_CALL_RESPONSE, {
        roomId,
        username,
        accepted: true,
      });

      toast.success('Video call started!');
    } catch (error) {
      logger.error('Error starting video call:', error);
      toast.error('Failed to start video call');
    }
  };

  const handleAcceptVideoCall = () => {
    setShowVideoCallInvite(false);
    setInVideoCall(true);
    setVideoCallParticipants((prev) => [...new Set([...prev, username])]);
    setShowVideoWindow(true);

    // Notify others that you accepted
    socketRef.current.emit(ACTIONS.VIDEO_CALL_RESPONSE, {
      roomId,
      username,
      accepted: true,
    });

    toast.success('Joined video call!');
  };

  const handleDeclineVideoCall = () => {
    setShowVideoCallInvite(false);

    // Notify others that you declined
    socketRef.current.emit(ACTIONS.VIDEO_CALL_RESPONSE, {
      roomId,
      username,
      accepted: false,
    });
  };

  const leaveVideoCall = () => {
    // Individual user leaves the call
    logger.log('👋 [VIDEO] Leaving video call');
    
    // Clean up local state
    setInVideoCall(false);
    setVideoCallParticipants([]);
    setShowVideoWindow(false);
    
    // Notify others that this user left (not ending for everyone)
    socketRef.current.emit(ACTIONS.VIDEO_CALL_LEAVE, { 
      roomId, 
      username 
    });
    
    toast('You left the video call', { icon: '👋' });
  };

  const endVideoCall = () => {
    // End the call for everyone (host action)
    logger.log('📞 [VIDEO] Ending video call for everyone');
    
    // Clean up local state first
    setInVideoCall(false);
    setVideoCallParticipants([]);
    setShowVideoWindow(false);
    
    // Notify others that the call has ended for everyone
    socketRef.current.emit(ACTIONS.VIDEO_CALL_END, { roomId });
    
    toast('Video call ended for everyone', { icon: '📞' });
  };

  const runCode = async () => {
    const code = codeRef.current;
    if (!code) {
      toast.error('No code to execute');
      return;
    }

    if (!activeFile) {
      toast.error('No file selected');
      return;
    }

    setIsExecuting(true);
    setOutput({}); // Clear previous output

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/execute-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language: activeFile.language,
          stdin: '', // Can be extended to support user input
        }),
      });

      const result = await response.json();
      
      if (result.error && !result.success) {
        toast.error(result.error);
      } else if (result.success) {
        toast.success('Code executed successfully!');
      }

      setOutput(result);
    } catch (error) {
      logger.error('Execution error:', error);
      toast.error('Failed to execute code. Please try again.');
      setOutput({
        success: false,
        error: 'Failed to connect to execution server',
        stdout: null,
        stderr: null,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="editor-layout">
      {/* Video Call Invitation Modal */}
      {showVideoCallInvite && (
        <VideoCallModal
          initiator={videoCallInitiator}
          onAccept={handleAcceptVideoCall}
          onDecline={handleDeclineVideoCall}
        />
      )}

      {/* TOP NAVBAR */}
      <nav className="top-navbar">
        <div className="navbar-left">
          <img className="navbar-logo" src="/icon.png" alt="CodeView" />
          <span className="navbar-title">CodeView</span>
        </div>
        
        <div className="navbar-actions">
          {/* Copy Room ID */}
          <button className="navbar-icon-btn" onClick={copyRoomId} title="Copy Room ID">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
            </svg>
            <span className="tooltip">Copy Room ID</span>
          </button>

          {/* Video Call */}
          {!inVideoCall ? (
            <button className="navbar-icon-btn" onClick={startVideoCall} title="Start Video Call">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 7l-7 5 7 5V7z"></path>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
              </svg>
              <span className="tooltip">Video Call</span>
            </button>
          ) : (
            <button className="navbar-icon-btn navbar-icon-active" onClick={endVideoCall} title="End Call">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="1" y1="1" x2="23" y2="23"></line>
                <path d="M23 7l-7 5 7 5V7z"></path>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
              </svg>
              <span className="tooltip">End Call</span>
            </button>
          )}

          {/* Leave Room */}
          <button className="navbar-icon-btn navbar-icon-danger" onClick={leaveRoom} title="Leave Room">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span className="tooltip">Leave Room</span>
          </button>

          {/* Run Code */}
          <button className="navbar-icon-btn navbar-icon-run" onClick={runCode} title="Run Code" disabled={isExecuting}>
            {isExecuting ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21"></polygon>
              </svg>
            )}
            <span className="tooltip">{isExecuting ? 'Running...' : 'Run Code'}</span>
          </button>

          {/* Nova AI Button */}
          <button 
            className={`navbar-icon-btn ${showNovaAI ? 'active' : ''}`}
            onClick={() => setShowNovaAI(!showNovaAI)}
            title="Nova AI Assistant"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="url(#aiGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <defs>
                <linearGradient id="aiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"></path>
              <path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z"></path>
              <path d="M19 10l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5L17 12l1.5-.5.5-1.5z"></path>
            </svg>
            <span className="tooltip">Nova AI</span>
          </button>
        </div>

        <div className="navbar-right">
          {/* View Mode Toggle */}
          <div className="view-toggle">
            <button 
              className={`toggle-btn ${viewMode === 'code' ? 'active' : ''}`}
              onClick={() => setViewMode('code')}
              title="Code Editor"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16,18 22,12 16,6"></polyline>
                <polyline points="8,6 2,12 8,18"></polyline>
              </svg>
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'whiteboard' ? 'active' : ''}`}
              onClick={() => setViewMode('whiteboard')}
              title="Whiteboard"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                <path d="M2 2l7.586 7.586"></path>
              </svg>
            </button>
          </div>



          {activeFile && (
            <span className="active-file-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z"/>
              </svg>
              {activeFile.name}
            </span>
          )}
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <div className="main-content">
        {/* LEFT SIDEBAR - File Explorer */}
        <aside className="file-sidebar">
          <div className="file-explorer">
            <div className="explorer-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"></path>
              </svg>
              <span>FILES</span>
              <button 
                className="add-file-btn" 
                onClick={() => setShowNewFileModal(true)}
                title="New File"
              >
                +
              </button>
            </div>
            
            <div className="file-tree">
              {files.map((file) => (
                <div 
                  key={file.name}
                  className={`file-item file ${activeFile?.name === file.name ? 'active' : ''}`}
                  onClick={() => switchFile(file)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z"/>
                  </svg>
                  <span>{file.name}</span>
                  {files.length > 1 && (
                    <button 
                      className="delete-file-btn"
                      onClick={(e) => { e.stopPropagation(); deleteFile(file.name); }}
                      title="Delete"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Video Call Participants */}
            {videoCallParticipants.length > 0 && (
              <div className="video-call-section">
                <div className="explorer-header">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 7l-7 5 7 5V7z"></path>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                  </svg>
                  <span>IN CALL</span>
                </div>
                <div className="participants-list">
                  {videoCallParticipants.map((participant, index) => (
                    <div key={index} className="participant-item">
                      <span className="participant-dot"></span>
                      <span>{participant}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* New File Modal */}
          {showNewFileModal && (
            <div className="new-file-modal">
              <div className="modal-content">
                <h3>Create New File</h3>
                <input
                  type="text"
                  placeholder="filename.ext (e.g., app.py)"
                  value={newFileName}
                  onChange={(e) => {
                    setNewFileName(e.target.value);
                    setNewFileError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && createFile()}
                  autoFocus
                />
                {newFileError && <p className="error-text">{newFileError}</p>}
                <div className="modal-actions">
                  <button onClick={() => { setShowNewFileModal(false); setNewFileName(''); setNewFileError(''); }}>
                    Cancel
                  </button>
                  <button onClick={createFile} className="primary">Create</button>
                </div>
              </div>
            </div>
          )}

          {/* Connected Users - Bottom Left */}
          <div className="connected-users">
            <div className="users-header">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 00-3-3.87"></path>
                <path d="M16 3.13a4 4 0 010 7.75"></path>
              </svg>
              <span>{clients.length} online</span>
            </div>
            <div className="users-list">
              {clients.map((client) => (
                <div key={client.SocketId} className="user-item">
                  <div className="user-avatar-small">
                    {client.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="user-name-small">{client.username}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* EDITOR AREA */}
        <div className="editor-area">
          {viewMode === 'code' ? (
            <>
              {show && activeFile && (
                <Editor
                  key={activeFile.name}
                  socketRef={socketRef}
                  roomId={roomId}
                  initialCode={activeFile.content}
                  username={username}
                  language={activeFile.language}
                  onCodeChange={(code) => {
                    codeRef.current = code;
                    // Update local file state
                    setFiles(prev => prev.map(f => 
                      f.name === activeFile.name ? { ...f, content: code } : f
                    ));
                    saveFileToBackend(code);
                  }}
                />
              )}
              <Output output={output} isLoading={isExecuting} />
            </>
          ) : (
            <Whiteboard socketRef={socketRef} roomId={roomId} />
          )}

          {/* Draggable Floating Video Call Window */}
          {showVideoWindow && (
            <Draggable handle=".drag-handle" defaultPosition={{ x: 20, y: 20 }} cancel=".no-drag">
              <div 
                className={`video-window ${isVideoMinimized ? 'minimized' : ''}`}
              >
                <div className="drag-handle video-header">
                  <div className="video-header-left">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 7l-7 5 7 5V7z"></path>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                    </svg>
                    <span>Video Call</span>
                    <span className="live-dot"></span>
                  </div>
                  <div className="video-header-actions no-drag">
                    <button onClick={() => setIsVideoMinimized(!isVideoMinimized)}>
                      {isVideoMinimized ? '□' : '−'}
                    </button>
                    <button onClick={() => setShowVideoWindow(false)}>×</button>
                  </div>
                </div>
                {!isVideoMinimized && (
                  <div className="video-content">
                    <SimpleWebRTC
                      socketRef={socketRef}
                      roomId={roomId}
                      participants={clients}
                      onClose={leaveVideoCall}
                    />
                  </div>
                )}
              </div>
            </Draggable>
          )}
        </div>
      </div>

      {/* Nova AI Chat Panel */}
      <NovaAI 
        isOpen={showNovaAI}
        onClose={() => setShowNovaAI(false)}
        code={activeFile?.content || ''}
        language={activeFile?.language || 'javascript'}
      />
    </div>
  );
};

export default EditorPage;

