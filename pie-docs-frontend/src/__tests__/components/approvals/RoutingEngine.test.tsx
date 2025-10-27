import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import RoutingEngine from '@/components/approvals/RoutingEngine';
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
      auth: () => ({ user: { id: 'user-1', name: 'Test User', role: 'admin' } }),
    },
    preloadedState: {
      approvals: {
        activeApprovals: {
          pending: [],
          inProgress: [],
          completed: [],
          escalated: [],
        },
        approvalChains: [
          {
            id: 'chain-1',
            name: 'Contract Approval Chain',
            steps: [
              { id: 'step-1', role: 'reviewer', userId: 'user-2', order: 1 },
              { id: 'step-2', role: 'approver', userId: 'user-3', order: 2 },
              { id: 'step-3', role: 'final_approver', userId: 'user-4', order: 3 }
            ],
            documentTypes: ['contract', 'agreement']
          },
          {
            id: 'chain-2',
            name: 'Policy Approval Chain',
            steps: [
              { id: 'step-1', role: 'reviewer', userId: 'user-5', order: 1 },
              { id: 'step-2', role: 'approver', userId: 'user-6', order: 2 }
            ],
            documentTypes: ['policy', 'procedure']
          }
        ],
        routingRules: [
          {
            id: 'rule-1',
            name: 'High Value Contract Rule',
            condition: {
              documentType: 'contract',
              metadata: { value: { operator: 'gt', value: 100000 } }
            },
            chainId: 'chain-1',
            priority: 1,
            enabled: true
          },
          {
            id: 'rule-2',
            name: 'Policy Document Rule',
            condition: {
              documentType: 'policy'
            },
            chainId: 'chain-2',
            priority: 2,
            enabled: true
          }
        ],
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
};

describe('RoutingEngine', () => {
  let store: any;

  beforeEach(() => {
    store = createMockStore();
    vi.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <Provider store={store}>
        <RoutingEngine {...props} />
      </Provider>
    );
  };

  it('renders routing engine interface with available chains', () => {
    renderComponent();

    expect(screen.getByText('Approval Routing Engine')).toBeInTheDocument();
    expect(screen.getByText('Contract Approval Chain')).toBeInTheDocument();
    expect(screen.getByText('Policy Approval Chain')).toBeInTheDocument();
  });

  it('displays routing rules with conditions and priorities', () => {
    renderComponent();

    expect(screen.getByText('High Value Contract Rule')).toBeInTheDocument();
    expect(screen.getByText('Policy Document Rule')).toBeInTheDocument();
    expect(screen.getByText('Priority: 1')).toBeInTheDocument();
    expect(screen.getByText('Priority: 2')).toBeInTheDocument();
  });

  it('evaluates document routing based on metadata', async () => {
    renderComponent();

    const testDocument = {
      id: 'doc-1',
      type: 'contract',
      metadata: { value: 150000 },
      title: 'High Value Contract'
    };

    const routeButton = screen.getByText(/route document/i);
    fireEvent.click(routeButton);

    // Simulate document input
    const documentInput = screen.getByTestId('document-input');
    fireEvent.change(documentInput, {
      target: { value: JSON.stringify(testDocument) }
    });

    const evaluateButton = screen.getByText(/evaluate routing/i);
    fireEvent.click(evaluateButton);

    await waitFor(() => {
      expect(screen.getByText('Contract Approval Chain')).toBeInTheDocument();
      expect(screen.getByText(/matched rule: high value contract/i)).toBeInTheDocument();
    });
  });

  it('shows approval chain step visualization', () => {
    renderComponent();

    const chainCard = screen.getByTestId('chain-contract-approval-chain');
    fireEvent.click(chainCard);

    expect(screen.getByText('Step 1: reviewer')).toBeInTheDocument();
    expect(screen.getByText('Step 2: approver')).toBeInTheDocument();
    expect(screen.getByText('Step 3: final_approver')).toBeInTheDocument();
  });

  it('allows creating new routing rules', () => {
    renderComponent();

    const addRuleButton = screen.getByText(/add rule/i);
    fireEvent.click(addRuleButton);

    expect(screen.getByText('Create Routing Rule')).toBeInTheDocument();
    expect(screen.getByLabelText(/rule name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/document type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/approval chain/i)).toBeInTheDocument();
  });

  it('validates routing rule conditions', () => {
    renderComponent();

    const addRuleButton = screen.getByText(/add rule/i);
    fireEvent.click(addRuleButton);

    const saveButton = screen.getByText(/save rule/i);
    fireEvent.click(saveButton);

    expect(screen.getByText(/rule name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/document type is required/i)).toBeInTheDocument();
  });

  it('provides routing simulation and testing tools', async () => {
    renderComponent();

    const simulateButton = screen.getByText(/simulate routing/i);
    fireEvent.click(simulateButton);

    const testScenarios = screen.getByTestId('test-scenarios');
    expect(testScenarios).toBeInTheDocument();

    const runTestButton = screen.getByText(/run test/i);
    fireEvent.click(runTestButton);

    await waitFor(() => {
      expect(screen.getByText(/simulation results/i)).toBeInTheDocument();
    });
  });

  it('handles parallel approval routing', () => {
    renderComponent();

    const parallelToggle = screen.getByLabelText(/enable parallel approvals/i);
    fireEvent.click(parallelToggle);

    expect(screen.getByText(/parallel configuration/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/required approvals/i)).toBeInTheDocument();
  });

  it('displays routing analytics and statistics', () => {
    renderComponent();

    const analyticsTab = screen.getByText(/analytics/i);
    fireEvent.click(analyticsTab);

    expect(screen.getByText(/routing efficiency/i)).toBeInTheDocument();
    expect(screen.getByText(/average processing time/i)).toBeInTheDocument();
    expect(screen.getByText(/rule usage statistics/i)).toBeInTheDocument();
  });

  it('allows editing existing routing rules', () => {
    renderComponent();

    const editButton = screen.getByTestId('edit-rule-1');
    fireEvent.click(editButton);

    expect(screen.getByDisplayValue('High Value Contract Rule')).toBeInTheDocument();
    expect(screen.getByDisplayValue('100000')).toBeInTheDocument();
  });

  it('supports conditional routing based on document metadata', () => {
    renderComponent();

    const addConditionButton = screen.getByText(/add condition/i);
    fireEvent.click(addConditionButton);

    expect(screen.getByLabelText(/metadata field/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/operator/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/value/i)).toBeInTheDocument();
  });

  it('provides routing rule priority management', () => {
    renderComponent();

    const priorityControls = screen.getAllByTestId(/priority-control/);
    expect(priorityControls).toHaveLength(2);

    const moveUpButton = screen.getByTestId('priority-up-rule-2');
    fireEvent.click(moveUpButton);

    expect(screen.getByText('Priority: 1')).toBeInTheDocument();
  });

  it('handles routing conflicts and resolution', () => {
    renderComponent();

    const conflictIndicator = screen.getByTestId('routing-conflicts');
    expect(conflictIndicator).toBeInTheDocument();

    const resolveButton = screen.getByText(/resolve conflicts/i);
    fireEvent.click(resolveButton);

    expect(screen.getByText(/conflict resolution/i)).toBeInTheDocument();
  });

  it('supports routing rule import and export', () => {
    renderComponent();

    const exportButton = screen.getByText(/export rules/i);
    fireEvent.click(exportButton);

    expect(screen.getByText(/download configuration/i)).toBeInTheDocument();

    const importButton = screen.getByText(/import rules/i);
    fireEvent.click(importButton);

    expect(screen.getByText(/upload configuration/i)).toBeInTheDocument();
  });

  it('displays routing performance metrics', () => {
    renderComponent();

    const metricsPanel = screen.getByTestId('routing-metrics');
    expect(metricsPanel).toBeInTheDocument();

    expect(screen.getByText(/rules evaluated per second/i)).toBeInTheDocument();
    expect(screen.getByText(/routing accuracy/i)).toBeInTheDocument();
  });

  it('provides routing rule templates for common scenarios', () => {
    renderComponent();

    const templatesButton = screen.getByText(/rule templates/i);
    fireEvent.click(templatesButton);

    expect(screen.getByText(/contract templates/i)).toBeInTheDocument();
    expect(screen.getByText(/policy templates/i)).toBeInTheDocument();
    expect(screen.getByText(/financial templates/i)).toBeInTheDocument();
  });

  it('handles routing errors gracefully', async () => {
    const mockError = vi.fn().mockRejectedValue(new Error('Routing failed'));
    vi.spyOn(store, 'dispatch').mockImplementation(mockError);

    renderComponent();

    const routeButton = screen.getByText(/route document/i);
    fireEvent.click(routeButton);

    await waitFor(() => {
      expect(screen.getByText(/routing error/i)).toBeInTheDocument();
    });
  });

  it('supports dynamic routing rule updates', () => {
    renderComponent();

    const dynamicToggle = screen.getByLabelText(/enable dynamic routing/i);
    fireEvent.click(dynamicToggle);

    expect(screen.getByText(/rules will update automatically/i)).toBeInTheDocument();
  });
});