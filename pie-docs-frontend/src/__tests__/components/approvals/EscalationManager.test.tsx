import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import EscalationManager from '@/components/approvals/EscalationManager';
import approvalsSlice from '@/store/slices/approvalsSlice';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

const createMockStore = () => {
  return configureStore({
    reducer: {
      approvals: approvalsSlice,
      auth: () => ({ user: { id: 'user-1', name: 'Test User', role: 'manager' } }),
    },
    preloadedState: {
      approvals: {
        activeApprovals: {
          pending: [
            {
              id: 'approval-1',
              documentId: 'doc-1',
              userId: 'user-2',
              assignedAt: '2025-01-14T10:00:00Z',
              dueDate: '2025-01-15T10:00:00Z',
              priority: 'high',
              escalated: false
            }
          ],
          inProgress: [],
          completed: [],
          escalated: [
            {
              id: 'approval-2',
              documentId: 'doc-2',
              userId: 'user-3',
              assignedAt: '2025-01-13T10:00:00Z',
              dueDate: '2025-01-14T10:00:00Z',
              priority: 'urgent',
              escalated: true,
              escalatedAt: '2025-01-14T11:00:00Z',
              escalatedTo: 'manager-1'
            }
          ],
        },
        approvalChains: [],
        routingRules: [],
        currentDocument: {
          documentId: null,
          approvalHistory: [],
          currentStep: null,
          parallelApprovals: {
            required: 0,
            approved: 0,
            rejected: 0,
            pending: 0
          },
        },
        escalationConfig: {
          timeoutRules: [
            {
              id: 'rule-1',
              priority: 'high',
              timeoutHours: 24,
              escalationChainId: 'chain-1',
              enabled: true
            },
            {
              id: 'rule-2',
              priority: 'urgent',
              timeoutHours: 4,
              escalationChainId: 'chain-2',
              enabled: true
            }
          ],
          escalationChains: [
            {
              id: 'chain-1',
              name: 'Standard Escalation',
              steps: [
                { level: 1, userId: 'manager-1', role: 'manager' },
                { level: 2, userId: 'director-1', role: 'director' }
              ]
            }
          ],
          notificationSettings: {
            emailEnabled: true,
            smsEnabled: false,
            slackEnabled: true
          }
        },
        auditTrail: {
          actions: [],
          filters: {},
          exportFormats: []
        },
      },
    },
  });
};

