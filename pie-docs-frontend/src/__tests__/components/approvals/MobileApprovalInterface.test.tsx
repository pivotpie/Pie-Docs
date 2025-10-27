import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import MobileApprovalInterface from '@/components/approvals/MobileApprovalInterface';
import approvalsSlice from '@/store/slices/approvalsSlice';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock touch events
Object.defineProperty(window, 'ontouchstart', {
  value: null,
  writable: true,
});

const createMockStore = () => {
  return configureStore({
    reducer: {
      approvals: approvalsSlice,
      auth: () => ({ user: { id: 'user-1', name: 'Test User' } }),
    },
    preloadedState: {
      approvals: {
        activeApprovals: {
          pending: [
            {
              id: 'approval-1',
              documentId: 'doc-1',
              title: 'Contract Review',
              priority: 'high',
              dueDate: '2025-01-16T10:00:00Z',
              requestedBy: 'John Doe',
              documentType: 'contract'
            },
            {
              id: 'approval-2',
              documentId: 'doc-2',
              title: 'Policy Update',
              priority: 'medium',
              dueDate: '2025-01-17T10:00:00Z',
              requestedBy: 'Jane Smith',
              documentType: 'policy'
            }
          ],
          inProgress: [],
          completed: [],
          escalated: [],
        },
        approvalChains: [],
        routingRules: [],
        currentDocument: {
          documentId: 'doc-1',
          approvalHistory: [],
          currentStep: {
            id: 'step-1',
            approvalId: 'approval-1',
            assignedTo: 'user-1',
            status: 'pending'
          },
          parallelApprovals: {
            required: 1,
            approved: 0,
            rejected: 0,
            pending: 1
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
};

describe('MobileApprovalInterface', () => {
  let store: any;

  beforeEach(() => {
    store = createMockStore();
    vi.clearAllMocks();

    // Mock viewport for mobile testing
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    });
  });

  const renderComponent = (props = {}) => {
    return render(
      <Provider store={store}>
        <MobileApprovalInterface {...props} />
      </Provider>
    );
  };

  it('renders mobile-optimized approval interface', () => {
    renderComponent();

    expect(screen.getByText('Approvals')).toBeInTheDocument();
    expect(screen.getByText('Contract Review')).toBeInTheDocument();
    expect(screen.getByText('Policy Update')).toBeInTheDocument();
  });

  it('displays touch-friendly approval buttons with proper spacing', () => {
    renderComponent();

    const approveButtons = screen.getAllByText(/approve/i);
    const rejectButtons = screen.getAllByText(/reject/i);

    // Check that buttons have touch-friendly minimum size (44px)
    approveButtons.forEach(button => {
      const styles = window.getComputedStyle(button);
      expect(parseInt(styles.minHeight) >= 44).toBe(true);
    });

    rejectButtons.forEach(button => {
      const styles = window.getComputedStyle(button);
      expect(parseInt(styles.minHeight) >= 44).toBe(true);
    });
  });

  it('supports swipe gestures for quick approve/reject actions', () => {
    renderComponent();

    const approvalCard = screen.getByTestId('approval-card-1');

    // Simulate swipe right (approve)
    fireEvent.touchStart(approvalCard, {
      touches: [{ clientX: 100, clientY: 100 }]
    });
    fireEvent.touchMove(approvalCard, {
      touches: [{ clientX: 200, clientY: 100 }]
    });
    fireEvent.touchEnd(approvalCard);

    expect(screen.getByText(/swipe to approve/i)).toBeInTheDocument();
  });

  it('provides mobile document preview with zoom and pan', () => {
    renderComponent();

    const previewButton = screen.getByText(/preview/i);
    fireEvent.click(previewButton);

    expect(screen.getByTestId('mobile-document-preview')).toBeInTheDocument();
    expect(screen.getByText(/pinch to zoom/i)).toBeInTheDocument();
  });

  it('handles offline approval capability with sync indicators', () => {
    renderComponent();

    // Simulate offline mode
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });

    window.dispatchEvent(new Event('offline'));

    expect(screen.getByText(/offline mode/i)).toBeInTheDocument();
    expect(screen.getByText(/changes will sync/i)).toBeInTheDocument();
  });

  it('displays mobile-specific notification handling', () => {
    renderComponent();

    const notificationButton = screen.getByTestId('mobile-notifications');
    fireEvent.click(notificationButton);

    expect(screen.getByText(/push notifications/i)).toBeInTheDocument();
    expect(screen.getByText(/enable notifications/i)).toBeInTheDocument();
  });

  it('adapts interface for different screen orientations', () => {
    renderComponent();

    // Simulate landscape orientation
    Object.defineProperty(window, 'innerWidth', { value: 667 });
    Object.defineProperty(window, 'innerHeight', { value: 375 });

    window.dispatchEvent(new Event('orientationchange'));

    expect(screen.getByTestId('landscape-layout')).toBeInTheDocument();
  });

  it('provides thumb-friendly navigation controls', () => {
    renderComponent();

    const navButtons = screen.getAllByRole('button');
    const bottomNavButtons = navButtons.filter(button =>
      button.closest('[data-testid="bottom-navigation"]')
    );

    expect(bottomNavButtons.length).toBeGreaterThan(0);
  });

  it('shows mobile-optimized comment input with voice-to-text', () => {
    renderComponent();

    const commentButton = screen.getByText(/add comment/i);
    fireEvent.click(commentButton);

    expect(screen.getByTestId('mobile-comment-input')).toBeInTheDocument();
    expect(screen.getByTestId('voice-input-button')).toBeInTheDocument();
  });

  it('displays approval priority with visual indicators', () => {
    renderComponent();

    expect(screen.getByTestId('priority-indicator-high')).toBeInTheDocument();
    expect(screen.getByTestId('priority-indicator-medium')).toBeInTheDocument();
  });

  it('handles bulk approval selection with touch controls', () => {
    renderComponent();

    const selectModeButton = screen.getByText(/select multiple/i);
    fireEvent.click(selectModeButton);

    const approvalCards = screen.getAllByTestId(/approval-card/);

    // Simulate long press to select
    fireEvent.touchStart(approvalCards[0], { touches: [{ clientX: 100, clientY: 100 }] });

    setTimeout(() => {
      fireEvent.touchEnd(approvalCards[0]);
    }, 500);

    expect(screen.getByTestId('bulk-actions')).toBeInTheDocument();
  });

  it('provides mobile document annotation tools', () => {
    renderComponent();

    const annotateButton = screen.getByText(/annotate/i);
    fireEvent.click(annotateButton);

    expect(screen.getByTestId('mobile-annotation-tools')).toBeInTheDocument();
    expect(screen.getByText(/draw/i)).toBeInTheDocument();
    expect(screen.getByText(/highlight/i)).toBeInTheDocument();
  });

  it('shows connection status and sync progress', () => {
    renderComponent();

    expect(screen.getByTestId('connection-status')).toBeInTheDocument();
  });

  it('displays approval deadline countdown for urgent items', () => {
    renderComponent();

    expect(screen.getByText(/due in/i)).toBeInTheDocument();
    expect(screen.getByTestId('countdown-timer')).toBeInTheDocument();
  });

  it('handles haptic feedback for approval actions', () => {
    const mockVibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      writable: true
    });

    renderComponent();

    const approveButton = screen.getByText(/approve/i);
    fireEvent.click(approveButton);

    expect(mockVibrate).toHaveBeenCalledWith([100]);
  });

  it('provides accessibility features for mobile', () => {
    renderComponent();

    // Check for proper ARIA labels
    expect(screen.getByLabelText(/approve document/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reject document/i)).toBeInTheDocument();
  });

  it('handles pull-to-refresh functionality', () => {
    renderComponent();

    const container = screen.getByTestId('approval-list-container');

    // Simulate pull-to-refresh gesture
    fireEvent.touchStart(container, {
      touches: [{ clientX: 100, clientY: 50 }]
    });
    fireEvent.touchMove(container, {
      touches: [{ clientX: 100, clientY: 150 }]
    });
    fireEvent.touchEnd(container);

    expect(screen.getByText(/refreshing/i)).toBeInTheDocument();
  });
});