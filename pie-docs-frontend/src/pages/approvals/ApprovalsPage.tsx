import React, { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import ApprovalInterface from './ApprovalInterface';
import ApprovalHistory from '@/components/approvals/ApprovalHistory';
import ParallelApprovals from '@/components/approvals/ParallelApprovals';
import EscalationManager from '@/components/approvals/EscalationManager';
import MobileApprovalInterface from '@/components/approvals/MobileApprovalInterface';
import RoutingEngine from '@/components/approvals/RoutingEngine';

const ApprovalsPage: React.FC = () => {
  const { theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get active tab from URL params
  const activeTab = searchParams.get('tab') || 'pending';

  // Tab navigation handler
  const handleTabChange = useCallback((tab: string) => {
    setSearchParams({ tab });
  }, [setSearchParams]);

  const tabs = [
    { id: 'pending', label: 'Pending Approvals', icon: '⏳' },
    { id: 'routing', label: 'Approval Routing', icon: '🔀' },
    { id: 'escalation', label: 'Escalation Management', icon: '⚠️' },
    { id: 'parallel', label: 'Parallel Approvals', icon: '↔' },
    { id: 'mobile', label: 'Mobile Interface', icon: '📱' },
    { id: 'history', label: 'Approval History', icon: '📋' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 glass-strong">
        <div className="px-6 py-4">
          <div className="flex flex-col space-y-4">
            {/* Top Row: Title and Tab Navigation */}
            <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
              {/* Title */}
              <div className="flex items-center space-x-4">
                <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
                  Document Approvals
                </h1>
              </div>

              {/* Tab Navigation */}
              <div className="flex items-center space-x-1 bg-white/10 rounded-lg p-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`
                      flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
                      ${activeTab === tab.id
                        ? 'bg-white/20 text-white shadow-sm'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                      }
                    `}
                  >
                    <span>{tab.icon}</span>
                    <span className="hidden md:block">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {/* Pending Approvals Tab (Original ApprovalInterface) */}
        {activeTab === 'pending' && (
          <div className="h-full">
            <ApprovalInterface />
          </div>
        )}

        {/* Approval Routing Tab */}
        {activeTab === 'routing' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">Approval Routing</h2>
                <p className="text-white/70">Configure approval routing rules and workflows.</p>
              </div>

              <div className="glass-panel rounded-lg p-6">
                <RoutingEngine />
              </div>
            </div>
          </div>
        )}

        {/* Escalation Management Tab */}
        {activeTab === 'escalation' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">Escalation Management</h2>
                <p className="text-white/70">Manage approval escalations and deadlines.</p>
              </div>

              <div className="glass-panel rounded-lg p-6">
                <EscalationManager />
              </div>
            </div>
          </div>
        )}

        {/* Parallel Approvals Tab */}
        {activeTab === 'parallel' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">Parallel Approvals</h2>
                <p className="text-white/70">Configure and manage parallel approval processes.</p>
              </div>

              <div className="glass-panel rounded-lg p-6">
                <ParallelApprovals />
              </div>
            </div>
          </div>
        )}

        {/* Mobile Interface Tab */}
        {activeTab === 'mobile' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">Mobile Approval Interface</h2>
                <p className="text-white/70">Mobile-optimized approval interface for on-the-go approvals.</p>
              </div>

              <div className="glass-panel rounded-lg p-6">
                <MobileApprovalInterface />
              </div>
            </div>
          </div>
        )}

        {/* Approval History Tab */}
        {activeTab === 'history' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">Approval History</h2>
                <p className="text-white/70">View complete approval history and audit trails.</p>
              </div>

              <div className="glass-panel rounded-lg p-6">
                <ApprovalHistory />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalsPage;