import React from 'react';

const TypingIndicator = ({ typingUsers, getPhotoUrl }) => {
  if (typingUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-gray-500 italic pl-2 py-2">
      <div className="flex items-center gap-1">
        {typingUsers.map((u) =>
          u.photo ? (
            <img key={u.userId} src={getPhotoUrl(u.photo)} alt="" className="w-5 h-5 rounded-full object-cover inline-block -mr-1" />
          ) : (
            <span key={u.userId} className="w-2 h-2 bg-gray-400 rounded-full typing-dot inline-block" />
          )
        )}
      </div>
      <span>{typingUsers.map(u => u.name).join(', ')} typing...</span>
    </div>
  );
};

export default React.memo(TypingIndicator);
