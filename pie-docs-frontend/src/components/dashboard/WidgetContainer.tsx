import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';

export type WidgetSize = 'small' | 'medium' | 'large' | 'wide';

interface WidgetContainerProps {
  id: string;
  title: string;
  size?: WidgetSize;
  children: React.ReactNode;
  className?: string;
  onResize?: (size: WidgetSize) => void;
  isDragging?: boolean;
}

const WidgetContainer: React.FC<WidgetContainerProps> = ({
  id,
  title,
  size = 'medium',
  children,
  className = '',
  onResize,
  isDragging = false
}) => {
  const { t } = useTranslation('dashboard');
  const { theme } = useTheme();
  const getSizeClasses = (size: WidgetSize): string => {
    switch (size) {
      case 'small':
        return 'col-span-1 row-span-1';
      case 'medium':
        return 'col-span-1 row-span-2 md:col-span-2 md:row-span-1';
      case 'large':
        return 'col-span-1 row-span-2 md:col-span-2 md:row-span-2';
      case 'wide':
        return 'col-span-1 row-span-1 md:col-span-4 md:row-span-1';
      default:
        return 'col-span-1 row-span-2 md:col-span-2 md:row-span-1';
    }
  };

  return (
    <div
      data-widget-id={id}
      className={`
        ${getSizeClasses(size)}
        glass-card
        transition-all duration-300 ease-in-out
        ${isDragging ? 'scale-105 z-50' : 'hover:scale-[1.02] hover:shadow-lg'}
        ${className}
      `}
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
          {title}
        </h3>

        {/* Widget Controls */}
        <div className="flex items-center space-x-2">
          {onResize && (
            <div className="flex items-center space-x-1">
              <button
                onClick={() => onResize('small')}
                className={`w-2 h-2 rounded-full transition-colors ${
                  size === 'small' ? 'bg-primary-600' : 'bg-gray-300 hover:bg-gray-400'
                }`}
                title={t('accessibility.resizeToSmall')}
                aria-label={t('accessibility.resizeToSmall')}
              />
              <button
                onClick={() => onResize('medium')}
                className={`w-2 h-2 rounded-full transition-colors ${
                  size === 'medium' ? 'bg-primary-600' : 'bg-gray-300 hover:bg-gray-400'
                }`}
                title={t('accessibility.resizeToMedium')}
                aria-label={t('accessibility.resizeToMedium')}
              />
              <button
                onClick={() => onResize('large')}
                className={`w-2 h-2 rounded-full transition-colors ${
                  size === 'large' ? 'bg-primary-600' : 'bg-gray-300 hover:bg-gray-400'
                }`}
                title={t('accessibility.resizeToLarge')}
                aria-label={t('accessibility.resizeToLarge')}
              />
              <button
                onClick={() => onResize('wide')}
                className={`w-2 h-2 rounded-full transition-colors ${
                  size === 'wide' ? 'bg-primary-600' : 'bg-gray-300 hover:bg-gray-400'
                }`}
                title={t('accessibility.resizeToWide')}
                aria-label={t('accessibility.resizeToWide')}
              />
            </div>
          )}

          {/* Drag Handle */}
          <div
            className="cursor-move p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            data-drag-handle
            aria-label={t('accessibility.dragToReorder')}
          >
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 3h2v2H9V3zm0 4h2v2H9V7zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm4-16h2v2h-2V3zm0 4h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Widget Content */}
      <div className="p-4 h-full">
        {children}
      </div>
    </div>
  );
};

export default WidgetContainer;