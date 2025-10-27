import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input: React.FC<InputProps> = ({ className = '', error, ...props }) => {
  const { theme } = useTheme();

  const baseClasses = 'block w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm transition-all duration-300 bg-white/10 backdrop-blur-sm border hover:bg-white/20';
  const normalClasses = theme === 'dark'
    ? 'border-white/20 focus:ring-white/40 focus:border-white/40 text-white placeholder-white/60'
    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400';
  const errorClasses = theme === 'dark'
    ? 'border-red-400/60 focus:ring-red-400/60 focus:border-red-400/60 text-white placeholder-white/60'
    : 'border-red-300 focus:ring-red-500 focus:border-red-500 text-gray-900 placeholder-gray-400';

  const classes = `${baseClasses} ${error ? errorClasses : normalClasses} ${className}`;

  return (
    <div>
      <input className={classes} {...props} />
      {error && <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>{error}</p>}
    </div>
  );
};