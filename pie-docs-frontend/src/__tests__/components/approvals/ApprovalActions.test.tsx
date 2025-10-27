import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ApprovalActions from '@/components/approvals/ApprovalActions';
import approvalsSlice from '@/store/slices/approvalsSlice';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
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
          approvalHistory: [],
          currentStep: null,
          parallelApprovals: {
            totalRequired: 0,
            approved: 0,
            rejected: 0,
            changesRequested: 0,
            pending: [],
            completed: [],
            consensusReached: false,
            finalDecision: null,
          },
        },
        escalationConfig: {
          timeoutRules: [],
          escalationChains: [],
          notificationSettings: {
            email: {
              approvalRequired: true,
              escalation: true,
              decision: true,
              reminder: true,
            },
            inApp: {
              approvalRequired: true,
              escalation: true,
              decision: true,
              reminder: true,
            },
            mobile: {
              approvalRequired: true,
              escalation: true,
              decision: false,
              reminder: false,
            },
          },
        },
        auditTrail: {
          actions: [],
          filters: {
            dateRange: { start: null, end: null },
            userId: null,
            action: null,
            documentId: null,
            approvalId: null,
          },
          exportFormats: ['csv', 'json', 'pdf'],
        },
        loading: {
          approvals: false,
          chains: false,
          routing: false,
          escalation: false,
          audit: false,
        },
        error: null,
      },
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['approvals/fetchApprovalHistory/fulfilled'],
          ignoredPaths: ['approvals.currentDocument.approvalHistory'],
        },
      }),
  });
};

describe('ApprovalActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProps = {
    documentId: 'doc-1',
    onClose: vi.fn(),
  };

  it('renders approval actions modal', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <ApprovalActions {...mockProps} />
      </Provider>
    );

    expect(screen.getByText('Review Document')).toBeInTheDocument();
    expect(screen.getByText('Make your approval decision and provide feedback')).toBeInTheDocument();
  });

  it('displays decision buttons', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <ApprovalActions {...mockProps} />
      </Provider>
    );

    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Request Changes')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });

  it('shows comment textarea when decision is selected', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <ApprovalActions {...mockProps} />
      </Provider>
    );

    const approveButton = screen.getByText('Approve');
    fireEvent.click(approveButton);

    expect(screen.getByText('Please explain why you approve this document:')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Provide detailed approval reasoning/)).toBeInTheDocument();
  });

  it('handles comment input', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <ApprovalActions {...mockProps} />
      </Provider>
    );

    const approveButton = screen.getByText('Approve');
    fireEvent.click(approveButton);

    const commentTextarea = screen.getByPlaceholderText(/Provide detailed approval reasoning/);
    fireEvent.change(commentTextarea, { target: { value: 'This document looks good to me.' } });

    expect(commentTextarea).toHaveValue('This document looks good to me.');
  });

  it('shows different comment prompts for different decisions', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <ApprovalActions {...mockProps} />
      </Provider>
    );

    // Test reject
    const rejectButton = screen.getByText('Reject');
    fireEvent.click(rejectButton);
    expect(screen.getByText('Please explain why you reject this document (required):')).toBeInTheDocument();

    // Test request changes
    const changesButton = screen.getByText('Request Changes');
    fireEvent.click(changesButton);
    expect(screen.getByText('Please specify what changes are needed (required):')).toBeInTheDocument();
  });

  it('enables submit button when decision and comments are provided', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <ApprovalActions {...mockProps} />
      </Provider>
    );

    const approveButton = screen.getByText('Approve');
    fireEvent.click(approveButton);

    const submitButton = screen.getByText('Submit Approve');
    expect(submitButton).toBeDisabled();

    const commentTextarea = screen.getByPlaceholderText(/Provide detailed approval reasoning/);
    fireEvent.change(commentTextarea, { target: { value: 'Approved with comments' } });

    expect(submitButton).not.toBeDisabled();
  });

  it('shows annotation tools toggle', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <ApprovalActions {...mockProps} />
      </Provider>
    );

    const annotationButton = screen.getByText('Show Annotation Tools');
    expect(annotationButton).toBeInTheDocument();

    fireEvent.click(annotationButton);
    expect(screen.getByText('Hide Annotation Tools')).toBeInTheDocument();
  });

  it('displays annotation type buttons when tools are shown', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <ApprovalActions {...mockProps} />
      </Provider>
    );

    const annotationButton = screen.getByText('Show Annotation Tools');
    fireEvent.click(annotationButton);

    expect(screen.getByText('Comment')).toBeInTheDocument();
    expect(screen.getByText('Highlight')).toBeInTheDocument();
    expect(screen.getByText('Redaction')).toBeInTheDocument();
  });

  it('handles close button click', () => {
    const store = createMockStore();
    const onCloseMock = vi.fn();

    render(
      <Provider store={store}>
        <ApprovalActions {...mockProps} onClose={onCloseMock} />
      </Provider>
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(onCloseMock).toHaveBeenCalled();
  });

  it('handles cancel button click', () => {
    const store = createMockStore();
    const onCloseMock = vi.fn();

    render(
      <Provider store={store}>
        <ApprovalActions {...mockProps} onClose={onCloseMock} />
      </Provider>
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(onCloseMock).toHaveBeenCalled();
  });

  it('shows loading state during submission', async () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <ApprovalActions {...mockProps} />
      </Provider>
    );

    const approveButton = screen.getByText('Approve');
    fireEvent.click(approveButton);

    const commentTextarea = screen.getByPlaceholderText(/Provide detailed approval reasoning/);
    fireEvent.change(commentTextarea, { target: { value: 'Test comment' } });

    const submitButton = screen.getByText('Submit Approve');
    fireEvent.click(submitButton);

    expect(screen.getByText('Submitting...')).toBeInTheDocument();
  });

  it('shows required comments warning for reject decision', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <ApprovalActions {...mockProps} />
      </Provider>
    );

    const rejectButton = screen.getByText('Reject');
    fireEvent.click(rejectButton);

    expect(screen.getByText(/Required.*Detailed rejection reasons must be provided/)).toBeInTheDocument();
  });

  it('displays help text', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <ApprovalActions {...mockProps} />
      </Provider>
    );

    expect(screen.getByText(/Tip.*Use annotation tools to highlight specific sections/)).toBeInTheDocument();
    expect(screen.getByText(/Note.*All decisions are logged for audit purposes/)).toBeInTheDocument();
  });

  it('shows document viewer controls', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <ApprovalActions {...mockProps} />
      </Provider>
    );

    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    expect(screen.getByTitle('Search')).toBeInTheDocument();
  });

  it('displays sample document content', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <ApprovalActions {...mockProps} />
      </Provider>
    );

    expect(screen.getByText('Sample Document for Approval')).toBeInTheDocument();
    expect(screen.getByText('Document Details')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});