import React from 'react';

const ChatInput = React.memo(({
  text, onTextChange, onKeyDown, sending, uploadProgress, room,
  onSend, onFileSelect,
  previewFile, onUploadConfirm, onCancelPreview,
  isRecording, recordingTime, onStartRecording, onStopRecording, formatDuration,
  replyTo, onCancelReply,
  showEmojiPicker, onEmojiPickerToggle, onEmojiSelect, emitTyping,
  fileInputRef,
}) => {
  return (
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
            <button onClick={onCancelPreview} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Cancel">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button onClick={onUploadConfirm} disabled={uploadProgress !== null} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50">
              {uploadProgress !== null ? `${uploadProgress}%` : 'Send'}
            </button>
          </div>
        </div>
      )}
      {replyTo && (
        <div className="mb-2 px-3 py-2 bg-primary-50 rounded-lg border border-primary-200 flex items-center gap-2 text-sm animate-slide-in-up">
          <div className="w-1 h-8 bg-primary-400 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary-700 truncate">
              Replying to {replyTo.sender?._id === replyTo.userId ? 'yourself' : `${replyTo.sender?.firstName} ${replyTo.sender?.lastName}`}
            </p>
            <p className="text-xs text-primary-500 truncate">{replyTo.content || (replyTo.messageType === 'image' ? '📷 Photo' : replyTo.messageType === 'file' ? '📎 File' : '')}</p>
          </div>
          <button onClick={onCancelReply} className="text-primary-400 hover:text-primary-600 p-1 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      <form onSubmit={onSend} className="flex items-center gap-2">
        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors" title="Attach file" disabled={uploadProgress !== null || isRecording}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <button type="button" onClick={isRecording ? onStopRecording : onStartRecording} className={`p-2.5 rounded-full transition-colors ${isRecording ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`} title={isRecording ? 'Stop recording' : 'Record voice'} disabled={uploadProgress !== null}>
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
        <input type="file" ref={fileInputRef} onChange={onFileSelect} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.mp3,.wav,.ogg,.webm,mp4,video/*" />
        <div className="flex-1 relative">
          <textarea
            value={text}
            onChange={onTextChange}
            onKeyDown={onKeyDown}
            placeholder={room?.type === 'announcement' ? 'Type announcement content...' : 'Type a message...'}
            rows={1}
            className="w-full resize-none border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-12"
            style={{ maxHeight: '120px' }}
            disabled={uploadProgress !== null}
          />
          <button type="button" onClick={onEmojiPickerToggle} className="absolute right-2.5 bottom-2 text-gray-400 hover:text-amber-500 transition-colors" title="Add emoji">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          {showEmojiPicker && (
            <div className="absolute bottom-14 left-0" onClick={(e) => e.stopPropagation()}>
              <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-3 w-[300px] animate-scale-in">
                <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                  {['😀','😂','😍','🤔','😎','🙌','👍','❤️','🔥','💯','🎉','🚀','⭐','💪','🤝','🙏'].map((emoji) => (
                    <button key={emoji} type="button" onClick={() => { onEmojiSelect(emoji); }} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg text-lg transition-colors">{emoji}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <button type="submit" disabled={(!text.trim() && !previewFile) || sending || uploadProgress !== null} className="bg-primary-600 text-white p-2.5 rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
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
  );
});

export default ChatInput;
