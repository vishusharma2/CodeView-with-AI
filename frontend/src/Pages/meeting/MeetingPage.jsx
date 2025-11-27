// MeetingPage.jsx
import React, { useEffect, useRef } from "react";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const MeetingPage = () => {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const containerRef = useRef(null);

  // username should be passed from MeetingLogin via navigate state OR localStorage
  const username = location.state?.username || localStorage.getItem("username");

  useEffect(() => {
    if (!username) {
      toast.error("Username required to join meeting");
      navigate("/meetinglogin");
      return;
    }
    let zpInstance = null;
    let mounted = true;

    const init = async () => {
      try {
        const params = new URLSearchParams({ roomId, username });
        const resp = await fetch(`/api/zego-token?${params.toString()}`);
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err?.error || "Failed to get token");
        }

        const { token } = await resp.json();

        if (!mounted) return;
        zpInstance = ZegoUIKitPrebuilt.create(token);
        zpInstance.joinRoom({
          container: containerRef.current,
          scenario: {
            mode: ZegoUIKitPrebuilt.VideoConference,
          },
        });
      } catch (err) {
        console.error("Meeting init error:", err);
        toast.error("Unable to join meeting: " + err.message);
        // optionally redirect back to login
        setTimeout(() => navigate("/meetinglogin"), 1200);
      }
    };

    init();

    return () => {
      mounted = false;
      try {
        // If Zego instance has leaveRoom / destroy API, call it here:
        if (zpInstance && typeof zpInstance.destroy === "function") {
          zpInstance.destroy();
        }
      } catch (err) {
        console.error("Cleanup error:", err);
      }
    };
  }, [roomId, username, navigate]);

  return (
    <div className="room-page">
      <div ref={containerRef} className="room" style={{ width: "100%", height: "100vh" }} />
    </div>
  );
};

export default MeetingPage;
