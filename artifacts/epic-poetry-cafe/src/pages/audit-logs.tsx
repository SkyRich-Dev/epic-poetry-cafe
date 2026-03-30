import React from 'react';
import { useListAuditLogs } from '@workspace/api-client-react';
import { PageHeader, formatDate } from '../components/ui-extras';

export default function AuditLogs() {
  const { data: logs, isLoading } = useListAuditLogs();

  return (
    <div className="space-y-6">
      <PageHeader title="System Audit Logs" description="Track all critical changes across the system for security and compliance" />

      <div className="table-container">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground border-b font-medium uppercase text-xs tracking-wider">
            <tr>
              <th className="px-6 py-4">Timestamp</th>
              <th className="px-6 py-4">Module</th>
              <th className="px-6 py-4">Action</th>
              <th className="px-6 py-4">Record ID</th>
              <th className="px-6 py-4">Changed By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading logs...</td></tr>
            ) : logs?.items?.length === 0 || !logs ? (
               <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No audit logs available.</td></tr>
            ) : logs.items.map((log: any) => (
              <tr key={log.id} className="table-row-hover">
                <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{new Date(log.changedAt).toLocaleString()}</td>
                <td className="px-6 py-4 font-medium capitalize">{log.module}</td>
                <td className="px-6 py-4"><span className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs font-semibold">{log.action}</span></td>
                <td className="px-6 py-4 text-muted-foreground">#{log.recordId}</td>
                <td className="px-6 py-4 text-foreground">{log.changedBy || 'System'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
