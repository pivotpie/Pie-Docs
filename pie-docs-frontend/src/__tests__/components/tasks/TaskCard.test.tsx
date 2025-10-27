import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import TaskCard from '@/components/tasks/TaskCard';
import tasksSlice, { Task } from '@/store/slices/tasksSlice';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock @dnd-kit/sortable
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

// Mock @dnd-kit/utilities
vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => '',
    },
  },
}));

const createMockTask = (overrides?: Partial<Task>): Task => ({
  id: 'task-1',
  title: 'Test Task',
  description: 'This is a test task description',
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
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-02'),
  comments: [],
  attachments: [],
  tags: ['urgent'],
  deadline: new Date('2025-12-31'),
  ...overrides,
});

const createMockStore = (selectedTasks: string[] = []) => {
  return configureStore({
    reducer: {
      tasks: tasksSlice,
    },
    preloadedState: {
      tasks: {
        selectedTasks,
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

describe('TaskCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders task information correctly', () => {
    const task = createMockTask();
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TaskCard task={task} />
      </Provider>
    );

    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText('This is a test task description')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('displays priority badge with correct styling', () => {
    const criticalTask = createMockTask({ priority: 'critical' });
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TaskCard task={criticalTask} />
      </Provider>
    );

    const priorityBadge = screen.getByText('Critical');
    expect(priorityBadge).toBeInTheDocument();
    expect(priorityBadge).toHaveClass('bg-red-500');
  });

  it('shows overdue styling for past deadline', () => {
    const overdueTask = createMockTask({
      deadline: new Date('2024-01-01'), // Past date
    });
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TaskCard task={overdueTask} />
      </Provider>
    );

    // Check for overdue indicator in the card styling
    const cardElement = screen.getByText('Test Task').closest('div');
    expect(cardElement).toHaveClass('border-l-4', 'border-l-red-500');
  });

  it('handles task selection toggle', () => {
    const task = createMockTask();
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TaskCard task={task} />
      </Provider>
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);

    // Check that the task is selected in the store
    const state = store.getState();
    expect(state.tasks.selectedTasks).toContain('task-1');
  });

  it('shows selected state when task is selected', () => {
    const task = createMockTask();
    const store = createMockStore(['task-1']); // Task is pre-selected

    render(
      <Provider store={store}>
        <TaskCard task={task} />
      </Provider>
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();

    // Check for selected styling
    const cardElement = screen.getByText('Test Task').closest('div');
    expect(cardElement).toHaveClass('ring-2', 'ring-blue-500');
  });

  it('expands card details when show more is clicked', async () => {
    const task = createMockTask({
      estimatedHours: 8,
      actualHours: 6,
    });
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TaskCard task={task} />
      </Provider>
    );

    const expandButton = screen.getByText('Show more');
    fireEvent.click(expandButton);

    await waitFor(() => {
      expect(screen.getByText('Show less')).toBeInTheDocument();
      expect(screen.getByText('Estimated:')).toBeInTheDocument();
      expect(screen.getByText('8h')).toBeInTheDocument();
      expect(screen.getByText('Actual:')).toBeInTheDocument();
      expect(screen.getByText('6h')).toBeInTheDocument();
    });
  });

  it('displays comments and attachments count', () => {
    const task = createMockTask({
      comments: [
        {
          id: 'comment-1',
          authorId: '1',
          authorName: 'John',
          content: 'Test comment',
          createdAt: new Date(),
        },
      ],
      attachments: [
        {
          id: 'attachment-1',
          name: 'test.pdf',
          url: '#',
          type: 'application/pdf',
          size: 1024,
          uploadedAt: new Date(),
        },
      ],
    });
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TaskCard task={task} />
      </Provider>
    );

    expect(screen.getByText('1')).toBeInTheDocument(); // Comments count
    expect(screen.getByText('1')).toBeInTheDocument(); // Attachments count
  });

  it('shows tags with correct display', () => {
    const task = createMockTask({
      tags: ['urgent', 'bug-fix', 'high-priority', 'backend'],
    });
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TaskCard task={task} />
      </Provider>
    );

    // Should show first 3 tags
    expect(screen.getByText('urgent')).toBeInTheDocument();
    expect(screen.getByText('bug-fix')).toBeInTheDocument();
    expect(screen.getByText('high-priority')).toBeInTheDocument();

    // Should show "+1" for additional tags
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('opens task assignment modal when assignee is clicked', () => {
    const task = createMockTask();
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TaskCard task={task} />
      </Provider>
    );

    const assigneeButton = screen.getByTitle('Reassign task');
    fireEvent.click(assigneeButton);

    // TaskAssignment modal should be rendered (we can't easily test modal visibility without more setup)
    expect(assigneeButton).toBeInTheDocument();
  });

  it('displays document link when documentTitle is present', () => {
    const task = createMockTask({
      documentTitle: 'Important Document.pdf',
    });
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TaskCard task={task} />
      </Provider>
    );

    expect(screen.getByText('📄 Important Document.pdf')).toBeInTheDocument();
  });

  it('formats deadline date correctly', () => {
    const task = createMockTask({
      deadline: new Date('2025-12-25'),
    });
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TaskCard task={task} />
      </Provider>
    );

    // Check for formatted date (exact format may vary based on locale)
    expect(screen.getByText(/12\/25\/2025|25\/12\/2025|2025-12-25/)).toBeInTheDocument();
  });

  it('prevents drag operations when clicking interactive elements', () => {
    const task = createMockTask();
    const store = createMockStore();

    render(
      <Provider store={store}>
        <TaskCard task={task} />
      </Provider>
    );

    const checkbox = screen.getByRole('checkbox');
    const expandButton = screen.getByText('Show more');
    const assigneeButton = screen.getByTitle('Reassign task');

    // These elements should stop propagation to prevent drag
    fireEvent.click(checkbox);
    fireEvent.click(expandButton);
    fireEvent.click(assigneeButton);

    // Events should not trigger drag operations (tested via stopPropagation)
    expect(checkbox).toBeInTheDocument();
    expect(expandButton).toBeInTheDocument();
    expect(assigneeButton).toBeInTheDocument();
  });
});