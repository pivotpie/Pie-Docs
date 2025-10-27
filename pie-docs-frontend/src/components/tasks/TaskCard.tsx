import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { RootState, AppDispatch } from '@/store';
import { Task, TaskPriority, toggleTaskSelection } from '@/store/slices/tasksSlice';
import TaskDetails from './TaskDetails';
import TaskAssignment from './TaskAssignment';

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, isDragging = false }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedTasks } = useSelector((state: RootState) => state.tasks);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showAssignment, setShowAssignment] = useState(false);

  const isSelected = selectedTasks.includes(task.id);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: task.id,
    disabled: isDragging,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-blue-500';
      case 'low':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPriorityText = (priority: TaskPriority) => {
    switch (priority) {
      case 'critical':
        return 'Critical';
      case 'high':
        return 'High';
      case 'medium':
        return 'Medium';
      case 'low':
        return 'Low';
      default:
        return 'Low';
    }
  };

  const isOverdue = task.deadline && new Date(task.deadline) < new Date();
  const isDueSoon = task.deadline && new Date(task.deadline) <= new Date(Date.now() + 24 * 60 * 60 * 1000);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    dispatch(toggleTaskSelection(task.id));
  };

  const handleCardClick = () => {
    if (!isDragging && !isSortableDragging) {
      setShowDetails(true);
    }
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      <motion.div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`bg-white rounded-lg border shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md ${
          isSelected ? 'ring-2 ring-blue-500 border-blue-300' : 'border-gray-200'
        } ${isSortableDragging ? 'opacity-50' : ''} ${
          isOverdue ? 'border-l-4 border-l-red-500' : isDueSoon ? 'border-l-4 border-l-orange-500' : ''
        }`}
        onClick={handleCardClick}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start space-x-3 flex-1">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={handleCheckboxChange}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900 leading-tight">
                  {task.title}
                </h4>
                {task.documentTitle && (
                  <p className="text-xs text-blue-600 mt-1">📄 {task.documentTitle}</p>
                )}
              </div>
            </div>

            {/* Priority Badge */}
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${getPriorityColor(
                task.priority
              )}`}
            >
              {getPriorityText(task.priority)}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>

          {/* Meta Information */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAssignment(true);
                }}
                className="flex items-center hover:bg-gray-100 rounded px-1 py-0.5 transition-colors"
                title="Reassign task"
              >
                <img
                  src={task.assignee.avatar || `https://ui-avatars.com/api/?name=${task.assignee.name}&size=20`}
                  alt={task.assignee.name}
                  className="w-5 h-5 rounded-full"
                />
                <span className="ml-1">{task.assignee.name}</span>
              </button>
              {task.comments.length > 0 && (
                <div className="flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-2.172-.266l-3.828 1.914a1 1 0 01-1.414-1.414l1.914-3.828A8.955 8.955 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                  </svg>
                  {task.comments.length}
                </div>
              )}
              {task.attachments.length > 0 && (
                <div className="flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  {task.attachments.length}
                </div>
              )}
            </div>

            {/* Deadline */}
            {task.deadline && (
              <div className={`flex items-center ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-orange-600' : ''}`}>
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {new Date(task.deadline).toLocaleDateString()}
              </div>
            )}
          </div>

          {/* Tags */}
          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {task.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                >
                  {tag}
                </span>
              ))}
              {task.tags.length > 3 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                  +{task.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Expand Toggle */}
          <button
            onClick={handleToggleExpand}
            className="mt-3 flex items-center text-xs text-blue-600 hover:text-blue-800"
          >
            <span>{isExpanded ? 'Show less' : 'Show more'}</span>
            <svg
              className={`w-3 h-3 ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Expanded Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 pt-3 border-t border-gray-100"
              >
                <div className="space-y-2 text-sm text-gray-600">
                  <div><strong>Assigned by:</strong> {task.assignedBy.name}</div>
                  {task.estimatedHours && (
                    <div><strong>Estimated:</strong> {task.estimatedHours}h</div>
                  )}
                  {task.actualHours && (
                    <div><strong>Actual:</strong> {task.actualHours}h</div>
                  )}
                  <div><strong>Created:</strong> {new Date(task.createdAt).toLocaleDateString()}</div>
                  <div><strong>Updated:</strong> {new Date(task.updatedAt).toLocaleDateString()}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Task Details Modal */}
      <TaskDetails
        task={task}
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
      />

      {/* Task Assignment Modal */}
      <TaskAssignment
        task={task}
        isOpen={showAssignment}
        onClose={() => setShowAssignment(false)}
      />
    </>
  );
};

export default TaskCard;