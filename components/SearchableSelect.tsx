import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { XCircleIcon } from './icons/XCircleIcon';

interface Option {
  value: string | number;
  label: string;
  className?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | number | null;
  onChange: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder = 'انتخاب کنید...', disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(option => option.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  const filteredOptions = searchTerm
    ? options.filter(option => option.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  const handleSelectOption = (option: Option) => {
    onChange(option.value);
    setIsOpen(false);
  };
  
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`relative w-full text-right bg-gray-50 border border-gray-300 rounded-md shadow-sm pl-10 pr-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm ${disabled ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`block truncate ${selectedOption?.className || ''}`}>
          {selectedOption ? selectedOption.label : <span className="text-gray-400">{placeholder}</span>}
        </span>
        {selectedOption && !disabled && (
           <span className="absolute inset-y-0 left-6 flex items-center pr-2" onClick={handleClear}>
                <XCircleIcon className="h-5 w-5 text-gray-400 hover:text-red-500" />
            </span>
        )}
        <span className="absolute inset-y-0 left-0 flex items-center pr-2 pointer-events-none">
          <ChevronDownIcon />
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          <div className="p-2">
            <input
              type="search"
              placeholder="جستجو..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-md py-1.5 px-3 text-slate-900 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              autoFocus
            />
          </div>
          <ul>
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => {
                const isSelected = value === option.value;
                const customClass = option.className || '';
                const defaultTextColor = isSelected ? 'text-cyan-800' : 'text-gray-900';
                
                return (
                  <li
                    key={option.value}
                    onClick={() => handleSelectOption(option)}
                    className={`
                      cursor-pointer select-none relative py-2 pl-3 pr-9
                      hover:bg-cyan-100 hover:text-cyan-900
                      ${isSelected ? 'bg-cyan-50' : ''}
                      ${customClass || defaultTextColor}
                    `}
                  >
                    <span className={`block truncate ${isSelected ? 'font-semibold' : 'font-normal'}`}>
                      {option.label}
                    </span>
                  </li>
                );
              })
            ) : (
              <li className="text-center text-gray-500 py-2">نتیجه‌ای یافت نشد.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;