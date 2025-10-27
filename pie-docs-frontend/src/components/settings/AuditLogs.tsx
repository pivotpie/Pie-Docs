import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function AuditLogs() {
  const { t } = useTranslation(['common', 'settings'])

  const [logs] = useState([
    { id: '1', user: 'admin', action: 'User Created', resource: 'john_doe', timestamp: '2024-01-15 14:30:22', ip: '192.168.1.1' },
    { id: '2', user: 'manager', action: 'Document Uploaded', resource: 'contract.pdf', timestamp: '2024-01-15 14:25:10', ip: '192.168.1.2' },
    { id: '3', user: 'admin', action: 'Role Updated', resource: 'editor', timestamp: '2024-01-15 14:20:05', ip: '192.168.1.1' },
    { id: '4', user: 'user1', action: 'Login', resource: '-', timestamp: '2024-01-15 14:15:33', ip: '192.168.1.5' },
  ])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Audit Logs</h2>
          <p className="text-white/60 mt-1">View system activity and user actions</p>
        </div>
        <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
          Export Logs
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-sm font-medium text-white/60">Timestamp</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-white/60">User</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-white/60">Action</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-white/60">Resource</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-white/60">IP Address</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="py-3 px-4 text-white/80 text-sm">{log.timestamp}</td>
                <td className="py-3 px-4 text-white/80">{log.user}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">{log.action}</span>
                </td>
                <td className="py-3 px-4 text-white/80">{log.resource}</td>
                <td className="py-3 px-4 text-white/60 text-sm">{log.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