describe('EscalationManager', () => {
  let store: any;

  beforeEach(() => {
    store = createMockStore();
    vi.clearAllMocks();
    // Mock timers for timeout testing
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderComponent = (props = {}) => {
    return render(
      <Provider store={store}>
        <EscalationManager {...props} />
      </Provider>
    );
  };

  it('renders escalation dashboard with pending and escalated approvals', () => {
    renderComponent();

    expect(screen.getByText('Escalation Management')).toBeInTheDocument();
    expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
    expect(screen.getByText('Escalated Approvals')).toBeInTheDocument();
  });

  it('displays overdue approvals with warning indicators', () => {
    renderComponent();

    expect(screen.getByText(/overdue/i)).toBeInTheDocument();
    expect(screen.getByText(/24 hours ago/i)).toBeInTheDocument();
  });

  it('shows escalation rules configuration', () => {
    renderComponent();

    const configButton = screen.getByText(/configure rules/i);
    fireEvent.click(configButton);

    expect(screen.getByText('Standard Escalation')).toBeInTheDocument();
    expect(screen.getByText('24 hours')).toBeInTheDocument();
    expect(screen.getByText('4 hours')).toBeInTheDocument();
  });

  it('allows manual escalation of pending approvals', async () => {
    renderComponent();

    const escalateButton = screen.getByText(/escalate now/i);
    fireEvent.click(escalateButton);

    const confirmButton = screen.getByText(/confirm escalation/i);
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText(/escalation initiated/i)).toBeInTheDocument();
    });
  });

  it('displays escalation chain progression', () => {
    renderComponent();

    const escalatedItem = screen.getByTestId('escalated-approval-2');
    expect(escalatedItem).toBeInTheDocument();
    expect(screen.getByText('manager-1')).toBeInTheDocument();
  });

  it('shows notification settings for escalations', () => {
    renderComponent();

    const settingsButton = screen.getByText(/notification settings/i);
    fireEvent.click(settingsButton);

    expect(screen.getByLabelText(/email notifications/i)).toBeChecked();
    expect(screen.getByLabelText(/sms notifications/i)).not.toBeChecked();
    expect(screen.getByLabelText(/slack notifications/i)).toBeChecked();
  });

  it('automatically escalates approvals based on timeout rules', async () => {
    renderComponent();

    // Fast-forward time to trigger automatic escalation
    vi.advanceTimersByTime(4 * 60 * 60 * 1000); // 4 hours

    await waitFor(() => {
      expect(screen.getByText(/automatically escalated/i)).toBeInTheDocument();
    });
  });

  it('allows editing escalation timeout rules', () => {
    renderComponent();

    const editButton = screen.getByText(/edit rules/i);
    fireEvent.click(editButton);

    const timeoutInput = screen.getByLabelText(/timeout hours/i);
    fireEvent.change(timeoutInput, { target: { value: '48' } });

    const saveButton = screen.getByText(/save changes/i);
    fireEvent.click(saveButton);

    expect(screen.getByDisplayValue('48')).toBeInTheDocument();
  });

  it('displays escalation audit trail', () => {
    renderComponent();

    const auditButton = screen.getByText(/escalation history/i);
    fireEvent.click(auditButton);

    expect(screen.getByText(/escalation log/i)).toBeInTheDocument();
  });

  it('shows escalation statistics and metrics', () => {
    renderComponent();

    expect(screen.getByText(/1 pending/i)).toBeInTheDocument();
    expect(screen.getByText(/1 escalated/i)).toBeInTheDocument();
    expect(screen.getByText(/average response time/i)).toBeInTheDocument();
  });

  it('handles bulk escalation actions', () => {
    renderComponent();

    const selectAllCheckbox = screen.getByLabelText(/select all/i);
    fireEvent.click(selectAllCheckbox);

    const bulkEscalateButton = screen.getByText(/bulk escalate/i);
    fireEvent.click(bulkEscalateButton);

    expect(screen.getByText(/escalate selected items/i)).toBeInTheDocument();
  });

  it('filters escalations by priority and status', () => {
    renderComponent();

    const priorityFilter = screen.getByLabelText(/filter by priority/i);
    fireEvent.change(priorityFilter, { target: { value: 'urgent' } });

    expect(screen.getByText('approval-2')).toBeInTheDocument();
    expect(screen.queryByText('approval-1')).not.toBeInTheDocument();
  });

  it('displays escalation chain hierarchy', () => {
    renderComponent();

    const chainButton = screen.getByText(/view chain/i);
    fireEvent.click(chainButton);

    expect(screen.getByText('Level 1: manager')).toBeInTheDocument();
    expect(screen.getByText('Level 2: director')).toBeInTheDocument();
  });

  it('handles escalation failures gracefully', async () => {
    const mockError = vi.fn().mockRejectedValue(new Error('Escalation failed'));
    vi.spyOn(store, 'dispatch').mockImplementation(mockError);

    renderComponent();

    const escalateButton = screen.getByText(/escalate now/i);
    fireEvent.click(escalateButton);

    await waitFor(() => {
      expect(screen.getByText(/escalation failed/i)).toBeInTheDocument();
    });
  });

  it('validates escalation rules before saving', () => {
    renderComponent();

    const editButton = screen.getByText(/edit rules/i);
    fireEvent.click(editButton);

    const timeoutInput = screen.getByLabelText(/timeout hours/i);
    fireEvent.change(timeoutInput, { target: { value: '0' } });

    const saveButton = screen.getByText(/save changes/i);
    fireEvent.click(saveButton);

    expect(screen.getByText(/timeout must be greater than 0/i)).toBeInTheDocument();
  });
});