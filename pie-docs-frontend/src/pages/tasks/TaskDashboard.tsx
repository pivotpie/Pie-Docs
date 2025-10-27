import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { setCurrentView, setTasks } from '@/store/slices/tasksSlice';
import KanbanBoard from '@/components/tasks/KanbanBoard';
import TaskCalendar from '@/components/tasks/TaskCalendar';
import TaskFilters from '@/components/tasks/TaskFilters';
import BulkOperations from '@/components/tasks/BulkOperations';
import NotificationCenter from '@/components/tasks/NotificationCenter';
import TaskAnalytics from '@/components/tasks/TaskAnalytics';
import { mockTaskService } from '@/services/mockTaskService';

const TaskDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { currentView, selectedTasks, loading, error } = useSelector((state: RootState) => state.tasks);

  useEffect(() => {
    // Load initial tasks
    const loadTasks = async () => {
      try {
        const tasks = await mockTaskService.getUserTasks({});
        dispatch(setTasks(tasks));
      } catch (error) {
        console.error('Failed to load tasks:', error);
      }
    };

    loadTasks();
  }, [dispatch]);

  const handleViewChange = (view: 'kanban' | 'calendar' | 'list') => {
    dispatch(setCurrentView(view));
  };

  if (loading.tasks) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Tasks</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Task Dashboard</h1>
            </div>

            {/* View Toggle */}
            <div className="flex items-center space-x-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => handleViewChange('kanban')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'kanban'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Kanban
                </button>
                <button
                  onClick={() => handleViewChange('calendar')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'calendar'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Calendar
                </button>
              </div>

              <NotificationCenter />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Analytics */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <div className="lg:col-span-3">
            <TaskFilters />
          </div>
          <div className="lg:col-span-1">
            <TaskAnalytics />
          </div>
        </div>

        {/* Bulk Operations */}
        {selectedTasks.length > 0 && (
          <div className="mb-6">
            <BulkOperations />
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {currentView === 'kanban' && <KanbanBoard />}
          {currentView === 'calendar' && <TaskCalendar />}
        </div>
      </div>
    </div>
  );
};

export default TaskDashboard;