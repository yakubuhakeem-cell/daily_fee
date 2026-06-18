import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  MessageSquare, 
  Search, 
  RefreshCw, 
  Clock, 
  User, 
  Phone, 
  CheckCircle, 
  AlertCircle, 
  Cpu, 
  HelpCircle, 
  ExternalLink 
} from 'lucide-react';

export function WhatsAppLogsTab() {
  const { whatsappLogs = [], fetchWhatsappLogs, storageMode } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'delivered' | 'simulated' | 'error'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchWhatsappLogs?.();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const filteredLogs = whatsappLogs.filter(log => {
    const matchesSearch = 
      (log.studentName || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.phone || '').includes(search) ||
      (log.message || '').toLowerCase().includes(search.toLowerCase());

    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'delivered') return matchesSearch && log.status === 'delivered';
    if (statusFilter === 'simulated') return matchesSearch && log.status === 'simulated_success';
    if (statusFilter === 'error') return matchesSearch && (log.status === 'api_error' || log.status === 'connection_failed');
    return matchesSearch;
  });

  const totalCount = whatsappLogs.length;
  const deliveredCount = whatsappLogs.filter(l => l.status === 'delivered').length;
  const simulatedCount = whatsappLogs.filter(l => l.status === 'simulated_success').length;
  const failedCount = whatsappLogs.filter(l => l.status === 'api_error' || l.status === 'connection_failed').length;

  return (
    <div className="space-y-6" id="whatsapp-logs-tab">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-neutral-900 gap-4">
        <div>
          <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
            <MessageSquare className="text-emerald-400 stroke-[2.5]" size={18} />
            <span>WhatsApp Communications & Automated Logs</span>
          </h3>
          <p className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider mt-1">
            Real-time server-side API trace logs and outbound parent receipts audit
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="self-start md:self-auto py-2.5 px-4 bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-white border border-neutral-800 flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={12} className={`${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          <span>{isRefreshing ? 'Refreshing Audit...' : 'Refresh Logs'}</span>
        </button>
      </div>

      {/* Gateway Alert Config Box */}
      <div className="bg-neutral-950 border border-neutral-850 p-4 rounded-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white">
            <Cpu size={14} className="text-emerald-400" />
            <span>Connection State: {process.env.WHATSAPP_API_URL ? '🟢 Gateway Hook Active' : '⚡ Live Simulated Local Engine'}</span>
          </div>
          <p className="text-[11px] text-neutral-400 max-w-2xl leading-normal">
            {process.env.WHATSAPP_API_URL 
              ? `Your system is fully integrated with external outbound gateway endpoint (${process.env.WHATSAPP_API_URL.slice(0, 45)}...). Outgoing school check-in receipts and balance invoices will deliver to parents via WhatsApp.`
              : 'The background WhatsApp dispatch is currently running in "Simulation Mode" so no actual text fees are charged. To wire real client-facing cellular networks, please append "WHATSAPP_API_URL" and matching authentication credentials inside the environment configuration panel.'}
          </p>
        </div>
        <div className="font-mono text-[9px] text-neutral-500 uppercase text-right">
          Mode: <strong className="text-white">{storageMode === 'cloud' ? 'Firebase Sync DB' : 'Offline Local Ledger'}</strong>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-neutral-900 border-2 border-neutral-850 p-4 relative overflow-hidden">
          <span className="text-[9px] font-mono uppercase text-neutral-500 font-extrabold block">Total Processed dispatches</span>
          <span className="text-2xl font-black text-white font-mono block mt-1">{totalCount}</span>
          <div className="absolute top-3 right-3 bg-neutral-950 p-1.5 opacity-40 rounded-xs">
            <MessageSquare size={14} className="text-neutral-500" />
          </div>
        </div>

        <div className="bg-neutral-900 border-2 border-emerald-950/20 p-4 relative overflow-hidden">
          <span className="text-[9px] font-mono uppercase text-emerald-500 font-extrabold block">Outbound Delivered</span>
          <span className="text-2xl font-black text-emerald-400 font-mono block mt-1">{deliveredCount}</span>
          <div className="absolute top-3 right-3 bg-emerald-950/20 p-1.5 rounded-xs">
            <CheckCircle size={14} className="text-emerald-400" />
          </div>
        </div>

        <div className="bg-neutral-900 border-2 border-amber-950/20 p-4 relative overflow-hidden">
          <span className="text-[9px] font-mono uppercase text-amber-500 font-extrabold block">Simulated Deliveries</span>
          <span className="text-2xl font-black text-amber-400 font-mono block mt-1">{simulatedCount}</span>
          <div className="absolute top-3 right-3 bg-amber-950/20 p-1.5 rounded-xs">
            <Cpu size={14} className="text-amber-400" />
          </div>
        </div>

        <div className="bg-neutral-900 border-2 border-red-950/20 p-4 relative overflow-hidden">
          <span className="text-[9px] font-mono uppercase text-red-500 font-extrabold block">Dispatch Failures</span>
          <span className="text-2xl font-black text-red-400 font-mono block mt-1">{failedCount}</span>
          <div className="absolute top-3 right-3 bg-red-950/20 p-1.5 rounded-xs">
            <AlertCircle size={14} className="text-red-400" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search by student, guardian phone, or message text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-850 py-2.5 pl-10 pr-4 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-700"
          />
        </div>

        <div className="flex gap-1.5 bg-neutral-950 p-1 border border-neutral-850">
          {(['all', 'delivered', 'simulated', 'error'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 text-[9px] font-mono font-black uppercase tracking-wider transition-colors cursor-pointer ${
                statusFilter === tab 
                  ? 'bg-amber-400 text-black' 
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Sheet Table */}
      <div className="bg-neutral-950 border border-neutral-850 overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-neutral-600 space-y-2">
            <MessageSquare className="mx-auto text-neutral-800" size={32} />
            <p className="text-xs font-mono uppercase tracking-widest font-black">No outbound logs match selection</p>
            <p className="text-[10px] text-neutral-500 font-semibold max-w-sm mx-auto">
              Whenever you toggle manual/automated dispatches or register student check-ins, outbound details are archived here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-900 border-b border-neutral-850 text-[9px] font-mono text-neutral-400 uppercase tracking-widest">
                  <th className="py-3 px-4">Date/Time</th>
                  <th className="py-3 px-4">Recipient Pupil</th>
                  <th className="py-3 px-4">Guardian Phone</th>
                  <th className="py-3 px-4">Message Segment Summary</th>
                  <th className="py-3 px-4">Reason / Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Raw payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/60 font-mono text-[11px] text-neutral-300">
                {filteredLogs.map((log) => {
                  const stamp = new Date(log.timestamp);
                  const displayTime = stamp.toLocaleDateString() + ' ' + stamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  
                  return (
                    <tr key={log.id} className="hover:bg-neutral-900/40 transition-colors">
                      <td className="py-3 px-4 text-neutral-500 whitespace-nowrap flex items-center gap-1.5">
                        <Clock size={11} />
                        {displayTime}
                      </td>
                      <td className="py-3 px-4 font-bold text-white uppercase whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <User size={11} className="text-neutral-500" />
                          {log.studentName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-amber-500 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Phone size={11} className="text-neutral-500" />
                          {log.phone}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-neutral-400" title={log.message}>
                        {log.message}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 border rounded-xs ${
                          log.type === 'receipt' 
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/60'
                            : log.type === 'invoice'
                            ? 'bg-amber-950/40 text-amber-400 border-amber-900/60'
                            : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                        }`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`flex items-center gap-1 text-[10px] font-bold ${
                          log.status === 'delivered'
                            ? 'text-emerald-400'
                            : log.status === 'simulated_success'
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }`}>
                          {log.status === 'delivered' ? 'DELIVERED' : log.status === 'simulated_success' ? 'SIMULATED' : 'FAILED'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-[9px] font-sans font-extrabold uppercase hover:underline text-amber-400 hover:text-amber-300 cursor-pointer"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Details Modal Overlay */}
      {selectedLog && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border-4 border-amber-400 max-w-xl w-full p-6 shadow-[8px_8px_0px_0px_rgba(251,191,36,0.15)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-black">Audit Telemetry Payload</span>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-neutral-500 hover:text-white font-mono text-xs uppercase hover:underline cursor-pointer"
              >
                [Close]
              </button>
            </div>

            <div className="space-y-3 font-mono text-[11px]">
              <div className="grid grid-cols-3 border-b border-neutral-850 py-1">
                <span className="text-neutral-500 uppercase">Log Entry ID:</span>
                <span className="col-span-2 text-white">{selectedLog.id}</span>
              </div>
              <div className="grid grid-cols-3 border-b border-neutral-850 py-1">
                <span className="text-neutral-500 uppercase">Timestamp:</span>
                <span className="col-span-2 text-white">{new Date(selectedLog.timestamp).toISOString()}</span>
              </div>
              <div className="grid grid-cols-3 border-b border-neutral-850 py-1">
                <span className="text-neutral-500 uppercase">Student Name:</span>
                <span className="col-span-2 text-white uppercase font-bold">{selectedLog.studentName}</span>
              </div>
              <div className="grid grid-cols-3 border-b border-neutral-850 py-1">
                <span className="text-neutral-500 uppercase">Raw Phone:</span>
                <span className="col-span-2 text-white">{selectedLog.phone}</span>
              </div>
              <div className="grid grid-cols-3 border-b border-neutral-850 py-1">
                <span className="text-neutral-500 uppercase">Normalized:</span>
                <span className="col-span-2 text-amber-400">{selectedLog.normalizedPhone || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-3 border-b border-neutral-850 py-1">
                <span className="text-neutral-500 uppercase">Trigger Event:</span>
                <span className="col-span-2 uppercase text-white font-semibold">{selectedLog.type}</span>
              </div>
              <div className="grid grid-cols-3 border-b border-neutral-850 py-1">
                <span className="text-neutral-500 uppercase">Message Text:</span>
                <span className="col-span-2 text-neutral-200 block max-h-24 overflow-y-auto whitespace-pre-wrap pr-1 bg-neutral-950 p-2 border border-neutral-850">
                  {selectedLog.message}
                </span>
              </div>
              <div className="grid grid-cols-3 border-b border-neutral-850 py-1">
                <span className="text-neutral-500 uppercase">Delivery Status:</span>
                <span className={`col-span-2 uppercase font-black ${
                  selectedLog.status === 'delivered' ? 'text-emerald-400' : selectedLog.status === 'simulated_success' ? 'text-amber-400' : 'text-red-400'
                }`}>{selectedLog.status}</span>
              </div>
              <div className="space-y-1">
                <span className="text-neutral-500 uppercase text-[9px] block">Network API Gateway Trace Output:</span>
                <pre className="text-[9.5px] text-neutral-400 bg-neutral-950 p-2 border border-neutral-850 overflow-x-auto rounded-xs leading-relaxed max-h-32">
                  {selectedLog.details}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="py-1.5 px-4 bg-amber-400 text-black text-[10px] font-mono font-black uppercase tracking-wider hover:bg-amber-300 transition-colors cursor-pointer"
              >
                Close Trace Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
