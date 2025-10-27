import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary';
  className?: string;
  onClick?: () => void;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  className = '',
  onClick
}) => {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors';

  const variantClasses = {
    default: 'bg-blue-100 text-blue-800',
    outline: 'border border-gray-300 text-gray-600 bg-white',
    secondary: 'bg-gray-100 text-gray-800'
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${onClick ? 'cursor-pointer hover:bg-opacity-80' : ''} ${className}`;

  return (
    <span className={classes} onClick={onClick}>
      {children}
    </span>
  );
};