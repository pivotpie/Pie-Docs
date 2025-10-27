import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  multiple?: boolean;
  className?: string;
  disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  multiple = false,
  className = '',
  disabled = false
}) => {
  const { theme } = useTheme();

  const baseClasses = `block w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 sm:text-sm transition-all duration-300 bg-white/10 backdrop-blur-sm border hover:bg-white/20 ${
    theme === 'dark'
      ? 'border-white/20 focus:ring-white/40 focus:border-white/40 text-white'
      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-gray-900'
  }`;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (multiple) {
      const selectedValues = Array.from(e.target.selectedOptions, option => option.value);
      onChange(selectedValues);
    } else {
      onChange(e.target.value);
    }
  };

  return (
    <select
      className={`${baseClasses} ${className}`}
      value={multiple ? undefined : (value as string)}
      onChange={handleChange}
      multiple={multiple}
      disabled={disabled}
    >
      {!multiple && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map(option => (
        <option
          key={option.value}
          value={option.value}
          selected={multiple ? (value as string[])?.includes(option.value) : undefined}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
};