import React from 'react';

export const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={className || "w-5 h-5"}
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor" 
    strokeWidth={1.5}
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M10.5 21l1.5-4.5 4.5-1.5-4.5-1.5L10.5 3l-1.5 4.5-4.5 1.5 4.5 1.5 1.5 4.5z"
    />
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M18.75 11.25l1.5-3-1.5-3-3 1.5 3 1.5z"
    />
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M5.25 11.25l-1.5 3 1.5 3 3-1.5-3-1.5z"
    />
  </svg>
);
