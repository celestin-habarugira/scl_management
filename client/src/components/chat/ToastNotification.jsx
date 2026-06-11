import React from 'react';

const ToastNotification = ({ toast, getPhotoUrl, onClose }) => {
  if (!toast) return null;

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 animate-slide-in-up">
      <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 min-w-[280px] max-w-sm">
        <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 overflow-hidden">
          {toast.senderPhoto ? (
            <img src={getPhotoUrl(toast.senderPhoto)} alt="" className="w-full h-full object-cover" />
          ) : (
            toast.sender.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{toast.sender}</p>
          <p className="text-xs text-gray-300 truncate">{toast.body}</p>
        </div>
        <span className="text-[10px] text-gray-400 flex-shrink-0">{toast.time}</span>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-0.5 flex-shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default React.memo(ToastNotification);
