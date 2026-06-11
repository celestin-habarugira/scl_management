import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { chatAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket, useOnlineUsers } from '../../context/SocketContext';
import { useCall } from '../../context/CallContext';
import { API_URL } from '../../config';
import ChatHeader from './ChatHeader';
import ChatInput from './ChatInput';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import ToastNotification from './ToastNotification';
import ImageLightbox from './ImageLightbox';
import MessageSearch from './MessageSearch';
import MembersList from './MembersList';

const MESSAGES_PER_PAGE = 50;

const ChatWindow = ({ room }) => {
  const { user } = useAuth();
  const socket = useSocket();
  const onlineUserIds = useOnlineUsers();
  const call = useCall();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [error, setError] = useState(null);
  const [failedMessages, setFailedMessages] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [actionEmojiMsg, setActionEmojiMsg] = useState(null);
  const [toast, setToast] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const chatRef = useRef(null);
  const pageRef = useRef(1);
  const messagesCache = useRef(new Map());
  const prevRoomId = useRef(null);
  const notifPermRef = useRef(false);
  const editInputRef = useRef(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const scrollToBottom = useCallback((smooth = true) => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }, 50);
  }, []);

  const fetchMessages = useCallback(async (roomId, page = 1) => {
    if (page === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const { data } = await chatAPI.getMessages(roomId, { page, limit: MESSAGES_PER_PAGE });
      const msgs = data.messages || [];
      const totalPages = data.pages || 1;
      if (page === 1) {
        messagesCache.current.set(roomId, msgs);
        setMessages(msgs);
      } else {
        const cached = messagesCache.current.get(roomId) || [];
        const merged = [...msgs, ...cached];
        messagesCache.current.set(roomId, merged);
        setMessages(merged);
      }
      setHasMore(page < totalPages);
      pageRef.current = page;
      if (page === 1) scrollToBottom(false);
    } catch {
      setError('Failed to load messages');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [scrollToBottom]);

  useEffect(() => {
    if (!room) { setMessages([]); return; }
    const cached = messagesCache.current.get(room._id);
    if (cached && prevRoomId.current === room._id) {
      setMessages(cached);
      scrollToBottom(false);
      return;
    }
    prevRoomId.current = room._id;
    pageRef.current = 1;
    setHasMore(true);
    fetchMessages(room._id, 1);
    chatAPI.markAsRead(room._id).catch(() => {});
    if (socket) socket.emit('join_room', room._id);
  }, [room?._id, fetchMessages]);

  useEffect(() => {
    if (!socket || !room) return;
    const handleNewMessage = (msg) => {
      if (msg.chatRoom !== room._id) return;
      setMessages((prev) => {
        const existing = prev.some(m => m._id === msg._id);
        if (existing) {
          if (msg._status !== 'sending') return prev;
        }
        const tempIndex = prev.findIndex(m => m._id && m._id.toString().startsWith('temp-') && m.content === msg.content && m.sender?._id === user._id);
        const updated = [...prev];
        if (tempIndex >= 0) updated[tempIndex] = { ...msg, _status: 'sent' };
        else { if (existing) return prev; updated.push(msg); }
        const cached = messagesCache.current.get(room._id) || [];
        if (!cached.some(m => m._id === msg._id))
          messagesCache.current.set(room._id, [...cached, msg]);
        return updated;
      });
      if (msg.sender._id !== user._id) {
        chatAPI.markAsRead(room._id).catch(() => {});
        const senderName = `${msg.sender.firstName} ${msg.sender.lastName}`;
        const body = msg.messageType === 'image' ? '📷 Sent an image' :
                     msg.messageType === 'file' ? '📎 Sent a file' : msg.content;
        if (document.hidden && Notification.permission === 'granted')
          new Notification(`EP. Cyumushyika - ${senderName}`, { body, icon: '/favicon.ico' });
        setToast({ sender: senderName, senderPhoto: msg.sender.photo, body, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
        setTimeout(() => setToast(null), 4000);
      }
      scrollToBottom();
    };
    const handleTyping = ({ userId, name, photo }) => {
      if (userId !== user._id)
        setTypingUsers((prev) => prev.find(u => u.userId === userId) ? prev : [...prev, { userId, name, photo }]);
    };
    const handleStopTyping = ({ userId }) => {
      setTypingUsers((prev) => prev.filter(u => u.userId !== userId));
    };
    const handleReacted = ({ messageId, reactions }) => {
      setMessages((prev) => prev.map(m => m._id === messageId ? { ...m, reactions } : m));
    };
    const handleEdited = ({ messageId, content, edited }) => {
      setMessages((prev) => prev.map(m => m._id === messageId ? { ...m, content, edited } : m));
    };
    const handleDeleted = ({ messageId }) => {
      setMessages((prev) => prev.map(m => m._id === messageId ? { ...m, isDeleted: true, content: '', fileUrl: null, fileName: null, fileSize: null, mimeType: null, reactions: [] } : m));
    };
    const handleDelivered = ({ messageId, deliveredTo }) => {
      setMessages((prev) => prev.map(m => m._id === messageId ? { ...m, deliveredTo } : m));
    };
    const handlePhotoUpdated = ({ userId: changedUserId, photo }) => {
      setMessages((prev) => prev.map((m) => m.sender._id === changedUserId ? { ...m, sender: { ...m.sender, photo } } : m));
    };
    const handleSeen = ({ roomId: seenRoomId, userId: seenUserId, seenAt }) => {
      if (seenRoomId !== room._id) return;
      setMessages((prev) => prev.map(m => {
        if (m.sender._id === user._id && (!m.readBy || !m.readBy.some(r => r.user?.toString() === seenUserId)))
          return { ...m, readBy: [...(m.readBy || []), { user: seenUserId, readAt: seenAt }] };
        return m;
      }));
    };
    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);
    socket.on('message_reacted', handleReacted);
    socket.on('message_edited', handleEdited);
    socket.on('message_deleted', handleDeleted);
    socket.on('message_delivered', handleDelivered);
    socket.on('messages_seen', handleSeen);
    socket.on('user_photo_updated', handlePhotoUpdated);
    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
      socket.off('message_reacted', handleReacted);
      socket.off('message_edited', handleEdited);
      socket.off('message_deleted', handleDeleted);
      socket.off('message_delivered', handleDelivered);
      socket.off('messages_seen', handleSeen);
      socket.off('user_photo_updated', handlePhotoUpdated);
    };
  }, [socket, room?._id, user._id]);

  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    const handleScroll = () => {
      if (el.scrollTop < 80 && hasMore && !loadingMore)
        fetchMessages(room._id, pageRef.current + 1);
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, room?._id, fetchMessages]);

  useEffect(() => {
    if (!document.hidden) { document.title = 'Chat - EP. Cyumushyika'; return; }
    const total = messages.filter(m => m.sender._id !== user._id).length;
    document.title = total > 0 ? `(${total}) Chat - EP. Cyumushyika` : 'Chat - EP. Cyumushyika';
  }, [messages, user._id]);

  useEffect(() => {
    if (!notifPermRef.current && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
      notifPermRef.current = true;
    }
  }, []);

  const retryMessage = useCallback(async (failedMsg) => {
    setFailedMessages((prev) => prev.filter(m => m._id !== failedMsg._id));
    setMessages((prev) => prev.map(m => m._id === failedMsg._id ? { ...m, _status: 'sending' } : m));
    setSending(true);
    if (socket?.connected) {
      socket.emit('send_message', { roomId: room._id, content: failedMsg.content, messageType: 'text' }, (response) => {
        if (response?.error) {
          setMessages((prev) => prev.map(m => m._id === failedMsg._id ? { ...m, _status: 'failed' } : m));
          setError('Message failed. Tap to retry.');
          setTimeout(() => setError(null), 3000);
        }
      });
    } else {
      try {
        await chatAPI.sendMessage(room._id, failedMsg.content, 'text');
        setMessages((prev) => prev.map(m => m._id === failedMsg._id ? { ...m, _status: 'sent' } : m));
        scrollToBottom();
      } catch {
        setMessages((prev) => prev.map(m => m._id === failedMsg._id ? { ...m, _status: 'failed' } : m));
        setFailedMessages((prev) => [...prev, { ...failedMsg, _id: Date.now() }]);
        setError('Message failed. Tap to retry.');
        setTimeout(() => setError(null), 3000);
      }
    }
    setSending(false);
  }, [socket, room?._id, scrollToBottom]);

  const handleSend = useCallback(async (e) => {
    e.preventDefault();
    if (previewFile) { handleUploadConfirm(); return; }
    if (!text.trim() || sending) return;
    const content = text.trim();
    setSending(true);

    const tempId = 'temp-' + Date.now();
    const tempMsg = {
      _id: tempId, chatRoom: room._id,
      sender: { _id: user._id, firstName: user.firstName, lastName: user.lastName, role: user.role, photo: user.photo },
      content, messageType: 'text',
      replyTo: replyTo ? { _id: replyTo._id, sender: replyTo.sender, content: replyTo.content, messageType: replyTo.messageType } : null,
      readBy: [{ user: user._id }], reactions: [], edited: false, isDeleted: false,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), _status: 'sending',
    };

    setMessages((prev) => [...prev, tempMsg]);
    setText('');
    setReplyTo(null);
    scrollToBottom();

    if (socket?.connected) {
      socket.emit('send_message', { roomId: room._id, content, messageType: 'text', replyTo: replyTo?._id }, (response) => {
        if (response?.error) setMessages((prev) => prev.map(m => m._id === tempId ? { ...m, _status: 'failed' } : m));
      });
    } else {
      try {
        const { data } = await chatAPI.sendMessage(room._id, content, 'text', replyTo?._id);
        setMessages((prev) => prev.map(m => m._id === tempId ? { ...data, _status: 'sent' } : m));
      } catch {
        setMessages((prev) => prev.map(m => m._id === tempId ? { ...m, _status: 'failed' } : m));
        setFailedMessages((prev) => [...prev, { _id: tempId, content, sender: { _id: user._id } }]);
        setError('Message failed. Tap to retry.');
        setTimeout(() => setError(null), 5000);
      }
    }
    setSending(false);
  }, [text, sending, room?._id, user, replyTo, previewFile, socket, scrollToBottom]);

  const handleReact = useCallback(async (messageId, emoji) => {
    try { await chatAPI.reactToMessage(messageId, emoji); }
    catch { setError('Failed to react'); setTimeout(() => setError(null), 3000); }
  }, []);

  const handleEditSubmit = useCallback(async (messageId) => {
    if (!editText.trim() || sending) return;
    setSending(true);
    try {
      await chatAPI.editMessage(messageId, editText.trim());
      setEditingId(null);
      setEditText('');
    } catch {
      setError('Failed to edit message');
      setTimeout(() => setError(null), 3000);
    } finally { setSending(false); }
  }, [editText, sending]);

  const handleDelete = useCallback(async (messageId) => {
    try { await chatAPI.deleteMessage(messageId); }
    catch { setError('Failed to delete message'); setTimeout(() => setError(null), 3000); }
  }, []);

  const emitTyping = useCallback(() => {
    if (!socket || !room) return;
    socket.emit('typing', { roomId: room._id });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => socket.emit('stop_typing', { roomId: room._id }), 1500);
  }, [socket, room]);

  const handleTextChange = useCallback((e) => {
    setText(e.target.value);
    emitTyping();
  }, [emitTyping]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); }
  }, [handleSend]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleUploadConfirm = useCallback(async () => {
    if (!previewFile) return;
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', previewFile);
    formData.append('roomId', room._id);
    try {
      await chatAPI.uploadFile(formData, {
        onUploadProgress: (pe) => setUploadProgress(Math.round((pe.loaded * 100) / pe.total)),
      });
      scrollToBottom();
      setPreviewFile(null);
    } catch {
      setError('Failed to upload file');
      setTimeout(() => setError(null), 3000);
    } finally { setUploadProgress(null); }
  }, [previewFile, room?._id, scrollToBottom]);

  const handleDownload = useCallback((fileUrl, fileName) => {
    const a = document.createElement('a');
    a.href = `${API_URL}${fileUrl}`;
    a.download = fileName || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        setPreviewFile(file);
        if (fileInputRef.current) {
          const dt = new DataTransfer();
          dt.items.add(file);
          fileInputRef.current.files = dt.files;
        }
        handleFileSelect({ target: { files: [file] } });
      };
      recorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      setError('Microphone access denied');
      setTimeout(() => setError(null), 3000);
    }
  }, [handleFileSelect]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive')
      mediaRecorderRef.current.stop();
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingTime(0);
  }, []);

  const formatDuration = useCallback((sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  const getInitials = useCallback((name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2), []);
  const getPhotoUrl = useCallback((photo) => photo ? `${API_URL}${photo}` : null, []);

  const getAvatarColor = useCallback((name) => {
    const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500', 'bg-amber-500', 'bg-cyan-500', 'bg-pink-500', 'bg-indigo-500'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }, []);

  const formatTime = useCallback((date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 2) return '1m ago';
    if (diffMin < 60) return `${diffMin}m ago`;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  const formatDate = useCallback((date) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
  }, []);

  const getRoomName = useCallback(() => {
    if (!room) return '';
    if (room.name) return room.name;
    const other = room.participants?.find(p => p._id !== user._id);
    return other ? `${other.firstName} ${other.lastName}` : 'Chat';
  }, [room, user._id]);

  const getOtherParticipant = useCallback(() => {
    if (!room || room.type !== 'direct') return null;
    return room.participants?.find(p => p._id !== user._id);
  }, [room, user._id]);

  const otherUser = useMemo(getOtherParticipant, [getOtherParticipant]);
  const isOtherOnline = otherUser ? onlineUserIds.has(otherUser._id) : false;

  const getFileIcon = useCallback((mimeType) => {
    if (!mimeType) return '📎';
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    return '📎';
  }, []);

  const getSeenText = useCallback((msg) => {
    if (!msg.readBy || msg.readBy.length <= 1) return null;
    const others = msg.readBy.filter(r => r.user?.toString() !== user._id);
    if (others.length === 0) return null;
    if (room?.type === 'direct') return 'Seen';
    return `Seen by ${others.length}`;
  }, [room?.type, user._id]);

  const formatMessageDate = useCallback((msgDate, index) => {
    if (index === 0) return formatDate(msgDate);
    const prev = messages[index - 1];
    if (!prev) return formatDate(msgDate);
    const curr = new Date(msgDate);
    const prevDate = new Date(prev.createdAt);
    if (curr.toDateString() !== prevDate.toDateString()) return formatDate(msgDate);
    return null;
  }, [messages, formatDate]);

  if (!room) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <svg className="w-20 h-20 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-lg font-medium text-gray-500">Select a conversation</p>
          <p className="text-sm mt-1">Choose a chat from the sidebar to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          alt=""
          onClose={() => setLightboxSrc(null)}
          onDownload={(url) => handleDownload(url, getFileNameFromUrl(url))}
        />
      )}

      <ChatHeader
        room={room}
        otherUser={otherUser}
        isOtherOnline={isOtherOnline}
        getPhotoUrl={getPhotoUrl}
        getRoomName={getRoomName}
        getInitials={getInitials}
        getAvatarColor={getAvatarColor}
        onSearchClick={() => setShowSearch(true)}
        onMembersClick={() => setShowMembers(true)}
        onAudioCall={() => { const o = getOtherParticipant(); if (o) call.startCall(o, false); }}
        onVideoCall={() => { const o = getOtherParticipant(); if (o) call.startCall(o, true); }}
      />

      <div ref={chatRef} className="flex-1 overflow-y-auto px-5 py-4 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex space-x-1.5">
              <span className="w-2.5 h-2.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2.5 h-2.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2.5 h-2.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        ) : (
          <>
            {loadingMore && (
              <div className="flex justify-center py-3">
                <div className="flex space-x-1">
                  <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            {hasMore && messages.length >= MESSAGES_PER_PAGE && !loadingMore && (
              <div className="flex justify-center py-3">
                <span className="text-xs text-gray-400">Scroll up to load older messages</span>
              </div>
            )}

            {failedMessages.map((fm) => (
              <div key={fm._id} className="flex justify-end mb-1 message-enter">
                <div className="max-w-xs lg:max-w-md">
                  <div className="px-4 py-2.5 rounded-2xl bg-red-100 text-red-800 border border-red-200 shadow-sm flex items-center gap-2">
                    <span className="text-sm whitespace-pre-wrap break-words">{fm.content}</span>
                    <button onClick={() => retryMessage(fm)} className="text-red-600 hover:text-red-800 p-1" title="Retry">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-[11px] text-right mr-1 text-red-400 mt-0.5">Failed · Tap to retry</p>
                </div>
              </div>
            ))}

            {messages.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <svg className="w-12 h-12 mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm font-medium">No messages yet</p>
                <p className="text-xs mt-0.5">Send a message or share an image to get started</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isOwn = msg.sender._id === user._id;
                const dateLabel = formatMessageDate(msg.createdAt, idx);
                const showAvatar = idx === 0 || messages[idx - 1]?.sender?._id !== msg.sender._id;
                const seenText = isOwn ? getSeenText(msg) : null;
                const reactions = msg.reactions || [];
                const reactionSummary = reactions.reduce((acc, r) => {
                  const existing = acc.find(a => a.emoji === r.emoji);
                  if (existing) existing.count++;
                  else acc.push({ emoji: r.emoji, count: 1 });
                  return acc;
                }, []);

                return (
                  <MessageBubble
                    key={msg._id}
                    msg={msg}
                    isOwn={isOwn}
                    showAvatar={showAvatar}
                    dateLabel={dateLabel}
                    editingId={editingId}
                    editText={editText}
                    actionEmojiMsg={actionEmojiMsg}
                    seenText={seenText}
                    reactionSummary={reactionSummary}
                    onReact={(emoji) => handleReact(msg._id, emoji)}
                    onReply={() => setReplyTo(msg)}
                    onEdit={() => { setEditingId(msg._id); setEditText(msg.content); setTimeout(() => editInputRef.current?.focus(), 50); }}
                    onDelete={() => handleDelete(msg._id)}
                    onEmojiPick={() => setActionEmojiMsg(msg._id === actionEmojiMsg ? null : msg._id)}
                    onEditSubmit={handleEditSubmit}
                    setEditingId={setEditingId}
                    setEditText={setEditText}
                    getPhotoUrl={getPhotoUrl}
                    getInitials={getInitials}
                    getAvatarColor={getAvatarColor}
                    formatTime={formatTime}
                    getFileIcon={getFileIcon}
                    onLightboxOpen={(url) => setLightboxSrc(url)}
                    onDownload={handleDownload}
                    API_URL={API_URL}
                    editInputRef={editInputRef}
                    retryMessage={retryMessage}
                  />
                );
              })
            )}

            <TypingIndicator typingUsers={typingUsers} getPhotoUrl={getPhotoUrl} />
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {showSearch && (
        <MessageSearch
          roomId={room._id}
          onSelectMessage={(messageId) => {
            const el = document.getElementById(`msg-${messageId}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
          onClose={() => setShowSearch(false)}
        />
      )}

      {showMembers && (
        <MembersList
          participants={room.participants || []}
          type={room.type}
          onClose={() => setShowMembers(false)}
        />
      )}

      {uploadProgress !== null && (
        <div className="px-5 py-2 bg-blue-50 border-t border-blue-200">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-blue-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
            <span className="text-xs text-blue-700 font-medium whitespace-nowrap">Uploading {uploadProgress}%</span>
          </div>
        </div>
      )}

      {error && (
        <div className="px-5 py-2 bg-red-50 border-t border-red-200">
          <p className="text-xs text-red-600 font-medium">{error}</p>
        </div>
      )}

      <ToastNotification toast={toast} getPhotoUrl={getPhotoUrl} onClose={() => setToast(null)} />

      <ChatInput
        text={text}
        onTextChange={handleTextChange}
        onKeyDown={handleKeyDown}
        sending={sending}
        uploadProgress={uploadProgress}
        room={room}
        onSend={handleSend}
        onFileSelect={handleFileSelect}
        previewFile={previewFile}
        onUploadConfirm={handleUploadConfirm}
        onCancelPreview={() => setPreviewFile(null)}
        isRecording={isRecording}
        recordingTime={recordingTime}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        formatDuration={formatDuration}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        showEmojiPicker={showEmojiPicker}
        onEmojiPickerToggle={() => setShowEmojiPicker(!showEmojiPicker)}
        onEmojiSelect={(emoji) => { setText((prev) => prev + emoji); setShowEmojiPicker(false); setTimeout(emitTyping, 0); }}
        emitTyping={emitTyping}
        fileInputRef={fileInputRef}
      />
    </div>
  );
};

const getFileNameFromUrl = (fileUrl) => fileUrl?.split('/').pop() || '';

export default ChatWindow;
