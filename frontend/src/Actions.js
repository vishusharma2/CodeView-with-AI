const ACTIONS = {
  JOIN: "join",
  JOINED: "joined",
  DISCONNECTED: "disconnected",
  CODE_CHANGE: "code-change",
  SYNC_CODE: "sync-code",
  LEAVE: "leave",
  LANGUAGE_CHANGE: "language-change",
  CURSOR_POSITION: "cursor-position",
  VIDEO_CALL_INVITE: "video-call-invite",
  VIDEO_CALL_RESPONSE: "video-call-response",
  VIDEO_CALL_LEAVE: "video-call-leave",
  VIDEO_CALL_END: "video-call-end",
  WEBRTC_OFFER: "webrtc-offer",
  WEBRTC_ANSWER: "webrtc-answer",
  WEBRTC_ICE_CANDIDATE: "webrtc-ice-candidate",
  WHITEBOARD_DRAW: "whiteboard-draw",
  WHITEBOARD_CLEAR: "whiteboard-clear",
  FILE_CREATE: "file-create",
  FILE_DELETE: "file-delete",
  FILE_SYNC: "file-sync",
};

export default ACTIONS;
