import React from 'react';
import MessageActions from './MessageActions';
import EmojiPicker from './EmojiPicker';

const MessageBubble = React.memo(({
  msg, isOwn, showAvatar, dateLabel,
  editingId, editText, actionEmojiMsg, seenText, reactionSummary,
  onReact, onReply, onEdit, onDelete, onEmojiPick,
  onEditSubmit, setEditingId, setEditText,
  getPhotoUrl, getInitials, getAvatarColor, formatTime,
  getFileIcon, onLightboxOpen, onDownload, API_URL,
  editInputRef, retryMessage,
}) => {
  if (msg.isDeleted) {
    return (
      <div className="message-enter">
        {dateLabel && <DateLabel label={dateLabel} />}
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${!showAvatar ? 'ml-[52px]' : ''}`}>
          <div className="px-4 py-2 rounded-xl bg-gray-100 text-gray-400 italic text-xs">This message was deleted</div>
        </div>
      </div>
    );
  }

  return (
    <div id={`msg-${msg._id}`} className="message-enter group">
      {dateLabel && <DateLabel label={dateLabel} />}

      {msg.messageType === 'announcement' ? (
        <AnnouncementBubble msg={msg} reactionSummary={reactionSummary} onReact={onReact} getPhotoUrl={getPhotoUrl} getInitials={getInitials} getAvatarColor={getAvatarColor} formatTime={formatTime} />
      ) : (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-2 ${!showAvatar ? 'ml-[52px]' : ''}`}>
          {!isOwn && showAvatar && (
            msg.sender.photo ? (
              <img src={getPhotoUrl(msg.sender.photo)} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${getAvatarColor(`${msg.sender.firstName} ${msg.sender.lastName}`)}`}>
                {getInitials(`${msg.sender.firstName} ${msg.sender.lastName}`)}
              </div>
            )
          )}
          {!isOwn && !showAvatar && <div className="w-9 flex-shrink-0" />}
          <div className="max-w-xs lg:max-w-md relative">
            <div className="flex items-end gap-1">
              <MessageActions message={msg} isOwn={isOwn} onReact={onReact} onReply={onReply} onEdit={onEdit} onDelete={onDelete} onEmojiPick={onEmojiPick} />
              <div className="flex-1">
                {showAvatar && !isOwn && (
                  <p className="text-xs text-gray-500 mb-1 ml-1 font-medium">{msg.sender.firstName} {msg.sender.lastName}</p>
                )}

                {editingId === msg._id ? (
                  <EditInput msgId={msg._id} editText={editText} setEditText={setEditText} onSubmit={onEditSubmit} onCancel={() => { setEditingId(null); setEditText(''); }} inputRef={editInputRef} />
                ) : actionEmojiMsg === msg._id ? (
                  <EmojiPicker onSelect={(emoji) => { onReact(emoji); onEmojiPick(); }} onClose={onEmojiPick} />
                ) : (
                  <>
                    {msg.replyTo && <ReplyPreview replyTo={msg.replyTo} isOwn={isOwn} />}
                    <MessageContent msg={msg} isOwn={isOwn} API_URL={API_URL} getFileIcon={getFileIcon} onLightboxOpen={onLightboxOpen} onDownload={onDownload} />
                  </>
                )}
              </div>
            </div>

            {reactionSummary.length > 0 && (
              <div className={`flex flex-wrap gap-1 mt-0.5 ${isOwn ? 'justify-end mr-1' : 'justify-start ml-1'}`}>
                {reactionSummary.map((r, i) => (
                  <button key={i} onClick={() => onReact(r.emoji)} className={`text-xs rounded-full px-2 py-0.5 transition-colors ${isOwn ? 'bg-white/80 hover:bg-white shadow-sm' : 'bg-gray-100/80 hover:bg-gray-200'}`}>
                    {r.emoji} <span className="font-medium text-gray-500">{r.count}</span>
                  </button>
                ))}
              </div>
            )}

            <MetaInfo isOwn={isOwn} msg={msg} formatTime={formatTime} retryMessage={retryMessage} seenText={seenText} />
          </div>
        </div>
      )}
    </div>
  );
});

const DateLabel = React.memo(({ label }) => (
  <div className="flex justify-center py-3">
    <span className="text-xs text-gray-400 bg-white px-4 py-1.5 rounded-full shadow-sm border border-gray-100">{label}</span>
  </div>
));

const AnnouncementBubble = React.memo(({ msg, reactionSummary, onReact, getPhotoUrl, getInitials, getAvatarColor, formatTime }) => (
  <div className="flex justify-center py-2">
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 max-w-lg w-full shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
        <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Announcement</span>
      </div>
      <p className="text-sm text-amber-900 whitespace-pre-wrap break-words">{msg.content}</p>
      <div className="flex items-center gap-2 mt-2">
        {msg.sender.photo ? (
          <img src={getPhotoUrl(msg.sender.photo)} alt="" className="w-5 h-5 rounded-full object-cover" />
        ) : (
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${getAvatarColor(`${msg.sender.firstName} ${msg.sender.lastName}`)}`}>
            {getInitials(`${msg.sender.firstName} ${msg.sender.lastName}`)}
          </div>
        )}
        <span className="text-xs text-amber-600">{msg.sender.firstName} {msg.sender.lastName}</span>
        <span className="text-xs text-amber-400">· {formatTime(msg.createdAt)}</span>
      </div>
      {reactionSummary.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {reactionSummary.map((r, i) => (
            <button key={i} onClick={() => onReact(msg._id, r.emoji)} className="text-xs bg-amber-100/50 hover:bg-amber-100 rounded-full px-2 py-0.5 transition-colors">
              {r.emoji} <span className="text-amber-600 font-medium">{r.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  </div>
));

const ReplyPreview = React.memo(({ replyTo, isOwn }) => (
  <div className={`mb-1 px-3 py-1.5 rounded-lg text-xs border-l-2 ${isOwn ? 'bg-primary-500/20 border-primary-300' : 'bg-gray-100 border-gray-300'}`}>
    <p className="font-medium text-gray-600 truncate">{replyTo.sender?.firstName} {replyTo.sender?.lastName}</p>
    <p className="text-gray-500 truncate">{replyTo.content || (replyTo.messageType === 'image' ? '📷 Photo' : '📎 File')}</p>
  </div>
));

const EditInput = React.memo(({ msgId, editText, setEditText, onSubmit, onCancel, inputRef }) => (
  <div className="flex items-center gap-2">
    <input ref={inputRef} type="text" value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(msgId); } if (e.key === 'Escape') onCancel(); }} className="flex-1 px-3 py-2 border border-primary-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
    <button onClick={() => onSubmit(msgId)} className="text-primary-600 hover:text-primary-700 p-1" title="Save">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
    </button>
    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1" title="Cancel">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
    </button>
  </div>
));

const MessageContent = React.memo(({ msg, isOwn, API_URL, getFileIcon, onLightboxOpen, onDownload }) => {
  if (msg.messageType === 'image') {
    return (
      <div className="relative group/image rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-white">
        <div className="cursor-pointer" onClick={() => onLightboxOpen(msg.fileUrl)}>
          <img src={`${API_URL}${msg.fileUrl}`} alt={msg.content} className="max-w-full h-auto max-h-72 object-cover hover:opacity-95 transition-opacity" loading="lazy" />
          {msg.content && <p className="text-xs text-gray-500 px-3 py-1.5 bg-white truncate">{msg.content}</p>}
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDownload(msg.fileUrl, msg.fileName); }} className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover/image:opacity-100 transition-opacity" title="Download">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        </button>
      </div>
    );
  }

  if (msg.messageType === 'file' && msg.mimeType?.startsWith('video/')) {
    return (
      <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-black relative group/video">
        <video src={`${API_URL}${msg.fileUrl}`} controls className="max-w-full h-auto max-h-72 w-full" preload="metadata">Your browser does not support the video tag.</video>
        {msg.content && <p className="text-xs text-gray-300 px-3 py-1.5 bg-black/80 truncate absolute bottom-0 left-0 right-0">{msg.content}</p>}
        <button onClick={() => onDownload(msg.fileUrl, msg.fileName)} className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover/video:opacity-100 transition-opacity" title="Download">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        </button>
      </div>
    );
  }

  if (msg.messageType === 'file' && msg.mimeType?.startsWith('audio/')) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-3 min-w-[220px]">
        <div className="flex items-center gap-3">
          <button onClick={() => { const a = new Audio(`${API_URL}${msg.fileUrl}`); a.play(); }} className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center hover:bg-primary-200 transition-colors" title="Play">
            <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-700 truncate">{msg.fileName || 'Voice note'}</p>
            {msg.fileSize && <p className="text-[11px] text-gray-400">{(msg.fileSize / 1024).toFixed(0)} KB</p>}
          </div>
          <button onClick={() => onDownload(msg.fileUrl, msg.fileName)} className="p-2 text-gray-400 hover:text-primary-600 transition-colors" title="Download">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          </button>
        </div>
      </div>
    );
  }

  if (msg.messageType === 'file') {
    return (
      <div className={`flex items-center gap-2 rounded-xl shadow-sm transition-colors ${isOwn ? 'bg-primary-600' : 'bg-white border border-gray-200'}`}>
        <a href={`${API_URL}${msg.fileUrl}`} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 px-4 py-3 min-w-0 flex-1 ${isOwn ? 'text-white hover:bg-primary-700' : 'text-gray-800 hover:bg-gray-50'}`}>
          <span className="text-xl flex-shrink-0">{getFileIcon(msg.mimeType)}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{msg.fileName || msg.content}</p>
            {msg.fileSize && <p className={`text-xs ${isOwn ? 'text-primary-200' : 'text-gray-400'}`}>{(msg.fileSize / 1024).toFixed(1)} KB</p>}
          </div>
        </a>
        <button onClick={() => onDownload(msg.fileUrl, msg.fileName)} className={`p-2 flex-shrink-0 transition-colors ${isOwn ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-primary-600'}`} title="Download">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        </button>
      </div>
    );
  }

  return (
    <div className={`px-4 py-2.5 rounded-2xl shadow-sm ${isOwn ? 'bg-primary-600 text-white rounded-br-md' : 'bg-white text-gray-800 rounded-bl-md border border-gray-100'}`}>
      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
      {msg.edited && <span className={`text-[10px] ${isOwn ? 'text-primary-200' : 'text-gray-400'} italic`}>(edited)</span>}
    </div>
  );
});

