import React, { useState, useEffect } from 'react';
import { chatAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const NewDirectModal = ({ onClose, onCreated }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    chatAPI.getAvailableUsers().then(({ data }) => {
      setUsers(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSelect = async (targetUser) => {
    try {
      const { data } = await chatAPI.getOrCreateDirect(targetUser._id);
      onCreated(data);
      onClose();
    } catch (err) {
      console.error('Failed to start conversation');
    }
  };

  const filtered = search.trim()
    ? users.filter(u =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const getPhotoUrl = (photo) => photo ? `http://localhost:4000${photo}` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">New Direct Message</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-3 border-b border-gray-100">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50"
          />
        </div>

        <div className="p-4 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-20 text-sm text-gray-400">Loading users...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-8">No users found</div>
          ) : (
            filtered.map((u) => (
              <button
                key={u._id}
                onClick={() => handleSelect(u)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden">
                  {u.photo ? (
                    <img src={getPhotoUrl(u.photo)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary-500 flex items-center justify-center text-sm font-medium text-white">
                      {getInitials(`${u.firstName} ${u.lastName}`)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-gray-500 capitalize truncate">{u.role}{u.department ? ` · ${u.department}` : ''}</p>
                  {u.performance?.recordCount > 0 && (
                    <p className="text-[11px] text-gray-400 truncate">
                      {u.performance.recordCount} record{u.performance.recordCount !== 1 ? 's' : ''}
                      {u.performance.avgScore !== null ? ` · Avg: ${u.performance.avgScore}%` : ''}
                      {u.performance.subjects?.length > 0 ? ` · ${u.performance.subjects.slice(0, 2).join(', ')}${u.performance.subjects.length > 2 ? '...' : ''}` : ''}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NewDirectModal;
