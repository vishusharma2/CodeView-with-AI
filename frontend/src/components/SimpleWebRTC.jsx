import React, { useEffect, useRef, useState } from 'react';

const SimpleWebRTC = ({ socketRef, roomId, participants, onClose }) => {
  const localVideoRef = useRef(null);
  const remoteVideosRef = useRef({});
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
    socketRef.current.on('WEBRTC_OFFER', handleReceiveOffer);
    socketRef.current.on('WEBRTC_ANSWER', handleReceiveAnswer);
    socketRef.current.on('WEBRTC_ICE_CANDIDATE', handleReceiveIceCandidate);

    return () => {
      socketRef.current.off('WEBRTC_OFFER', handleReceiveOffer);
      socketRef.current.off('WEBRTC_ANSWER', handleReceiveAnswer);
      socketRef.current.off('WEBRTC_ICE_CANDIDATE', handleReceiveIceCandidate);
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
          createPeerConnection(participant.socketId);
        } else {
          console.log('🎥 [WebRTC] Skipping self:', participant.socketId === socketRef.current.id ? 'MATCH' : 'NO SOCKET ID');
        }
      });
    } catch (error) {
      console.error('🎥 [WebRTC] Error accessing media devices:', error);
      alert('Could not access camera/microphone. Please check permissions.');
    }
  };

  const createPeerConnection = (targetSocketId) => {
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
      if (!remoteVideosRef.current[targetSocketId]) {
        const videoElement = document.createElement('video');
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.srcObject = remoteStream;
        videoElement.className = 'remoteVideo';
        
        const container = document.getElementById('remote-videos-container');
        if (container) {
          container.appendChild(videoElement);
          remoteVideosRef.current[targetSocketId] = videoElement;
          console.log('🎥 [WebRTC] Remote video element created and added to DOM');
        } else {
          console.error('🎥 [WebRTC] Remote videos container not found!');
        }
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🎥 [WebRTC] Sending ICE candidate to:', targetSocketId);
        socketRef.current.emit('WEBRTC_ICE_CANDIDATE', {
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

      socketRef.current.emit('WEBRTC_OFFER', {
        roomId,
        offer,
        targetSocketId,
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };

  const handleReceiveOffer = async ({ offer, senderSocketId }) => {
    if (!peerConnectionsRef.current[senderSocketId]) {
      createPeerConnection(senderSocketId);
    }

    const peerConnection = peerConnectionsRef.current[senderSocketId];

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socketRef.current.emit('WEBRTC_ANSWER', {
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

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
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

    // Remove remote video elements
    Object.values(remoteVideosRef.current).forEach((video) => {
      video.remove();
    });

    peerConnectionsRef.current = {};
    remoteVideosRef.current = {};
  };

  return (
    <div className="webrtcContainer">
      <div className="videoGrid">
        <div className="videoWrapper">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="localVideo"
          />
          <span className="videoLabel">You</span>
        </div>
        <div id="remote-videos-container" className="remoteVideosContainer"></div>
      </div>
      
      <div className="videoControls">
        <button
          onClick={toggleAudio}
          className={`controlBtn ${!isAudioEnabled ? 'disabled' : ''}`}
          title={isAudioEnabled ? 'Mute' : 'Unmute'}
        >
          {isAudioEnabled ? '🎤' : '🔇'}
        </button>
        <button
          onClick={toggleVideo}
          className={`controlBtn ${!isVideoEnabled ? 'disabled' : ''}`}
          title={isVideoEnabled ? 'Stop Video' : 'Start Video'}
        >
          {isVideoEnabled ? '📹' : '📷'}
        </button>
        <button onClick={onClose} className="controlBtn endBtn" title="Leave Call">
          📞
        </button>
      </div>
    </div>
  );
};

export default SimpleWebRTC;
