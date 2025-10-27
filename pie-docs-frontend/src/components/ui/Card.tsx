import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'glass-strong';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'glass'
}) => {
  const baseClasses = {
    default: 'bg-white rounded-lg border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700',
    glass: 'glass-card smooth-transition hover:scale-105',
    'glass-strong': 'glass-card bg-white/20 dark:bg-black/30 smooth-transition hover:scale-105'
  };

  return (
    <div className={`${baseClasses[variant]} ${className}`}>
      {children}
    </div>
  );
};