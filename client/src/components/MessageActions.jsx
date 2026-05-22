import React, { useState, useRef, useEffect } from 'react';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const MessageActions = ({ message, isOwn, onReact, onReply, onEdit, onDelete, onEmojiPick }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const canEdit = isOwn && message.messageType === 'text' && !message.isDeleted;
  const canDelete = isOwn && !message.isDeleted;

  const isExpired = canEdit && (Date.now() - new Date(message.createdAt).getTime() > 5 * 60 * 1000);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded-full transition-all"
        title="More actions"
      >
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
        </svg>
      </button>

      {open && (
        <div className={`absolute bottom-full mb-1 ${isOwn ? 'right-0' : 'left-0'} bg-white rounded-xl shadow-xl border border-gray-200 py-1 min-w-[160px] z-40 animate-scale-in`}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-3 pt-1.5 pb-1">React</p>
          <div className="flex gap-0.5 px-2 pb-1">
            {REACTION_EMOJIS.map((emoji) => {
              const reacted = message.reactions?.some(r => r.emoji === emoji);
              return (
                <button
                  key={emoji}
                  onClick={() => { onReact(emoji); setOpen(false); }}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-all hover:bg-gray-100 ${reacted ? 'bg-primary-50 scale-110' : ''}`}
                >
                  {emoji}
                </button>
              );
            })}
            <button
              onClick={() => { setOpen(false); onEmojiPick?.(); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-lg hover:bg-gray-100 text-gray-400"
              title="More emojis"
            >
              +
            </button>
          </div>

          <div className="border-t border-gray-100" />

          <button onClick={() => { onReply(); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Reply
          </button>

          {canEdit && !isExpired && (
            <button onClick={() => { onEdit(); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          )}

          {canDelete && (
            <button onClick={() => { onDelete(); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageActions;
