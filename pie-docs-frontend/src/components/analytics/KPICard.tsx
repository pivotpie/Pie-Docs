import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';

export interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    period?: string;
  };
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'blue',
  size = 'medium',
  loading = false,
  onClick,
  className = '',
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    purple: 'bg-purple-50 border-purple-200 text-purple-900',
    gray: 'bg-gray-50 border-gray-200 text-gray-900',
  };

  const iconColorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    yellow: 'text-yellow-600 bg-yellow-100',
    red: 'text-red-600 bg-red-100',
    purple: 'text-purple-600 bg-purple-100',
    gray: 'text-gray-600 bg-gray-100',
  };

  const valueColorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
    purple: 'text-purple-600',
    gray: 'text-gray-600',
  };

  const sizeClasses = {
    small: 'p-4',
    medium: 'p-6',
    large: 'p-8',
  };

  const valueSizeClasses = {
    small: 'text-xl',
    medium: 'text-2xl',
    large: 'text-3xl',
  };

  const getTrendIcon = () => {
    if (!trend) return null;

    switch (trend.direction) {
      case 'up':
        return (
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'down':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  const getTrendColor = () => {
    if (!trend) return 'text-gray-500';
    switch (trend.direction) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatTrendValue = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue >= 1) {
      return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
    }
    return `${value > 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className={`glass-card ${sizeClasses[size]} ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 bg-white/20 rounded w-1/2"></div>
            <div className="w-8 h-8 bg-white/20 rounded-lg"></div>
          </div>
          <div className="h-8 bg-white/20 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-white/20 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        glass-card transition-all duration-300 smooth-transition
        ${onClick ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : ''}
        ${sizeClasses[size]} ${className}
      `}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-medium truncate pr-2 ${
          theme === 'dark' ? 'text-white/80' : 'text-gray-600'
        }`}>{title}</h3>
        {icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconColorClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className={`font-bold ${valueSizeClasses[size]} ${
          theme === 'dark' ? 'text-white' : valueColorClasses[color]
        }`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>

        {subtitle && (
          <p className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>{subtitle}</p>
        )}

        {trend && (
          <div className="flex items-center space-x-1">
            {getTrendIcon()}
            <span className={`text-sm font-medium ${getTrendColor()}`}>
              {formatTrendValue(trend.value)}
            </span>
            {trend.period && (
              <span className="text-xs text-gray-500">vs {trend.period}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default KPICard;