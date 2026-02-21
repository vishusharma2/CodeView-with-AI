import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { VideoCameraIcon } from '../icons';

const VideoCallModal = ({ initiator, onAccept, onDecline }) => {
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
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
    <div className="videoCallModalOverlay fixed inset-0 bg-black/80 backdrop-blur-[10px] flex items-center justify-center z-[1000]">
      <div className="videoCallModal bg-[linear-gradient(135deg,rgba(28,30,41,0.95)_0%,rgba(20,20,40,0.95)_100%)] backdrop-blur-[30px] rounded-3xl p-8 max-w-[500px] w-[90%] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
        <div className="flex flex-col items-center mb-6">
          <div className="text-violet-500 mb-4">
            <VideoCameraIcon size={48} />
          </div>
          <h2 className="m-0 text-2xl font-bold text-white">Video Call Invitation</h2>
        </div>
        
        <div className="text-center mb-8">
          <p className="text-lg text-gray-200 mb-4">
            <span className="text-indigo-500 font-bold">{initiator}</span> is inviting you to join a video call
          </p>
          <p className="text-sm text-white/60 italic">Auto-declining in {timeLeft}s</p>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={onDecline}
            className="flex-1 max-w-[150px] border-none py-4 px-6 rounded-xl text-[15px] font-semibold cursor-pointer transition-all duration-200 bg-red-500 text-white hover:bg-red-400 hover:-translate-y-px hover:shadow-[0_12px_24px_rgba(239,68,68,0.3)]"
          >
            <span className="relative z-[2]">Decline</span>
          </button>
          <button
            onClick={onAccept}
            className="flex-1 max-w-[150px] border-none py-4 px-6 rounded-xl text-[15px] font-semibold cursor-pointer transition-all duration-200 bg-emerald-500 text-white hover:bg-emerald-400 hover:-translate-y-px hover:shadow-[0_12px_24px_rgba(16,185,129,0.3)]"
          >
            <span className="relative z-[2]">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCallModal;