const MetaInfo = React.memo(({ isOwn, msg, formatTime, retryMessage, seenText }) => (
  <div className={`flex items-center gap-1.5 ${isOwn ? 'justify-end' : 'justify-start'} mt-1 ${isOwn ? 'mr-1' : 'ml-1'}`}>
    <span className="text-[11px] text-gray-400">{formatTime(msg.createdAt)}</span>
    {isOwn && msg._status === 'sending' && (
      <span className="text-[11px] text-gray-400 italic flex items-center gap-1">
        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Sending
      </span>
    )}
    {isOwn && msg._status === 'failed' && (
      <button onClick={() => retryMessage(msg)} className="text-[11px] text-red-500 font-medium hover:text-red-700 flex items-center gap-1" title="Tap to retry">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
        Failed
      </button>
    )}
    {isOwn && !msg._status && msg.deliveredTo && msg.deliveredTo.length > 1 && (
      <span className="text-[11px] text-primary-500 font-medium flex items-center gap-0.5" title="Delivered">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 7.5a1 1 0 01-.3.7l-11 11a1 1 0 01-1.4 0l-6-6a1 1 0 011.4-1.4l5.3 5.3 10.3-10.3a1 1 0 011.4 1.4z" /></svg>
      </span>
    )}
    {isOwn && !msg._status && (!msg.deliveredTo || msg.deliveredTo.length <= 1) && (
      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
    )}
    {seenText && (
      <span className="text-[11px] text-primary-500 font-medium flex items-center gap-0.5" title="Seen">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 7.5a1 1 0 01-.3.7l-11 11a1 1 0 01-1.4 0l-6-6a1 1 0 011.4-1.4l5.3 5.3 10.3-10.3a1 1 0 011.4 1.4z" /></svg>
      </span>
    )}
  </div>
));

export default MessageBubble;
