import React from 'react';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';
import { XIcon } from './icons/XIcon';

interface AlertProps {
  messages: string[];
  onClose: () => void;
  type?: 'error' | 'success'; // Expandable for future use
}

const Alert: React.FC<AlertProps> = ({ messages, onClose, type = 'error' }) => {
  if (messages.length === 0) {
    return null;
  }

  const baseClasses = "p-4 rounded-md border flex gap-4 my-4 animate-fade-in";
  const typeClasses = {
    error: "bg-red-50 border-red-300 text-red-800",
    success: "bg-green-50 border-green-300 text-green-800",
  };

  const iconClasses = {
    error: "text-red-500",
    success: "text-green-500",
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]}`} role="alert">
      <div className="flex-shrink-0">
        <ExclamationCircleIcon className={`h-5 w-5 ${iconClasses[type]}`} />
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-sm">
          {type === 'error' ? 'لطفا خطاهای زیر را برطرف کنید:' : 'موفقیت'}
        </h3>
        <ul className="list-disc list-inside text-sm mt-2 space-y-1">
          {messages.map((msg, index) => (
            <li key={index}>{msg}</li>
          ))}
        </ul>
      </div>
      <div className="flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className={`p-1 rounded-full hover:bg-black/10 transition-colors -m-1`}
          aria-label="بستن"
        >
          <XIcon />
        </button>
      </div>
    </div>
  );
};

export default Alert;