import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Task } from '@/store/slices/tasksSlice';

const TaskCalendar: React.FC = () => {
  const { allTasks } = useSelector((state: RootState) => state.tasks);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

  // Get tasks with deadlines
  const tasksWithDeadlines = allTasks.filter(task => task.deadline);

  // Calendar navigation
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  // Get calendar days for month view
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);

    while (current <= lastDay || current.getDay() !== 0) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);

      if (days.length > 42) break; // Safety net
    }

    return days;
  };

  // Get tasks for a specific date
  const getTasksForDate = (date: Date): Task[] => {
    return tasksWithDeadlines.filter(task => {
      if (!task.deadline) return false;
      const taskDate = new Date(task.deadline);
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-blue-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  if (view === 'month') {
    const calendarDays = getCalendarDays();

    return (
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {formatMonth(currentDate)}
            </h2>
            <div className="flex space-x-1">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-gray-100 rounded-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-gray-100 rounded-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setView('month')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  view === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setView('week')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  view === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setView('day')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  view === 'day' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                Day
              </button>
            </div>

            {/* Export buttons for month view */}
            <div className="flex space-x-2">
              <button
                onClick={exportToICal}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                title="Export calendar to iCal format"
              >
                📅 Export
              </button>
              <button
                onClick={exportToGoogleCalendar}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                title="Add to Google Calendar"
              >
                📆 Google
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white border rounded-lg overflow-hidden">
          {/* Week Header */}
          <div className="grid grid-cols-7 bg-gray-50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="px-4 py-3 text-sm font-medium text-gray-500 text-center border-r border-gray-200 last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => {
              const dayTasks = getTasksForDate(day);
              const isCurrentMonthDay = isCurrentMonth(day);
              const isTodayDay = isToday(day);

              return (
                <div
                  key={index}
                  className={`min-h-32 p-2 border-r border-b border-gray-200 last:border-r-0 ${
                    isCurrentMonthDay ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isTodayDay
                      ? 'w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center'
                      : isCurrentMonthDay ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {day.getDate()}
                  </div>

                  {/* Tasks for this day */}
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map(task => (
                      <div
                        key={task.id}
                        className={`text-xs p-1 rounded text-white truncate ${getPriorityColor(task.priority)}`}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-gray-600">Critical</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span className="text-gray-600">High</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-gray-600">Medium</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-500 rounded"></div>
            <span className="text-gray-600">Low</span>
          </div>
        </div>
      </div>
    );
  }

  // Calendar export functionality
  const exportToICal = () => {
    const icalData = generateICalData(tasksWithDeadlines);
    const blob = new Blob([icalData], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tasks-calendar.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generateICalData = (tasks: Task[]) => {
    const now = new Date();
    const icalHeader = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//PieDocs//Task Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ].join('\r\n');

    const icalEvents = tasks.map(task => {
      if (!task.deadline) return '';

      const deadline = new Date(task.deadline);
      const dtStart = deadline.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const dtEnd = new Date(deadline.getTime() + 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const uid = `task-${task.id}@piedocs.com`;

      return [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:Task: ${task.title}`,
        `DESCRIPTION:${task.description.replace(/\n/g, '\\n')}`,
        `PRIORITY:${task.priority === 'critical' ? '1' : task.priority === 'high' ? '3' : task.priority === 'medium' ? '5' : '7'}`,
        `STATUS:${task.status === 'completed' ? 'COMPLETED' : 'NEEDS-ACTION'}`,
        'END:VEVENT',
      ].join('\r\n');
    }).filter(Boolean);

    const icalFooter = 'END:VCALENDAR';

    return [icalHeader, ...icalEvents, icalFooter].join('\r\n');
  };

  const exportToGoogleCalendar = () => {
    const baseUrl = 'https://calendar.google.com/calendar/render';
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: 'PieDocs Tasks',
      details: `${tasksWithDeadlines.length} tasks with deadlines from PieDocs`,
      dates: `${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`
    });

    window.open(`${baseUrl}?${params.toString()}`, '_blank');
  };

  // Drag and drop functionality for deadline rescheduling
  const handleTaskDrop = (taskId: string, newDate: Date) => {
    // In a real implementation, this would update the task deadline
    console.log(`Rescheduling task ${taskId} to ${newDate.toLocaleDateString()}`);
    // dispatch(updateTask({ id: taskId, deadline: newDate }));
  };

  // Placeholder for week and day views with export options
  return (
    <div className="p-6">
      {/* Export Controls */}
      <div className="mb-6 flex justify-end space-x-2">
        <button
          onClick={exportToICal}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          📅 Export iCal
        </button>
        <button
          onClick={exportToGoogleCalendar}
          className="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          📆 Add to Google Calendar
        </button>
      </div>

      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {view === 'week' ? 'Week View' : 'Day View'}
        </h3>
        <p className="text-gray-500">Week and Day views coming soon! You can export your calendar using the buttons above.</p>
        <button
          onClick={() => setView('month')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Month View
        </button>
      </div>
    </div>
  );
};

export default TaskCalendar;