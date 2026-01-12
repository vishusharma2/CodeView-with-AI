import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const VideoCallModal = ({ initiator, onAccept, onDecline }) => {
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    // Auto-dismiss after 30 seconds
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onDecline]);

  return (
    <div className="videoCallModalOverlay">
      <div className="videoCallModal">
        <div className="videoCallModalHeader">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 7l-7 5 7 5V7z"></path>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
          </svg>
          <h2 className="neonText">Video Call Invitation</h2>
        </div>
        
        <div className="videoCallModalBody">
          <p className="inviteMessage">
            <span className="initiatorName">{initiator}</span> is inviting you to join a video call
          </p>
          <p className="timeRemaining">Auto-declining in {timeLeft}s</p>
        </div>

        <div className="videoCallModalActions">
          <button onClick={onDecline} className="btn declineBtn neonBtnRed">
            <span className="btnText">Decline</span>
          </button>
          <button onClick={onAccept} className="btn acceptBtn neonBtnGreen">
            <span className="btnText">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCallModal;
