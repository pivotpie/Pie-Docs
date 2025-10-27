import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { clearTaskSelection, setBulkOperationProgress } from '@/store/slices/tasksSlice';
import { mockTaskService } from '@/services/mockTaskService';

const BulkOperations: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedTasks, bulkOperationProgress } = useSelector((state: RootState) => state.tasks);

  const handleBulkAction = async (action: 'complete' | 'approve' | 'reject') => {
    if (selectedTasks.length === 0) return;

    dispatch(setBulkOperationProgress({
      total: selectedTasks.length,
      completed: 0,
      inProgress: true,
    }));

    try {
      await mockTaskService.bulkUpdateTasks(selectedTasks, action);

      dispatch(setBulkOperationProgress({
        completed: selectedTasks.length,
        inProgress: false,
      }));

      // Clear selection after successful operation
      setTimeout(() => {
        dispatch(clearTaskSelection());
        dispatch(setBulkOperationProgress({
          total: 0,
          completed: 0,
          inProgress: false,
        }));
      }, 1000);

    } catch (error) {
      console.error('Bulk operation failed:', error);
      dispatch(setBulkOperationProgress({
        inProgress: false,
      }));
    }
  };

  if (bulkOperationProgress.inProgress) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-sm font-medium text-gray-900">
              Processing {bulkOperationProgress.completed} of {bulkOperationProgress.total} tasks...
            </span>
          </div>
          <div className="w-32 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(bulkOperationProgress.completed / bulkOperationProgress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={true}
              readOnly
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm font-medium text-gray-900">
              {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''} selected
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleBulkAction('approve')}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Approve
          </button>

          <button
            onClick={() => handleBulkAction('complete')}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Complete
          </button>

          <button
            onClick={() => handleBulkAction('reject')}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reject
          </button>

          <button
            onClick={() => dispatch(clearTaskSelection())}
            className="text-sm text-gray-500 hover:text-gray-700 px-2"
          >
            Clear selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkOperations;