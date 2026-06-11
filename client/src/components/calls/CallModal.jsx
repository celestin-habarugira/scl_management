import React, { useRef, useEffect } from 'react';
import { useCall } from '../../context/CallContext';
import { API_URL } from '../../config';

const formatDuration = (sec) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const CallModal = () => {
  const {
    callState, callType, callPeer, localStream, remoteStream,
    micMuted, videoOff, callDuration, callError,
    acceptCall, rejectCall, endCall, toggleMic, toggleVideo,
  } = useCall();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (callState === 'idle') return null;

  const peerName = callPeer ? `${callPeer.firstName} ${callPeer.lastName}` : 'Unknown';
  const peerPhoto = callPeer?.photo;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      {callError && callState === 'idle' && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-xl shadow-2xl animate-fade-in z-10">
          <p className="text-sm font-medium">{callError}</p>
        </div>
      )}
      <div className="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden w-full max-w-lg mx-4">
        {callState === 'ringing' && (
          <div className="p-8 text-center">
            {peerPhoto ? (
              <img src={`${API_URL}${peerPhoto}`} alt="" className="w-20 h-20 rounded-full object-cover mx-auto mb-4 animate-bounce" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4 animate-bounce">
                {peerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
            )}
            <h3 className="text-xl font-semibold text-white mb-1">{peerName}</h3>
            <p className="text-gray-400 mb-8">{callType === 'video' ? '📹 Video call' : '📞 Audio call'}</p>
            <p className="text-green-400 text-sm mb-6 animate-pulse">Incoming call...</p>
            <div className="flex justify-center gap-6">
              <button onClick={rejectCall} className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors shadow-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                </svg>
              </button>
              <button onClick={acceptCall} className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center transition-colors shadow-lg animate-pulse">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.128-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {callState === 'calling' && (
          <div className="p-8 text-center">
            {peerPhoto ? (
              <img src={`${API_URL}${peerPhoto}`} alt="" className="w-20 h-20 rounded-full object-cover mx-auto mb-4" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
                {peerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
            )}
            <h3 className="text-xl font-semibold text-white mb-1">{peerName}</h3>
            <p className="text-gray-400 mb-2">{callType === 'video' ? '📹 Video call' : '📞 Audio call'}</p>
            <p className="text-yellow-400 text-sm animate-pulse">Calling...</p>
            <div className="flex justify-center mt-8">
              <button onClick={endCall} className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors shadow-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {callState === 'connected' && (
          <div className="relative">
            {callType === 'video' ? (
              <div className="relative bg-black" style={{ minHeight: '400px' }}>
                {remoteStream ? (
                  <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover absolute inset-0" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      {peerPhoto ? (
                        <img src={`${API_URL}${peerPhoto}`} alt="" className="w-24 h-24 rounded-full object-cover mx-auto mb-3" />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center text-3xl font-bold text-white mx-auto mb-3">
                          {peerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                      )}
                      <p className="text-gray-400 text-sm">Connecting...</p>
                    </div>
                  </div>
                )}
                {localStream && (
                  <div className="absolute bottom-4 right-4 w-32 h-24 rounded-lg overflow-hidden border-2 border-white/30 shadow-lg">
                    <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <h3 className="text-white font-semibold text-lg">{peerName}</h3>
                  <p className="text-gray-300 text-sm">{formatDuration(callDuration)}</p>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                {peerPhoto ? (
                  <img src={`${API_URL}${peerPhoto}`} alt="" className="w-24 h-24 rounded-full object-cover mx-auto mb-4" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center text-3xl font-bold text-white mx-auto mb-4">
                    {peerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                )}
                <h3 className="text-xl font-semibold text-white mb-1">{peerName}</h3>
                <p className="text-green-400 text-sm mb-2">{formatDuration(callDuration)}</p>
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                  <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.128-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
              </div>
            )}
            <div className="flex justify-center gap-4 p-4 bg-gray-900 border-t border-gray-800">
              <button onClick={toggleMic} className={`p-3 rounded-full transition-colors ${micMuted ? 'bg-red-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'}`} title={micMuted ? 'Unmute' : 'Mute'}>
                {micMuted ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </button>
              {callType === 'video' && (
                <button onClick={toggleVideo} className={`p-3 rounded-full transition-colors ${videoOff ? 'bg-red-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'}`} title={videoOff ? 'Turn on video' : 'Turn off video'}>
                  {videoOff ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              )}
              <button onClick={endCall} className="p-3 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors" title="End call">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallModal;
