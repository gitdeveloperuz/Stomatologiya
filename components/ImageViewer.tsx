
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  imageBase64: string | null;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ isOpen, onClose, imageBase64 }) => {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !imageBase64) return null;

  const mimeType = imageBase64.startsWith('iVBOR') ? 'image/png' : 'image/jpeg';
  const src = `data:${mimeType};base64,${imageBase64}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md transition-opacity cursor-pointer" 
        onClick={onClose}
      />
      
      {/* Close Button */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 z-[110] p-2 bg-black/50 hover:bg-white/20 text-white rounded-full transition-colors"
      >
        <X className="h-8 w-8" />
      </button>

      {/* Image */}
      <img
        src={src}
        alt="Full size view"
        className="relative z-[105] max-w-full max-h-[90vh] w-auto h-auto rounded-lg shadow-2xl object-contain select-none"
        onClick={(e) => e.stopPropagation()} 
      />
    </div>
  );
};
