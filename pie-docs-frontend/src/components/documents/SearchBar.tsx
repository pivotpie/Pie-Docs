import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
  debounceMs?: number;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  disabled = false,
  className = '',
  autoFocus = false,
  debounceMs = 300,
}) => {
  const { theme } = useTheme();
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local value when external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced onChange handler
  const debouncedOnChange = useCallback(
    (newValue: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        onChange(newValue);
      }, debounceMs);
    },
    [onChange, debounceMs]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    debouncedOnChange(newValue);
  };

  const handleClear = () => {
    setLocalValue('');
    onChange('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleClear();
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        {/* Search Icon */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className={`h-5 w-5 ${theme === 'dark' ? 'text-white/60' : 'text-gray-400'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className={`
            block w-full pl-10 pr-10 py-2 border rounded-lg
            bg-white/10 backdrop-blur-sm hover:bg-white/20
            focus:outline-none focus:ring-2 transition-all duration-300
            disabled:cursor-not-allowed
            ${theme === 'dark'
              ? 'border-white/20 text-white placeholder-white/60 focus:ring-white/40 focus:border-white/40 disabled:bg-white/5'
              : 'border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50'
            }
          `}
          aria-label="Search documents"
        />

        {/* Clear Button */}
        {localValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className={`absolute inset-y-0 right-0 pr-3 flex items-center transition-colors hover:scale-110 ${
              theme === 'dark' ? 'hover:text-white/80' : 'hover:text-gray-600'
            }`}
            aria-label="Clear search"
          >
            <svg
              className={`h-5 w-5 ${theme === 'dark' ? 'text-white/60' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Loading Indicator */}
      {disabled && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <div className={`animate-spin h-4 w-4 border-2 rounded-full ${
            theme === 'dark'
              ? 'border-white/30 border-t-white/60'
              : 'border-gray-300 border-t-blue-500'
          }`}></div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;