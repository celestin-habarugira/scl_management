import React, { useState } from 'react';
import ChatSidebar from '../components/ChatSidebar';
import ChatWindow from '../components/ChatWindow';
import CreateGroupModal from '../components/CreateGroupModal';
import CreateAnnouncementModal from '../components/CreateAnnouncementModal';
import { SocketProvider } from '../context/SocketContext';
import { CallProvider } from '../context/CallContext';
import CallModal from '../components/CallModal';
import { useAuth } from '../context/AuthContext';
import { chatAPI } from '../services/api';

const NewDirectModal = ({ onClose, onCreated }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
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

  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

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
        <div className="p-4 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-20 text-sm text-gray-400">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-8">No other users found</div>
          ) : (
            users.map((u) => (
              <button
                key={u._id}
                onClick={() => handleSelect(u)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-sm font-medium text-white flex-shrink-0">
                  {getInitials(`${u.firstName} ${u.lastName}`)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-gray-500 capitalize">{u.role}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const Chat = () => {
  const [activeRoom, setActiveRoom] = useState(null);
  const [showNewDirect, setShowNewDirect] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false);

  const handleRoomCreated = (room) => {
    setActiveRoom(room);
  };

  return (
    <SocketProvider>
      <CallProvider>
        <div className="flex h-[calc(100vh-8rem)] -mx-4 sm:-mx-6 lg:-mx-8 rounded-xl overflow-hidden shadow-lg border border-gray-200">
          <ChatSidebar
            activeRoom={activeRoom}
            onSelectRoom={(room) => setActiveRoom(room)}
            onNewDirect={() => setShowNewDirect(true)}
            onCreateGroup={() => setShowNewGroup(true)}
            onCreateAnnouncement={() => setShowNewAnnouncement(true)}
          />
          <ChatWindow room={activeRoom} />
        </div>
        <CallModal />
      </CallProvider>

      {showNewDirect && (
        <NewDirectModal
          onClose={() => setShowNewDirect(false)}
          onCreated={handleRoomCreated}
        />
      )}

      {showNewGroup && (
        <CreateGroupModal
          onClose={() => setShowNewGroup(false)}
          onCreated={handleRoomCreated}
        />
      )}

      {showNewAnnouncement && (
        <CreateAnnouncementModal
          onClose={() => setShowNewAnnouncement(false)}
          onCreated={handleRoomCreated}
        />
      )}
    </SocketProvider>
  );
};

export default Chat;
