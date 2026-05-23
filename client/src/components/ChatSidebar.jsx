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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [missedCalls, setMissedCalls] = useState([]);
  const [showCallHistory, setShowCallHistory] = useState(false);

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

  const handleSearch = useCallback(async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await chatAPI.getAvailableUsers();
      const q = query.toLowerCase();
      const filtered = data.filter(u =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
      );
      setSearchResults(filtered);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSelectUser = async (targetUser) => {
    try {
      const { data } = await chatAPI.getOrCreateDirect(targetUser._id);
      onSelectRoom(data);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error('Failed to start conversation');
    }
  };

  useEffect(() => {
    if (!socket) return;

    socket.on('missed_calls', (calls) => {
      setMissedCalls(calls);
    });

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

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const fetchCallLogs = useCallback(async () => {
    try {
      const { data } = await chatAPI.getCallLogs();
      setMissedCalls(data.filter(l => l.status === 'missed' && l.callee._id === user._id));
    } catch {}
  }, [user]);

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
        <div className="flex items-center gap-1">
          {missedCalls.length > 0 && (
            <button
              onClick={() => { setShowCallHistory(true); fetchCallLogs(); }}
              className="relative p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
              title={`${missedCalls.length} missed call${missedCalls.length > 1 ? 's' : ''}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.128-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {missedCalls.length > 9 ? '9+' : missedCalls.length}
              </span>
            </button>
          )}
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
      </div>

      <div className="px-4 py-2 border-b border-gray-100">
        <div className="relative">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setSearchResults([]); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {searchQuery.trim() ? (
          <div className="py-2">
            {searching ? (
              <div className="flex items-center justify-center py-6">
                <div className="flex space-x-1">
                  <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">No users found</div>
            ) : (
              <div>
                <div className="px-4 pt-2 pb-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Search Results</p>
                </div>
                {searchResults.map((u) => {
                  const isOnline = onlineUserIds.has(u._id);
                  return (
                    <button
                      key={u._id}
                      onClick={() => handleSelectUser(u)}
                      className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-sm font-medium text-white">
                          {getInitials(`${u.firstName} ${u.lastName}`)}
                        </div>
                        {isOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-gray-500 capitalize truncate">{u.role}{u.email ? ` · ${u.email}` : ''}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : loading ? (
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

        {showCallHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCallHistory(false)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[60vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Call History</h2>
                <button onClick={() => setShowCallHistory(false)} className="text-gray-400 hover:text-gray-600 p-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {missedCalls.length === 0 ? (
                  <div className="text-center text-gray-400 py-8 text-sm">No missed calls</div>
                ) : (
                  missedCalls.map((call) => (
                    <div key={call._id} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${call.status === 'missed' ? 'bg-red-500' : 'bg-gray-500'}`}>
                        {`${call.caller.firstName?.[0] || ''}${call.caller.lastName?.[0] || ''}`.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{call.caller.firstName} {call.caller.lastName}</p>
                        <p className="text-xs text-gray-500">
                          {call.status === 'missed' ? '📞 Missed call' : call.status === 'rejected' ? '📞 Call rejected' : `📞 Call · ${formatDuration(call.duration)}`}
                          <span className="ml-2">{new Date(call.createdAt).toLocaleDateString()}</span>
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            const { data } = await chatAPI.getOrCreateDirect(call.caller._id);
                            onSelectRoom(data);
                            setShowCallHistory(false);
                          } catch {}
                        }}
                        className="text-primary-600 hover:text-primary-700 p-1"
                        title="Chat"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
