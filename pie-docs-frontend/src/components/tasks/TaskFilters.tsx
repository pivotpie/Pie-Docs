import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { updateFilters, TaskPriority, TaskStatus } from '@/store/slices/tasksSlice';

const TaskFilters: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { filters } = useSelector((state: RootState) => state.tasks);

  const priorities: TaskPriority[] = ['low', 'medium', 'high', 'critical'];
  const statuses: TaskStatus[] = ['pending', 'inProgress', 'completed'];

  const handleSearchChange = (search: string) => {
    dispatch(updateFilters({ search }));
  };

  const handlePriorityToggle = (priority: TaskPriority) => {
    const newPriorities = filters.priority.includes(priority)
      ? filters.priority.filter(p => p !== priority)
      : [...filters.priority, priority];

    dispatch(updateFilters({ priority: newPriorities }));
  };

  const handleStatusToggle = (status: TaskStatus) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];

    dispatch(updateFilters({ status: newStatuses }));
  };

  const clearFilters = () => {
    dispatch(updateFilters({
      search: '',
      priority: [],
      status: [],
      assignee: [],
      tags: [],
      dateRange: { start: null, end: null },
    }));
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'inProgress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="flex-1 min-w-64">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search tasks..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Priority:</span>
          <div className="flex space-x-1">
            {priorities.map(priority => (
              <button
                key={priority}
                onClick={() => handlePriorityToggle(priority)}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                  filters.priority.includes(priority)
                    ? getPriorityColor(priority)
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Status:</span>
          <div className="flex space-x-1">
            {statuses.map(status => (
              <button
                key={status}
                onClick={() => handleStatusToggle(status)}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                  filters.status.includes(status)
                    ? getStatusColor(status)
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {status === 'inProgress' ? 'In Progress' :
                 status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Clear Filters */}
        {(filters.search || filters.priority.length > 0 || filters.status.length > 0) && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
};

export default TaskFilters;