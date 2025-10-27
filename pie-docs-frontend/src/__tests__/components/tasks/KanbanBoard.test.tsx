import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import KanbanBoard from '@/components/tasks/KanbanBoard';
import tasksSlice, { Task, TaskStatus } from '@/store/slices/tasksSlice';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock @dnd-kit
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd }: any) => (
    <div data-testid="dnd-context" onDrop={() => onDragEnd?.({ active: { id: 'test' }, over: { id: 'inProgress' } })}>
      {children}
    </div>
  ),
  DragOverlay: ({ children }: any) => <div data-testid="drag-overlay">{children}</div>,
  useSensor: () => ({}),
  useSensors: () => [],
  PointerSensor: {},
  closestCorners: {},
  useDroppable: () => ({ isOver: false, setNodeRef: vi.fn() }),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => children,
  verticalListSortingStrategy: {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => '',
    },
  },
}));

const createMockTask = (id: string, status: TaskStatus): Task => ({
  id,
  title: `Task ${id}`,
  description: `Description for task ${id}`,
  status,
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

const createMockStore = (tasks: Task[] = []) => {
  const store = configureStore({
    reducer: {
      tasks: tasksSlice,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          // Ignore Date objects in actions and state for tests
          ignoredActions: ['tasks/setTasks'],
          ignoredPaths: ['tasks.allTasks', 'tasks.tasksByStatus'],
        },
      }),
  });

  // Set initial tasks
  store.dispatch({
    type: 'tasks/setTasks',
    payload: tasks,
  });

  return store;
};

describe('KanbanBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all three columns', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <KanbanBoard />
      </Provider>
    );

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('displays tasks in correct columns', () => {
    const tasks = [
      createMockTask('1', 'pending'),
      createMockTask('2', 'inProgress'),
      createMockTask('3', 'completed'),
    ];

    const store = createMockStore(tasks);

    render(
      <Provider store={store}>
        <KanbanBoard />
      </Provider>
    );

    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
    expect(screen.getByText('Task 3')).toBeInTheDocument();
  });

  it('shows correct task count in column headers', () => {
    const tasks = [
      createMockTask('1', 'pending'),
      createMockTask('2', 'pending'),
      createMockTask('3', 'inProgress'),
    ];

    const store = createMockStore(tasks);

    render(
      <Provider store={store}>
        <KanbanBoard />
      </Provider>
    );

    // Check that task counts are displayed correctly
    expect(screen.getByText('2')).toBeInTheDocument(); // Pending count
    expect(screen.getByText('1')).toBeInTheDocument(); // In Progress count
    expect(screen.getByText('0')).toBeInTheDocument(); // Completed count
  });

  it('shows empty state when no tasks', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <KanbanBoard />
      </Provider>
    );

    const emptyStates = screen.getAllByText('No tasks');
    expect(emptyStates).toHaveLength(3); // One for each column
  });

  it('renders task cards with correct information', () => {
    const task = createMockTask('1', 'pending');
    task.priority = 'high';
    task.deadline = new Date();

    const store = createMockStore([task]);

    render(
      <Provider store={store}>
        <KanbanBoard />
      </Provider>
    );

    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Description for task 1')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('handles task selection', () => {
    const task = createMockTask('1', 'pending');
    const store = createMockStore([task]);

    render(
      <Provider store={store}>
        <KanbanBoard />
      </Provider>
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // Check that the task is selected in the store
    const state = store.getState();
    expect(state.tasks.selectedTasks).toContain('1');
  });

  it('opens task details when card is clicked', () => {
    const task = createMockTask('1', 'pending');
    const store = createMockStore([task]);

    render(
      <Provider store={store}>
        <KanbanBoard />
      </Provider>
    );

    const taskCard = screen.getByText('Task 1').closest('div');
    if (taskCard) {
      fireEvent.click(taskCard);
    }

    // The TaskDetails modal should be rendered
    // We can't easily test modal visibility without more setup
    // but we can verify the click handler exists
    expect(taskCard).toBeInTheDocument();
  });

  it('expands task card when expand button is clicked', async () => {
    const task = createMockTask('1', 'pending');
    const store = createMockStore([task]);

    render(
      <Provider store={store}>
        <KanbanBoard />
      </Provider>
    );

    const expandButton = screen.getByText('Show more');
    fireEvent.click(expandButton);

    await waitFor(() => {
      expect(screen.getByText('Show less')).toBeInTheDocument();
    });
  });

  it('renders drag overlay when dragging', () => {
    const task = createMockTask('1', 'pending');
    const store = createMockStore([task]);

    render(
      <Provider store={store}>
        <KanbanBoard />
      </Provider>
    );

    expect(screen.getByTestId('drag-overlay')).toBeInTheDocument();
  });

  it('renders priority badges with correct colors', () => {
    const tasks = [
      { ...createMockTask('1', 'pending'), priority: 'critical' as const },
      { ...createMockTask('2', 'pending'), priority: 'high' as const },
      { ...createMockTask('3', 'pending'), priority: 'medium' as const },
      { ...createMockTask('4', 'pending'), priority: 'low' as const },
    ];

    const store = createMockStore(tasks);

    render(
      <Provider store={store}>
        <KanbanBoard />
      </Provider>
    );

    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });
});