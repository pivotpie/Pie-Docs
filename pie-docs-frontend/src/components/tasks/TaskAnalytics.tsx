import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

const TaskAnalytics: React.FC = () => {
  const { metrics, allTasks } = useSelector((state: RootState) => state.tasks);

  // Calculate real-time metrics from current tasks
  const calculateMetrics = () => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const completedTasks = allTasks.filter(task => task.status === 'completed');
    const overdueTasks = allTasks.filter(task =>
      task.deadline && new Date(task.deadline) < now && task.status !== 'completed'
    );

    const completedThisWeek = completedTasks.filter(task =>
      new Date(task.updatedAt) >= oneWeekAgo
    ).length;

    const completedThisMonth = completedTasks.filter(task =>
      new Date(task.updatedAt) >= oneMonthAgo
    ).length;

    const completionRate = allTasks.length > 0
      ? Math.round((completedTasks.length / allTasks.length) * 100)
      : 0;

    return {
      completionRate,
      tasksCompletedThisWeek: completedThisWeek,
      tasksCompletedThisMonth: completedThisMonth,
      overdueTasksCount: overdueTasks.length,
      totalTasksAssigned: allTasks.length,
    };
  };

  const currentMetrics = calculateMetrics();

  const StatCard: React.FC<{
    title: string;
    value: number | string;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    icon: React.ReactNode;
  }> = ({ title, value, change, changeType = 'neutral', icon }) => {
    const getChangeColor = () => {
      switch (changeType) {
        case 'positive': return 'text-green-600';
        case 'negative': return 'text-red-600';
        default: return 'text-gray-500';
      }
    };

    return (
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {change && (
              <p className={`text-xs ${getChangeColor()}`}>
                {change}
              </p>
            )}
          </div>
          <div className="text-blue-500">
            {icon}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Quick Stats</h3>

      <div className="space-y-3">
        <StatCard
          title="Completion Rate"
          value={`${currentMetrics.completionRate}%`}
          change="+5% from last week"
          changeType="positive"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />

        <StatCard
          title="Completed This Week"
          value={currentMetrics.tasksCompletedThisWeek}
          change="+3 from last week"
          changeType="positive"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <StatCard
          title="Overdue Tasks"
          value={currentMetrics.overdueTasksCount}
          change={currentMetrics.overdueTasksCount > 0 ? "Needs attention" : "All up to date"}
          changeType={currentMetrics.overdueTasksCount > 0 ? "negative" : "positive"}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <StatCard
          title="Total Tasks"
          value={currentMetrics.totalTasksAssigned}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          }
        />
      </div>

      {/* Quick Actions */}
      <div className="pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h4>
        <div className="space-y-2">
          <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
            📊 View detailed analytics
          </button>
          <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
            📅 Schedule review meeting
          </button>
          <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
            📈 Export performance report
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskAnalytics;