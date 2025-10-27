import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type TaskStatus = 'pending' | 'inProgress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  assignedBy: {
    id: string;
    name: string;
  };
  deadline?: Date;
  createdAt: Date;
  updatedAt: Date;
  documentId?: string;
  documentTitle?: string;
  workflowId?: string;
  workflowStepId?: string;
  comments: TaskComment[];
  attachments: TaskAttachment[];
  tags: string[];
  estimatedHours?: number;
  actualHours?: number;
}

export interface TaskComment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Date;
  isSystemMessage?: boolean;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: Date;
}

export interface NotificationSettings {
  email: {
    taskAssigned: boolean;
    taskDue: boolean;
    taskOverdue: boolean;
    taskCompleted: boolean;
    taskCommented: boolean;
  };
  inApp: {
    taskAssigned: boolean;
    taskDue: boolean;
    taskOverdue: boolean;
    taskCompleted: boolean;
    taskCommented: boolean;
  };
  digest: {
    enabled: boolean;
    frequency: 'daily' | 'weekly';
    time: string;
  };
}

export interface Notification {
  id: string;
  type: 'taskAssigned' | 'taskDue' | 'taskOverdue' | 'taskCompleted' | 'taskCommented';
  taskId: string;
  taskTitle: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  actionUrl?: string;
}

export interface TaskFilters {
  priority: TaskPriority[];
  assignee: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  search: string;
  tags: string[];
  status: TaskStatus[];
}

export interface TaskMetrics {
  completionRate: number;
  averageTimeToComplete: number;
  tasksCompletedThisWeek: number;
  tasksCompletedThisMonth: number;
  overdueTasksCount: number;
  totalTasksAssigned: number;
  averageResponseTime: number;
  productivityScore: number;
}

export interface TasksState {
  tasksByStatus: {
    pending: Task[];
    inProgress: Task[];
    completed: Task[];
  };
  allTasks: Task[];
  selectedTasks: string[];
  filters: TaskFilters;
  notifications: {
    preferences: NotificationSettings;
    unreadCount: number;
    history: Notification[];
  };
  metrics: TaskMetrics;
  loading: {
    tasks: boolean;
    bulkOperation: boolean;
    metrics: boolean;
  };
  error: string | null;
  currentView: 'kanban' | 'calendar' | 'list';
  bulkOperationProgress: {
    total: number;
    completed: number;
    inProgress: boolean;
  };
}

const initialState: TasksState = {
  tasksByStatus: {
    pending: [],
    inProgress: [],
    completed: [],
  },
  allTasks: [],
  selectedTasks: [],
  filters: {
    priority: [],
    assignee: [],
    dateRange: {
      start: null,
      end: null,
    },
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
        frequency: 'daily',
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
  currentView: 'kanban',
  bulkOperationProgress: {
    total: 0,
    completed: 0,
    inProgress: false,
  },
};

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTasks: (state, action: PayloadAction<Task[]>) => {
      state.allTasks = action.payload;
      state.tasksByStatus = {
        pending: action.payload.filter(task => task.status === 'pending'),
        inProgress: action.payload.filter(task => task.status === 'inProgress'),
        completed: action.payload.filter(task => task.status === 'completed'),
      };
    },

    updateTaskStatus: (state, action: PayloadAction<{ taskId: string; status: TaskStatus }>) => {
      const { taskId, status } = action.payload;
      const task = state.allTasks.find(t => t.id === taskId);

      if (task) {
        const oldStatus = task.status;
        task.status = status;
        task.updatedAt = new Date();

        // Remove from old status array
        state.tasksByStatus[oldStatus] = state.tasksByStatus[oldStatus].filter(t => t.id !== taskId);

        // Add to new status array
        state.tasksByStatus[status].push(task);
      }
    },

    addTask: (state, action: PayloadAction<Task>) => {
      const task = action.payload;
      state.allTasks.push(task);
      state.tasksByStatus[task.status].push(task);
    },

    updateTask: (state, action: PayloadAction<Partial<Task> & { id: string }>) => {
      const taskIndex = state.allTasks.findIndex(t => t.id === action.payload.id);
      if (taskIndex !== -1) {
        state.allTasks[taskIndex] = { ...state.allTasks[taskIndex], ...action.payload };

        // Update in status arrays
        const task = state.allTasks[taskIndex];
        Object.keys(state.tasksByStatus).forEach(status => {
          const statusTaskIndex = state.tasksByStatus[status as TaskStatus].findIndex(t => t.id === task.id);
          if (statusTaskIndex !== -1) {
            state.tasksByStatus[status as TaskStatus][statusTaskIndex] = task;
          }
        });
      }
    },

    toggleTaskSelection: (state, action: PayloadAction<string>) => {
      const taskId = action.payload;
      const index = state.selectedTasks.indexOf(taskId);

      if (index === -1) {
        state.selectedTasks.push(taskId);
      } else {
        state.selectedTasks.splice(index, 1);
      }
    },

    selectAllTasks: (state, action: PayloadAction<string[]>) => {
      state.selectedTasks = action.payload;
    },

    clearTaskSelection: (state) => {
      state.selectedTasks = [];
    },

    updateFilters: (state, action: PayloadAction<Partial<TaskFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.history.unshift(action.payload);
      if (!action.payload.isRead) {
        state.notifications.unreadCount++;
      }
    },

    markNotificationAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.history.find(n => n.id === action.payload);
      if (notification && !notification.isRead) {
        notification.isRead = true;
        state.notifications.unreadCount--;
      }
    },

    markAllNotificationsAsRead: (state) => {
      state.notifications.history.forEach(notification => {
        notification.isRead = true;
      });
      state.notifications.unreadCount = 0;
    },

    updateNotificationPreferences: (state, action: PayloadAction<NotificationSettings>) => {
      state.notifications.preferences = action.payload;
    },

    setMetrics: (state, action: PayloadAction<TaskMetrics>) => {
      state.metrics = action.payload;
    },

    setLoading: (state, action: PayloadAction<{ key: keyof TasksState['loading']; value: boolean }>) => {
      state.loading[action.payload.key] = action.payload.value;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    setCurrentView: (state, action: PayloadAction<'kanban' | 'calendar' | 'list'>) => {
      state.currentView = action.payload;
    },

    setBulkOperationProgress: (state, action: PayloadAction<Partial<TasksState['bulkOperationProgress']>>) => {
      state.bulkOperationProgress = { ...state.bulkOperationProgress, ...action.payload };
    },

    addTaskComment: (state, action: PayloadAction<{ taskId: string; comment: TaskComment }>) => {
      const task = state.allTasks.find(t => t.id === action.payload.taskId);
      if (task) {
        task.comments.push(action.payload.comment);
        task.updatedAt = new Date();
      }
    },
  },
});

export const {
  setTasks,
  updateTaskStatus,
  addTask,
  updateTask,
  toggleTaskSelection,
  selectAllTasks,
  clearTaskSelection,
  updateFilters,
  addNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  updateNotificationPreferences,
  setMetrics,
  setLoading,
  setError,
  setCurrentView,
  setBulkOperationProgress,
  addTaskComment,
} = tasksSlice.actions;

export default tasksSlice.reducer;