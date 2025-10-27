import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import BulkOperations from '@/components/tasks/BulkOperations';
import tasksSlice from '@/store/slices/tasksSlice';
import * as mockTaskService from '@/services/mockTaskService';

// Mock the task service
vi.mock('@/services/mockTaskService', () => ({
  mockTaskService: {
    bulkUpdateTasks: vi.fn(),
  },
}));

const createMockStore = (selectedTasks: string[] = [], bulkOperationProgress = { total: 0, completed: 0, inProgress: false }) => {
  return configureStore({
    reducer: {
      tasks: tasksSlice,
    },
    preloadedState: {
      tasks: {
        selectedTasks,
        bulkOperationProgress,
        tasksByStatus: { pending: [], inProgress: [], completed: [] },
        allTasks: [],
        filters: {
          priority: [],
          assignee: [],
          dateRange: { start: null, end: null },
          search: '',
          tags: [],
          status: [],
        },
        notifications: {
          preferences: {
            email: {
              taskAssigned: true,
              taskDue: true,
              taskOverdue: true,
              taskCompleted: false,
              taskCommented: true,
            },
            inApp: {
              taskAssigned: true,
              taskDue: true,
              taskOverdue: true,
              taskCompleted: true,
              taskCommented: true,
            },
            digest: {
              enabled: true,
              frequency: 'daily' as const,
              time: '09:00',
            },
          },
          unreadCount: 0,
          history: [],
        },
        metrics: {
          completionRate: 0,
          averageTimeToComplete: 0,
          tasksCompletedThisWeek: 0,
          tasksCompletedThisMonth: 0,
          overdueTasksCount: 0,
          totalTasksAssigned: 0,
          averageResponseTime: 0,
          productivityScore: 0,
        },
        loading: {
          tasks: false,
          bulkOperation: false,
          metrics: false,
        },
        error: null,
        currentView: 'kanban' as const,
      },
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['tasks/setTasks'],
          ignoredPaths: ['tasks.allTasks', 'tasks.tasksByStatus'],
        },
      }),
  });
};

