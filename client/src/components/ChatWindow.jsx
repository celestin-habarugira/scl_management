import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chatAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket, useOnlineUsers } from '../context/SocketContext';
import { useCall } from '../context/CallContext';
import { API_URL } from '../config';
import ImageLightbox from './ImageLightbox';
import EmojiPicker from './EmojiPicker';
import MessageActions from './MessageActions';
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
  const [videoPlayingMsgId, setVideoPlayingMsgId] = useState(null);
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
    } catch (err) {
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
        if (tempIndex >= 0) {
          updated[tempIndex] = { ...msg, _status: 'sent' };
        } else {
          if (existing) return prev;
          updated.push(msg);
        }
        const cached = messagesCache.current.get(room._id) || [];
        if (!cached.some(m => m._id === msg._id))
          messagesCache.current.set(room._id, [...cached, msg]);
        return updated;
      });
      if (msg.sender._id !== user._id) {
        chatAPI.markAsRead(room._id).catch(() => {});
        const senderName = `${msg.sender.firstName} ${msg.sender.lastName}`;
        const body = msg.messageType === 'image' ? '📷 Sent an image' :
                     msg.messageType === 'file' ? '📎 Sent a file' :
                     msg.content;
        if (document.hidden && Notification.permission === 'granted') {
          new Notification(`EP. Cyumushyika - ${senderName}`, { body, icon: '/favicon.ico' });
        }
        setToast({ sender: senderName, body, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
        setTimeout(() => setToast(null), 4000);
      }
      scrollToBottom();
    };
    const handleTyping = ({ userId, name }) => {
      if (userId !== user._id)
        setTypingUsers((prev) => prev.find(u => u.userId === userId) ? prev : [...prev, { userId, name }]);
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
    const handleSeen = ({ roomId: seenRoomId, userId: seenUserId, seenAt }) => {
      if (seenRoomId !== room._id) return;
      setMessages((prev) => prev.map(m => {
        if (m.sender._id === user._id && (!m.readBy || !m.readBy.some(r => r.user?.toString() === seenUserId))) {
          return { ...m, readBy: [...(m.readBy || []), { user: seenUserId, readAt: seenAt }] };
        }
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
    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
      socket.off('message_reacted', handleReacted);
      socket.off('message_edited', handleEdited);
      socket.off('message_deleted', handleDeleted);
      socket.off('message_delivered', handleDelivered);
      socket.off('messages_seen', handleSeen);
    };
  }, [socket, room?._id, user._id]);

  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    const handleScroll = () => {
      if (el.scrollTop < 80 && hasMore && !loadingMore) {
        fetchMessages(room._id, pageRef.current + 1);
      }
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, room?._id, fetchMessages]);

  useEffect(() => {
    if (document.hidden) {
      const unreadEl = document.querySelector('.unread-badge-count');
      const total = messages.filter(m => m.sender._id !== user._id).length;
      document.title = total > 0 ? `(${total}) Chat - EP. Cyumushyika` : 'Chat - EP. Cyumushyika';
    } else {
      document.title = 'Chat - EP. Cyumushyika';
    }
  }, [messages, user._id]);

  useEffect(() => {
    if (!notifPermRef.current && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
      notifPermRef.current = true;
    }
  }, []);

  const retryMessage = async (failedMsg) => {
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
      } catch (err) {
        setMessages((prev) => prev.map(m => m._id === failedMsg._id ? { ...m, _status: 'failed' } : m));
        setFailedMessages((prev) => [...prev, { ...failedMsg, _id: Date.now() }]);
        setError('Message failed. Tap to retry.');
        setTimeout(() => setError(null), 3000);
      }
    }
    setSending(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (previewFile) {
      handleUploadConfirm();
      return;
    }
    if (!text.trim() || sending) return;
    const content = text.trim();
    setSending(true);

    const tempId = 'temp-' + Date.now();
    const tempMsg = {
      _id: tempId,
      chatRoom: room._id,
      sender: { _id: user._id, firstName: user.firstName, lastName: user.lastName, role: user.role },
      content,
      messageType: 'text',
      replyTo: replyTo ? { _id: replyTo._id, sender: replyTo.sender, content: replyTo.content, messageType: replyTo.messageType } : null,
      readBy: [{ user: user._id }],
      reactions: [],
      edited: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _status: 'sending',
    };

    setMessages((prev) => [...prev, tempMsg]);
    setText('');
    setReplyTo(null);
    scrollToBottom();

    if (socket?.connected) {
      socket.emit('send_message', { roomId: room._id, content, messageType: 'text', replyTo: replyTo?._id }, (response) => {
        if (response?.error) {
          setMessages((prev) => prev.map(m => m._id === tempId ? { ...m, _status: 'failed' } : m));
        }
      });
    } else {
      try {
        const { data } = await chatAPI.sendMessage(room._id, content, 'text', replyTo?._id);
        setMessages((prev) => prev.map(m => m._id === tempId ? { ...data, _status: 'sent' } : m));
      } catch (err) {
        setMessages((prev) => prev.map(m => m._id === tempId ? { ...m, _status: 'failed' } : m));
        setFailedMessages((prev) => [...prev, { _id: tempId, content, sender: { _id: user._id } }]);
        setError('Message failed. Tap to retry.');
        setTimeout(() => setError(null), 5000);
      }
    }

    setSending(false);
  };

  const handleReact = async (messageId, emoji) => {
    try {
      await chatAPI.reactToMessage(messageId, emoji);
    } catch { setError('Failed to react'); setTimeout(() => setError(null), 3000); }
  };

  const handleEditSubmit = async (messageId) => {
    if (!editText.trim() || sending) return;
    setSending(true);
    try {
      await chatAPI.editMessage(messageId, editText.trim());
      setEditingId(null);
      setEditText('');
    } catch (err) {
      setError('Failed to edit message');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (messageId) => {
    try {
      await chatAPI.deleteMessage(messageId);
    } catch {
      setError('Failed to delete message');
      setTimeout(() => setError(null), 3000);
    }
  };

  const startEdit = (msg) => {
    setEditingId(msg._id);
    setEditText(msg.content);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const cancelReply = () => setReplyTo(null);

  const emitTyping = useCallback(() => {
    if (!socket || !room) return;
    socket.emit('typing', { roomId: room._id });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => socket.emit('stop_typing', { roomId: room._id }), 1500);
  }, [socket, room]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    emitTyping();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadConfirm = async () => {
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
    } catch (err) {
      setError('Failed to upload file');
      setTimeout(() => setError(null), 3000);
    } finally {
      setUploadProgress(null);
    }
  };

  const handleDownload = (fileUrl, fileName) => {
    const a = document.createElement('a');
    a.href = `${API_URL}${fileUrl}`;
    a.download = fileName || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getFileNameFromUrl = (fileUrl) => fileUrl?.split('/').pop() || '';

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
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
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch (err) {
      setError('Microphone access denied');
      setTimeout(() => setError(null), 3000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingTime(0);
  };

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getAvatarColor = (name) => {
    const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500', 'bg-amber-500', 'bg-cyan-500', 'bg-pink-500', 'bg-indigo-500'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const formatTime = (date) => {
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
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const getRoomName = () => {
    if (!room) return '';
    if (room.name) return room.name;
    const other = room.participants?.find(p => p._id !== user._id);
    return other ? `${other.firstName} ${other.lastName}` : 'Chat';
  };

  const getOtherParticipant = () => {
    if (!room || room.type !== 'direct') return null;
    return room.participants?.find(p => p._id !== user._id);
  };

  const otherUser = getOtherParticipant();
  const isOtherOnline = otherUser ? onlineUserIds.has(otherUser._id) : false;

  const getRoomSubtitle = () => {
    if (!room) return '';
    if (room.type === 'direct') return isOtherOnline ? '🟢 Online' : 'Offline';
    if (room.type === 'announcement') return 'Announcement';
    return `Group · ${room.participants?.length || 0} members`;
  };

  const getSeenText = (msg) => {
    if (!msg.readBy || msg.readBy.length <= 1) return null;
    const others = msg.readBy.filter(r => r.user?.toString() !== user._id);
    if (others.length === 0) return null;
    if (room.type === 'direct') return 'Seen';
    return `Seen by ${others.length}`;
  };

  const getFileIcon = (mimeType) => {
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
  };

  const formatMessageDate = (msgDate, index) => {
    if (index === 0) return formatDate(msgDate);
    const prev = messages[index - 1];
    if (!prev) return formatDate(msgDate);
    const curr = new Date(msgDate);
    const prevDate = new Date(prev.createdAt);
    if (curr.toDateString() !== prevDate.toDateString()) return formatDate(msgDate);
    return null;
  };

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
      {lightboxSrc && <ImageLightbox src={lightboxSrc} alt="" onClose={() => setLightboxSrc(null)} onDownload={(url) => handleDownload(url, getFileNameFromUrl(url))} />}

      <div className="px-5 py-3 border-b border-gray-200 bg-white flex items-center gap-3 shadow-sm z-10">
        <div className="relative">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0 ${
            room.type === 'announcement' ? 'bg-amber-500' :
            room.type === 'group' ? 'bg-emerald-500' : getAvatarColor(getRoomName())
          }`}>
            {room.type === 'announcement' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            ) : getInitials(getRoomName())}
          </div>
          {room.type === 'direct' && isOtherOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm truncate">{getRoomName()}</h3>
          <p className={`text-xs ${isOtherOnline ? 'text-emerald-600' : 'text-gray-400'}`}>{getRoomSubtitle()}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(true)}
            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors"
            title="Search messages"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          {room.type === 'direct' && call.callState === 'idle' && (
            <>
              <button
                onClick={() => { const other = getOtherParticipant(); if (other) call.startCall(other, false); }}
                className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                title="Audio call"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.128-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
              <button
                onClick={() => { const other = getOtherParticipant(); if (other) call.startCall(other, true); }}
                className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-full transition-colors"
                title="Video call"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </>
          )}
          {(room.type === 'group' || room.type === 'announcement') && (
            <button
              onClick={() => setShowMembers(true)}
              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors"
              title="View members"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </button>
          )}
          {room.type === 'announcement' && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-1 rounded-full">Announcement</span>
          )}
        </div>
      </div>

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
                const isAudio = msg.mimeType?.startsWith('audio/');
                const reactions = msg.reactions || [];
                const reactionSummary = reactions.reduce((acc, r) => {
                  const existing = acc.find(a => a.emoji === r.emoji);
                  if (existing) existing.count++;
                  else acc.push({ emoji: r.emoji, count: 1 });
                  return acc;
                }, []);

                if (msg.isDeleted) {
                  return (
                    <div key={msg._id} className="message-enter">
                      {dateLabel && (
                        <div className="flex justify-center py-3">
                          <span className="text-xs text-gray-400 bg-white px-4 py-1.5 rounded-full shadow-sm border border-gray-100">{dateLabel}</span>
                        </div>
                      )}
                      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${!showAvatar ? 'ml-[52px]' : ''}`}>
                        <div className="px-4 py-2 rounded-xl bg-gray-100 text-gray-400 italic text-xs">
                          This message was deleted
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg._id} id={`msg-${msg._id}`} className="message-enter group">
                    {dateLabel && (
                      <div className="flex justify-center py-3">
                        <span className="text-xs text-gray-400 bg-white px-4 py-1.5 rounded-full shadow-sm border border-gray-100">{dateLabel}</span>
                      </div>
                    )}

                    {msg.messageType === 'announcement' ? (
                      <div className="flex justify-center py-2">
                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 max-w-lg w-full shadow-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                            </svg>
                            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Announcement</span>
                          </div>
                          <p className="text-sm text-amber-900 whitespace-pre-wrap break-words">{msg.content}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${getAvatarColor(`${msg.sender.firstName} ${msg.sender.lastName}`)}`}>
                              {getInitials(`${msg.sender.firstName} ${msg.sender.lastName}`)}
                            </div>
                            <span className="text-xs text-amber-600">{msg.sender.firstName} {msg.sender.lastName}</span>
                            <span className="text-xs text-amber-400">· {formatTime(msg.createdAt)}</span>
                          </div>
                          {reactionSummary.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {reactionSummary.map((r, i) => (
                                <button key={i} onClick={() => handleReact(msg._id, r.emoji)} className="text-xs bg-amber-100/50 hover:bg-amber-100 rounded-full px-2 py-0.5 transition-colors">
                                  {r.emoji} <span className="text-amber-600 font-medium">{r.count}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-2 ${!showAvatar ? 'ml-[52px]' : ''}`}>
                        {!isOwn && showAvatar && (
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${getAvatarColor(`${msg.sender.firstName} ${msg.sender.lastName}`)}`}>
                            {getInitials(`${msg.sender.firstName} ${msg.sender.lastName}`)}
                          </div>
                        )}
                        {!isOwn && !showAvatar && <div className="w-9 flex-shrink-0" />}
                        <div className="max-w-xs lg:max-w-md relative">
                          <div className="flex items-end gap-1">
                            <MessageActions
                              message={msg}
                              isOwn={isOwn}
                              onReact={(emoji) => handleReact(msg._id, emoji)}
                              onReply={() => setReplyTo(msg)}
                              onEdit={() => startEdit(msg)}
                              onDelete={() => handleDelete(msg._id)}
                              onEmojiPick={() => setActionEmojiMsg(msg._id)}
                            />

                            <div className="flex-1">
                              {showAvatar && !isOwn && (
                                <p className="text-xs text-gray-500 mb-1 ml-1 font-medium">{msg.sender.firstName} {msg.sender.lastName}</p>
                              )}

                              {editingId === msg._id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    ref={editInputRef}
                                    type="text"
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSubmit(msg._id); }
                                      if (e.key === 'Escape') { setEditingId(null); setEditText(''); }
                                    }}
                                    className="flex-1 px-3 py-2 border border-primary-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                  />
                                  <button onClick={() => handleEditSubmit(msg._id)} className="text-primary-600 hover:text-primary-700 p-1" title="Save">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </button>
                                  <button onClick={() => { setEditingId(null); setEditText(''); }} className="text-gray-400 hover:text-gray-600 p-1" title="Cancel">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              ) : actionEmojiMsg === msg._id ? (
                                <EmojiPicker
                                  onSelect={(emoji) => { handleReact(msg._id, emoji); setActionEmojiMsg(null); }}
                                  onClose={() => setActionEmojiMsg(null)}
                                />
                              ) : (
                                <>
                                  {msg.replyTo && (
                                    <div className={`mb-1 px-3 py-1.5 rounded-lg text-xs border-l-2 ${isOwn ? 'bg-primary-500/20 border-primary-300' : 'bg-gray-100 border-gray-300'}`}>
                                      <p className="font-medium text-gray-600 truncate">{msg.replyTo.sender?.firstName} {msg.replyTo.sender?.lastName}</p>
                                      <p className="text-gray-500 truncate">{msg.replyTo.content || (msg.replyTo.messageType === 'image' ? '📷 Photo' : '📎 File')}</p>
                                    </div>
                                  )}

                                  {msg.messageType === 'image' ? (
                                    <div className="relative group/image rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-white">
                                      <div className="cursor-pointer" onClick={() => setLightboxSrc(msg.fileUrl)}>
                                        <img src={`${API_URL}${msg.fileUrl}`} alt={msg.content} className="max-w-full h-auto max-h-72 object-cover hover:opacity-95 transition-opacity" loading="lazy" />
                                        {msg.content && <p className="text-xs text-gray-500 px-3 py-1.5 bg-white truncate">{msg.content}</p>}
                                      </div>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleDownload(msg.fileUrl, msg.fileName); }}
                                        className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover/image:opacity-100 transition-opacity"
                                        title="Download image"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                      </button>
                                    </div>
                                  ) : msg.messageType === 'file' && msg.mimeType?.startsWith('video/') ? (
                                    <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-black relative group/video">
                                      <video
                                        src={`${API_URL}${msg.fileUrl}`}
                                        controls
                                        className="max-w-full h-auto max-h-72 w-full"
                                        preload="metadata"
                                      >
                                        Your browser does not support the video tag.
                                      </video>
                                      {msg.content && <p className="text-xs text-gray-300 px-3 py-1.5 bg-black/80 truncate absolute bottom-0 left-0 right-0">{msg.content}</p>}
                                      <button
                                        onClick={() => handleDownload(msg.fileUrl, msg.fileName)}
                                        className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover/video:opacity-100 transition-opacity"
                                        title="Download video"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                      </button>
                                    </div>
                                  ) : msg.messageType === 'file' && isAudio ? (
                                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-3 min-w-[220px]">
                                      <div className="flex items-center gap-3">
                                        <button onClick={() => { const a = new Audio(`${API_URL}${msg.fileUrl}`); a.play(); }} className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center hover:bg-primary-200 transition-colors" title="Play audio">
                                          <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                        </button>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium text-gray-700 truncate">{msg.fileName || 'Voice note'}</p>
                                          {msg.fileSize && <p className="text-[11px] text-gray-400">{(msg.fileSize / 1024).toFixed(0)} KB</p>}
                                        </div>
                                        <button onClick={() => handleDownload(msg.fileUrl, msg.fileName)} className="p-2 text-gray-400 hover:text-primary-600 transition-colors" title="Download audio">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                          </svg>
                                        </button>
                                      </div>
                                    </div>
                                  ) : msg.messageType === 'file' ? (
                                    <div className={`flex items-center gap-2 rounded-xl shadow-sm transition-colors ${
                                      isOwn ? 'bg-primary-600' : 'bg-white border border-gray-200'
                                    }`}>
                                      <a href={`${API_URL}${msg.fileUrl}`} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 px-4 py-3 min-w-0 flex-1 ${
                                        isOwn ? 'text-white hover:bg-primary-700' : 'text-gray-800 hover:bg-gray-50'
                                      }`}>
                                        <span className="text-xl flex-shrink-0">{getFileIcon(msg.mimeType)}</span>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-sm font-medium truncate">{msg.fileName || msg.content}</p>
                                          {msg.fileSize && <p className={`text-xs ${isOwn ? 'text-primary-200' : 'text-gray-400'}`}>{(msg.fileSize / 1024).toFixed(1)} KB</p>}
                                        </div>
                                      </a>
                                      <button onClick={() => handleDownload(msg.fileUrl, msg.fileName)} className={`p-2 flex-shrink-0 transition-colors ${
                                        isOwn ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-primary-600'
                                      }`} title="Download file">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                      </button>
                                    </div>
                                  ) : (
                                    <div className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                                      isOwn ? 'bg-primary-600 text-white rounded-br-md' : 'bg-white text-gray-800 rounded-bl-md border border-gray-100'
                                    }`}>
                                      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                                      {msg.edited && (
                                        <span className={`text-[10px] ${isOwn ? 'text-primary-200' : 'text-gray-400'} italic`}>(edited)</span>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {reactionSummary.length > 0 && (
                            <div className={`flex flex-wrap gap-1 mt-0.5 ${isOwn ? 'justify-end mr-1' : 'justify-start ml-1'}`}>
                              {reactionSummary.map((r, i) => (
                                <button key={i} onClick={() => handleReact(msg._id, r.emoji)} className={`text-xs rounded-full px-2 py-0.5 transition-colors ${
                                  isOwn ? 'bg-white/80 hover:bg-white shadow-sm' : 'bg-gray-100/80 hover:bg-gray-200'
                                }`}>
                                  {r.emoji} <span className="font-medium text-gray-500">{r.count}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          <div className={`flex items-center gap-1.5 ${isOwn ? 'justify-end' : 'justify-start'} mt-1 ${isOwn ? 'mr-1' : 'ml-1'}`}>
                            <span className="text-[11px] text-gray-400">{formatTime(msg.createdAt)}</span>
                            {isOwn && msg._status === 'sending' && (
                              <span className="text-[11px] text-gray-400 italic flex items-center gap-1">
                                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Sending
                              </span>
                            )}
                            {isOwn && msg._status === 'failed' && (
                              <button onClick={() => retryMessage(msg)} className="text-[11px] text-red-500 font-medium hover:text-red-700 flex items-center gap-1" title="Tap to retry">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                Failed
                              </button>
                            )}
                            {isOwn && !msg._status && msg.deliveredTo && msg.deliveredTo.length > 1 && (
                              <span className="text-[11px] text-primary-500 font-medium flex items-center gap-0.5" title="Delivered">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M23.5 7.5a1 1 0 01-.3.7l-11 11a1 1 0 01-1.4 0l-6-6a1 1 0 011.4-1.4l5.3 5.3 10.3-10.3a1 1 0 011.4 1.4z" />
                                </svg>
                              </span>
                            )}
                            {isOwn && !msg._status && (!msg.deliveredTo || msg.deliveredTo.length <= 1) && (
                              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {seenText && (
                              <span className="text-[11px] text-primary-500 font-medium flex items-center gap-0.5" title="Seen">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M23.5 7.5a1 1 0 01-.3.7l-11 11a1 1 0 01-1.4 0l-6-6a1 1 0 011.4-1.4l5.3 5.3 10.3-10.3a1 1 0 011.4 1.4z" />
                                </svg>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-500 italic pl-2 py-2">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full typing-dot" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full typing-dot" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full typing-dot" style={{ animationDelay: '300ms' }} />
                </div>
                <span>{typingUsers.map(u => u.name).join(', ')} typing...</span>
              </div>
            )}

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

      {toast && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 animate-slide-in-up">
          <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 min-w-[280px] max-w-sm">
            <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {toast.sender.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{toast.sender}</p>
              <p className="text-xs text-gray-300 truncate">{toast.body}</p>
            </div>
            <span className="text-[10px] text-gray-400 flex-shrink-0">{toast.time}</span>
            <button onClick={() => setToast(null)} className="text-gray-400 hover:text-white p-0.5 flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="px-5 py-3 border-t border-gray-200 bg-white">
        {previewFile && (
          <div className="mb-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 animate-slide-in-up">
            <div className="flex items-center gap-3">
              {previewFile.type.startsWith('image/') ? (
                <img src={URL.createObjectURL(previewFile)} alt="Preview" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">{previewFile.type.startsWith('video/') ? '🎬' : previewFile.type.startsWith('audio/') ? '🎵' : '📎'}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{previewFile.name}</p>
                <p className="text-xs text-gray-400">{(previewFile.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                title="Cancel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <button
                onClick={handleUploadConfirm}
                disabled={uploadProgress !== null}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {uploadProgress !== null ? `${uploadProgress}%` : 'Send'}
              </button>
            </div>
          </div>
        )}
        {replyTo && (
          <div className="mb-2 px-3 py-2 bg-primary-50 rounded-lg border border-primary-200 flex items-center gap-2 text-sm animate-slide-in-up">
            <div className="w-1 h-8 bg-primary-400 rounded-full flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-primary-700 truncate">Replying to {replyTo.sender?._id === user._id ? 'yourself' : `${replyTo.sender?.firstName} ${replyTo.sender?.lastName}`}</p>
              <p className="text-xs text-primary-500 truncate">{replyTo.content || (replyTo.messageType === 'image' ? '📷 Photo' : replyTo.messageType === 'file' ? '📎 File' : '')}</p>
            </div>
            <button onClick={cancelReply} className="text-primary-400 hover:text-primary-600 p-1 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors"
            title="Attach file"
            disabled={uploadProgress !== null || isRecording}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-2.5 rounded-full transition-colors ${
              isRecording
                ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
            }`}
            title={isRecording ? 'Stop recording' : 'Record voice'}
            disabled={uploadProgress !== null}
          >
            {isRecording ? (
              <span className="flex items-center gap-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
                  <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
                </svg>
                <span className="text-xs font-mono">{formatDuration(recordingTime)}</span>
              </span>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.mp3,.wav,.ogg,.webm,.mp4,video/*" />
          <div className="flex-1 relative">
            <textarea
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={room.type === 'announcement' ? 'Type announcement content...' : 'Type a message...'}
              rows={1}
              className="w-full resize-none border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-12"
              style={{ maxHeight: '120px' }}
              disabled={uploadProgress !== null}
            />
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-2.5 bottom-2 text-gray-400 hover:text-amber-500 transition-colors"
              title="Add emoji"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            {showEmojiPicker && (
              <EmojiPicker
                onSelect={(emoji) => { setText((prev) => prev + emoji); setShowEmojiPicker(false); setTimeout(emitTyping, 0); }}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </div>
          <button
            type="submit"
            disabled={(!text.trim() && !previewFile) || sending || uploadProgress !== null}
            className="bg-primary-600 text-white p-2.5 rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {previewFile ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
