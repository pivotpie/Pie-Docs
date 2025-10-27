import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

type SettingsSection = 'profile' | 'preferences' | 'security' | 'users' | 'role-permissions' | 'general' | 'documents' | 'workflows' | 'search' | 'analytics' | 'email' | 'api' | 'database' | 'security-admin' | 'audit' | 'health' | 'cache'

// User-level components
import UserProfile from '@/components/settings/UserProfile'
import UserPreferences from '@/components/settings/UserPreferences'
import UserSecurity from '@/components/settings/UserSecurity'

// Admin components - Access Management
import UserManagement from '@/components/settings/UserManagement'
import ModernRolePermissionManager from '@/components/settings/ModernRolePermissionManager'

// Admin components - System Configuration
import GeneralSettings from '@/components/settings/GeneralSettings'
import DocumentSettings from '@/components/settings/DocumentSettings'
import WorkflowSettings from '@/components/settings/WorkflowSettings'
import SearchSettings from '@/components/settings/SearchSettings'
import AnalyticsSettings from '@/components/settings/AnalyticsSettings'

// Admin components - Integration & Connectivity
import EmailSettings from '@/components/settings/EmailSettings'
import ApiSettings from '@/components/settings/ApiSettings'
import DatabaseManagement from '@/components/settings/DatabaseManagement'

// Admin components - Security & Compliance
import SecuritySettings from '@/components/settings/SecuritySettings'
import AuditLogs from '@/components/settings/AuditLogs'

// Admin components - Maintenance & Monitoring
import SystemHealth from '@/components/settings/SystemHealth'
import CacheManagement from '@/components/settings/CacheManagement'

export default function SettingsPage() {
  const { t } = useTranslation(['common', 'settings'])
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')

  // Mock user role check - replace with actual auth context
  const isAdmin = true // TODO: Get from auth context

  const userSections = [
    {
      id: 'profile' as SettingsSection,
      name: t('settings:myProfile'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      adminOnly: false,
      category: 'user' as const,
    },
    {
      id: 'preferences' as SettingsSection,
      name: t('settings:preferences'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
      adminOnly: false,
      category: 'user' as const,
    },
    {
      id: 'security' as SettingsSection,
      name: t('settings:passwordSecurity'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      adminOnly: false,
      category: 'user' as const,
    },
  ]

  const adminSections = [
    // Access Management
    {
      id: 'users' as SettingsSection,
      name: t('settings:users'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      adminOnly: true,
      category: 'admin' as const,
    },
    {
      id: 'role-permissions' as SettingsSection,
      name: t('settings:rolePermissions'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      adminOnly: true,
      category: 'admin' as const,
    },
    // System Configuration
    {
      id: 'general' as SettingsSection,
      name: t('settings:general'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      adminOnly: true,
      category: 'admin' as const,
    },
    {
      id: 'documents' as SettingsSection,
      name: t('settings:documents'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      adminOnly: true,
      category: 'admin' as const,
    },
    {
      id: 'workflows' as SettingsSection,
      name: t('settings:workflows'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
        </svg>
      ),
      adminOnly: true,
      category: 'admin' as const,
    },
    {
      id: 'search' as SettingsSection,
      name: t('settings:searchAI'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      adminOnly: true,
      category: 'admin' as const,
    },
    {
      id: 'analytics' as SettingsSection,
      name: t('settings:analytics'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      adminOnly: true,
      category: 'admin' as const,
    },
    // Integration
    {
      id: 'email' as SettingsSection,
      name: t('settings:email'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      adminOnly: true,
      category: 'admin' as const,
    },
    {
      id: 'api' as SettingsSection,
      name: t('settings:apiWebhooks'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      adminOnly: true,
      category: 'admin' as const,
    },
    {
      id: 'database' as SettingsSection,
      name: t('settings:database'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      ),
      adminOnly: true,
      category: 'admin' as const,
    },
    // Security & Compliance
    {
      id: 'security-admin' as SettingsSection,
      name: t('settings:security'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      adminOnly: true,
      category: 'admin' as const,
    },
    {
      id: 'audit' as SettingsSection,
      name: t('settings:auditLogs'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      adminOnly: true,
      category: 'admin' as const,
    },
    // Monitoring
    {
      id: 'health' as SettingsSection,
      name: t('settings:systemHealth'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      adminOnly: true,
      category: 'admin' as const,
    },
    {
      id: 'cache' as SettingsSection,
      name: t('settings:cache'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      adminOnly: true,
      category: 'admin' as const,
    },
  ]

  const allSections = [...userSections, ...(isAdmin ? adminSections : [])]

  const renderSectionContent = () => {
    switch (activeSection) {
      // User sections
      case 'profile':
        return <UserProfile />
      case 'preferences':
        return <UserPreferences />
      case 'security':
        return <UserSecurity />

      // Admin - Access Management
      case 'users':
        return <UserManagement />
      case 'role-permissions':
        return <ModernRolePermissionManager />

      // Admin - System Configuration
      case 'general':
        return <GeneralSettings />
      case 'documents':
        return <DocumentSettings />
      case 'workflows':
        return <WorkflowSettings />
      case 'search':
        return <SearchSettings />
      case 'analytics':
        return <AnalyticsSettings />

      // Admin - Integration
      case 'email':
        return <EmailSettings />
      case 'api':
        return <ApiSettings />
      case 'database':
        return <DatabaseManagement />

      // Admin - Security & Compliance
      case 'security-admin':
        return <SecuritySettings />
      case 'audit':
        return <AuditLogs />

      // Admin - Monitoring
      case 'health':
        return <SystemHealth />
      case 'cache':
        return <CacheManagement />

      default:
        return null
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 mt-20">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">{t('settings:settings')}</h1>
        <p className="text-white/60 mt-2">{t('settings:manageSettings')}</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-64 flex-shrink-0">
          <div className="modal-glass rounded-xl sticky top-24">
            <nav className="p-2 max-h-[calc(100vh-7rem)] overflow-y-auto">
              {/* User Settings Section */}
              <div className="mb-4">
                <div className="px-4 py-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
                  {t('settings:userSettings')}
                </div>
                {userSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all
                      ${
                        activeSection === section.id
                          ? 'bg-white/20 text-white shadow-lg'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }
                    `}
                  >
                    {section.icon}
                    <span>{section.name}</span>
                  </button>
                ))}
              </div>

              {/* Admin Settings Section */}
              {isAdmin && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-white/40 uppercase tracking-wider border-t border-white/10 pt-4">
                    {t('settings:adminSettings')}
                  </div>
                  {adminSections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`
                        w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all
                        ${
                          activeSection === section.id
                            ? 'bg-white/20 text-white shadow-lg'
                            : 'text-white/70 hover:text-white hover:bg-white/10'
                        }
                      `}
                    >
                      {section.icon}
                      <span>{section.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="modal-glass rounded-xl">
            {renderSectionContent()}
          </div>
        </div>
      </div>
    </div>
  )
}
