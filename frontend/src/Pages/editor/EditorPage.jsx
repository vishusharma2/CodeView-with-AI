import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
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
    }
  }, [roomId, location.state]);

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

  const endVideoCall = () => {
    // Clean up local state first
    setInVideoCall(false);
    setVideoCallParticipants([]);
    setShowVideoWindow(false);
    
    // Notify others that the call has ended
    socketRef.current.emit(ACTIONS.VIDEO_CALL_END, { roomId });
    
    toast('Video call ended', { icon: '📞' });
  };

  const runCode = () => {
    const code = codeRef.current;
    if (!code) return;

    const newOutput = [];
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      newOutput.push({ text: args.join(' '), isError: false });
      originalLog(...args);
    };

    console.error = (...args) => {
      newOutput.push({ text: args.join(' '), isError: true });
      originalError(...args);
    };

    console.warn = (...args) => {
      newOutput.push({ text: args.join(' '), isError: false });
      originalWarn(...args);
    };

    try {
      // eslint-disable-next-line no-new-func
      new Function(code)();
    } catch (error) {
      newOutput.push({ text: error.toString(), isError: true });
    } finally {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      setOutput(newOutput);
    }
  };

  const handleUsernameSubmit = () => {
    if (!username.trim()) {
      toast.error('Please enter a username');
      return;
    }
    sessionStorage.setItem(`username_${roomId}`, username);
    setIsUsernameSet(true);
  };

  const handleUsernameKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleUsernameSubmit();
    }
  };

  // Show username prompt if not set
  if (!isUsernameSet) {
    return (
      <div className="homePageWrapper">
        <div className="formWrapper">
          <img
            className='homePageLogo'
            src="/code-view-logo1.png"
            alt="Logo"
          />
          <h4 className='mainLabel'>Enter your username to join room</h4>
          <div className="inputGroup">
            <input
              type="text"
              className="inputBox"
              placeholder='USERNAME'
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={handleUsernameKeyPress}
              autoFocus
            />
            <button
              onClick={handleUsernameSubmit}
              className="btn joinBtn"
            >
              Join Room
            </button>
            <button
              onClick={() => reactNavigator('/')}
              className="btn leaveBtn"
              style={{ marginTop: '10px' }}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            }} />   
        }
        <Output output={output} />

        {/* Floating Video Call Window */}
        {showVideoWindow && (
          <div className={`videoCallWindow ${isVideoMinimized ? 'minimized' : ''}`}>
            <div className="videoCallHeader">
              <span className="videoCallHeaderTitle">Video Call</span>
              <div className="videoCallControls">
                <button 
                  className="videoControlBtn"
                  onClick={() => setIsVideoMinimized(!isVideoMinimized)}
                  title={isVideoMinimized ? "Maximize" : "Minimize"}
                >
                  {isVideoMinimized ? '□' : '_'}
                </button>
                <button 
                  className="videoControlBtn closeBtn"
                  onClick={() => setShowVideoWindow(false)}
                  title="Close (call continues)"
                >
                  ×
                </button>
              </div>
            </div>
            {!isVideoMinimized && (
              <>
                {console.log('🎥 Rendering SimpleWebRTC with clients:', clients)}
                <SimpleWebRTC
                  socketRef={socketRef}
                  roomId={roomId}
                  participants={clients}
                  onClose={endVideoCall}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorPage;