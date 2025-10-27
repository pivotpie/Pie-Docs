import { Task, TaskFilters, TaskStatus, TaskPriority } from '@/store/slices/tasksSlice';

// Mock data generator
const generateMockTasks = (): Task[] => {
  const assignees = [
    { id: '1', name: 'John Doe', email: 'john@example.com', avatar: null },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', avatar: null },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com', avatar: null },
    { id: '4', name: 'Alice Brown', email: 'alice@example.com', avatar: null },
  ];

  const assignedBy = [
    { id: '5', name: 'Manager One' },
    { id: '6', name: 'Manager Two' },
    { id: '7', name: 'Team Lead' },
  ];

  const priorities: TaskPriority[] = ['low', 'medium', 'high', 'critical'];
  const statuses: TaskStatus[] = ['pending', 'inProgress', 'completed'];
  const tags = ['urgent', 'review', 'documentation', 'bug-fix', 'feature', 'testing', 'security', 'performance'];

  const tasks: Task[] = [];

  // Generate 30 mock tasks
  for (let i = 1; i <= 30; i++) {
    const randomAssignee = assignees[Math.floor(Math.random() * assignees.length)];
    const randomAssignedBy = assignedBy[Math.floor(Math.random() * assignedBy.length)];
    const randomPriority = priorities[Math.floor(Math.random() * priorities.length)];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    // Create realistic task titles and descriptions
    const taskTitles = [
      'Review and approve quarterly financial report',
      'Update user authentication system security',
      'Design new customer dashboard interface',
      'Implement automated testing pipeline',
      'Analyze user feedback and create improvement plan',
      'Migrate legacy database to new infrastructure',
      'Create documentation for API endpoints',
      'Fix critical bug in payment processing',
      'Optimize application performance metrics',
      'Setup monitoring and alerting system',
      'Review compliance requirements for GDPR',
      'Integrate third-party analytics service',
      'Update mobile app to latest framework',
      'Conduct security audit of web application',
      'Implement real-time chat functionality',
      'Design email notification templates',
      'Setup automated backup procedures',
      'Create user training materials',
      'Optimize database query performance',
      'Implement dark mode UI theme',
      'Review and update privacy policy',
      'Setup continuous deployment pipeline',
      'Create error logging and tracking system',
      'Implement password reset functionality',
      'Design responsive mobile interface',
      'Setup load balancing configuration',
      'Create automated report generation',
      'Implement file upload and storage',
      'Review code quality and standards',
      'Setup environment monitoring tools',
    ];

    const descriptions = [
      'This task requires careful attention to detail and coordination with multiple stakeholders.',
      'High-priority item that needs to be completed before the next sprint deadline.',
      'Complex implementation that may require additional research and planning.',
      'Standard procedure following established guidelines and best practices.',
      'Critical security update that affects user data protection.',
      'Performance optimization that will improve overall system efficiency.',
      'Documentation update to ensure compliance with current standards.',
      'Bug fix that addresses customer-reported issues.',
      'New feature implementation based on user feedback and requirements.',
      'Maintenance task to keep systems running smoothly.',
    ];

    const createdDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    const updatedDate = new Date(createdDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000);

    // Generate deadline (some tasks have deadlines, some don't)
    const hasDeadline = Math.random() > 0.3;
    const deadline = hasDeadline
      ? new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000)
      : undefined;

    const randomTags = tags
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.floor(Math.random() * 4) + 1);

    const task: Task = {
      id: `task-${i}`,
      title: taskTitles[i - 1] || `Sample Task ${i}`,
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      status: randomStatus,
      priority: randomPriority,
      assignee: randomAssignee,
      assignedBy: randomAssignedBy,
      deadline,
      createdAt: createdDate,
      updatedAt: updatedDate,
      documentId: Math.random() > 0.5 ? `doc-${i}` : undefined,
      documentTitle: Math.random() > 0.5 ? `Document ${i}.pdf` : undefined,
      workflowId: Math.random() > 0.7 ? `workflow-${i}` : undefined,
      workflowStepId: Math.random() > 0.7 ? `step-${i}` : undefined,
      tags: randomTags,
      estimatedHours: Math.random() > 0.5 ? Math.floor(Math.random() * 40) + 1 : undefined,
      actualHours: randomStatus === 'completed' ? Math.floor(Math.random() * 35) + 1 : undefined,
      comments: generateMockComments(i),
      attachments: generateMockAttachments(i),
    };

    tasks.push(task);
  }

  return tasks;
};

const generateMockComments = (taskId: number) => {
  const commentCount = Math.floor(Math.random() * 5);
  const comments = [];
  const authors = ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown', 'Manager One'];
  const commentTexts = [
    'Looking good so far, keep up the great work!',
    'I have some questions about the implementation approach.',
    'Can we schedule a quick call to discuss this?',
    'The deadline might be tight, let me know if you need help.',
    'Great progress! This looks like it will meet all requirements.',
    'I\'ve reviewed the changes and they look good to go.',
    'Please make sure to include proper error handling.',
    'The test results are looking positive.',
  ];

  for (let i = 0; i < commentCount; i++) {
    comments.push({
      id: `comment-${taskId}-${i}`,
      authorId: `author-${i}`,
      authorName: authors[Math.floor(Math.random() * authors.length)],
      content: commentTexts[Math.floor(Math.random() * commentTexts.length)],
      createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      isSystemMessage: Math.random() > 0.8,
    });
  }

  return comments;
};

const generateMockAttachments = (taskId: number) => {
  const attachmentCount = Math.floor(Math.random() * 3);
  const attachments = [];
  const fileNames = [
    'requirements.pdf',
    'design-mockup.png',
    'technical-spec.docx',
    'data-export.xlsx',
    'screenshot.jpg',
  ];

  for (let i = 0; i < attachmentCount; i++) {
    attachments.push({
      id: `attachment-${taskId}-${i}`,
      name: fileNames[Math.floor(Math.random() * fileNames.length)],
      url: `#`,
      type: 'application/pdf',
      size: Math.floor(Math.random() * 1000000) + 50000,
      uploadedAt: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000),
    });
  }

  return attachments;
};

// Mock API service
export const mockTaskService = {
  getUserTasks: async (filters: Partial<TaskFilters>): Promise<Task[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    let tasks = generateMockTasks();

    // Apply filters
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      tasks = tasks.filter(task =>
        task.title.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower)
      );
    }

    if (filters.priority && filters.priority.length > 0) {
      tasks = tasks.filter(task => filters.priority!.includes(task.priority));
    }

    if (filters.status && filters.status.length > 0) {
      tasks = tasks.filter(task => filters.status!.includes(task.status));
    }

    if (filters.assignee && filters.assignee.length > 0) {
      tasks = tasks.filter(task => filters.assignee!.includes(task.assignee.id));
    }

    if (filters.tags && filters.tags.length > 0) {
      tasks = tasks.filter(task =>
        filters.tags!.some(filterTag => task.tags.includes(filterTag))
      );
    }

    if (filters.dateRange?.start) {
      tasks = tasks.filter(task =>
        new Date(task.createdAt) >= filters.dateRange!.start!
      );
    }

    if (filters.dateRange?.end) {
      tasks = tasks.filter(task =>
        new Date(task.createdAt) <= filters.dateRange!.end!
      );
    }

    return tasks;
  },

  updateTaskStatus: async (taskId: string, status: TaskStatus): Promise<Task> => {
    await new Promise(resolve => setTimeout(resolve, 200));

    // In a real app, this would update the backend
    const tasks = generateMockTasks();
    const task = tasks.find(t => t.id === taskId);

    if (!task) {
      throw new Error('Task not found');
    }

    return {
      ...task,
      status,
      updatedAt: new Date(),
    };
  },

  reassignTask: async (taskId: string, newAssigneeId: string): Promise<Task> => {
    await new Promise(resolve => setTimeout(resolve, 300));

    const tasks = generateMockTasks();
    const task = tasks.find(t => t.id === taskId);

    if (!task) {
      throw new Error('Task not found');
    }

    const assignees = [
      { id: '1', name: 'John Doe', email: 'john@example.com', avatar: null },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com', avatar: null },
      { id: '3', name: 'Bob Johnson', email: 'bob@example.com', avatar: null },
      { id: '4', name: 'Alice Brown', email: 'alice@example.com', avatar: null },
    ];

    const newAssignee = assignees.find(a => a.id === newAssigneeId);
    if (!newAssignee) {
      throw new Error('Assignee not found');
    }

    return {
      ...task,
      assignee: newAssignee,
      updatedAt: new Date(),
    };
  },

  bulkUpdateTasks: async (taskIds: string[], action: 'complete' | 'approve' | 'reject' | 'reassign'): Promise<Task[]> => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const tasks = generateMockTasks();
    const updatedTasks = tasks
      .filter(task => taskIds.includes(task.id))
      .map(task => ({
        ...task,
        status: action === 'complete' ? 'completed' as TaskStatus : task.status,
        updatedAt: new Date(),
      }));

    return updatedTasks;
  },
};