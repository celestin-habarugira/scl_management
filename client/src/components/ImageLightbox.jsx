import React, { useEffect } from 'react';
import { API_URL } from '../config';

const ImageLightbox = ({ src, alt, onClose, onDownload }) => {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const fullSrc = src.startsWith('http') ? src : `${API_URL}${src}`;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white p-2 z-10"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <button
        onClick={onClose}
        className="absolute top-4 left-4 text-white/70 hover:text-white text-sm z-10 bg-white/10 px-3 py-1.5 rounded-lg"
      >
        Close
      </button>

      {onDownload && (
        <button
          onClick={() => onDownload(src)}
          className="absolute bottom-4 right-4 text-white/70 hover:text-white z-10 bg-white/10 px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors hover:bg-white/20"
          title="Download image"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </button>
      )}

      <div className="max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <img
          src={fullSrc}
          alt={alt || 'Image'}
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
        />
      </div>

      {alt && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/50 px-4 py-2 rounded-lg max-w-md text-center truncate">
          {alt}
        </div>
      )}
    </div>
  );
};

export default ImageLightbox;
