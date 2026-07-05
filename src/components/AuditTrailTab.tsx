import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  FileText, 
  Search, 
  RefreshCw, 
  User, 
  Settings, 
  CreditCard, 
  ShieldCheck, 
  TrendingDown, 
  Tag,
  Clock,
  Briefcase
} from 'lucide-react';

export function AuditTrailTab() {
  const { auditLogs = [], fetchAuditLogs } = useApp();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'students' | 'payments' | 'expenses' | 'settings' | 'security' | 'other'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAuditLogs?.();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      (log.action || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.operatorName || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.studentName || '').toLowerCase().includes(search.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || log.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Calculate counts for stats cards
  const totalCount = auditLogs.length;
  const studentCount = auditLogs.filter(l => l.category === 'students').length;
  const paymentCount = auditLogs.filter(l => l.category === 'payments').length;
  const settingsCount = auditLogs.filter(l => l.category === 'settings').length;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'students':
        return 'bg-purple-950 text-purple-300 border-purple-800';
      case 'payments':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'expenses':
        return 'bg-rose-950 text-rose-300 border-rose-800';
      case 'settings':
        return 'bg-amber-950 text-amber-300 border-amber-800';
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

  return (
    <div className="space-y-6" id="audit-trail-tab">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-neutral-900 gap-4">
        <div>
          <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
            <FileText className="text-amber-400 stroke-[2.5]" size={18} />
            <span>Activity Audit Trail</span>
          </h3>
          <p className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider mt-1">
            System logs recording major administrative events, staff actions, and fee configuration audits
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="self-start md:self-auto py-2.5 px-4 bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-white border border-neutral-800 flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={12} className={`${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          <span>{isRefreshing ? 'Refreshing Audit...' : 'Refresh Audit'}</span>
        </button>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-950 border-2 border-neutral-850 p-4 relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block font-mono">Total Traced Logs</span>
            <span className="text-2xl font-mono font-black text-white block">{totalCount}</span>
          </div>
          <div className="absolute right-3 bottom-3 opacity-15">
            <FileText size={40} className="text-neutral-500" />
          </div>
        </div>

        <div className="bg-neutral-950 border-2 border-neutral-850 p-4 relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest block font-mono">Pupil Registry Actions</span>
            <span className="text-2xl font-mono font-black text-purple-300 block">{studentCount}</span>
          </div>
          <div className="absolute right-3 bottom-3 opacity-15">
            <User size={40} className="text-purple-500" />
          </div>
        </div>

        <div className="bg-neutral-950 border-2 border-neutral-850 p-4 relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block font-mono">Payment Transactions</span>
            <span className="text-2xl font-mono font-black text-emerald-300 block">{paymentCount}</span>
          </div>
          <div className="absolute right-3 bottom-3 opacity-15">
            <CreditCard size={40} className="text-emerald-500" />
          </div>
        </div>

        <div className="bg-neutral-950 border-2 border-neutral-850 p-4 relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest block font-mono">System Audits</span>
            <span className="text-2xl font-mono font-black text-amber-300 block">{settingsCount}</span>
          </div>
          <div className="absolute right-3 bottom-3 opacity-15">
            <Settings size={40} className="text-amber-500" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-neutral-900 border-2 border-neutral-800 p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
            <input
              type="text"
              placeholder="Search by action, details, operator, or student..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-neutral-950 border-2 border-neutral-850 hover:border-neutral-800 focus:border-amber-400 text-white font-mono text-xs pl-10 pr-4 py-3 focus:outline-none transition-all placeholder:text-neutral-600"
            />
          </div>
        </div>

        {/* Categories Tab Selector */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {(['all', 'students', 'payments', 'expenses', 'settings', 'security', 'other'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 font-mono text-[9px] font-black uppercase tracking-widest border-2 transition-all cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-amber-400 border-amber-400 text-black'
                  : 'bg-neutral-950 border-neutral-850 text-neutral-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-neutral-950 border-2 border-neutral-850 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="bg-neutral-900 text-neutral-400 border-b-2 border-neutral-850 uppercase text-[9px] tracking-wider font-bold">
                <th className="p-4 w-[180px]">Timestamp</th>
                <th className="p-4 w-[160px]">Action</th>
                <th className="p-4 w-[150px]">Operator</th>
                <th className="p-4 w-[120px]">Category</th>
                <th className="p-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900 text-neutral-300">
              {filteredLogs.length > 0 ? (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-neutral-900/40 transition-colors">
                    <td className="p-4 text-neutral-400 select-none flex items-center gap-1.5">
                      <Clock size={11} className="text-neutral-500" />
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="p-4 font-extrabold text-white">
                      <span className="bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-sm uppercase text-[10px] tracking-tight">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <span className="font-bold block text-white">{log.operatorName}</span>
                        <span className="text-[9px] text-neutral-500 uppercase tracking-wider block font-black">
                          {log.operatorRole}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border rounded-sm ${getCategoryColor(log.category)}`}>
                        {log.category}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1.5 leading-relaxed">
                        <p className="text-neutral-200">{log.details}</p>
                        {(log.studentName || log.amount !== undefined) && (
                          <div className="flex flex-wrap items-center gap-2">
                            {log.studentName && (
                              <span className="bg-neutral-900 border border-neutral-800 text-purple-400 text-[10px] px-1.5 py-0.5 rounded-sm">
                                Pupil: {log.studentName}
                              </span>
                            )}
                            {log.amount !== undefined && (
                              <span className="bg-neutral-900 border border-neutral-800 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded-sm">
                                Amount: GHC {log.amount.toFixed(2)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-neutral-500 font-mono italic">
                    No activity logs found matching the filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
