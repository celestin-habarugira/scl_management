import React, { useState, useRef } from 'react';
import { chatAPI } from '../services/api';

const MessageSearch = ({ roomId, onSelectMessage, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = async () => {
    if (!query.trim() || !roomId) return;
    setLoading(true);
    setSearched(true);
    try {
      const { data } = await chatAPI.searchMessages(roomId, query.trim());
      setResults(data || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSearch(); }
    if (e.key === 'Escape') onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[60vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search messages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm focus:outline-none py-2"
          />
          {loading && <span className="text-xs text-gray-400">Searching...</span>}
          <button onClick={handleSearch} disabled={!query.trim()} className="text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-40">
            Search
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {searched && !loading && results.length === 0 && (
            <div className="text-center py-10 text-sm text-gray-400">No messages found</div>
          )}
          {results.map((msg) => (
            <button
              key={msg._id}
              onClick={() => { onSelectMessage?.(msg._id); onClose?.(); }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-gray-700">{msg.sender?.firstName} {msg.sender?.lastName}</span>
                <span className="text-[10px] text-gray-400">{new Date(msg.createdAt).toLocaleDateString()}</span>
                {msg.messageType === 'announcement' && (
                  <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Announcement</span>
                )}
              </div>
              <p className="text-sm text-gray-600 truncate">{msg.content}</p>
            </button>
          ))}
        </div>

        {results.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-100 text-center">
            <span className="text-[11px] text-gray-400">{results.length} result{results.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageSearch;
