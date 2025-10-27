import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { AppDispatch } from '@/store';
import { updateTask, Task } from '@/store/slices/tasksSlice';

interface TaskAssignmentProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  department: string;
  isAvailable: boolean;
}

// Mock users for assignment
const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    department: 'Engineering',
    isAvailable: true,
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    department: 'Design',
    isAvailable: true,
  },
  {
    id: '3',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    department: 'Product',
    isAvailable: false,
  },
  {
    id: '4',
    name: 'Alice Brown',
    email: 'alice@example.com',
    department: 'QA',
    isAvailable: true,
  },
  {
    id: '5',
    name: 'Charlie Wilson',
    email: 'charlie@example.com',
    department: 'DevOps',
    isAvailable: true,
  },
];

const TaskAssignment: React.FC<TaskAssignmentProps> = ({ task, isOpen, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [selectedUser, setSelectedUser] = useState<string>(task.assignee.id);
  const [reason, setReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredUsers = mockUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAssignment = async () => {
    if (!selectedUser || selectedUser === task.assignee.id) {
      return;
    }

    setIsSubmitting(true);

    try {
      const newAssignee = mockUsers.find(user => user.id === selectedUser);
      if (!newAssignee) return;

      // Update the task with new assignee
      dispatch(updateTask({
        id: task.id,
        assignee: {
          id: newAssignee.id,
          name: newAssignee.name,
          email: newAssignee.email,
          avatar: newAssignee.avatar,
        },
        updatedAt: new Date(),
      }));

      // In a real app, this would also create an audit log entry
      // and send notifications to both old and new assignees

      onClose();
    } catch (error) {
      console.error('Assignment failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedUser(task.assignee.id);
    setReason('');
    setSearchQuery('');
    onClose();
  };

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
            className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
            onClick={handleCancel}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Reassign Task</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Assign "{task.title}" to a different team member
                </p>
              </div>
              <button
                onClick={handleCancel}
                className="ml-4 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Current Assignee */}
            <div className="mb-6 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Currently assigned to:</p>
              <div className="flex items-center space-x-3">
                <img
                  src={task.assignee.avatar || `https://ui-avatars.com/api/?name=${task.assignee.name}&size=32`}
                  alt={task.assignee.name}
                  className="w-8 h-8 rounded-full"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{task.assignee.name}</p>
                  <p className="text-xs text-gray-500">{task.assignee.email}</p>
                </div>
              </div>
            </div>

            {/* User Search */}
            <div className="mb-4">
              <label htmlFor="user-search" className="block text-sm font-medium text-gray-700 mb-2">
                Search team members
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  id="user-search"
                  type="text"
                  placeholder="Search by name, email, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* User List */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Available team members</p>
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                {filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <p className="text-sm">No team members found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredUsers.map(user => (
                      <label
                        key={user.id}
                        className={`flex items-center space-x-3 p-3 cursor-pointer hover:bg-gray-50 ${
                          !user.isAvailable ? 'opacity-50' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="assignee"
                          value={user.id}
                          checked={selectedUser === user.id}
                          onChange={(e) => setSelectedUser(e.target.value)}
                          disabled={!user.isAvailable}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <img
                          src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&size=32`}
                          alt={user.name}
                          className="w-8 h-8 rounded-full"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {user.name}
                            {!user.isAvailable && (
                              <span className="ml-2 text-xs text-red-600">(Unavailable)</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                          <p className="text-xs text-gray-400">{user.department}</p>
                        </div>
                        {selectedUser === user.id && (
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Reason */}
            <div className="mb-6">
              <label htmlFor="assignment-reason" className="block text-sm font-medium text-gray-700 mb-2">
                Reason for reassignment (optional)
              </label>
              <textarea
                id="assignment-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this task is being reassigned..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignment}
                disabled={!selectedUser || selectedUser === task.assignee.id || isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Assigning...
                  </div>
                ) : (
                  'Reassign Task'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default TaskAssignment;