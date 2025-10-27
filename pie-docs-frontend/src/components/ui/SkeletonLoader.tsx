interface SkeletonLoaderProps {
  type?: 'text' | 'card' | 'avatar' | 'image' | 'table' | 'list';
  lines?: number;
  className?: string;
  width?: string;
  height?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  type = 'text',
  lines = 3,
  className = '',
  width = 'w-full',
  height = 'h-4'
}) => {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700 animate-pulse rounded';

  const renderSkeleton = () => {
    switch (type) {
      case 'avatar':
        return (
          <div className={`${baseClasses} rounded-full w-10 h-10 ${className}`} />
        );

      case 'image':
        return (
          <div className={`${baseClasses} ${width} ${height} ${className}`} />
        );

      case 'card':
        return (
          <div className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow ${className}`}>
            <div className={`${baseClasses} h-6 w-3/4 mb-4`} />
            <div className={`${baseClasses} h-4 w-full mb-2`} />
            <div className={`${baseClasses} h-4 w-2/3 mb-2`} />
            <div className={`${baseClasses} h-4 w-1/2`} />
          </div>
        );

      case 'table':
        return (
          <div className={`space-y-3 ${className}`}>
            <div className={`${baseClasses} h-8 w-full`} />
            {Array.from({ length: lines }).map((_, index) => (
              <div key={index} className="grid grid-cols-4 gap-4">
                <div className={`${baseClasses} h-6`} />
                <div className={`${baseClasses} h-6`} />
                <div className={`${baseClasses} h-6`} />
                <div className={`${baseClasses} h-6`} />
              </div>
            ))}
          </div>
        );

      case 'list':
        return (
          <div className={`space-y-3 ${className}`}>
            {Array.from({ length: lines }).map((_, index) => (
              <div key={index} className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className={`${baseClasses} rounded-full w-8 h-8`} />
                <div className="flex-1 space-y-2">
                  <div className={`${baseClasses} h-4 w-3/4`} />
                  <div className={`${baseClasses} h-3 w-1/2`} />
                </div>
              </div>
            ))}
          </div>
        );

      case 'text':
      default:
        return (
          <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, index) => (
              <div
                key={index}
                className={`${baseClasses} ${height} ${
                  index === lines - 1 ? 'w-3/4' : width
                }`}
              />
            ))}
          </div>
        );
    }
  };

  return <div role="status" aria-label="Loading content">{renderSkeleton()}</div>;
};

export default SkeletonLoader;