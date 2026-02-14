import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
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
import { useTheme } from '../../context/ThemeContext';
import {
  CopyIcon,
  VideoCameraIcon,
  VideoOffIcon,
  LogoutIcon,
  SpinnerIcon,
  PlayIcon,
  SparklesIcon,
  SunIcon,
  MoonIcon,
  CodeIcon,
  PencilIcon,
  FileIcon,
  FolderIcon,
  UsersIcon,
  PhoneEndIcon,
  DownloadIcon,
} from '../../icons';
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
  const { theme, toggleTheme } = useTheme();
  const socketRef = useRef(null);
  const codeRef = useRef(null);
  const location = useLocation();
  const { roomId } = useParams();
  const reactNavigator = useNavigate();
  const [clients, setClients] = useState([]);
  const [username, setUsername] = useState('');
  const [isUsernameSet, setIsUsernameSet] = useState(false);
  const [output, setOutput] = useState([]);
  const [htmlPreview, setHtmlPreview] = useState(null);
  const [show, setShow] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const saveTimeoutRef = useRef(null);
  
  // Multi-file state
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const activeFileRef = useRef(null); // Track active file for socket listeners
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileError, setNewFileError] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const fileInputRef = useRef(null);

  // Sync activeFileRef
  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

  // Close add-file dropdown on click outside
  useEffect(() => {
    if (!showAddMenu) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest('.add-file-dropdown')) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAddMenu]);
  
  // Video call states
  const [inVideoCall, setInVideoCall] = useState(false);
  const [videoCallParticipants, setVideoCallParticipants] = useState([]);
  const [showVideoCallInvite, setShowVideoCallInvite] = useState(false);
  const [videoCallInitiator, setVideoCallInitiator] = useState('');
  const [isVideoCallHost, setIsVideoCallHost] = useState(false);
  const [showVideoWindow, setShowVideoWindow] = useState(false);
  const [isVideoMinimized, setIsVideoMinimized] = useState(false);
  
  // Rejoin permission states
  const [hasLeftCall, setHasLeftCall] = useState(false);
  const [rejoinAttempts, setRejoinAttempts] = useState(0);
  const [showRejoinRequest, setShowRejoinRequest] = useState(false);
  const [rejoinRequester, setRejoinRequester] = useState('');
  const [waitingForRejoinApproval, setWaitingForRejoinApproval] = useState(false);

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
        
        // If user is blocked from rejoining (3+ failed attempts), auto-decline
        if (rejoinAttempts >= 3) {
          logger.log('🚫 [BLOCKED] Auto-declining invite - user is blocked from this call');
          socketRef.current.emit(ACTIONS.VIDEO_CALL_RESPONSE, {
            roomId,
            username,
            accepted: false,
          });
          toast.error('You are blocked from this call after 3 denied rejoin attempts');
          return;
        }
        
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
        logger.log('👋 [VIDEO] Current participants before removal:', videoCallParticipants);
        // Remove user from participants list
        setVideoCallParticipants((prev) => {
          const updated = prev.filter(p => p !== leavingUser);
          logger.log('👋 [VIDEO] Participants after removal:', updated);
          return updated;
        });
        toast(`${leavingUser} left the video call`, { icon: '👋' });
      });

      socketRef.current.on(ACTIONS.VIDEO_CALL_END, () => {
        setInVideoCall(false);
        setIsVideoCallHost(false);
        setVideoCallParticipants([]);
        setShowVideoWindow(false);
        setHasLeftCall(false);
        setRejoinAttempts(0);
        setWaitingForRejoinApproval(false);
        toast('Video call ended', { icon: '📞' });
      });

      // Listen for rejoin requests (host only)
      socketRef.current.on(ACTIONS.VIDEO_CALL_REJOIN_REQUEST, ({ requester }) => {
        logger.log('📞 [REJOIN] Received rejoin request from:', requester);
        logger.log('📞 [REJOIN] Current username:', username);
        logger.log('📞 [REJOIN] inVideoCall:', inVideoCall);
        logger.log('📞 [REJOIN] isVideoCallHost:', isVideoCallHost);
        // Only show modal if you're not the requester
        if (requester !== username) {
          logger.log('📞 [REJOIN] Showing rejoin modal for requester:', requester);
          setRejoinRequester(requester);
          setShowRejoinRequest(true);
          toast(`${requester} wants to rejoin the call`, { icon: '🔔' });
        }
      });

      // Listen for rejoin response (requester only)
      socketRef.current.on(ACTIONS.VIDEO_CALL_REJOIN_RESPONSE, ({ requester, approved }) => {
        logger.log('📞 [REJOIN] Received rejoin response:', requester, approved);
        if (requester === username) {
          setWaitingForRejoinApproval(false);
          if (approved) {
            // Join the call as a participant
            setInVideoCall(true);
            setIsVideoCallHost(false);
            setShowVideoWindow(true);
            setHasLeftCall(false);
            setRejoinAttempts(0);
            setVideoCallParticipants((prev) => [...new Set([...prev, username])]);
            socketRef.current.emit(ACTIONS.VIDEO_CALL_RESPONSE, {
              roomId,
              username,
              accepted: true,
            });
            toast.success('Rejoin request approved!');
          } else {
            // Increment attempt counter and keep hasLeftCall true
            setRejoinAttempts((prev) => {
              const newAttempts = prev + 1;
              if (newAttempts >= 3) {
                toast.error('Rejoin request denied. Maximum attempts reached - you are blocked from rejoining.');
                setHasLeftCall(false);
              } else {
                toast.error(`Rejoin request denied by host (${newAttempts}/3 attempts)`);
              }
              return newAttempts;
            });
          }
        }
      });

      // File sync event listeners
      socketRef.current.on(ACTIONS.FILE_CREATE, ({ file }) => {
        logger.log('📁 Received FILE_CREATE:', file.name);
        setFiles((prev) => {
          // Avoid duplicates
          if (prev.some(f => f.name === file.name)) return prev;
          return [...prev, file];
        });
        toast.success(`${file.name} was created by another user`);
      });

      socketRef.current.on(ACTIONS.FILE_DELETE, ({ fileName }) => {
        logger.log('🗑️ Received FILE_DELETE:', fileName);
        setFiles((prev) => prev.filter(f => f.name !== fileName));
        // If the deleted file was active, switch to first available file
        setActiveFile((prevActive) => {
          if (prevActive?.name === fileName) {
            setFiles((prevFiles) => {
              const remaining = prevFiles.filter(f => f.name !== fileName);
              if (remaining.length > 0) {
                codeRef.current = remaining[0].content || '';
                return remaining;
              }
              return prevFiles;
            });
            return null; // Will be updated by the setFiles callback
          }
          return prevActive;
        });
        toast(`${fileName} was deleted by another user`, { icon: '🗑️' });
      });

      // Listen for code changes to update files state (for non-active files)
      socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code, fileName: changedFileName }) => {
        if (!changedFileName) return;
        
        // precise-sync: Update codeRef if this is the active file
        // This ensures that if the user switches files, we have the latest content for the current file
        // stored in codeRef, so it can be correctly saved to the files array during the switch.
        if (activeFileRef.current && activeFileRef.current.name === changedFileName) {
          codeRef.current = code;
        }

        // Update the files state with the new content
        setFiles((prev) => prev.map(f => 
          f.name === changedFileName ? { ...f, content: code } : f
        ));
      });

      // Listen for code output from other users
      socketRef.current.on(ACTIONS.CODE_OUTPUT, ({ output, executedBy, fileName }) => {
        logger.log(`▶️ Received code output from ${executedBy} for ${fileName}`);
        if (output && output.htmlPreview) {
          setHtmlPreview(output.htmlPreview);
          setOutput({});
        } else {
          setHtmlPreview(null);
          setOutput(output);
        }
        toast(`${executedBy} ran ${fileName}`, { icon: '▶️' });
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
        socketRef.current.off(ACTIONS.FILE_CREATE);
        socketRef.current.off(ACTIONS.FILE_DELETE);
        socketRef.current.off(ACTIONS.CODE_CHANGE);
        socketRef.current.off(ACTIONS.CODE_OUTPUT);
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
      
      // Broadcast file creation to other users
      if (socketRef.current) {
        socketRef.current.emit(ACTIONS.FILE_CREATE, { roomId, file: newFile });
      }
      
      toast.success(`Created ${name}`);
    } catch (err) {
      logger.error('Create file error:', err);
      setNewFileError('Failed to create file');
    }
  };

  // Upload file
  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const name = file.name;
    const ext = name.substring(name.lastIndexOf('.')).toLowerCase();

    if (!VALID_EXTENSIONS[ext]) {
      toast.error(`Invalid file type. Allowed: ${Object.keys(VALID_EXTENSIONS).join(', ')}`);
      e.target.value = '';
      return;
    }

    // Check if file already exists
    if (files.some(f => f.name === name)) {
      toast.error(`File "${name}" already exists`);
      e.target.value = '';
      return;
    }

    // Save current file content before switching
    if (activeFile && codeRef.current !== undefined) {
      const currentContent = codeRef.current;
      setFiles(prev => prev.map(f => 
        f.name === activeFile.name ? { ...f, content: currentContent } : f
      ));
      saveFileToBackend(currentContent);
    }

    // Read file content
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target.result;
      const language = VALID_EXTENSIONS[ext];

      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
        const response = await fetch(`${backendUrl}/api/rooms/${roomId}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });

        const data = await response.json();
        if (!response.ok) {
          toast.error(data.error || 'Failed to upload file');
          return;
        }

        // Save content to backend
        await fetch(`${backendUrl}/api/rooms/${roomId}/files/${encodeURIComponent(name)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        });

        const newFile = { name, content, language };
        setFiles(prev => [...prev, newFile]);
        setActiveFile(newFile);
        codeRef.current = content;

        // Broadcast file creation
        if (socketRef.current) {
          socketRef.current.emit(ACTIONS.FILE_CREATE, { roomId, file: newFile });
        }

        toast.success(`Uploaded ${name}`);
      } catch (err) {
        logger.error('Upload file error:', err);
        toast.error('Failed to upload file');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
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
        
        // Broadcast file deletion to other users
        if (socketRef.current) {
          socketRef.current.emit(ACTIONS.FILE_DELETE, { roomId, fileName });
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

  // Switch view mode (code/whiteboard) while preserving code
  const switchViewMode = (mode) => {
    // Save current code before switching views
    if (viewMode === 'code' && activeFile && codeRef.current !== undefined) {
      const currentContent = codeRef.current;
      // Update files array with current content
      setFiles(prev => prev.map(f => 
        f.name === activeFile.name ? { ...f, content: currentContent } : f
      ));
      // Update activeFile with current content
      setActiveFile(prev => prev ? { ...prev, content: currentContent } : prev);
      // Save to backend
      saveFileToBackend(currentContent);
    }
    setViewMode(mode);
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

  async function downloadFiles() {
    if (!files || files.length === 0) {
      toast.error('No files to download');
      return;
    }
    try {
      const zip = new JSZip();
      files.forEach(file => {
        zip.file(file.name, file.content || '');
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `codeview-${roomId}.zip`);
      toast.success('Files downloaded successfully');
    } catch (err) {
      toast.error('Failed to create ZIP');
      logger.error(err);
    }
  }

  function leaveRoom() {
    // Leave video call if user is in one (only disconnect self, not everyone)
    if (inVideoCall) {
      socketRef.current.emit(ACTIONS.VIDEO_CALL_LEAVE, { roomId, username });
    }
    reactNavigator('/');
  }

  const startVideoCall = async () => {
    if (inVideoCall) {
      toast.error('You are already in a video call');
      return;
    }

    // Check if user has left the call and there are participants (call is ongoing)
    if (hasLeftCall && videoCallParticipants.length > 0) {
      // Check if user is blocked from rejoining (3 failed attempts)
      if (rejoinAttempts >= 3) {
        toast.error('You are blocked from rejoining this call. Please wait for the call to end.');
        return;
      }
      
      // Request to rejoin instead of starting new call
      logger.log('📞 [REJOIN] Requesting to rejoin call');
      socketRef.current.emit(ACTIONS.VIDEO_CALL_REJOIN_REQUEST, {
        roomId,
        requester: username,
      });
      setWaitingForRejoinApproval(true);
      toast('Requesting permission from host...', { icon: '⏳' });
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

      // Add self to participants and set as host
      setInVideoCall(true);
      setIsVideoCallHost(true);
      setHasLeftCall(false);
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
    setIsVideoCallHost(false);
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
    
    // Track that user declined - they need to request permission to join now
    setHasLeftCall(true);
    // Keep track of who's in the call (at least the initiator)
    setVideoCallParticipants([videoCallInitiator]);

    // Notify others that you declined
    socketRef.current.emit(ACTIONS.VIDEO_CALL_RESPONSE, {
      roomId,
      username,
      accepted: false,
    });
    
    toast('You declined the video call', { icon: '👋' });
  };

  const leaveVideoCall = () => {
    // Individual user leaves the call
    logger.log('👋 [VIDEO] Leaving video call');
    logger.log('👋 [VIDEO] Current participants:', videoCallParticipants);
    
    // Check if this is the last person in the call
    const isLastPerson = videoCallParticipants.length <= 1;
    
    // Clean up local state but keep participants list to know call is active
    setInVideoCall(false);
    setIsVideoCallHost(false);
    setShowVideoWindow(false);
    setHasLeftCall(true);
    
    // Remove self from participants list (keep others so we know call is active)
    setVideoCallParticipants((prev) => prev.filter(p => p !== username));
    
    if (isLastPerson) {
      // Last person leaving - end the call for everyone
      logger.log('📞 [VIDEO] Last person leaving - ending call for everyone');
      socketRef.current.emit(ACTIONS.VIDEO_CALL_END, { roomId });
      toast('You left the video call (call ended)', { icon: '📞' });
    } else {
      // Not the last person - just notify others that this user left
      socketRef.current.emit(ACTIONS.VIDEO_CALL_LEAVE, { 
        roomId, 
        username 
      });
      toast('You left the video call', { icon: '👋' });
    }
  };

  const endVideoCall = () => {
    // End the call for everyone (host action)
    logger.log('📞 [VIDEO] Ending video call for everyone');
    
    // Clean up local state first
    setInVideoCall(false);
    setIsVideoCallHost(false);
    setVideoCallParticipants([]);
    setShowVideoWindow(false);
    
    // Notify others that the call has ended for everyone
    socketRef.current.emit(ACTIONS.VIDEO_CALL_END, { roomId });
    
    toast('Video call ended for everyone', { icon: '📞' });
  };

  const handleApproveRejoin = () => {
    logger.log('✅ [REJOIN] Approving rejoin request from:', rejoinRequester);
    socketRef.current.emit(ACTIONS.VIDEO_CALL_REJOIN_RESPONSE, {
      roomId,
      requester: rejoinRequester,
      approved: true,
    });
    setShowRejoinRequest(false);
    setRejoinRequester('');
    toast.success(`${rejoinRequester} approved to rejoin`);
  };

  const handleDenyRejoin = () => {
    logger.log('🚫 [REJOIN] Denying rejoin request from:', rejoinRequester);
    socketRef.current.emit(ACTIONS.VIDEO_CALL_REJOIN_RESPONSE, {
      roomId,
      requester: rejoinRequester,
      approved: false,
    });
    setShowRejoinRequest(false);
    setRejoinRequester('');
    toast(`Denied ${rejoinRequester}'s rejoin request`, { icon: '🚫' });
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

    // Handle HTML files — render in iframe instead of Judge0
    if (activeFile.language === 'html') {
      setHtmlPreview(null); // Clear first
      setOutput({});

      // Collect CSS from other files in the room
      const cssFiles = files.filter(f => f.name.endsWith('.css'));
      let combinedCSS = cssFiles.map(f => f.content || '').join('\n');

      // Inject CSS into HTML if not already linked
      let htmlContent = code;
      if (combinedCSS && !htmlContent.includes('<style')) {
        htmlContent = htmlContent.replace(
          '</head>',
          `<style>${combinedCSS}</style></head>`
        );
        // If no <head>, prepend the style
        if (!htmlContent.includes('<head')) {
          htmlContent = `<style>${combinedCSS}</style>${htmlContent}`;
        }
      }

      setHtmlPreview(htmlContent);
      toast.success('HTML rendered!');

      // Broadcast to other users
      if (socketRef.current) {
        socketRef.current.emit(ACTIONS.CODE_OUTPUT, {
          roomId,
          output: { success: true, htmlPreview: htmlContent, executedBy: username },
          executedBy: username,
          fileName: activeFile.name
        });
      }
      return;
    }

    setHtmlPreview(null); // Clear HTML preview for non-HTML files
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

      // Add executedBy info
      const outputWithUser = { ...result, executedBy: username };
      setOutput(outputWithUser);

      // Broadcast output to other users in the room
      if (socketRef.current) {
        socketRef.current.emit(ACTIONS.CODE_OUTPUT, {
          roomId,
          output: outputWithUser,
          executedBy: username,
          fileName: activeFile.name
        });
      }
    } catch (error) {
      logger.error('Execution error:', error);
      toast.error('Failed to execute code. Please try again.');
      const errorOutput = {
        success: false,
        error: 'Failed to connect to execution server',
        stdout: null,
        stderr: null,
        executedBy: username
      };
      setOutput(errorOutput);
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

      {/* Rejoin Request Modal (Host Only) */}
      {showRejoinRequest && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: '16px',
            padding: '32px',
            width: '400px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '16px',
              }}>🔔</div>
              <h3 style={{
                color: 'white',
                fontSize: '20px',
                fontWeight: '600',
                marginBottom: '8px',
              }}>Rejoin Request</h3>
              <p style={{
                color: '#94a3b8',
                fontSize: '15px',
              }}>
                <strong style={{ color: '#06b6d4' }}>{rejoinRequester}</strong> wants to rejoin the call
              </p>
            </div>
            <div style={{
              display: 'flex',
              gap: '12px',
            }}>
              <button
                onClick={handleDenyRejoin}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
              >
                Deny
              </button>
              <button
                onClick={handleApproveRejoin}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  background: '#10b981',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
              >
                Approve
              </button>
            </div>
          </div>
        </div>
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
            <CopyIcon />
            <span className="tooltip">Copy Room ID</span>
          </button>

          {/* Video Call */}
          {!inVideoCall ? (
            <button 
              className={`navbar-icon-btn ${rejoinAttempts >= 3 ? 'disabled' : ''}`}
              onClick={startVideoCall}
              disabled={rejoinAttempts >= 3}
              title={rejoinAttempts >= 3 ? "Blocked from call (3 denied attempts)" : "Start Video Call"}
              style={rejoinAttempts >= 3 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              <VideoCameraIcon />
              <span className="tooltip">{rejoinAttempts >= 3 ? 'Blocked (3 attempts)' : 'Video Call'}</span>
            </button>
          ) : (
            <button className="navbar-icon-btn navbar-icon-active" onClick={isVideoCallHost ? endVideoCall : leaveVideoCall} title={isVideoCallHost ? "End Call (All)" : "Leave Call"}>
              <VideoOffIcon />
              <span className="tooltip">{isVideoCallHost ? 'End Call (All)' : 'Leave Call'}</span>
            </button>
          )}

          {/* Leave Room */}
          <button className="navbar-icon-btn navbar-icon-danger" onClick={leaveRoom} title="Leave Room">
            <LogoutIcon />
            <span className="tooltip">Leave Room</span>
          </button>

          {/* Run Code */}
          <button className="navbar-icon-btn navbar-icon-run" onClick={runCode} title="Run Code" disabled={isExecuting}>
            {isExecuting ? (
              <SpinnerIcon />
            ) : (
              <PlayIcon />
            )}
            <span className="tooltip">{isExecuting ? 'Running...' : 'Run Code'}</span>
          </button>

          {/* Nova AI Button */}
          <button 
            className={`navbar-icon-btn ${showNovaAI ? 'active' : ''}`}
            onClick={() => setShowNovaAI(!showNovaAI)}
            title="Nova AI Assistant"
          >
            <SparklesIcon />
            <span className="tooltip">Nova AI</span>
          </button>

          {/* Theme Toggle */}
          <button 
            className="navbar-icon-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <SunIcon />
            ) : (
              <MoonIcon />
            )}
            <span className="tooltip">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>

        <div className="navbar-right">
          {/* View Mode Toggle */}
          <div className="view-toggle">
            <button 
              className={`toggle-btn ${viewMode === 'code' ? 'active' : ''}`}
              onClick={() => switchViewMode('code')}
              title="Code Editor"
            >
              <CodeIcon />
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'whiteboard' ? 'active' : ''}`}
              onClick={() => switchViewMode('whiteboard')}
              title="Whiteboard"
            >
              <PencilIcon />
            </button>
          </div>



          {activeFile && (
            <span className="active-file-badge">
              <FileIcon />
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
              <FolderIcon />
              <span>FILES</span>
              <div className="explorer-actions">
                <button 
                  className="download-file-btn" 
                  onClick={downloadFiles}
                  title="Download All Files"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
                <div className="add-file-dropdown">
                  <button 
                    className="add-file-btn" 
                    onClick={() => setShowAddMenu(!showAddMenu)}
                    title="Add File"
                  >
                    +
                  </button>
                  {showAddMenu && (
                    <div className="add-file-menu">
                      <button onClick={() => { setShowAddMenu(false); setShowNewFileModal(true); }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="12" y1="18" x2="12" y2="12" />
                          <line x1="9" y1="15" x2="15" y2="15" />
                        </svg>
                        New File
                      </button>
                      <button onClick={() => { setShowAddMenu(false); fileInputRef.current?.click(); }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        Upload File
                      </button>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".js,.py,.java,.cpp,.c,.rb,.php,.go,.rs,.ts,.html,.css"
                  style={{ display: 'none' }}
                  onChange={uploadFile}
                />
              </div>
            </div>
            
            <div className="file-tree">
              {files.map((file) => (
                <div 
                  key={file.name}
                  className={`file-item file ${activeFile?.name === file.name ? 'active' : ''}`}
                  onClick={() => switchFile(file)}
                >
                  <FileIcon />
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
                  <VideoCameraIcon size={14} />
                  <span>IN CALL {isVideoCallHost && '(Host)'}</span>
                </div>
                <div className="participants-list">
                  {videoCallParticipants.map((participant, index) => (
                    <div key={index} className="participant-item">
                      <span className="participant-dot"></span>
                      <span>{participant}{participant === videoCallInitiator && ' (Host)'}</span>
                    </div>
                  ))}
                </div>
                {/* Call Control Buttons */}
                {inVideoCall && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 8px' }}>
                    <button 
                      onClick={leaveVideoCall}
                      title="Leave the call (only you)"
                      style={{
                        padding: '8px 12px',
                        background: '#f59e0b',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#d97706'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#f59e0b'}
                    >
                      <PhoneEndIcon />
                      Leave Call
                    </button>
                    {isVideoCallHost && (
                      <button 
                        onClick={endVideoCall}
                        title="End the call for everyone"
                        style={{
                          padding: '8px 12px',
                          background: '#ef4444',
                          border: 'none',
                          borderRadius: '6px',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
                      >
                        <VideoOffIcon size={14} />
                        End Call (All)
                      </button>
                    )}
                  </div>
                )}
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
              <UsersIcon />
              <span>{clients.length} online</span>
            </div>
            <div className="users-list">
              {clients.map((client) => (
                <div key={client.socketId} className="user-item">
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
                  fileName={activeFile.name}
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
              <Output output={output} isLoading={isExecuting} htmlPreview={htmlPreview} />
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
                    <VideoCameraIcon size={16} />
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

