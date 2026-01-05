import React, { useEffect, useRef, useState } from 'react';
import ACTIONS from '../Actions';

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
      console.log('👋 [SimpleWebRTC] Participant left:', username);
      setRemoteStreams(prev => {
        const updated = { ...prev };
        const socketIdToRemove = Object.keys(updated).find(socketId => updated[socketId].username === username);
        if (socketIdToRemove) {
          console.log('👋 [SimpleWebRTC] Removing remote stream for:', username);
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
      console.log('🎥 [WebRTC] Requesting camera/microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      console.log('🎥 [WebRTC] Media access granted, stream:', stream.id);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        console.log('🎥 [WebRTC] Local video element updated');
      }

      // Create peer connections for each participant
      console.log('🎥 [WebRTC] Creating peer connections for participants:', participants.length);
      console.log('🎥 [WebRTC] My socket ID:', socketRef.current.id);
      participants.forEach((participant) => {
        console.log('🎥 [WebRTC] Checking participant:', participant);
        // Only create connection if it's not the current user
        if (participant.socketId && participant.socketId !== socketRef.current.id) {
          console.log('🎥 [WebRTC] Creating peer connection for:', participant.username, participant.socketId);
          createPeerConnection(participant.socketId, participant.username);
        } else {
          console.log('🎥 [WebRTC] Skipping self:', participant.socketId === socketRef.current.id ? 'MATCH' : 'NO SOCKET ID');
        }
      });
    } catch (error) {
      console.error('🎥 [WebRTC] Error accessing media devices:', error);
      alert('Could not access camera/microphone. Please check permissions.');
    }
  };

  const createPeerConnection = (targetSocketId, username) => {
    if (peerConnectionsRef.current[targetSocketId]) {
      console.log('🎥 [WebRTC] Peer connection already exists for:', targetSocketId);
      return;
    }

    console.log('🎥 [WebRTC] Creating new RTCPeerConnection for:', targetSocketId);
    const peerConnection = new RTCPeerConnection(iceServers);
    peerConnectionsRef.current[targetSocketId] = peerConnection;

    // Add local stream tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStreamRef.current);
        console.log('🎥 [WebRTC] Added track to peer connection:', track.kind);
      });
    }

    // Handle incoming remote stream
    peerConnection.ontrack = (event) => {
      console.log('🎥 [WebRTC] Received remote track from:', targetSocketId);
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
        console.log('🎥 [WebRTC] Sending ICE candidate to:', targetSocketId);
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
      console.error('Error creating offer:', error);
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
      console.error('Error handling offer:', error);
    }
  };

  const handleReceiveAnswer = async ({ answer, senderSocketId }) => {
    const peerConnection = peerConnectionsRef.current[senderSocketId];
    if (peerConnection) {
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    }
  };

  const handleReceiveIceCandidate = async ({ candidate, senderSocketId }) => {
    const peerConnection = peerConnectionsRef.current[senderSocketId];
    if (peerConnection) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  };

  const toggleAudio = async () => {
    console.log('🎤 [WebRTC] Toggle audio clicked');
    if (!localStreamRef.current) {
      console.error('🎤 [WebRTC] No local stream!');
      return;
    }

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (!audioTrack) {
      console.error('🎤 [WebRTC] No audio track found!');
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
            console.log('🎤 [WebRTC] Replaced with real audio track');
          } else {
            await audioSender.replaceTrack(null);
            console.log('🎤 [WebRTC] Replaced audio with null (muted)');
          }
        } catch (error) {
          console.error('🎤 [WebRTC] Error replacing audio track:', error);
        }
      }
    });

    await Promise.all(promises);
    audioTrack.enabled = newState;
    setIsAudioEnabled(newState);
    console.log('🎤 [WebRTC] Audio', newState ? 'UNMUTED' : 'MUTED');
  };

  const toggleVideo = async () => {
    console.log('📹 [WebRTC] Toggle video clicked');
    if (!localStreamRef.current) {
      console.error('📹 [WebRTC] No local stream!');
      return;
    }

    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (!videoTrack) {
      console.error('📹 [WebRTC] No video track found!');
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
            console.log('📹 [WebRTC] Replaced with real video track');
          } else {
            await videoSender.replaceTrack(null);
            console.log('📹 [WebRTC] Replaced video with null (camera off)');
          }
        } catch (error) {
          console.error('📹 [WebRTC] Error replacing video track:', error);
        }
      }
    });

    await Promise.all(promises);
    videoTrack.enabled = newState;
    setIsVideoEnabled(newState);
    console.log('📹 [WebRTC] Video', newState ? 'ENABLED' : 'DISABLED');
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
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
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
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          )}
        </button>
        
        <button 
          onClick={onClose} 
          className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all transform hover:scale-110"
          title="Leave Call"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
          </svg>
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




