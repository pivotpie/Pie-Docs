import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ApprovalHistory from '@/components/approvals/ApprovalHistory';
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
      auth: () => ({ user: { id: 'user-1', name: 'Test User' } }),
    },
    preloadedState: {
      approvals: {
        activeApprovals: {
          pending: [],
          inProgress: [],
          completed: [],
          escalated: [],
        },
        approvalChains: [],
        routingRules: [],
        currentDocument: {
          documentId: 'doc-1',
          approvalHistory: [
            {
              id: 'approval-1',
              userId: 'user-1',
              userName: 'John Doe',
              action: 'approve',
              comment: 'Looks good',
              timestamp: '2025-01-15T10:00:00Z',
              checksum: 'abc123'
            },
            {
              id: 'approval-2',
              userId: 'user-2',
              userName: 'Jane Smith',
              action: 'reject',
              comment: 'Needs revision',
              timestamp: '2025-01-15T11:00:00Z',
              checksum: 'def456'
            }
          ],
          currentStep: null,
          parallelApprovals: {
            required: 2,
            approved: 1,
            rejected: 1,
            pending: 0
          },
        },
        escalationConfig: {
          timeoutRules: [],
          escalationChains: [],
          notificationSettings: {}
        },
        auditTrail: {
          actions: [],
          filters: {},
          exportFormats: ['csv', 'pdf']
        },
      },
    },
  });
};

describe('ApprovalHistory', () => {
  let store: any;

  beforeEach(() => {
    store = createMockStore();
    vi.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <Provider store={store}>
        <ApprovalHistory documentId="doc-1" {...props} />
      </Provider>
    );
  };

  it('renders approval history timeline', () => {
    renderComponent();

    expect(screen.getByText('Approval History')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Looks good')).toBeInTheDocument();
    expect(screen.getByText('Needs revision')).toBeInTheDocument();
  });

  it('displays approval actions with proper status indicators', () => {
    renderComponent();

    // Check for action indicators
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('shows timestamps for each approval action', () => {
    renderComponent();

    // Check for formatted timestamps
    expect(screen.getByText(/Jan 15, 2025/)).toBeInTheDocument();
  });

  it('displays audit trail with checksums for integrity verification', () => {
    renderComponent();

    // Check for checksum verification indicators
    expect(screen.getByText('abc123')).toBeInTheDocument();
    expect(screen.getByText('def456')).toBeInTheDocument();
  });

  it('allows filtering approval history by action type', () => {
    renderComponent();

    const filterSelect = screen.getByLabelText(/filter by action/i);
    fireEvent.change(filterSelect, { target: { value: 'approve' } });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });

  it('allows searching approval history by user or comment', () => {
    renderComponent();

    const searchInput = screen.getByPlaceholderText(/search history/i);
    fireEvent.change(searchInput, { target: { value: 'Looks good' } });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });

  it('displays export options for audit compliance', () => {
    renderComponent();

    const exportButton = screen.getByText(/export/i);
    fireEvent.click(exportButton);

    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('shows detailed view when approval action is clicked', () => {
    renderComponent();

    const approvalAction = screen.getByText('John Doe');
    fireEvent.click(approvalAction);

    expect(screen.getByText(/approval details/i)).toBeInTheDocument();
  });

  it('handles empty approval history gracefully', () => {
    const emptyStore = configureStore({
      reducer: {
        approvals: approvalsSlice,
        auth: () => ({ user: { id: 'user-1', name: 'Test User' } }),
      },
      preloadedState: {
        approvals: {
          activeApprovals: {
            pending: [],
            inProgress: [],
            completed: [],
            escalated: [],
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
            timeoutRules: [],
            escalationChains: [],
            notificationSettings: {}
          },
          auditTrail: {
            actions: [],
            filters: {},
            exportFormats: []
          },
        },
      },
    });

    render(
      <Provider store={emptyStore}>
        <ApprovalHistory documentId="doc-1" />
      </Provider>
    );

    expect(screen.getByText(/no approval history/i)).toBeInTheDocument();
  });

  it('validates audit trail checksums for integrity', () => {
    renderComponent();

    // Check for integrity validation indicators
    const integrityIndicators = screen.getAllByTestId(/checksum-status/i);
    expect(integrityIndicators).toHaveLength(2);
  });

  it('displays approval step progression', () => {
    renderComponent();

    expect(screen.getByText(/approval timeline/i)).toBeInTheDocument();
    expect(screen.getByText(/step 1 of/i)).toBeInTheDocument();
  });

  it('shows approval duration and timing information', () => {
    renderComponent();

    // Check for duration calculations
    expect(screen.getByText(/1 hour/i)).toBeInTheDocument();
  });
});