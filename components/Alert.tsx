import React, { useState, useEffect } from 'react';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XIcon } from './icons/XIcon';

interface AlertProps {
  messages: string[];
  onClose: () => void;
  type?: 'error' | 'success';
  duration?: number;
}

const Alert: React.FC<AlertProps> = ({ messages, onClose, type = 'error', duration = 10000 }) => {
  const [isClosing, setIsClosing] = useState(false);

  // This effect handles the auto-dismiss functionality.
  useEffect(() => {
    if (messages.length > 0) {
      // FIX: Reset the closing animation state whenever a new message arrives.
      // This prevents a new toast from being closed prematurely if it appears
      // while the previous one was in its closing animation.
      setIsClosing(false);

      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [messages, duration]);

  // Starts the closing animation.
  const handleClose = () => {
    setIsClosing(true);
  };

  // When the closing animation finishes, call the parent's onClose to remove the component from the DOM.
  const onAnimationEnd = () => {
    if (isClosing) {
      onClose();
    }
  };

  if (messages.length === 0) {
    return null;
  }

  // Configuration for different alert types (error, success)
  const baseClasses = "min-w-[320px] max-w-sm p-4 rounded-lg border-r-4 shadow-xl flex gap-4";
  const typeConfig = {
    error: {
      classes: "bg-red-50 border-red-500 text-red-800",
      icon: <ExclamationCircleIcon className="h-6 w-6 text-red-500" />,
      title: 'خطا'
    },
    success: {
      classes: "bg-green-50 border-green-500 text-green-800",
      icon: <CheckCircleIcon className="h-6 w-6 text-green-500" />,
      title: 'موفقیت'
    },
  };
  
  const currentConfig = typeConfig[type || 'error'];

  return (
    <div
      className={`${baseClasses} ${currentConfig.classes} ${isClosing ? 'animate-toast-out' : 'animate-toast-in'}`}
      role="alert"
      onAnimationEnd={onAnimationEnd}
    >
      <div className="flex-shrink-0">
        {currentConfig.icon}
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-sm">
          {currentConfig.title}
        </h3>
        <ul className="text-sm mt-1 space-y-1">
          {messages.map((msg, index) => (
            <li key={index}>{msg}</li>
          ))}
        </ul>
      </div>
      <div className="flex-shrink-0 -ml-2 -mt-2">
        <button
          onClick={handleClose}
          className={`p-1.5 rounded-full hover:bg-black/10 transition-colors`}
          aria-label="بستن"
        >
          <XIcon />
        </button>
      </div>
    </div>
  );
};

export default Alert;
