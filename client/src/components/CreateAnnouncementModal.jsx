import React, { useState, useEffect } from 'react';
import { chatAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CreateAnnouncementModal = ({ onClose, onCreated }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [title, setTitle] = useState('');
  const [sendToAll, setSendToAll] = useState(true);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    chatAPI.getAvailableUsers().then(({ data }) => {
      setUsers(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const toggleUser = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const payload = {
        name: title.trim(),
        participantIds: sendToAll ? undefined : selected,
      };
      const { data } = await chatAPI.createAnnouncement(payload);
      onCreated(data);
      onClose();
    } catch (err) {
      console.error('Failed to create announcement room');
    } finally {
      setCreating(false);
    }
  };

  const filtered = users.filter((u) =>
    u._id !== user._id &&
    (`${u.firstName} ${u.lastName} ${u.email} ${u.role}`).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">New Announcement</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-100">
          <input
            type="text"
            placeholder="Announcement title (e.g. Exam Schedule)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <div className="flex items-center gap-3 mt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={sendToAll}
                onChange={() => setSendToAll(true)}
                className="text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Send to everyone</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!sendToAll}
                onChange={() => setSendToAll(false)}
                className="text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Select recipients</span>
            </label>
          </div>
        </div>

        {!sendToAll && (
          <>
            <div className="px-6 py-3 border-b border-gray-100">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search recipients..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {selected.map((id) => {
                    const u = users.find((x) => x._id === id);
                    if (!u) return null;
                    return (
                      <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
                        {u.firstName} {u.lastName}
                        <button onClick={() => toggleUser(id)} className="hover:text-amber-900">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2 max-h-48">
              {loading ? (
                <div className="flex items-center justify-center h-16 text-sm text-gray-400">Loading users...</div>
              ) : filtered.length === 0 ? (
                <div className="flex items-center justify-center h-16 text-sm text-gray-400">No users found</div>
              ) : (
                filtered.map((u) => {
                  const isSelected = selected.includes(u._id);
                  return (
                    <button
                      key={u._id}
                      onClick={() => toggleUser(u._id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        isSelected ? 'bg-amber-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white ${
                        isSelected ? 'bg-amber-500' : 'bg-gray-400'
                      }`}>
                        {(u.firstName[0] + u.lastName[0]).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-gray-500 capitalize">{u.role}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected ? 'border-amber-500 bg-amber-500' : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}

        {sendToAll && (
          <div className="flex-1 flex items-center justify-center py-8 text-sm text-gray-400">
            This announcement will be sent to all active staff members
          </div>
        )}

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || (!sendToAll && selected.length < 1) || creating}
            className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Create Announcement'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateAnnouncementModal;
