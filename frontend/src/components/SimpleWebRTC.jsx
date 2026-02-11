import React, { useEffect, useRef, useState } from 'react';
import ACTIONS from '../Actions';
import logger from '../utils/logger';
import { MicOnIcon, MicOffIcon, VideoOnIcon, CancelIcon, PhoneEndIcon } from '../icons';

const SimpleWebRTC = ({ socketRef, roomId, participants, onClose }) => {
  const localVideoRef = useRef(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const peerConnectionsRef = useRef({});
  const localStreamRef = useRef(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  // ICE servers configuration (using free STUN servers)
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  useEffect(() => {
    initializeMedia();

    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (!socketRef.current) return;

    // Listen for WebRTC signaling events
    socketRef.current.on(ACTIONS.WEBRTC_OFFER, handleReceiveOffer);
    socketRef.current.on(ACTIONS.WEBRTC_ANSWER, handleReceiveAnswer);
    socketRef.current.on(ACTIONS.WEBRTC_ICE_CANDIDATE, handleReceiveIceCandidate);
    
    // Listen for when participants leave
    socketRef.current.on(ACTIONS.VIDEO_CALL_LEAVE, ({ username }) => {
      logger.log('👋 [SimpleWebRTC] Participant left:', username);
      setRemoteStreams(prev => {
        const updated = { ...prev };
        const socketIdToRemove = Object.keys(updated).find(socketId => updated[socketId].username === username);
        if (socketIdToRemove) {
          logger.log('👋 [SimpleWebRTC] Removing remote stream for:', username);
          delete updated[socketIdToRemove];
          if (peerConnectionsRef.current[socketIdToRemove]) {
            peerConnectionsRef.current[socketIdToRemove].close();
            delete peerConnectionsRef.current[socketIdToRemove];
          }
        }
        return updated;
      });
    });

    return () => {
      socketRef.current.off(ACTIONS.WEBRTC_OFFER, handleReceiveOffer);
      socketRef.current.off(ACTIONS.WEBRTC_ANSWER, handleReceiveAnswer);
      socketRef.current.off(ACTIONS.WEBRTC_ICE_CANDIDATE, handleReceiveIceCandidate);
      socketRef.current.off(ACTIONS.VIDEO_CALL_LEAVE);
    };
  }, [socketRef.current]);

  const initializeMedia = async () => {
    try {
      logger.log('🎥 [WebRTC] Requesting camera/microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      logger.log('🎥 [WebRTC] Media access granted, stream:', stream.id);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        logger.log('🎥 [WebRTC] Local video element updated');
      }

      // Create peer connections for each participant
      logger.log('🎥 [WebRTC] Creating peer connections for participants:', participants.length);
      logger.log('🎥 [WebRTC] My socket ID:', socketRef.current.id);
      participants.forEach((participant) => {
        logger.log('🎥 [WebRTC] Checking participant:', participant);
        // Only create connection if it's not the current user
        if (participant.socketId && participant.socketId !== socketRef.current.id) {
          logger.log('🎥 [WebRTC] Creating peer connection for:', participant.username, participant.socketId);
          createPeerConnection(participant.socketId, participant.username);
        } else {
          logger.log('🎥 [WebRTC] Skipping self:', participant.socketId === socketRef.current.id ? 'MATCH' : 'NO SOCKET ID');
        }
      });
    } catch (error) {
      logger.error('🎥 [WebRTC] Error accessing media devices:', error);
      alert('Could not access camera/microphone. Please check permissions.');
    }
  };

  const createPeerConnection = (targetSocketId, username) => {
    if (peerConnectionsRef.current[targetSocketId]) {
      logger.log('🎥 [WebRTC] Peer connection already exists for:', targetSocketId);
      return;
    }

    logger.log('🎥 [WebRTC] Creating new RTCPeerConnection for:', targetSocketId);
    const peerConnection = new RTCPeerConnection(iceServers);
    peerConnectionsRef.current[targetSocketId] = peerConnection;

    // Add local stream tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStreamRef.current);
        logger.log('🎥 [WebRTC] Added track to peer connection:', track.kind);
      });
    }

    // Handle incoming remote stream
    peerConnection.ontrack = (event) => {
      logger.log('🎥 [WebRTC] Received remote track from:', targetSocketId);
      const remoteStream = event.streams[0];
      
      setRemoteStreams(prev => ({
        ...prev,
        [targetSocketId]: {
          stream: remoteStream,
          username: username || targetSocketId
        }
      }));
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        logger.log('🎥 [WebRTC] Sending ICE candidate to:', targetSocketId);
        socketRef.current.emit(ACTIONS.WEBRTC_ICE_CANDIDATE, {
          roomId,
          candidate: event.candidate,
          targetSocketId,
        });
      }
    };

    // Create and send offer
    createAndSendOffer(peerConnection, targetSocketId);
  };

  const createAndSendOffer = async (peerConnection, targetSocketId) => {
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socketRef.current.emit(ACTIONS.WEBRTC_OFFER, {
        roomId,
        offer,
        targetSocketId,
      });
    } catch (error) {
      logger.error('Error creating offer:', error);
    }
  };

  const handleReceiveOffer = async ({ offer, senderSocketId }) => {
    const participant = participants.find(p => p.socketId === senderSocketId);
    if (!peerConnectionsRef.current[senderSocketId]) {
      createPeerConnection(senderSocketId, participant?.username);
    }

    const peerConnection = peerConnectionsRef.current[senderSocketId];

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socketRef.current.emit(ACTIONS.WEBRTC_ANSWER, {
        roomId,
        answer,
        targetSocketId: senderSocketId,
      });
    } catch (error) {
      logger.error('Error handling offer:', error);
    }
  };

  const handleReceiveAnswer = async ({ answer, senderSocketId }) => {
    const peerConnection = peerConnectionsRef.current[senderSocketId];
    if (peerConnection) {
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        logger.error('Error handling answer:', error);
      }
    }
  };

  const handleReceiveIceCandidate = async ({ candidate, senderSocketId }) => {
    const peerConnection = peerConnectionsRef.current[senderSocketId];
    if (peerConnection) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        logger.error('Error adding ICE candidate:', error);
      }
    }
  };

  const toggleAudio = async () => {
    logger.log('🎤 [WebRTC] Toggle audio clicked');
    if (!localStreamRef.current) {
      logger.error('🎤 [WebRTC] No local stream!');
      return;
    }

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (!audioTrack) {
      logger.error('🎤 [WebRTC] No audio track found!');
      return;
    }

    const newState = !isAudioEnabled;
    
    // Update all peer connections
    const promises = Object.values(peerConnectionsRef.current).map(async (peerConnection) => {
      const senders = peerConnection.getSenders();
      const audioSender = senders[0]; // Audio is first track (index 0)
      
      if (audioSender) {
        try {
          if (newState) {
            await audioSender.replaceTrack(audioTrack);
            logger.log('🎤 [WebRTC] Replaced with real audio track');
          } else {
            await audioSender.replaceTrack(null);
            logger.log('🎤 [WebRTC] Replaced audio with null (muted)');
          }
        } catch (error) {
          logger.error('🎤 [WebRTC] Error replacing audio track:', error);
        }
      }
    });

    await Promise.all(promises);
    audioTrack.enabled = newState;
    setIsAudioEnabled(newState);
    logger.log('🎤 [WebRTC] Audio', newState ? 'UNMUTED' : 'MUTED');
  };

  const toggleVideo = async () => {
    logger.log('📹 [WebRTC] Toggle video clicked');
    if (!localStreamRef.current) {
      logger.error('📹 [WebRTC] No local stream!');
      return;
    }

    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (!videoTrack) {
      logger.error('📹 [WebRTC] No video track found!');
      return;
    }

    const newState = !isVideoEnabled;
    
    // Update all peer connections
    const promises = Object.values(peerConnectionsRef.current).map(async (peerConnection) => {
      const senders = peerConnection.getSenders();
      const videoSender = senders[1]; // Video is second track (index 1)
      
      if (videoSender) {
        try {
          if (newState) {
            await videoSender.replaceTrack(videoTrack);
            logger.log('📹 [WebRTC] Replaced with real video track');
          } else {
            await videoSender.replaceTrack(null);
            logger.log('📹 [WebRTC] Replaced video with null (camera off)');
          }
        } catch (error) {
          logger.error('📹 [WebRTC] Error replacing video track:', error);
        }
      }
    });

    await Promise.all(promises);
    videoTrack.enabled = newState;
    setIsVideoEnabled(newState);
    logger.log('📹 [WebRTC] Video', newState ? 'ENABLED' : 'DISABLED');
  };

  const cleanup = () => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Close all peer connections
    Object.values(peerConnectionsRef.current).forEach((pc) => {
      pc.close();
    });

    peerConnectionsRef.current = {};
    setRemoteStreams({});
  };

  // Calculate grid columns based on total participants
  const totalParticipants = 1 + Object.keys(remoteStreams).length;
  const getGridCols = () => {
    if (totalParticipants === 1) return 'grid-cols-1';
    if (totalParticipants === 2) return 'grid-cols-2';
    if (totalParticipants <= 4) return 'grid-cols-2';
    if (totalParticipants <= 6) return 'grid-cols-3';
    return 'grid-cols-3';
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Video Grid */}
      <div className={`grid ${getGridCols()} gap-2 p-4 flex-1 auto-rows-fr overflow-y-auto`}>
        {/* Local Video */}
        <div className="relative bg-gray-900 rounded-lg overflow-hidden shadow-lg border-2 border-purple-500/30 hover:border-purple-500/60 transition-all group">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            <span className="text-white font-semibold text-sm drop-shadow-lg flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              You
            </span>
          </div>
          {!isVideoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-3xl text-white font-bold">Y</span>
                </div>
                <p className="text-white text-sm">Camera Off</p>
              </div>
            </div>
          )}
        </div>

        {/* Remote Videos */}
        {Object.entries(remoteStreams).map(([socketId, { stream, username }]) => (
          <RemoteVideo 
            key={socketId} 
            stream={stream} 
            username={username}
          />
        ))}
      </div>
      
      {/* Video Controls */}
      <div className="flex items-center justify-center gap-4 p-4 bg-gray-900/50 backdrop-blur-sm border-t border-purple-500/20">
        <button
          onClick={toggleAudio}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all transform hover:scale-110 ${
            isAudioEnabled 
              ? 'bg-gray-700 hover:bg-gray-600 text-white' 
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
          title={isAudioEnabled ? 'Mute' : 'Unmute'}
        >
          {isAudioEnabled ? (
            <MicOnIcon />
          ) : (
            <MicOffIcon />
          )}
        </button>
        
        <button
          onClick={toggleVideo}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all transform hover:scale-110 ${
            isVideoEnabled 
              ? 'bg-gray-700 hover:bg-gray-600 text-white' 
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
          title={isVideoEnabled ? 'Stop Video' : 'Start Video'}
        >
          {isVideoEnabled ? (
            <VideoOnIcon />
          ) : (
            <CancelIcon />
          )}
        </button>
        
        <button 
          onClick={onClose} 
          className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all transform hover:scale-110"
          title="Leave Call"
        >
          <PhoneEndIcon size={24} className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

// Remote Video Component
const RemoteVideo = ({ stream, username }) => {
  const videoRef = useRef(null);
  const [isVideoActive, setIsVideoActive] = useState(true);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      
      // Check if video track is active
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        setIsVideoActive(videoTrack.enabled);
        
        videoTrack.onended = () => setIsVideoActive(false);
        videoTrack.onmute = () => setIsVideoActive(false);
        videoTrack.onunmute = () => setIsVideoActive(true);
      }
    }
  }, [stream]);

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';
  };

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden shadow-lg border-2 border-cyan-500/30 hover:border-cyan-500/60 transition-all group">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`w-full h-full object-cover ${!isVideoActive ? 'hidden' : ''}`}
      />
      {!isVideoActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <div className="w-20 h-20 bg-cyan-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-3xl text-white font-bold">{getInitials(username)}</span>
            </div>
            <p className="text-white text-sm">Camera Off</p>
          </div>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
        <span className="text-white font-semibold text-sm drop-shadow-lg flex items-center gap-2">
          <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></span>
          {username}
        </span>
      </div>
    </div>
  );
};

export default SimpleWebRTC;




