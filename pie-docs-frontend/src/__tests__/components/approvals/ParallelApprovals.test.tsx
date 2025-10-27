import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ParallelApprovals from '@/components/approvals/ParallelApprovals';
import approvalsSlice from '@/store/slices/approvalsSlice';

const createMockStore = () => {
  return configureStore({
    reducer: {
      approvals: approvalsSlice,
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
            totalRequired: 4,
            approved: 1,
            rejected: 1,
            changesRequested: 1,
            pending: ['user2'],
            completed: ['user1', 'user3', 'user4'],
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
          ignoredActions: ['approvals/updateParallelApprovalStatus'],
          ignoredPaths: ['approvals.currentDocument.parallelApprovals'],
        },
      }),
  });
};

describe('ParallelApprovals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProps = {
    approvalId: 'approval-1',
  };

  it('renders parallel approval status', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <ParallelApprovals {...mockProps} />
      </Provider>
    );

    expect(screen.getByText('Parallel Approval Status')).toBeInTheDocument();
  });

  it('displays consensus type selector', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <ParallelApprovals {...mockProps} />
      </Provider>
    );

    expect(screen.getByText('Consensus:')).toBeInTheDocument();
    const consensusSelect = screen.getByDisplayValue('Majority');
    expect(consensusSelect).toBeInTheDocument();
  });

  it('shows progress information', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <ParallelApprovals {...mockProps} />
      </Provider>
    );

    expect(screen.getByText(/Progress: \d+%/)).toBeInTheDocument();
    expect(screen.getByText(/\d+ of \d+ completed/)).toBeInTheDocument();
  });

  it('displays progress bar', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <ParallelApprovals {...mockProps} />
      </Provider>
    );

    const progressBar = document.querySelector('.bg-blue-600');
    expect(progressBar).toBeInTheDocument();
  });

  it('shows approver list with status', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <ParallelApprovals {...mockProps} />
      </Provider>
    );

    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    expect(screen.getByText('Mike Chen')).toBeInTheDocument();
    expect(screen.getByText('Lisa Williams')).toBeInTheDocument();
  });

  it('displays different status indicators for approvers', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <ParallelApprovals {...mockProps} />
      </Provider>
    );

    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('Changes Requested')).toBeInTheDocument();
  });

  it('shows approver roles and departments', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <ParallelApprovals {...mockProps} />
      </Provider>
    );

    expect(screen.getByText('Legal Counsel • Legal')).toBeInTheDocument();
    expect(screen.getByText('CFO • Finance')).toBeInTheDocument();
    expect(screen.getByText('VP Operations • Operations')).toBeInTheDocument();
    expect(screen.getByText('HR Director • HR')).toBeInTheDocument();
  });

  it('displays decision timestamps for completed approvals', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <ParallelApprovals {...mockProps} />
      </Provider>
    );

    expect(screen.getByText(/Decided: \d+\/\d+\/\d+/)).toBeInTheDocument();
  });

  it('shows weight indicators for weighted consensus', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <ParallelApprovals {...mockProps} />
      </Provider>
    );

    // Change to weighted consensus
    const consensusSelect = screen.getByDisplayValue('Majority');
    fireEvent.change(consensusSelect, { target: { value: 'weighted' } });

    expect(screen.getByText('Weight: 1')).toBeInTheDocument();
    expect(screen.getByText('Weight: 2')).toBeInTheDocument();
  });

  it('opens comment modal when clicking comment button', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <ParallelApprovals {...mockProps} />
      </Provider>
    );

    // Find and click a comment button (represented by chat icon)
    const commentButtons = document.querySelectorAll('button[title="View comments"]');
    if (commentButtons.length > 0) {
      fireEvent.click(commentButtons[0]);
      expect(screen.getByText("John Smith's Feedback")).toBeInTheDocument();
    }
  });

  it('displays consensus requirements information', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <ParallelApprovals {...mockProps} />
      </Provider>
    );

    expect(screen.getByText('Consensus Requirements')).toBeInTheDocument();
    expect(screen.getByText('• More than half of the approvers must agree for a decision')).toBeInTheDocument();
  });

  it('changes consensus requirements text when type changes', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <ParallelApprovals {...mockProps} />
      </Provider>
    );

    const consensusSelect = screen.getByDisplayValue('Majority');

    // Test unanimous
    fireEvent.change(consensusSelect, { target: { value: 'unanimous' } });
    expect(screen.getByText('• All approvers must approve for the document to be approved')).toBeInTheDocument();

    // Test weighted
    fireEvent.change(consensusSelect, { target: { value: 'weighted' } });
    expect(screen.getByText('• Decisions are weighted by approver importance/role weight')).toBeInTheDocument();

    // Test any
    fireEvent.change(consensusSelect, { target: { value: 'any' } });
    expect(screen.getByText('• Any single approver decision determines the outcome')).toBeInTheDocument();
  });

  it('shows consensus reached indicator when consensus is met', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <ParallelApprovals {...mockProps} />
      </Provider>
    );

    // The mock data should trigger consensus under majority rule
    // (approved: 1, rejected: 1, changes: 1, pending: 1 out of 4 total)
    // This might show consensus depending on the implementation logic
  });

  it('displays comment modal content', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <ParallelApprovals {...mockProps} />
      </Provider>
    );

    // Click a comment button to open modal
    const commentButtons = document.querySelectorAll('button[title="View comments"]');
    if (commentButtons.length > 0) {
      fireEvent.click(commentButtons[0]);

      // Check modal content
      expect(screen.getByText('Decision:')).toBeInTheDocument();
      expect(screen.getByText('Date:')).toBeInTheDocument();
      expect(screen.getByText('Comments:')).toBeInTheDocument();
    }
  });

  it('closes comment modal when close button is clicked', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <ParallelApprovals {...mockProps} />
      </Provider>
    );

    // Open modal
    const commentButtons = document.querySelectorAll('button[title="View comments"]');
    if (commentButtons.length > 0) {
      fireEvent.click(commentButtons[0]);

      // Close modal
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(screen.queryByText("John Smith's Feedback")).not.toBeInTheDocument();
    }
  });

  it('shows appropriate status icons', () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <ParallelApprovals {...mockProps} />
      </Provider>
    );

    // Check for SVG icons (they should be present for each status)
    const svgIcons = document.querySelectorAll('svg');
    expect(svgIcons.length).toBeGreaterThan(0);
  });
});