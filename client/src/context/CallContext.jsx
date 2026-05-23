import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const CallContext = createContext(null);

const RTC_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export const CallProvider = ({ children }) => {
  const { user } = useAuth();
  const socket = useSocket();
  const [callState, setCallState] = useState('idle');
  const [callType, setCallType] = useState(null);
  const [callPeer, setCallPeer] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micMuted, setMicMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callError, setCallError] = useState(null);

  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const pendingOfferRef = useRef(null);
  const callPeerIdRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const ringTimeoutRef = useRef(null);
  const ringtoneRef = useRef(null);

  const playRingtone = useCallback((repeat = true) => {
    const beep = () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 440;
        gain.gain.value = 0.3;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.stop(ctx.currentTime + 0.5);
      } catch (e) {}
    };
    beep();
    if (repeat) ringtoneRef.current = setInterval(beep, 2000);
  }, []);

  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      clearInterval(ringtoneRef.current);
      ringtoneRef.current = null;
    }
  }, []);

  const getStream = useCallback(async (video) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: video });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('getUserMedia failed:', err);
      return null;
    }
  }, []);

  const cleanupCall = useCallback(() => {
    if (durationIntervalRef.current) { clearInterval(durationIntervalRef.current); durationIntervalRef.current = null; }
    if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; }
    stopRingtone();
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    remoteStreamRef.current = null;
    pendingCandidatesRef.current = [];
    pendingOfferRef.current = null;
    callPeerIdRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallPeer(null);
    setCallType(null);
    setCallState('idle');
    setMicMuted(false);
    setVideoOff(false);
    setCallDuration(0);
    setCallError(null);
  }, [stopRingtone]);

  const setupPCHandlers = useCallback((pc, targetUserId) => {
    pc.onicecandidate = (e) => {
      if (e.candidate) socket?.emit('ice_candidate', { targetUserId, candidate: e.candidate });
    };
    pc.ontrack = (e) => {
      remoteStreamRef.current = e.streams[0];
      setRemoteStream(e.streams[0]);
    };
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed')
        cleanupCall();
    };
  }, [socket, cleanupCall]);

  const startCall = useCallback(async (targetUser, video) => {
    if (!socket?.connected) return;
    const stream = await getStream(video);
    if (!stream) return;

    const targetId = targetUser._id;
    callPeerIdRef.current = targetId;
    setCallPeer(targetUser);
    setCallType(video ? 'video' : 'audio');
    setCallState('calling');
    playRingtone(true);

    ringTimeoutRef.current = setTimeout(() => {
      stopRingtone();
      setCallError('No answer');
      setTimeout(() => setCallError(null), 3000);
      cleanupCall();
    }, 30000);

    socket.emit('call_user', { targetUserId: targetId, callType: video ? 'video' : 'audio' });
    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerRef.current = pc;
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    setupPCHandlers(pc, targetId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('offer', { targetUserId: targetId, offer });
  }, [socket, getStream, setupPCHandlers, playRingtone, stopRingtone, cleanupCall]);

  const acceptCall = useCallback(async () => {
    if (!socket?.connected || !callPeer) return;
    const stream = await getStream(callType === 'video');
    if (!stream) return;

    const peerId = callPeer._id;
    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerRef.current = pc;
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    setupPCHandlers(pc, peerId);

    if (pendingOfferRef.current) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(pendingOfferRef.current));
        pendingOfferRef.current = null;
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { targetUserId: peerId, answer });
      } catch (err) {
        console.error('Error handling stored offer:', err);
        cleanupCall();
        return;
      }
      pendingCandidatesRef.current.forEach(c => {
        pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      });
      pendingCandidatesRef.current = [];
    }

    setCallState('connected');
    socket.emit('accept_call', { targetUserId: peerId });
    durationIntervalRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
  }, [socket, callPeer, callType, getStream, setupPCHandlers, cleanupCall]);

  const rejectCall = useCallback(() => {
    if (socket?.connected && callPeer)
      socket.emit('reject_call', { targetUserId: callPeer._id });
    cleanupCall();
  }, [socket, callPeer, cleanupCall]);

  const endCall = useCallback(() => {
    if (socket?.connected && callPeerIdRef.current)
      socket.emit('end_call', { targetUserId: callPeerIdRef.current });
    cleanupCall();
  }, [socket, cleanupCall]);

  const toggleMic = useCallback(() => {
    setMicMuted(prev => {
      const newVal = !prev;
      localStreamRef.current?.getAudioTracks().forEach(t => t.enabled = !newVal);
      if (socket?.connected && callPeerIdRef.current)
        socket.emit('toggle_mic', { targetUserId: callPeerIdRef.current, muted: newVal });
      return newVal;
    });
  }, [socket]);

  const toggleVideo = useCallback(() => {
    setVideoOff(prev => {
      const newVal = !prev;
      localStreamRef.current?.getVideoTracks().forEach(t => t.enabled = !newVal);
      if (socket?.connected && callPeerIdRef.current)
        socket.emit('toggle_video', { targetUserId: callPeerIdRef.current, videoOff: newVal });
      return newVal;
    });
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = ({ from, callerName, callType: cType }) => {
      callPeerIdRef.current = from;
      setCallPeer({ _id: from, firstName: callerName.split(' ')[0], lastName: callerName.split(' ').slice(1).join(' ') });
      setCallType(cType);
      setCallState('ringing');
      playRingtone(true);
      ringTimeoutRef.current = setTimeout(() => {
        stopRingtone();
        setCallError('Missed call');
        setTimeout(() => setCallError(null), 3000);
        cleanupCall();
      }, 30000);
    };

    const handleCallAccepted = async () => {
      stopRingtone();
      if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; }
      setCallState('connected');
      durationIntervalRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    };

    const handleCallRejected = () => {
      stopRingtone();
      setCallError('Call rejected');
      setTimeout(() => setCallError(null), 3000);
      cleanupCall();
    };

    const handleOffer = async ({ from, offer }) => {
      if (peerRef.current) {
        try {
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await peerRef.current.createAnswer();
          await peerRef.current.setLocalDescription(answer);
          socket.emit('answer', { targetUserId: from, answer });
          pendingCandidatesRef.current.forEach(c => {
            peerRef.current.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          });
          pendingCandidatesRef.current = [];
        } catch (err) { console.error('Error handling offer:', err); }
      } else {
        pendingOfferRef.current = offer;
      }
    };

    const handleAnswer = async ({ from, answer }) => {
      if (!peerRef.current) return;
      try {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        pendingCandidatesRef.current.forEach(c => {
          peerRef.current.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        });
        pendingCandidatesRef.current = [];
      } catch (err) { console.error('Error handling answer:', err); }
    };

    const handleIceCandidate = async ({ candidate }) => {
      if (peerRef.current?.remoteDescription) {
        try { await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate)); }
        catch (err) {}
      } else pendingCandidatesRef.current.push(candidate);
    };

    const handleCallEnded = () => { stopRingtone(); cleanupCall(); };

    socket.on('incoming_call', handleIncomingCall);
    socket.on('call_accepted', handleCallAccepted);
    socket.on('call_rejected', handleCallRejected);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice_candidate', handleIceCandidate);
    socket.on('call_ended', handleCallEnded);

    return () => {
      socket.off('incoming_call', handleIncomingCall);
      socket.off('call_accepted', handleCallAccepted);
      socket.off('call_rejected', handleCallRejected);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice_candidate', handleIceCandidate);
      socket.off('call_ended', handleCallEnded);
      stopRingtone();
    };
  }, [socket, cleanupCall, playRingtone, stopRingtone]);

  return (
    <CallContext.Provider value={{
      callState, callType, callPeer, localStream, remoteStream,
      micMuted, videoOff, callDuration, callError,
      startCall, acceptCall, rejectCall, endCall, toggleMic, toggleVideo, cleanupCall,
    }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => useContext(CallContext);
export default CallContext;
