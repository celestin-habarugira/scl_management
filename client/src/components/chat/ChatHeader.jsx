import React from 'react';

const ChatHeader = React.memo(({ room, otherUser, isOtherOnline, getPhotoUrl, getRoomName, getInitials, getAvatarColor, onSearchClick, onMembersClick, onAudioCall, onVideoCall }) => {
  if (!room) return null;

  return (
    <div className="px-5 py-3 border-b border-gray-200 bg-white flex items-center gap-3 shadow-sm z-10">
      <div className="relative">
        {room.type === 'direct' && otherUser?.photo ? (
          <img src={getPhotoUrl(otherUser.photo)} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0 ${
            room.type === 'announcement' ? 'bg-amber-500' :
            room.type === 'group' ? 'bg-emerald-500' : getAvatarColor(getRoomName())
          }`}>
            {room.type === 'announcement' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            ) : getInitials(getRoomName())}
          </div>
        )}
        {room.type === 'direct' && isOtherOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 text-sm truncate">{getRoomName()}</h3>
        <p className={`text-xs ${isOtherOnline ? 'text-emerald-600' : 'text-gray-400'}`}>
          {room.type === 'direct'
            ? (isOtherOnline ? 'Online' : 'Offline')
            : room.type === 'announcement' ? 'Announcement' : `Group · ${room.participants?.length || 0} members`}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onSearchClick}
          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors"
          title="Search messages"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        {room.type === 'direct' && (
          <>
            <button onClick={onAudioCall} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors" title="Audio call">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.128-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
            <button onClick={onVideoCall} className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-full transition-colors" title="Video call">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </>
        )}
        {(room.type === 'group' || room.type === 'announcement') && (
          <button onClick={onMembersClick} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors" title="View members">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </button>
        )}
        {room.type === 'announcement' && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-1 rounded-full">Announcement</span>
        )}
      </div>
    </div>
  );
});

export default ChatHeader;
