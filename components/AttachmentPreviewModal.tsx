
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { DownloadIcon } from './icons/DownloadIcon';

interface AttachmentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachments: string[];
}

const isImage = (url: string) => {
    if (!url) return false;
    try {
        const path = new URL(url).pathname.toLowerCase();
        return /\.(jpe?g|png|gif|webp)$/i.test(path);
    } catch {
        return false;
    }
};

const getFilenameFromUrl = (url: string) => {
    try {
        // Attempt to decode the URL to handle encoded characters (like Persian names)
        const decodedUrl = decodeURIComponent(url);
        // Split by '/' and get the last part, then remove any query parameters
        return decodedUrl.split('/').pop()?.split('?')[0] || 'فایل پیوست';
    } catch (e) {
        // If decoding fails, fallback to a non-decoded version
        return url.split('/').pop()?.split('?')[0] || 'فایل پیوست';
    }
};


const AttachmentPreviewModal: React.FC<AttachmentPreviewModalProps> = ({ isOpen, onClose, attachments }) => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen && attachments?.length > 0) {
        const initialLoadingStates: Record<string, boolean> = {};
        attachments.forEach(url => {
            if (isImage(url)) {
                initialLoadingStates[url] = true; // Set to loading initially
            }
        });
        setLoadingStates(initialLoadingStates);
    }
  }, [isOpen, attachments]);


  if (!attachments || attachments.length === 0) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl">
      <div className="p-4 bg-gray-50">
        <h3 className="text-lg font-medium leading-6 text-cyan-600 mb-4">
          پیش‌نمایش پیوست‌ها
        </h3>
        <div className="space-y-4 max-h-[80vh] overflow-y-auto p-2">
          {attachments.map(url => (
            <div key={url} className="border rounded-lg p-3 bg-white shadow-sm">
              <div className="text-sm text-gray-600 mb-3 truncate">
                {getFilenameFromUrl(url)}
              </div>
              {isImage(url) ? (
                <div className="relative mx-auto flex items-center justify-center min-h-[150px] bg-slate-50 rounded-md">
                    {loadingStates[url] && (
                        <div className="w-full px-4">
                            <div className="skeleton-line-loader"></div>
                        </div>
                    )}
                    <img 
                        src={url} 
                        alt="پیش‌نمایش" 
                        className={`max-w-full max-h-[65vh] mx-auto rounded-md object-contain transition-opacity duration-300 ${loadingStates[url] ? 'opacity-0 h-0 absolute' : 'opacity-100'}`}
                        onLoad={() => setLoadingStates(prev => ({ ...prev, [url]: false }))}
                        onError={() => setLoadingStates(prev => ({ ...prev, [url]: false }))}
                    />
                </div>
              ) : (
                <div className="text-center p-8 flex flex-col items-center justify-center">
                  <p className="text-gray-500">پیش‌نمایش برای این نوع فایل در دسترس نیست.</p>
                  <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
                  >
                    <DownloadIcon />
                    دانلود فایل
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default AttachmentPreviewModal;