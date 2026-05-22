import React, { useState } from 'react';
import { useOnlineUsers } from '../context/SocketContext';

const MembersList = ({ participants = [], type, onClose }) => {
  const onlineUserIds = useOnlineUsers();
  const [search, setSearch] = useState('');

  const filtered = participants.filter(p => {
    const name = `${p.firstName} ${p.lastName} ${p.email} ${p.role || ''}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Members ({participants.length})</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">No members found</div>
          ) : (
            filtered.map((p) => {
              const isOnline = onlineUserIds.has(p._id);
              const initials = `${p.firstName?.[0] || ''}${p.lastName?.[0] || ''}`.toUpperCase();
              return (
                <div key={p._id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center text-xs font-bold text-white">
                      {initials || '?'}
                    </div>
                    {isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.firstName} {p.lastName}</p>
                    <p className="text-xs text-gray-500">{isOnline ? 'Online' : 'Offline'} {p.role ? `· ${p.role}` : ''}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default MembersList;
