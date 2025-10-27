import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '@/store/slices/tasksSlice';
import { useTheme } from '@/contexts/ThemeContext';

interface TaskDetailsProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
}

const TaskDetails: React.FC<TaskDetailsProps> = ({ task, isOpen, onClose }) => {
  const { theme } = useTheme();
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="inline-block align-bottom modal-glass rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all hover:scale-105 sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>{task.title}</h3>
                <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>
                  Assigned to {task.assignee.name} by {task.assignedBy.name}
                </p>
              </div>
              <button
                onClick={onClose}
                className={`ml-4 hover:scale-110 transition-all duration-300 ${theme === 'dark' ? 'text-white/60 hover:text-white/80' : 'text-white/60 hover:text-white/80'}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h4 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>Description</h4>
                <p className={`text-sm whitespace-pre-wrap ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>{task.description}</p>
              </div>

              {/* Meta Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>Priority</h4>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${
                    task.priority === 'critical' ? 'bg-red-500' :
                    task.priority === 'high' ? 'bg-orange-500' :
                    task.priority === 'medium' ? 'bg-blue-500' : 'bg-gray-500'
                  }`}>
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                  </span>
                </div>

                <div>
                  <h4 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>Status</h4>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    task.status === 'completed' ? 'bg-green-100 text-green-800' :
                    task.status === 'inProgress' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {task.status === 'inProgress' ? 'In Progress' :
                     task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                  </span>
                </div>

                {task.deadline && (
                  <div>
                    <h4 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>Deadline</h4>
                    <p className={`text-sm ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>{new Date(task.deadline).toLocaleDateString()}</p>
                  </div>
                )}

                <div>
                  <h4 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>Created</h4>
                  <p className={`text-sm ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>{new Date(task.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Tags */}
              {task.tags.length > 0 && (
                <div>
                  <h4 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {task.tags.map(tag => (
                      <span
                        key={tag}
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs glass-panel border border-white/20 ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              {task.comments.length > 0 && (
                <div>
                  <h4 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>Comments ({task.comments.length})</h4>
                  <div className="space-y-3 max-h-40 overflow-y-auto">
                    {task.comments.map(comment => (
                      <div key={comment.id} className="flex space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 glass-panel rounded-full flex items-center justify-center border border-white/20">
                            <span className={`text-xs font-medium ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>
                              {comment.authorName.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>{comment.authorName}</span>
                            <span className={`text-xs ${theme === 'dark' ? 'text-white/60' : 'text-white/60'}`}>
                              {new Date(comment.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {task.attachments.length > 0 && (
                <div>
                  <h4 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>Attachments ({task.attachments.length})</h4>
                  <div className="space-y-2">
                    {task.attachments.map(attachment => (
                      <div key={attachment.id} className="flex items-center space-x-2 p-2 glass-panel rounded border border-white/20">
                        <svg className={`w-4 h-4 ${theme === 'dark' ? 'text-white/60' : 'text-white/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span className={`text-sm flex-1 ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>{attachment.name}</span>
                        <span className={`text-xs ${theme === 'dark' ? 'text-white/60' : 'text-white/60'}`}>{(attachment.size / 1024).toFixed(1)} KB</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                className={`btn-glass px-4 py-2 text-sm font-medium hover:scale-105 transition-all duration-300 ${theme === 'dark' ? 'text-white/90 hover:text-white' : 'text-white/90 hover:text-white'}`}
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default TaskDetails;