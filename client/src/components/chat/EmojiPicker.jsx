import React, { useState, useRef, useEffect } from 'react';

const EMOJIS = [
  '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊',
  '😋', '😎', '😍', '🥰', '😘', '😗', '😙', '😚', '🙂', '🤗',
  '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥',
  '😮', '🤐', '😯', '😪', '😫', '😴', '😌', '😛', '😜', '😝',
  '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️', '🙁',
  '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨', '😩',
  '🤯', '😬', '😰', '😱', '🥵', '🥶', '😳', '🤪', '😵', '😡',
  '😠', '🤬', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌',
  '👐', '🤲', '🤝', '🙏', '✌️', '🤟', '🤘', '👌', '❤️', '🧡',
  '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '💯', '🔥',
];

const RECENT_KEY = 'opencode_recent_emojis';

const EmojiPicker = ({ onSelect, onClose }) => {
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
    catch { return []; }
  });
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose?.(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleSelect = (emoji) => {
    const updated = [emoji, ...recent.filter(e => e !== emoji)].slice(0, 15);
    setRecent(updated);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    onSelect(emoji);
  };

  return (
    <div ref={ref} className="absolute bottom-14 left-0 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 w-[300px] animate-scale-in">
      {recent.length > 0 && (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Recent</p>
          <div className="flex flex-wrap gap-1 mb-2 pb-2 border-b border-gray-100">
            {recent.map((emoji) => (
              <button key={emoji} onClick={() => handleSelect(emoji)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg text-lg transition-colors">
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">All Emojis</p>
      <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
        {EMOJIS.map((emoji) => (
          <button key={emoji} onClick={() => handleSelect(emoji)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg text-lg transition-colors">
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EmojiPicker;
