import React from 'react';
import Widget from '../Widget';
import type { WidgetProps } from '../Widget';

interface StatisticItem {
  label: string;
  value: string | number;
  color: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
}

interface StatisticsWidgetProps extends WidgetProps {
  statistics?: StatisticItem[];
}

const StatisticsWidget: React.FC<StatisticsWidgetProps> = ({
  statistics = [
    { label: 'Total Documents', value: '1,234', color: 'text-primary-600' },
    { label: 'Processing', value: 56, color: 'text-yellow-600' },
    { label: 'Completed Today', value: 89, color: 'text-green-600', trend: { value: 12, direction: 'up' } }
  ],
  ...widgetProps
}) => {
  return (
    <Widget {...widgetProps}>
      <div className="space-y-4">
        {statistics.map((stat, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {stat.label}
              </span>
              {stat.trend && (
                <div className="flex items-center mt-1">
                  <svg
                    className={`w-3 h-3 mr-1 ${
                      stat.trend.direction === 'up' ? 'text-green-500' : 'text-red-500'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    {stat.trend.direction === 'up' ? (
                      <path
                        fillRule="evenodd"
                        d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    ) : (
                      <path
                        fillRule="evenodd"
                        d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    )}
                  </svg>
                  <span className="text-xs text-gray-500">
                    {stat.trend.value}%
                  </span>
                </div>
              )}
            </div>
            <span className={`text-2xl font-bold ${stat.color}`}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </Widget>
  );
};

export default StatisticsWidget;