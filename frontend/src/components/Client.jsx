import React from 'react'
import Avatar from 'react-avatar'
const Client = ({username}) => {
  return (
    <div className="flex items-center flex-col font-semibold text-sm">
      <Avatar name={username} size={50} round="14px"  />
      <span className="mt-2.5 text-[#e0e0e0]">{username}</span>
    </div>
  );
};

export default Client