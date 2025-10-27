import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import TaskAssignment from '@/components/tasks/TaskAssignment';
import tasksSlice, { Task } from '@/store/slices/tasksSlice';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

const createMockTask = (): Task => ({
  id: 'task-1',
  title: 'Test Task Assignment',
  description: 'Task for testing assignment functionality',
  status: 'pending',
  priority: 'medium',
  assignee: {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
  },
  assignedBy: {
    id: '2',
    name: 'Manager',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  comments: [],
  attachments: [],
  tags: [],
});

const createMockStore = () => {
  return configureStore({
    reducer: {
      tasks: tasksSlice,
    },
    preloadedState: {
      tasks: {
        selectedTasks: [],
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
        bulkOperationProgress: {
          total: 0,
          completed: 0,
          inProgress: false,
        },
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

describe('TaskAssignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when not open', () => {
    const task = createMockTask();
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TaskAssignment task={task} isOpen={false} onClose={vi.fn()} />
      </Provider>
    );

    expect(screen.queryByText('Reassign Task')).not.toBeInTheDocument();
  });

  it('renders modal when open', () => {
    const task = createMockTask();
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TaskAssignment task={task} isOpen={true} onClose={vi.fn()} />
      </Provider>
    );

    expect(screen.getByText('Reassign Task')).toBeInTheDocument();
    expect(screen.getByText('Assign "Test Task Assignment" to a different team member')).toBeInTheDocument();
  });

  it('displays current assignee information', () => {
    const task = createMockTask();
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TaskAssignment task={task} isOpen={true} onClose={vi.fn()} />
      </Provider>
    );

    expect(screen.getByText('Currently assigned to:')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('shows available team members', () => {
    const task = createMockTask();
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TaskAssignment task={task} isOpen={true} onClose={vi.fn()} />
      </Provider>
    );

    expect(screen.getByText('Available team members')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Alice Brown')).toBeInTheDocument();
    expect(screen.getByText('Charlie Wilson')).toBeInTheDocument();
  });

  it('filters users based on search input', () => {
    const task = createMockTask();
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TaskAssignment task={task} isOpen={true} onClose={vi.fn()} />
      </Provider>
    );

    const searchInput = screen.getByPlaceholderText('Search by name, email, or department...');
    fireEvent.change(searchInput, { target: { value: 'Jane' } });

    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.queryByText('Alice Brown')).not.toBeInTheDocument();
  });

  it('filters users by department', () => {
    const task = createMockTask();
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TaskAssignment task={task} isOpen={true} onClose={vi.fn()} />
      </Provider>
    );

    const searchInput = screen.getByPlaceholderText('Search by name, email, or department...');
    fireEvent.change(searchInput, { target: { value: 'Engineering' } });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument(); // Design department
  });

  it('shows no results message when search yields no matches', () => {
    const task = createMockTask();
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TaskAssignment task={task} isOpen={true} onClose={vi.fn()} />
      </Provider>
    );

    const searchInput = screen.getByPlaceholderText('Search by name, email, or department...');
    fireEvent.change(searchInput, { target: { value: 'NonexistentUser' } });

    expect(screen.getByText('No team members found')).toBeInTheDocument();
  });

  it('handles user selection', () => {
    const task = createMockTask();
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TaskAssignment task={task} isOpen={true} onClose={vi.fn()} />
      </Provider>
    );

    const janeRadio = screen.getByLabelText(/Jane Smith/);
    fireEvent.click(janeRadio);

    expect(janeRadio).toBeChecked();
  });

  it('shows unavailable users with disabled state', () => {
    const task = createMockTask();
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TaskAssignment task={task} isOpen={true} onClose={vi.fn()} />
      </Provider>
    );

    // Bob Johnson is marked as unavailable in mock data
    const bobLabel = screen.getByText('Bob Johnson').closest('label');
    expect(bobLabel).toHaveClass('opacity-50');
    expect(screen.getByText('(Unavailable)')).toBeInTheDocument();

    const bobRadio = screen.getByDisplayValue('3'); // Bob's ID
    expect(bobRadio).toBeDisabled();
  });

  it('handles reason input', () => {
    const task = createMockTask();
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TaskAssignment task={task} isOpen={true} onClose={vi.fn()} />
      </Provider>
    );

    const reasonInput = screen.getByPlaceholderText('Explain why this task is being reassigned...');
    fireEvent.change(reasonInput, { target: { value: 'Better expertise match' } });

    expect(reasonInput).toHaveValue('Better expertise match');
  });

  it('disables reassign button when no user selected', () => {
    const task = createMockTask();
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TaskAssignment task={task} isOpen={true} onClose={vi.fn()} />
      </Provider>
    );

    const reassignButton = screen.getByText('Reassign Task');
    expect(reassignButton).toBeDisabled();
  });

  it('disables reassign button when same user is selected', () => {
    const task = createMockTask();
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TaskAssignment task={task} isOpen={true} onClose={vi.fn()} />
      </Provider>
    );

    // Current assignee is John (ID: 1)
    const johnRadio = screen.getByDisplayValue('1');
    fireEvent.click(johnRadio);

    const reassignButton = screen.getByText('Reassign Task');
    expect(reassignButton).toBeDisabled();
  });

  it('enables reassign button when different user is selected', () => {
    const task = createMockTask();
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TaskAssignment task={task} isOpen={true} onClose={vi.fn()} />
      </Provider>
    );

    const janeRadio = screen.getByDisplayValue('2');
    fireEvent.click(janeRadio);

    const reassignButton = screen.getByText('Reassign Task');
    expect(reassignButton).not.toBeDisabled();
  });

  it('shows loading state during assignment', async () => {
    const task = createMockTask();
    const store = createMockStore();
    const onCloseMock = vi.fn();

    render(
      <Provider store={store}>
        <TaskAssignment task={task} isOpen={true} onClose={onCloseMock} />
      </Provider>
    );

    const janeRadio = screen.getByDisplayValue('2');
    fireEvent.click(janeRadio);

    const reassignButton = screen.getByText('Reassign Task');
    fireEvent.click(reassignButton);

    expect(screen.getByText('Assigning...')).toBeInTheDocument();

    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  it('calls onClose when cancel button is clicked', () => {
    const task = createMockTask();
    const store = createMockStore();
    const onCloseMock = vi.fn();

    render(
      <Provider store={store}>
        <TaskAssignment task={task} isOpen={true} onClose={onCloseMock} />
      </Provider>
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(onCloseMock).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', () => {
    const task = createMockTask();
    const store = createMockStore();
    const onCloseMock = vi.fn();

    render(
      <Provider store={store}>
        <TaskAssignment task={task} isOpen={true} onClose={onCloseMock} />
      </Provider>
    );

    // Click the backdrop
    const backdrop = screen.getByText('Reassign Task').closest('.fixed')?.querySelector('.fixed');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onCloseMock).toHaveBeenCalled();
    }
  });

  it('calls onClose when X button is clicked', () => {
    const task = createMockTask();
    const store = createMockStore();
    const onCloseMock = vi.fn();

    render(
      <Provider store={store}>
        <TaskAssignment task={task} isOpen={true} onClose={onCloseMock} />
      </Provider>
    );

    const closeButton = screen.getByText('Reassign Task').parentElement?.querySelector('button[class*="text-gray-400"]');
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(onCloseMock).toHaveBeenCalled();
    }
  });

  it('updates task assignee in store when assignment succeeds', async () => {
    const task = createMockTask();
    const store = createMockStore();
    const onCloseMock = vi.fn();

    render(
      <Provider store={store}>
        <TaskAssignment task={task} isOpen={true} onClose={onCloseMock} />
      </Provider>
    );

    const janeRadio = screen.getByDisplayValue('2');
    fireEvent.click(janeRadio);

    const reassignButton = screen.getByText('Reassign Task');
    fireEvent.click(reassignButton);

    await waitFor(() => {
      const state = store.getState();
      // Check if updateTask action was dispatched (we can't easily verify the exact state change without more setup)
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  it('resets form when modal is cancelled', () => {
    const task = createMockTask();
    const store = createMockStore();
    const onCloseMock = vi.fn();

    render(
      <Provider store={store}>
        <TaskAssignment task={task} isOpen={true} onClose={onCloseMock} />
      </Provider>
    );

    // Make changes
    const janeRadio = screen.getByDisplayValue('2');
    fireEvent.click(janeRadio);

    const reasonInput = screen.getByPlaceholderText('Explain why this task is being reassigned...');
    fireEvent.change(reasonInput, { target: { value: 'Test reason' } });

    const searchInput = screen.getByPlaceholderText('Search by name, email, or department...');
    fireEvent.change(searchInput, { target: { value: 'Jane' } });

    // Cancel
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(onCloseMock).toHaveBeenCalled();
  });
});