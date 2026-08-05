import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { AuditLog } from '../types';
import { 
  FileText, 
  Search, 
  RefreshCw, 
  User, 
  Settings, 
  CreditCard, 
  Clock, 
  Trash2, 
  AlertTriangle, 
  Download, 
  Database, 
  ShieldAlert, 
  Info,
  X,
  Filter,
  CheckCircle2,
  Server
} from 'lucide-react';

export function AuditTrailTab() {
  const { auditLogs = [], fetchAuditLogs } = useApp();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'deletions' | 'students' | 'payments' | 'database' | 'expenses' | 'settings' | 'security' | 'other'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [visibleLogsCount, setVisibleLogsCount] = useState(50);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    setVisibleLogsCount(50);
  }, [search, categoryFilter]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAuditLogs?.();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const isDeletionAction = (log: AuditLog) => {
    const act = (log.action || '').toLowerCase();
    const det = (log.details || '').toLowerCase();
    return (
      act.includes('delete') || 
      act.includes('purge') || 
      act.includes('remove') || 
      act.includes('reset') || 
      det.includes('deleted') || 
      det.includes('purged') || 
      det.includes('removed') ||
      det.includes('reset')
    );
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      (log.action || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.operatorName || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.studentName || '').toLowerCase().includes(search.toLowerCase());

    if (categoryFilter === 'deletions') {
      return matchesSearch && isDeletionAction(log);
    }

    if (categoryFilter === 'database') {
      const act = (log.action || '').toLowerCase();
      const det = (log.details || '').toLowerCase();
      return matchesSearch && (
        log.category === 'settings' || 
        act.includes('sync') || 
        act.includes('db') || 
        act.includes('database') || 
        det.includes('sync') || 
        det.includes('database') || 
        det.includes('seed') || 
        det.includes('restore')
      );
    }

    const matchesCategory = categoryFilter === 'all' || log.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const displayedLogs = filteredLogs.slice(0, visibleLogsCount);

  // Stats Counters
  const totalCount = auditLogs.length;
  const deletionCount = auditLogs.filter(isDeletionAction).length;
  const studentCount = auditLogs.filter(l => l.category === 'students').length;
  const paymentCount = auditLogs.filter(l => l.category === 'payments').length;
  const databaseCount = auditLogs.filter(l => {
    const act = (l.action || '').toLowerCase();
    const det = (l.details || '').toLowerCase();
    return l.category === 'settings' || act.includes('sync') || act.includes('db') || det.includes('database') || det.includes('restore');
  }).length;

  const getActionBadgeStyle = (log: AuditLog) => {
    if (isDeletionAction(log)) {
      return 'bg-rose-950 text-rose-300 border-rose-800';
    }
    switch (log.category) {
      case 'students':
        return 'bg-purple-950 text-purple-300 border-purple-800';
      case 'payments':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'expenses':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'settings':
        return 'bg-blue-950 text-blue-300 border-blue-800';
      case 'security':
        return 'bg-pink-950 text-pink-300 border-pink-800';
      default:
        return 'bg-neutral-900 text-neutral-300 border-neutral-700';
    }
  };

  const formatTimestamp = (isoString?: string) => {
    if (!isoString) return '---';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['ID', 'Timestamp', 'Action', 'Operator Name', 'Operator Role', 'Category', 'Details', 'Student Name', 'Amount (GHC)'];
    const rows = filteredLogs.map(l => [
      l.id || '',
      l.timestamp || '',
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${(l.operatorName || '').replace(/"/g, '""')}"`,
      `"${(l.operatorRole || '').replace(/"/g, '""')}"`,
      l.category || '',
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${(l.studentName || '').replace(/"/g, '""')}"`,
      l.amount !== undefined ? l.amount.toFixed(2) : ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Internal_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="audit-trail-tab">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-neutral-900 gap-4">
        <div>
          <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
            <FileText className="text-amber-400 stroke-[2.5]" size={18} />
            <span>Internal Audit Log & Operations Monitor</span>
          </h3>
          <p className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider mt-1">
            Real-time administrative log tracking database syncs, deletions, pupil records, and payment audits to detect data changes
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="py-2.5 px-3.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-white border border-neutral-800 flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
          >
            <Download size={12} className="text-amber-400" />
            <span>Export CSV ({filteredLogs.length})</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-black border border-amber-400 flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={`${isRefreshing ? 'animate-spin text-black' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Logs'}</span>
          </button>
        </div>
      </div>

      {/* Metric Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-neutral-950 border-2 border-neutral-850 p-3.5 relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block font-mono">Total System Logs</span>
            <span className="text-2xl font-mono font-black text-white block">{totalCount}</span>
          </div>
          <div className="absolute right-2 bottom-2 opacity-15">
            <FileText size={36} className="text-neutral-500" />
          </div>
        </div>

        <div className="bg-neutral-950 border-2 border-rose-900/60 p-3.5 relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1 font-mono">
              <Trash2 size={10} /> Deletions & Purges
            </span>
            <span className="text-2xl font-mono font-black text-rose-300 block">{deletionCount}</span>
          </div>
          <div className="absolute right-2 bottom-2 opacity-15">
            <AlertTriangle size={36} className="text-rose-500" />
          </div>
        </div>

        <div className="bg-neutral-950 border-2 border-purple-900/60 p-3.5 relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest block font-mono">Pupil Registry</span>
            <span className="text-2xl font-mono font-black text-purple-300 block">{studentCount}</span>
          </div>
          <div className="absolute right-2 bottom-2 opacity-15">
            <User size={36} className="text-purple-500" />
          </div>
        </div>

        <div className="bg-neutral-950 border-2 border-emerald-900/60 p-3.5 relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block font-mono">Payment Transactions</span>
            <span className="text-2xl font-mono font-black text-emerald-300 block">{paymentCount}</span>
          </div>
          <div className="absolute right-2 bottom-2 opacity-15">
            <CreditCard size={36} className="text-emerald-500" />
          </div>
        </div>

        <div className="bg-neutral-950 border-2 border-amber-900/60 p-3.5 relative overflow-hidden col-span-2 lg:col-span-1">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest block font-mono">Database & Sync</span>
            <span className="text-2xl font-mono font-black text-amber-300 block">{databaseCount}</span>
          </div>
          <div className="absolute right-2 bottom-2 opacity-15">
            <Database size={36} className="text-amber-500" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-neutral-900 border-2 border-neutral-800 p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
            <input
              type="text"
              placeholder="Filter by action, operator, student name, or details..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-neutral-950 border-2 border-neutral-850 hover:border-neutral-800 focus:border-amber-400 text-white font-mono text-xs pl-10 pr-4 py-3 focus:outline-none transition-all placeholder:text-neutral-600"
            />
          </div>
          {categoryFilter !== 'deletions' && (
            <button
              onClick={() => setCategoryFilter('deletions')}
              className="px-4 py-2.5 bg-rose-950 hover:bg-rose-900 border-2 border-rose-800 text-rose-300 font-mono text-[10px] font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Trash2 size={12} className="text-rose-400" />
              <span>Show Deletions Only ({deletionCount})</span>
            </button>
          )}
        </div>

        {/* Categories Tab Selector */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {(['all', 'deletions', 'students', 'payments', 'database', 'expenses', 'settings', 'security', 'other'] as const).map(cat => {
            const labelMap: Record<string, string> = {
              all: 'ALL OPERATIONS',
              deletions: 'DELETIONS & PURGES',
              students: 'PUPIL REGISTRY',
              payments: 'PAYMENTS',
              database: 'DATABASE & SYNC',
              expenses: 'EXPENSES',
              settings: 'SETTINGS',
              security: 'SECURITY',
              other: 'OTHER'
            };
            const isSelected = categoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 font-mono text-[9px] font-black uppercase tracking-widest border-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? cat === 'deletions'
                      ? 'bg-rose-600 border-rose-500 text-white'
                      : 'bg-amber-400 border-amber-400 text-black'
                    : cat === 'deletions'
                      ? 'bg-rose-950/60 border-rose-900 text-rose-300 hover:bg-rose-900/80'
                      : 'bg-neutral-950 border-neutral-850 text-neutral-400 hover:text-white'
                }`}
              >
                {cat === 'deletions' && <AlertTriangle size={10} />}
                <span>{labelMap[cat] || cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-neutral-950 border-2 border-neutral-850 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="bg-neutral-900 text-neutral-400 border-b-2 border-neutral-850 uppercase text-[9px] tracking-wider font-bold">
                <th className="p-4 w-[170px]">Timestamp</th>
                <th className="p-4 w-[160px]">Action</th>
                <th className="p-4 w-[150px]">Operator</th>
                <th className="p-4 w-[120px]">Category</th>
                <th className="p-4">Details</th>
                <th className="p-4 w-[80px] text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900 text-neutral-300">
              {displayedLogs.length > 0 ? (
                displayedLogs.map(log => {
                  const isDel = isDeletionAction(log);
                  return (
                    <tr 
                      key={log.id} 
                      onClick={() => setSelectedLog(log)}
                      className={`transition-colors cursor-pointer ${
                        isDel 
                          ? 'bg-rose-950/10 hover:bg-rose-950/30 border-l-2 border-l-rose-500' 
                          : 'hover:bg-neutral-900/50'
                      }`}
                    >
                      <td className="p-4 text-neutral-400 select-none flex items-center gap-1.5">
                        <Clock size={11} className={isDel ? 'text-rose-400' : 'text-neutral-500'} />
                        <span className="text-[11px]">{formatTimestamp(log.timestamp)}</span>
                      </td>
                      <td className="p-4 font-extrabold text-white">
                        <span className={`px-2 py-0.5 border rounded-sm uppercase text-[10px] tracking-tight inline-flex items-center gap-1 ${getActionBadgeStyle(log)}`}>
                          {isDel && <AlertTriangle size={10} className="text-rose-400 shrink-0" />}
                          <span>{log.action.replace(/_/g, ' ')}</span>
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <span className="font-bold block text-white">{log.operatorName || 'System'}</span>
                          <span className="text-[9px] text-neutral-500 uppercase tracking-wider block font-black">
                            {log.operatorRole || 'Automation'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border border-neutral-800 bg-neutral-900 text-neutral-300 rounded-sm">
                          {log.category}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1.5 leading-relaxed">
                          <p className={`text-xs ${isDel ? 'text-rose-200 font-semibold' : 'text-neutral-200'}`}>
                            {log.details}
                          </p>
                          {(log.studentName || log.amount !== undefined) && (
                            <div className="flex flex-wrap items-center gap-2">
                              {log.studentName && (
                                <span className="bg-neutral-900 border border-neutral-800 text-purple-300 text-[10px] px-1.5 py-0.5 rounded-sm">
                                  Pupil: {log.studentName}
                                </span>
                              )}
                              {log.amount !== undefined && (
                                <span className="bg-neutral-900 border border-neutral-800 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded-sm">
                                  GHC {log.amount.toFixed(2)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <button className="px-2 py-1 text-[9px] font-black bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 rounded-sm">
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-neutral-500 font-mono italic">
                    No activity audit records found matching the filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredLogs.length > visibleLogsCount && (
          <div className="p-4 bg-neutral-900 border-t-2 border-neutral-850 text-center">
            <button
              onClick={() => setVisibleLogsCount(prev => prev + 50)}
              className="px-4 py-2 text-[10px] font-black bg-neutral-950 hover:bg-neutral-850 text-amber-400 border border-neutral-800 hover:border-amber-400 uppercase tracking-widest cursor-pointer transition-colors"
            >
              Show More Logs ({filteredLogs.length - visibleLogsCount} remaining)
            </button>
          </div>
        )}
      </div>

      {/* Selected Log Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-950 border-2 border-neutral-800 max-w-xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-900">
              <div className="flex items-center gap-2">
                <FileText className="text-amber-400" size={18} />
                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                  Log Entry Metadata Inspection
                </h4>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 hover:bg-neutral-900 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 gap-3 bg-neutral-900 p-3 border border-neutral-850">
                <div>
                  <span className="text-[9px] font-black text-neutral-500 uppercase block">Log Reference ID</span>
                  <span className="text-neutral-200 select-all font-mono">{selectedLog.id}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-neutral-500 uppercase block">Timestamp</span>
                  <span className="text-amber-300">{formatTimestamp(selectedLog.timestamp)}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-neutral-500 uppercase block">Operator Name</span>
                  <span className="text-white font-bold">{selectedLog.operatorName || 'System'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-neutral-500 uppercase block">Operator Role</span>
                  <span className="text-neutral-400">{selectedLog.operatorRole || 'System'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-black text-neutral-500 uppercase block">Action Summary</span>
                <p className="p-3 bg-neutral-900 border border-neutral-800 text-white font-bold uppercase tracking-tight">
                  {selectedLog.action.replace(/_/g, ' ')}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-black text-neutral-500 uppercase block">Details & Context</span>
                <p className="p-3 bg-neutral-900 border border-neutral-800 text-neutral-200 leading-relaxed">
                  {selectedLog.details}
                </p>
              </div>

              {(selectedLog.studentName || selectedLog.amount !== undefined || selectedLog.studentId) && (
                <div className="grid grid-cols-2 gap-3 bg-neutral-900 p-3 border border-neutral-850">
                  {selectedLog.studentName && (
                    <div>
                      <span className="text-[9px] font-black text-neutral-500 uppercase block">Pupil Name</span>
                      <span className="text-purple-300 font-bold">{selectedLog.studentName}</span>
                    </div>
                  )}
                  {selectedLog.studentId && (
                    <div>
                      <span className="text-[9px] font-black text-neutral-500 uppercase block">Pupil ID</span>
                      <span className="text-neutral-400">{selectedLog.studentId}</span>
                    </div>
                  )}
                  {selectedLog.amount !== undefined && (
                    <div>
                      <span className="text-[9px] font-black text-neutral-500 uppercase block">Transaction Amount</span>
                      <span className="text-emerald-400 font-bold">GHC {selectedLog.amount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <span className="text-[9px] font-black text-neutral-500 uppercase block">Raw JSON Data</span>
                <pre className="p-3 bg-black border border-neutral-900 text-emerald-400 text-[10px] overflow-x-auto max-h-[140px]">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-xs font-bold uppercase tracking-wider cursor-pointer border border-neutral-800"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
