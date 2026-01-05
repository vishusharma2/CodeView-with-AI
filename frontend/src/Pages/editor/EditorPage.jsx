import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import Draggable from 'react-draggable';
import ACTIONS from "../../Actions";
import Client from '../../components/Client';
import Editor from '../../components/Editor';
import Output from '../../components/Output';
import VideoCallModal from '../../components/VideoCallModal';
import SimpleWebRTC from '../../components/SimpleWebRTC';
import { initSocket } from "../../socket";
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams
}
  from 'react-router-dom';

// THIS IS MAIN PAGE  

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
  const [language, setLanguage] = useState('javascript');
  const [isExecuting, setIsExecuting] = useState(false);
  
  
  // Video call states
  const [inVideoCall, setInVideoCall] = useState(false);
  const [videoCallParticipants, setVideoCallParticipants] = useState([]);
  const [showVideoCallInvite, setShowVideoCallInvite] = useState(false);
  const [videoCallInitiator, setVideoCallInitiator] = useState('');
  const [showVideoWindow, setShowVideoWindow] = useState(false);
  const [isVideoMinimized, setIsVideoMinimized] = useState(false);


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

  useEffect(() => {
    if (!isUsernameSet || !username) return;

    const init = async () => {
      socketRef.current = await initSocket();
      socketRef.current.on('connect_error', (err) => handleErrors(err));
      socketRef.current.on('connect_failed', (err) => handleErrors(err));

      function handleErrors(e) {
        console.log('socket error', e);
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
            console.log(`${username} joined`);
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
        console.log('📞 Received VIDEO_CALL_INVITE from:', initiator);
        setVideoCallInitiator(initiator);
        setShowVideoCallInvite(true);
      });

      socketRef.current.on(ACTIONS.VIDEO_CALL_RESPONSE, ({ username: respondent, accepted }) => {
        console.log('📞 Received VIDEO_CALL_RESPONSE:', respondent, accepted);
        if (accepted) {
          setVideoCallParticipants((prev) => [...new Set([...prev, respondent])]);
          toast.success(`${respondent} joined the video call`);
        } else {
          toast(`${respondent} declined the video call`, { icon: '📵' });
        }
      });

      socketRef.current.on(ACTIONS.VIDEO_CALL_LEAVE, ({ username: leavingUser }) => {
        console.log('👋 [VIDEO] Received VIDEO_CALL_LEAVE:', leavingUser);
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

  async function copyRoomId() {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success('Room ID has been copied to your clipboard');
    } catch (err) {
      toast.error('Could not copy the Room Id');
      console.error(err);
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
      console.log('📞 Starting video call, emitting VIDEO_CALL_INVITE to room:', roomId);
      console.log('📞 Socket connected:', socketRef.current.connected);
      console.log('📞 Socket ID:', socketRef.current.id);
      
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
      console.log('📞 Emitting VIDEO_CALL_RESPONSE (accepted) for:', username);
      socketRef.current.emit(ACTIONS.VIDEO_CALL_RESPONSE, {
        roomId,
        username,
        accepted: true,
      });

      toast.success('Video call started!');
    } catch (error) {
      console.error('Error starting video call:', error);
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
    console.log('👋 [VIDEO] Leaving video call');
    
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
    console.log('📞 [VIDEO] Ending video call for everyone');
    
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
          language,
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
      console.error('Execution error:', error);
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
    <div className="mainWrap">
      {/* Video Call Invitation Modal */}
      {showVideoCallInvite && (
        <VideoCallModal
          initiator={videoCallInitiator}
          onAccept={handleAcceptVideoCall}
          onDecline={handleDeclineVideoCall}
        />
      )}

      <div className="aside">
        <div className="asideInner">
          <div className="logo">
            <img
              className='logoImage'
              src="/code-view-logo1.png"
              alt="Logo"
            />
          </div>
          <h3>Connected</h3>
          <div className="clientsList">
            {clients.map((client) => (
              <Client
                key={client.SocketId}
                username={client.username} />
            ))}
          </div>

          {/* Video Call Participants Indicator */}
          {videoCallParticipants.length > 0 && (
            <div className="videoCallInfo">
              <h4 className="videoCallTitle">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 7l-7 5 7 5V7z"></path>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                </svg>
                In Video Call
              </h4>
              <div className="videoParticipantsList">
                {videoCallParticipants.map((participant, index) => (
                  <span key={index} className="videoParticipant">
                    {participant}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <button className='btn copyBtn' onClick={copyRoomId} >
          Copy ROOM ID
        </button>
        {/* Video Call Button */}
        {!inVideoCall ? (
          <button className='btn videoCallBtn neonBtnPurple' onClick={startVideoCall}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 7l-7 5 7 5V7z"></path>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
            <span className="btnText">Video Call</span>
          </button>
        ) : (
          <button className='btn videoCallBtn neonBtnRed' onClick={endVideoCall}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="1" y1="1" x2="23" y2="23"></line>
              <path d="M23 7l-7 5 7 5V7z"></path>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
            <span className="btnText">End Call</span>
          </button>
        )}
        <button className='btn leaveBtn' onClick={leaveRoom} >
          Leave
        </button>
        <button className='btn runBtn' onClick={runCode}>
          Run
        </button>
      </div>
      <div className="editorWrap">
        {
          show && <Editor
            socketRef={socketRef}
            roomId={roomId}
            onCodeChange={(code) => {
              codeRef.current = code;
            }}
            onLanguageChange={(newLanguage) => {
              setLanguage(newLanguage);
            }} />   
        }
        <Output output={output} isLoading={isExecuting} />

        {/* Draggable Floating Video Call Window */}
        {showVideoWindow && (
          <Draggable
            handle=".drag-handle"
            defaultPosition={{ x: 20, y: 20 }}
            cancel=".no-drag"
          >
            <div 
              className={`fixed z-50 bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 rounded-2xl shadow-2xl border-2 border-purple-500/50 overflow-hidden ${
                isVideoMinimized ? 'w-80 h-16' : 'w-[600px] h-[450px]'
              }`}
              style={{
                boxShadow: '0 0 60px rgba(168, 85, 247, 0.3), 0 0 100px rgba(0, 255, 255, 0.2)',
              }}
            >
              {/* Draggable Header */}
              <div className="drag-handle bg-gradient-to-r from-purple-900/80 to-purple-800/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between border-b border-purple-500/30 cursor-move select-none">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="text-white font-bold text-sm tracking-wide uppercase">
                    Video Call
                  </span>
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                </div>
                <div className="flex items-center gap-2 no-drag">
                  <button 
                    className="w-8 h-8 rounded-lg bg-purple-700/50 hover:bg-purple-600 text-white flex items-center justify-center transition-all transform hover:scale-110"
                    onClick={() => setIsVideoMinimized(!isVideoMinimized)}
                    title={isVideoMinimized ? "Maximize" : "Minimize"}
                  >
                    {isVideoMinimized ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    )}
                  </button>
                  <button 
                    className="w-8 h-8 rounded-lg bg-red-600/50 hover:bg-red-600 text-white flex items-center justify-center transition-all transform hover:scale-110"
                    onClick={() => setShowVideoWindow(false)}
                    title="Close (call continues)"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Video Content */}
              {!isVideoMinimized && (
                <div className="h-[calc(100%-52px)]">
                  {console.log('🎥 Rendering SimpleWebRTC with clients:', clients)}
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
  );
};

export default EditorPage;

