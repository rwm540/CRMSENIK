import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { toPersianDigits } from '../utils/dateFormatter';
import { PaperClipIcon } from './icons/PaperClipIcon';
import { ExternalLinkIcon } from './icons/ExternalLinkIcon';
import { DownloadIcon } from './icons/DownloadIcon';

interface AttachmentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachments: string[];
  entityName: string;
}

const getCleanFileName = (url: string): string => {
    try {
      const decodedUrl = decodeURIComponent(url);
      const pathParts = decodedUrl.split('?')[0].split('/');
      const lastPart = pathParts.pop() || '';
      
      const nameParts = lastPart.split('-');
      // for contracts: field-timestamp-filename.ext
      if (nameParts.length > 2 && !isNaN(parseInt(nameParts[1], 10))) {
        return nameParts.slice(2).join('-');
      }
      // for tickets: timestamp-filename.ext
      if (nameParts.length > 1 && !isNaN(parseInt(nameParts[0], 10))) {
        return nameParts.slice(1).join('-');
      }
      return lastPart;
    } catch (e) {
        try {
            return decodeURIComponent(url.split('/').pop() || 'فایل');
        } catch {
            return 'فایل نامعتبر';
        }
    }
};

const AttachmentViewerModal: React.FC<AttachmentViewerModalProps> = ({ isOpen, onClose, attachments, entityName }) => {
  const [selectedAttachment, setSelectedAttachment] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && attachments.length > 0) {
      setSelectedAttachment(attachments[0]);
    } else if (!isOpen) {
      setTimeout(() => setSelectedAttachment(null), 300);
    }
  }, [isOpen, attachments]);

  const renderPreview = (url: string | null) => {
    if (!url) {
      return (
        <div className="flex items-center justify-center h-full bg-slate-200 rounded-lg">
          <p className="text-gray-500">فایلی برای نمایش انتخاب نشده است.</p>
        </div>
      );
    }

    const lowerUrl = url.toLowerCase();
    const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].some(ext => lowerUrl.endsWith(ext));
    const isPdf = lowerUrl.endsWith('.pdf');

    if (isImage) {
      return <img src={url} alt={getCleanFileName(url)} className="w-full h-full object-contain" />;
    }

    if (isPdf) {
      return <iframe src={url} className="w-full h-full border-0" title={getCleanFileName(url)}></iframe>;
    }

    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-100 rounded-lg p-8 text-center">
        <PaperClipIcon />
        <p className="mt-4 text-gray-600">پیش‌نمایش برای این نوع فایل پشتیبانی نمی‌شود.</p>
        <p className="text-sm text-gray-500 mt-1 truncate max-w-full">{getCleanFileName(url)}</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 transition-colors text-sm"
        >
          <DownloadIcon />
          <span>دانلود فایل</span>
        </a>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="5xl">
      <div className="flex flex-col h-[80vh]">
        <div className="p-4 border-b flex-shrink-0">
          <h3 className="text-lg font-medium leading-6 text-cyan-600">
            فایل‌های پیوست: {entityName}
          </h3>
        </div>

        {attachments.length > 0 ? (
          <div className="flex-1 flex flex-col md:flex-row min-h-0">
            <div className="w-full md:w-64 border-b md:border-b-0 md:border-l flex-shrink-0 overflow-y-auto p-2 bg-slate-50">
              <ul className="space-y-1">
                {attachments.map((url) => (
                  <li key={url}>
                    <button
                      onClick={() => setSelectedAttachment(url)}
                      className={`w-full text-right flex items-center gap-3 p-2 rounded-md text-sm transition-colors ${
                        selectedAttachment === url
                          ? 'bg-cyan-100 text-cyan-800 font-semibold'
                          : 'text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <PaperClipIcon />
                      <span className="truncate flex-1">{toPersianDigits(getCleanFileName(url))}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex-1 bg-slate-100 p-2 min-h-0">
              <div className="w-full h-full bg-white rounded-md overflow-hidden relative">
                {renderPreview(selectedAttachment)}
                 {selectedAttachment && (
                     <a
                        href={selectedAttachment}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                        title="باز کردن در پنجره جدید"
                    >
                        <ExternalLinkIcon className="h-5 w-5" />
                    </a>
                 )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center text-sm text-gray-400 p-8">
            <p>هیچ فایلی پیوست نشده است.</p>
          </div>
        )}

        <div className="bg-gray-50 px-6 py-3 flex justify-end gap-3 rounded-b-lg border-t flex-shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100">بستن</button>
        </div>
      </div>
    </Modal>
  );
};

export default AttachmentViewerModal;
