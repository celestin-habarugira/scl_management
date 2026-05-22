import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chatAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket, useOnlineUsers } from '../context/SocketContext';

const ChatSidebar = ({ activeRoom, onSelectRoom, onNewDirect, onCreateGroup, onCreateAnnouncement }) => {
  const { user } = useAuth();
  const socket = useSocket();
  const onlineUserIds = useOnlineUsers();
  const [conversations, setConversations] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const menuRef = useRef(null);
  const fetchedRef = useRef(false);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await chatAPI.getConversations();
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchConversations();
    }
  }, [fetchConversations]);

  useEffect(() => {
    if (!socket) return;

    const handleConvUpdated = ({ roomId, lastMessage }) => {
      setConversations((prev) => {
        const existing = prev.find((c) => c._id === roomId);
        if (!existing) {
          fetchConversations();
          return prev;
        }
        return prev.map((c) =>
          c._id === roomId
            ? { ...c, lastMessage, updatedAt: new Date().toISOString() }
            : c
        ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    };

    socket.on('conversation_updated', handleConvUpdated);
    socket.on('new_message', () => fetchConversations());

    return () => {
      socket.off('conversation_updated', handleConvUpdated);
      socket.off('new_message');
    };
  }, [socket, fetchConversations]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getConversationName = (conv) => {
    if (conv.name) return conv.name;
    const other = conv.participants?.find(p => p._id !== user._id);
    return other ? `${other.firstName} ${other.lastName}` : 'Unknown';
  };

  const getOtherParticipant = (conv) => {
    if (conv.type !== 'direct') return null;
    return conv.participants?.find(p => p._id !== user._id);
  };

  const isUserOnline = (userId) => onlineUserIds.has(userId);

  const getAvatarColor = (conv) => {
    if (conv.type === 'announcement') return 'bg-amber-500';
    if (conv.type === 'group') return 'bg-emerald-500';
    return 'bg-primary-500';
  };

  const getAvatarLabel = (conv) => {
    if (conv.type === 'announcement') return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    );
    if (conv.type === 'group') return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    );
    return getInitials(getConversationName(conv));
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Yesterday';
    if (days < 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  const getLastMessagePreview = (conv) => {
    if (!conv.lastMessage) return 'No messages yet';
    const { messageType, content } = conv.lastMessage;
    switch (messageType) {
      case 'image': return '📷 Photo';
      case 'file': return '📎 File';
      case 'announcement': return '📢 Announcement';
      default: return content;
    }
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
          <span className={`w-2 h-2 rounded-full ${socket?.connected ? 'bg-emerald-500' : 'bg-gray-300'}`} title={socket?.connected ? 'Connected' : 'Disconnected'} />
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="bg-primary-600 text-white p-2 rounded-full hover:bg-primary-700 transition-colors shadow-sm hover:shadow-md"
            title="New conversation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-30 animate-fade-in">
              <button
                onClick={() => { setShowMenu(false); onNewDirect(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-medium">New Direct Message</p>
                  <p className="text-xs text-gray-400">Chat one-on-one</p>
                </div>
              </button>

              <div className="border-t border-gray-100" />

              <button
                onClick={() => { setShowMenu(false); onCreateGroup(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-medium">Create Group Chat</p>
                  <p className="text-xs text-gray-400">Discuss with multiple people</p>
                </div>
              </button>

              {user?.role === 'admin' && (
                <>
                  <div className="border-t border-gray-100" />
                  <button
                    onClick={() => { setShowMenu(false); onCreateAnnouncement(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Send Announcement</p>
                      <p className="text-xs text-gray-400">Broadcast to everyone</p>
                    </div>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="flex space-x-1.5">
              <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 px-6 text-center">
            <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm font-medium">No conversations yet</p>
            <p className="text-xs mt-1">Click + to start a new chat</p>
          </div>
        ) : (
          <>
            {['direct', 'group', 'announcement'].map((type) => {
              const filtered = conversations.filter(c => c.type === type);
              if (filtered.length === 0) return null;
              const labels = { direct: 'Direct Messages', group: 'Group Chats', announcement: 'Announcements' };
              return (
                <div key={type}>
                  <div className="px-4 pt-4 pb-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{labels[type]}</p>
                  </div>
                  {filtered.map((conv) => {
                    const isActive = activeRoom?._id === conv._id;
                    const other = getOtherParticipant(conv);
                    const otherOnline = other ? isUserOnline(other._id) : false;
                    return (
                      <button
                        key={conv._id}
                        onClick={() => onSelectRoom(conv)}
                        className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-all border-l-[3px] ${
                          isActive ? 'bg-primary-50 border-l-primary-600' : 'border-l-transparent'
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-white ${getAvatarColor(conv)}`}>
                            {getAvatarLabel(conv)}
                          </div>
                          {conv.type === 'direct' && otherOnline && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline">
                            <span className="font-medium text-sm text-gray-900 truncate">
                              {getConversationName(conv)}
                            </span>
                            {conv.lastMessage && (
                              <span className="text-[11px] text-gray-400 flex-shrink-0 ml-2">
                                {formatTime(conv.updatedAt)}
                              </span>
                            )}
                          </div>
                          <div className="flex justify-between items-center mt-0.5">
                            <span className="text-xs text-gray-500 truncate block max-w-[180px]">
                              {getLastMessagePreview(conv)}
                            </span>
                            {conv.unreadCount > 0 && (
                              <span className="bg-primary-600 text-white text-[11px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 flex-shrink-0 ml-2">
                                {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
