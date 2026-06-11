import React, { useState } from 'react';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatWindow from '../components/chat/ChatWindow';
import CreateGroupModal from '../components/chat/CreateGroupModal';
import CreateAnnouncementModal from '../components/chat/CreateAnnouncementModal';
import NewDirectModal from '../components/chat/NewDirectModal';
import { SocketProvider } from '../context/SocketContext';
import { CallProvider } from '../context/CallContext';
import CallModal from '../components/calls/CallModal';

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