describe('BulkOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays selected task count correctly', () => {
    const store = createMockStore(['task-1', 'task-2', 'task-3']);

    render(
      <Provider store={store}>
        <BulkOperations />
      </Provider>
    );

    expect(screen.getByText('3 tasks selected')).toBeInTheDocument();
  });

  it('shows singular form for single task', () => {
    const store = createMockStore(['task-1']);

    render(
      <Provider store={store}>
        <BulkOperations />
      </Provider>
    );

    expect(screen.getByText('1 task selected')).toBeInTheDocument();
  });

  it('renders all bulk action buttons', () => {
    const store = createMockStore(['task-1', 'task-2']);

    render(
      <Provider store={store}>
        <BulkOperations />
      </Provider>
    );

    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
    expect(screen.getByText('Clear selection')).toBeInTheDocument();
  });

  it('handles approve action', async () => {
    const mockBulkUpdate = vi.mocked(mockTaskService.mockTaskService.bulkUpdateTasks);
    mockBulkUpdate.mockResolvedValue([]);

    const store = createMockStore(['task-1', 'task-2']);

    render(
      <Provider store={store}>
        <BulkOperations />
      </Provider>
    );

    const approveButton = screen.getByText('Approve');

    await act(async () => {
      fireEvent.click(approveButton);
    });

    expect(mockBulkUpdate).toHaveBeenCalledWith(['task-1', 'task-2'], 'approve');
  });

  it('handles complete action', async () => {
    const mockBulkUpdate = vi.mocked(mockTaskService.mockTaskService.bulkUpdateTasks);
    mockBulkUpdate.mockResolvedValue([]);

    const store = createMockStore(['task-1']);

    render(
      <Provider store={store}>
        <BulkOperations />
      </Provider>
    );

    const completeButton = screen.getByText('Complete');

    await act(async () => {
      fireEvent.click(completeButton);
    });

    expect(mockBulkUpdate).toHaveBeenCalledWith(['task-1'], 'complete');
  });

  it('handles reject action', async () => {
    const mockBulkUpdate = vi.mocked(mockTaskService.mockTaskService.bulkUpdateTasks);
    mockBulkUpdate.mockResolvedValue([]);

    const store = createMockStore(['task-1', 'task-2', 'task-3']);

    render(
      <Provider store={store}>
        <BulkOperations />
      </Provider>
    );

    const rejectButton = screen.getByText('Reject');

    await act(async () => {
      fireEvent.click(rejectButton);
    });

    expect(mockBulkUpdate).toHaveBeenCalledWith(['task-1', 'task-2', 'task-3'], 'reject');
  });

  it('clears selection when clear button is clicked', () => {
    const store = createMockStore(['task-1', 'task-2']);

    render(
      <Provider store={store}>
        <BulkOperations />
      </Provider>
    );

    const clearButton = screen.getByText('Clear selection');
    fireEvent.click(clearButton);

    // Check that clear selection action was dispatched
    const state = store.getState();
    expect(state.tasks.selectedTasks).toEqual([]);
  });

  it('shows progress indicator during bulk operation', () => {
    const store = createMockStore(
      ['task-1', 'task-2', 'task-3'],
      { total: 3, completed: 1, inProgress: true }
    );

    render(
      <Provider store={store}>
        <BulkOperations />
      </Provider>
    );

    expect(screen.getByText('Processing 1 of 3 tasks...')).toBeInTheDocument();

    // Check for progress bar with correct class selector
    const progressBar = document.querySelector('.bg-blue-600');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveStyle({ width: '33.33333333333333%' });
  });

  it('shows spinner during bulk operation', () => {
    const store = createMockStore(
      ['task-1', 'task-2'],
      { total: 2, completed: 0, inProgress: true }
    );

    render(
      <Provider store={store}>
        <BulkOperations />
      </Provider>
    );

    // Check for loading spinner
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');
  });

  it('shows zero tasks selected when no tasks selected', () => {
    const store = createMockStore([]); // No selected tasks

    render(
      <Provider store={store}>
        <BulkOperations />
      </Provider>
    );

    // Component still renders but shows zero tasks selected
    expect(screen.getByText('0 tasks selected')).toBeInTheDocument();
    expect(screen.getByText('Approve')).toBeInTheDocument();
  });

  it('handles bulk operation errors gracefully', async () => {
    const mockBulkUpdate = vi.mocked(mockTaskService.mockTaskService.bulkUpdateTasks);
    mockBulkUpdate.mockRejectedValue(new Error('Network error'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const store = createMockStore(['task-1']);

    render(
      <Provider store={store}>
        <BulkOperations />
      </Provider>
    );

    const approveButton = screen.getByText('Approve');

    await act(async () => {
      fireEvent.click(approveButton);
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Bulk operation failed:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('completes bulk operation flow correctly', async () => {
    const mockBulkUpdate = vi.mocked(mockTaskService.mockTaskService.bulkUpdateTasks);
    mockBulkUpdate.mockResolvedValue([]);

    const store = createMockStore(['task-1', 'task-2']);

    render(
      <Provider store={store}>
        <BulkOperations />
      </Provider>
    );

    const completeButton = screen.getByText('Complete');

    await act(async () => {
      fireEvent.click(completeButton);
    });

    // Wait for operation to complete and selection to clear
    await waitFor(() => {
      const state = store.getState();
      expect(state.tasks.bulkOperationProgress.inProgress).toBe(false);
    }, { timeout: 2000 });

    expect(mockBulkUpdate).toHaveBeenCalledWith(['task-1', 'task-2'], 'complete');
  });

  it('shows correct button styles and icons', () => {
    const store = createMockStore(['task-1']);

    render(
      <Provider store={store}>
        <BulkOperations />
      </Provider>
    );

    const approveButton = screen.getByText('Approve');
    const completeButton = screen.getByText('Complete');
    const rejectButton = screen.getByText('Reject');

    // Check button styling classes
    expect(approveButton.closest('button')).toHaveClass('bg-green-600', 'hover:bg-green-700');
    expect(completeButton.closest('button')).toHaveClass('bg-blue-600', 'hover:bg-blue-700');
    expect(rejectButton.closest('button')).toHaveClass('bg-white', 'hover:bg-gray-50');

    // Check for SVG icons within buttons
    expect(approveButton.closest('button')?.querySelector('svg')).toBeInTheDocument();
    expect(completeButton.closest('button')?.querySelector('svg')).toBeInTheDocument();
    expect(rejectButton.closest('button')?.querySelector('svg')).toBeInTheDocument();
  });
});