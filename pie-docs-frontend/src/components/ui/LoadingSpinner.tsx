import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white';
  message?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  message,
  className = ''
}) => {
  const { t } = useTranslation('common');
  const { theme } = useTheme();

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    primary: theme === 'dark' ? 'border-white/60' : 'border-primary-600',
    secondary: theme === 'dark' ? 'border-white/40' : 'border-gray-600',
    white: 'border-white'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center space-y-3">
        <div
          className={`
            animate-spin rounded-full border-2 border-transparent border-t-current
            ${sizeClasses[size]}
            ${colorClasses[color]}
          `}
          role="status"
          aria-label={message || t('loading')}
        />
        {message && (
          <p className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-gray-600'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;