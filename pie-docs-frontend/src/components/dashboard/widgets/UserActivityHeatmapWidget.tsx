import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Widget from '../Widget';
import type { WidgetProps } from '../Widget';
import type { DashboardData } from '@/contexts/DashboardDataContext';

interface HeatmapData {
  hour: number;
  day: number; // 0-6 (Sunday-Saturday)
  value: number; // activity intensity 0-100
  count: number; // actual number of activities
}

interface ActivitySummary {
  totalSessions: number;
  averageSessionDuration: string;
  peakHour: string;
  peakDay: string;
  activeUsers: number;
  documentInteractions: number;
}

interface UserActivityHeatmapWidgetProps extends WidgetProps {
  timeRange?: '7d' | '30d' | '90d';
  showTooltips?: boolean;
  data?: DashboardData | null;
}

const UserActivityHeatmapWidget: React.FC<UserActivityHeatmapWidgetProps> = ({
  timeRange = '7d',
  showTooltips = true,
  data,
  ...widgetProps
}) => {
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [selectedCell, setSelectedCell] = useState<HeatmapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  useEffect(() => {
    const generateHeatmapData = (): HeatmapData[] => {
      const data: HeatmapData[] = [];

      // Generate data for each hour of each day
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          // Create realistic activity patterns
          let baseActivity = 0;

          // Weekend vs weekday patterns
          if (day === 0 || day === 6) { // Weekend
            // Lower activity, peak in afternoon
            if (hour >= 10 && hour <= 22) {
              baseActivity = Math.random() * 40 + 20;
            } else {
              baseActivity = Math.random() * 15;
            }
          } else { // Weekday
            // Business hours peak
            if (hour >= 8 && hour <= 18) {
              baseActivity = Math.random() * 80 + 40;
            } else if (hour >= 19 && hour <= 23) {
              baseActivity = Math.random() * 30 + 10;
            } else {
              baseActivity = Math.random() * 10;
            }
          }

          // Add some random variation
          const variance = (Math.random() - 0.5) * 20;
          const value = Math.max(0, Math.min(100, baseActivity + variance));
          const count = Math.floor(value * 2.5); // Convert to activity count

          data.push({
            hour,
            day,
            value,
            count
          });
        }
      }

      return data;
    };

    const generateSummary = (heatmapData: HeatmapData[]): ActivitySummary => {
      // Use centralized data if available, otherwise calculate from heatmap data
      if (data) {
        return {
          totalSessions: data.totalSessions,
          averageSessionDuration: data.averageSessionDuration,
          peakHour: data.peakHour,
          peakDay: data.peakDay,
          activeUsers: data.activeUsers,
          documentInteractions: data.documentInteractions
        };
      }

      // Fallback to local calculation
      const maxActivity = Math.max(...heatmapData.map(d => d.value));
      const peakCell = heatmapData.find(d => d.value === maxActivity);

      const dayActivity = Array(7).fill(0);
      const hourActivity = Array(24).fill(0);

      heatmapData.forEach(cell => {
        dayActivity[cell.day] += cell.value;
        hourActivity[cell.hour] += cell.value;
      });

      const peakDay = days[dayActivity.indexOf(Math.max(...dayActivity))];
      const peakHour = `${hourActivity.indexOf(Math.max(...hourActivity))}:00`;

      return {
        totalSessions: heatmapData.reduce((sum, d) => sum + d.count, 0),
        averageSessionDuration: `${Math.floor(Math.random() * 45) + 15}m`,
        peakHour,
        peakDay,
        activeUsers: Math.floor(Math.random() * 150) + 50,
        documentInteractions: heatmapData.reduce((sum, d) => sum + Math.floor(d.count * 1.5), 0)
      };
    };

    setIsLoading(true);
    setTimeout(() => {
      const heatmapDataLocal = data?.activityHeatmap || generateHeatmapData();
      setHeatmapData(heatmapDataLocal);
      setSummary(generateSummary(heatmapDataLocal));
      setIsLoading(false);
    }, 1000);
  }, [timeRange]);

  const getIntensityColor = (value: number): string => {
    if (value === 0) return 'bg-gray-800 border-gray-700';
    if (value < 20) return 'bg-blue-900/40 border-blue-800/50';
    if (value < 40) return 'bg-blue-800/60 border-blue-700/70';
    if (value < 60) return 'bg-blue-600/80 border-blue-500/90';
    if (value < 80) return 'bg-blue-400 border-blue-300';
    return 'bg-blue-300 border-blue-200';
  };

  const getActivityLevel = (value: number): string => {
    if (value < 20) return 'Low';
    if (value < 40) return 'Moderate';
    if (value < 60) return 'High';
    if (value < 80) return 'Very High';
    return 'Peak';
  };

  const formatTime = (hour: number): string => {
    if (hour === 0) return '12am';
    if (hour < 12) return `${hour}am`;
    if (hour === 12) return '12pm';
    return `${hour - 12}pm`;
  };

  if (isLoading) {
    return (
      <Widget {...widgetProps}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </Widget>
    );
  }

  return (
    <Widget {...widgetProps}>
      <div className="space-y-3">
        {/* Compact Summary Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-sm font-bold text-white">{summary?.activeUsers}</div>
              <div className="text-xs text-white/60">Users</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-blue-400">{summary?.totalSessions.toLocaleString()}</div>
              <div className="text-xs text-white/60">Sessions</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/70">
              Peak: <span className="text-white font-medium">{summary?.peakDay} {summary?.peakHour}</span>
            </div>
            <div className="flex items-center space-x-1 mt-1">
              <div className="w-1.5 h-1.5 bg-gray-800 rounded-sm"></div>
              <div className="w-1.5 h-1.5 bg-blue-900/40 rounded-sm"></div>
              <div className="w-1.5 h-1.5 bg-blue-800/60 rounded-sm"></div>
              <div className="w-1.5 h-1.5 bg-blue-600/80 rounded-sm"></div>
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-sm"></div>
              <div className="w-1.5 h-1.5 bg-blue-300 rounded-sm"></div>
            </div>
          </div>
        </div>

        {/* Compact Landscape Heatmap */}
        <div className="glass-panel p-3 rounded-lg">
          <div className="space-y-2">
            {/* Hour labels - simplified */}
            <div className="flex items-center">
              <div className="w-6"></div> {/* Space for day labels */}
              <div className="flex-1 grid grid-cols-12 gap-0.5">
                {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map(hour => (
                  <div key={hour} className="text-xs text-white/60 text-center">
                    {hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour-12}p`}
                  </div>
                ))}
              </div>
            </div>

            {/* Compact Heatmap grid - show every 2 hours */}
            <div className="space-y-0.5">
              {days.map((day, dayIndex) => (
                <div key={day} className="flex items-center">
                  <div className="w-6 text-xs text-white/60 text-right pr-1">
                    {day}
                  </div>
                  <div className="flex-1 grid grid-cols-12 gap-0.5">
                    {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map(hour => {
                      const cellData = heatmapData.find(d => d.day === dayIndex && d.hour === hour);
                      return (
                        <motion.div
                          key={`${dayIndex}-${hour}`}
                          className={`
                            w-full h-3 rounded-sm border cursor-pointer
                            transition-all duration-200 hover:scale-110 hover:z-10 relative
                            ${getIntensityColor(cellData?.value || 0)}
                            ${selectedCell === cellData ? 'ring-1 ring-white/50' : ''}
                          `}
                          onClick={() => setSelectedCell(cellData || null)}
                          onMouseEnter={() => showTooltips && setSelectedCell(cellData || null)}
                          onMouseLeave={() => showTooltips && setSelectedCell(null)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Compact Tooltip */}
        {selectedCell && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-2 rounded-lg"
          >
            <div className="flex items-center justify-between text-xs">
              <div className="text-white/90">
                {days[selectedCell.day]} at {formatTime(selectedCell.hour)} • {selectedCell.count} activities
              </div>
              <div className="text-blue-400 font-medium">
                {Math.round(selectedCell.value)}% {getActivityLevel(selectedCell.value)}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </Widget>
  );
};

export default UserActivityHeatmapWidget;