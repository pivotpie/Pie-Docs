import React, { useState, useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import {
  EmailAccount,
  EmailImportRule,
  EmailImportJob,
  EmailProvider,
  ConnectionStatus
} from '../../types/domain/EmailIntegration';
import {
  createEmailAccount,
  updateEmailAccount,
  deleteEmailAccount,
  testEmailConnection,
  getEmailAccounts,
  createImportRule,
  startImportJob,
  getImportJobs,
  getEmailAnalytics
} from '../../store/slices/emailIntegrationSlice';
import EmailAccountsList from '../../components/documents/email/EmailAccountsList';
import EmailAccountForm from '../../components/documents/email/EmailAccountForm';
import ImportRulesManager from '../../components/documents/email/ImportRulesManager';
import EmailImportJobMonitor from '../../components/documents/email/EmailImportJobMonitor';
import EmailAnalyticsDashboard from '../../components/documents/email/EmailAnalyticsDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  Mail,
  Plus,
  Settings,
  Play,
  Pause,
  BarChart3,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Wifi,
  WifiOff,
  Refresh,
  Import,
  Filter,
  Monitor
} from 'lucide-react';

const EmailIntegrationManager: React.FC = () => {
  const dispatch = useAppDispatch();
  const {
    accounts,
    rules,
    currentAccount,
    currentJob,
    jobs,
    analytics,
    monitoring,
    loading,
    error
  } = useAppSelector(state => state.emailIntegration);

  const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showRulesManager, setShowRulesManager] = useState(false);
  const [activeTab, setActiveTab] = useState('accounts');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    dispatch(getEmailAccounts());
    dispatch(getImportJobs());
  }, [dispatch]);

  const handleCreateAccount = useCallback(async (accountData: Omit<EmailAccount, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await dispatch(createEmailAccount(accountData)).unwrap();
      setShowAccountForm(false);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to create email account:', error);
    }
  }, [dispatch]);

  const handleUpdateAccount = useCallback(async (account: EmailAccount) => {
    try {
      await dispatch(updateEmailAccount(account)).unwrap();
      setSelectedAccount(account);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update email account:', error);
    }
  }, [dispatch]);

  const handleDeleteAccount = useCallback(async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this email account? This will also delete all associated import rules and stop monitoring.')) {
      return;
    }

    try {
      await dispatch(deleteEmailAccount(accountId)).unwrap();
      if (selectedAccount?.id === accountId) {
        setSelectedAccount(null);
      }
    } catch (error) {
      console.error('Failed to delete email account:', error);
    }
  }, [dispatch, selectedAccount]);

  const handleTestConnection = useCallback(async (accountId: string) => {
    try {
      await dispatch(testEmailConnection(accountId)).unwrap();
    } catch (error) {
      console.error('Connection test failed:', error);
    }
  }, [dispatch]);

  const handleStartImport = useCallback(async (accountId: string, configuration?: any) => {
    try {
      await dispatch(startImportJob({ accountId, configuration })).unwrap();
    } catch (error) {
      console.error('Failed to start import job:', error);
    }
  }, [dispatch]);

  const handleToggleMonitoring = useCallback(async (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (account) {
      const updatedAccount = { ...account, isActive: !account.isActive };
      await handleUpdateAccount(updatedAccount);
    }
  }, [accounts, handleUpdateAccount]);

  const getStatusIcon = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'configuring':
      case 'testing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-500" />;
    }
  };

  const getProviderIcon = (provider: EmailProvider) => {
    // In a real implementation, you'd use specific provider icons
    return <Mail className="h-4 w-4" />;
  };

  const connectedAccounts = accounts.filter(acc => acc.status === 'connected');
  const errorAccounts = accounts.filter(acc => acc.status === 'error');
  const activeRules = rules.filter(rule => rule.isActive);
  const runningJobs = jobs.filter(job => job.status === 'running');

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Mail className="h-6 w-6 text-blue-600" />
              Email Integration
            </h1>
            <p className="text-sm text-gray-500">
              Automatically import documents from email accounts
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatch(getEmailAccounts())}
              disabled={loading}
            >
              <Refresh className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            <Dialog open={showAccountForm} onOpenChange={setShowAccountForm}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Email Account
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {isEditing ? 'Edit Email Account' : 'Add Email Account'}
                  </DialogTitle>
                </DialogHeader>
                <EmailAccountForm
                  account={isEditing ? selectedAccount : undefined}
                  onSave={isEditing ? handleUpdateAccount : handleCreateAccount}
                  onCancel={() => {
                    setShowAccountForm(false);
                    setIsEditing(false);
                    setSelectedAccount(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Connected Accounts</p>
                  <p className="text-2xl font-bold text-green-600">{connectedAccounts.length}</p>
                </div>
                <Wifi className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Rules</p>
                  <p className="text-2xl font-bold text-blue-600">{activeRules.length}</p>
                </div>
                <Filter className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Running Jobs</p>
                  <p className="text-2xl font-bold text-purple-600">{runningJobs.length}</p>
                </div>
                <Play className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Errors</p>
                  <p className="text-2xl font-bold text-red-600">{errorAccounts.length}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="accounts">Email Accounts</TabsTrigger>
            <TabsTrigger value="rules">Import Rules</TabsTrigger>
            <TabsTrigger value="jobs">Import Jobs</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Accounts List */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Email Accounts
                      <span className="text-sm font-normal text-gray-500">
                        {accounts.length} total
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EmailAccountsList
                      accounts={accounts}
                      selectedAccount={selectedAccount}
                      onAccountSelect={setSelectedAccount}
                      onAccountEdit={(account) => {
                        setSelectedAccount(account);
                        setIsEditing(true);
                        setShowAccountForm(true);
                      }}
                      onAccountDelete={handleDeleteAccount}
                      onTestConnection={handleTestConnection}
                      onToggleMonitoring={handleToggleMonitoring}
                      onStartImport={handleStartImport}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Account Details */}
              <div>
                {selectedAccount ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {getProviderIcon(selectedAccount.type)}
                        {selectedAccount.name}
                        {getStatusIcon(selectedAccount.status)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Email</label>
                        <p className="text-sm text-gray-900">{selectedAccount.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Provider</label>
                        <p className="text-sm text-gray-900 capitalize">{selectedAccount.type}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Status</label>
                        <p className={`text-sm font-medium ${
                          selectedAccount.status === 'connected' ? 'text-green-600' :
                          selectedAccount.status === 'error' ? 'text-red-600' :
                          'text-yellow-600'
                        }`}>
                          {selectedAccount.status.charAt(0).toUpperCase() + selectedAccount.status.slice(1)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Last Sync</label>
                        <p className="text-sm text-gray-900">
                          {selectedAccount.lastSync.toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Total Emails</label>
                        <p className="text-sm text-gray-900">{selectedAccount.totalEmails.toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Processed</label>
                        <p className="text-sm text-gray-900">{selectedAccount.processedEmails.toLocaleString()}</p>
                      </div>

                      <div className="flex flex-col gap-2 pt-4 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestConnection(selectedAccount.id)}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Test Connection
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartImport(selectedAccount.id)}
                          disabled={selectedAccount.status !== 'connected'}
                        >
                          <Import className="h-4 w-4 mr-2" />
                          Start Import
                        </Button>
                        <Button
                          size="sm"
                          variant={selectedAccount.isActive ? 'destructive' : 'default'}
                          onClick={() => handleToggleMonitoring(selectedAccount.id)}
                        >
                          {selectedAccount.isActive ? (
                            <><Pause className="h-4 w-4 mr-2" />Stop Monitoring</>
                          ) : (
                            <><Play className="h-4 w-4 mr-2" />Start Monitoring</>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <Mail className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          Select an email account to view details
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rules">
            <ImportRulesManager
              accounts={accounts}
              rules={rules}
              onCreateRule={(rule) => dispatch(createImportRule(rule))}
              onUpdateRule={(rule) => console.log('Update rule:', rule)}
              onDeleteRule={(ruleId) => console.log('Delete rule:', ruleId)}
              onTestRule={(ruleId) => console.log('Test rule:', ruleId)}
            />
          </TabsContent>

          <TabsContent value="jobs">
            <EmailImportJobMonitor
              jobs={jobs}
              currentJob={currentJob}
              onJobAction={(jobId, action) => console.log('Job action:', jobId, action)}
              onJobDetails={(jobId) => console.log('Job details:', jobId)}
            />
          </TabsContent>

          <TabsContent value="monitoring">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Monitoring Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {accounts.map((account) => (
                      <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getProviderIcon(account.type)}
                          <div>
                            <p className="font-medium text-gray-900">{account.name}</p>
                            <p className="text-sm text-gray-500">{account.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {account.isActive ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1 animate-pulse"></div>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Inactive
                            </span>
                          )}
                          {getStatusIcon(account.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {jobs.slice(0, 5).map((job) => (
                      <div key={job.id} className="flex items-center gap-3 p-2 border rounded">
                        <div className={`w-2 h-2 rounded-full ${
                          job.status === 'completed' ? 'bg-green-500' :
                          job.status === 'running' ? 'bg-blue-500' :
                          job.status === 'failed' ? 'bg-red-500' :
                          'bg-gray-400'
                        }`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {accounts.find(acc => acc.id === job.accountId)?.name || 'Unknown Account'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {job.startTime.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {job.results.documentsCreated} docs
                          </p>
                          <p className="text-xs text-gray-500 capitalize">
                            {job.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <EmailAnalyticsDashboard
              accounts={accounts}
              analytics={analytics}
              onLoadAnalytics={(accountId) => dispatch(getEmailAnalytics(accountId))}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Import Rules Manager Modal */}
      {showRulesManager && (
        <Dialog open={showRulesManager} onOpenChange={setShowRulesManager}>
          <DialogContent className="max-w-6xl">
            <DialogHeader>
              <DialogTitle>Import Rules Manager</DialogTitle>
            </DialogHeader>
            <ImportRulesManager
              accounts={accounts}
              rules={rules}
              onCreateRule={(rule) => dispatch(createImportRule(rule))}
              onUpdateRule={(rule) => console.log('Update rule:', rule)}
              onDeleteRule={(ruleId) => console.log('Delete rule:', ruleId)}
              onTestRule={(ruleId) => console.log('Test rule:', ruleId)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="m-4">
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default EmailIntegrationManager;