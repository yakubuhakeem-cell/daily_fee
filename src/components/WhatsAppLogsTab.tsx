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
  const [showGuide, setShowGuide] = useState(true);

  // Read current active connection configuration
  const activeProvider = process.env.WHATSAPP_PROVIDER || 
    (process.env.WHATSAPP_TWILIO_SID ? 'twilio' : process.env.WHATSAPP_PHONE_NUMBER_ID ? 'meta' : process.env.WHATSAPP_API_URL ? 'ultramsg/custom' : 'simulated');

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

      {/* Gateway Connection State & Guide Selector */}
      <div className="bg-neutral-950 border border-neutral-850 p-5 rounded-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-neutral-900 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white font-mono">
              <Cpu size={14} className="text-emerald-400" />
              <span>
                CONNECTION: {activeProvider !== "simulated" 
                  ? `🟢 GATEWAY HOOK ACTIVE (${activeProvider.toUpperCase()})` 
                  : "⚡ SIMULATION ENGINE (TEST MODE)"}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-normal max-w-3xl">
              {activeProvider !== "simulated"
                ? `The application is connected to your active WhatsApp API gateway provider (${activeProvider}). Real parent-facing notifications (check-in check-out alerts, balance statements, and billing receipts) will actively send outward via cellular waves!`
                : 'The system is in test "Simulation Mode" so no actual text fees or carrier limits apply. Read and toggle the deployment guide below to hook real cell networks.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-850 text-amber-400 border border-neutral-800 font-mono text-[9px] font-black uppercase tracking-widest cursor-pointer transition-colors"
          >
            {showGuide ? "Hide Setup Guide" : "how to get real API?"}
          </button>
        </div>

        {showGuide && (
          <div className="space-y-4 pt-1">
            <div className="text-xs font-mono font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle size={13} />
              <span>Outbound WhatsApp Carrier Gateways (Get real alerts to parent phones)</span>
            </div>
            
            <p className="text-[10px] text-neutral-400 leading-normal max-w-4xl font-sans">
              Setting up a real API enables bulk dispatches to work directly. To integrate real numbers, configure the variables listed in your 
              <strong className="text-neutral-200"> Secrets Manager</strong> inside the 
              <strong className="text-amber-400"> Settings Pane (top right)</strong> in the AI Studio editor. Below are the three best options:
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Option A: Quick Scan Webhooks (UltraMsg) */}
              <div className="bg-neutral-900/40 border border-neutral-850 p-4.5 rounded-xs space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-mono font-black uppercase tracking-wider bg-emerald-950/40 text-emerald-400 border border-emerald-900/60 px-2 py-0.5 rounded-xs">
                      Option A (Highly Recommended)
                    </span>
                    <span className="text-[9px] font-mono font-black text-neutral-500">QR-SCAN WEBHOOK</span>
                  </div>
                  <h5 className="text-xs font-black text-white uppercase font-sans tracking-tight">
                    UltraMsg / Wassenger Gateway
                  </h5>
                  <p className="text-[10.5px] text-neutral-400 leading-relaxed font-sans">
                    By far the easiest. Sync your own personal or school WhatsApp number in seconds by scanning a QR code with your phone. Does not require tedious official business registration.
                  </p>
                  
                  <div className="space-y-1 pt-1 font-mono text-[9.5px]">
                    <div className="text-white font-black uppercase tracking-widest text-[8px] text-neutral-500">Instructions:</div>
                    <ol className="list-decimal pl-4.5 text-neutral-400 space-y-1 leading-normal list-outside">
                      <li>Go to <a href="https://ultramsg.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline flex inline-flex items-center gap-0.5">ultramsg.com <ExternalLink size={8} /></a> and sign up for an account.</li>
                      <li>Scan the QR code displayed on the UltraMsg panel using WhatsApp on your phone (Linked Devices).</li>
                      <li>Copy your unique <strong className="text-neutral-200">API Link</strong> and <strong className="text-neutral-200">Token</strong>.</li>
                    </ol>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-850 space-y-2">
                  <div className="text-[8px] font-mono text-neutral-500 uppercase tracking-wider font-extrabold">Config Parameters:</div>
                  <div className="bg-neutral-950 p-2 border border-neutral-850 rounded-xs font-mono text-[9.5px] leading-relaxed select-all">
                    <div className="text-amber-400">WHATSAPP_PROVIDER="ultramsg"</div>
                    <div className="text-neutral-400">WHATSAPP_API_URL="https://api.ultramsg.com/instanceXXXX/messages/chat"</div>
                    <div className="text-neutral-400">WHATSAPP_API_TOKEN="your_token_here"</div>
                  </div>
                </div>
              </div>

              {/* Option B: Official Meta Cloud API */}
              <div className="bg-neutral-900/40 border border-neutral-850 p-4.5 rounded-xs space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-mono font-black uppercase tracking-wider bg-sky-950/40 text-sky-400 border border-sky-900/60 px-2 py-0.5 rounded-xs">
                      Option B (Direct)
                    </span>
                    <span className="text-[9px] font-mono font-black text-neutral-500">OFFICIAL FREE TIER</span>
                  </div>
                  <h5 className="text-xs font-black text-white uppercase font-sans tracking-tight">
                    Meta WhatsApp Cloud API
                  </h5>
                  <p className="text-[10.5px] text-neutral-400 leading-relaxed font-sans">
                    Direct integration with Meta (Facebook) developer dashboard. Completely free for up to 1,000 corporate conversations each month. Highly stable, official network infrastructure.
                  </p>
                  
                  <div className="space-y-1 pt-1 font-mono text-[9.5px]">
                    <div className="text-white font-black uppercase tracking-widest text-[8px] text-neutral-500">Instructions:</div>
                    <ol className="list-decimal pl-4.5 text-neutral-400 space-y-1 leading-normal list-outside">
                      <li>Visit the <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline flex inline-flex items-center gap-0.5">Meta Developer Portal <ExternalLink size={8} /></a>.</li>
                      <li>Create an App under "Business" type and link the WhatsApp product.</li>
                      <li>Find your temporary or permanent user <strong className="text-neutral-200">Access Token</strong> and <strong className="text-neutral-200">Phone Number ID</strong>.</li>
                    </ol>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-850 space-y-2">
                  <div className="text-[8px] font-mono text-neutral-500 uppercase tracking-wider font-extrabold">Config Parameters:</div>
                  <div className="bg-neutral-950 p-2 border border-neutral-850 rounded-xs font-mono text-[9.5px] leading-relaxed select-all">
                    <div className="text-amber-400">WHATSAPP_PROVIDER="meta"</div>
                    <div className="text-neutral-400">WHATSAPP_PHONE_NUMBER_ID="your_phone_id"</div>
                    <div className="text-neutral-400">WHATSAPP_API_TOKEN="your_system_access_token"</div>
                  </div>
                </div>
              </div>

              {/* Option C: Twilio Gateway */}
              <div className="bg-neutral-900/40 border border-neutral-850 p-4.5 rounded-xs space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-mono font-black uppercase tracking-wider bg-rose-950/40 text-rose-400 border border-rose-900/60 px-2 py-0.5 rounded-xs">
                      Option C (Enterprise)
                    </span>
                    <span className="text-[9px] font-mono font-black text-neutral-500">DEVELOPER FRIENDLY</span>
                  </div>
                  <h5 className="text-xs font-black text-white uppercase font-sans tracking-tight">
                    Twilio WhatsApp Gateway
                  </h5>
                  <p className="text-[10.5px] text-neutral-400 leading-relaxed font-sans">
                    Highly robust enterprise communications provider. Offers a developer-friendly Sandbox environment for immediate compliance tests and worldwide message dispatch channels.
                  </p>
                  
                  <div className="space-y-1 pt-1 font-mono text-[9.5px]">
                    <div className="text-white font-black uppercase tracking-widest text-[8px] text-neutral-500">Instructions:</div>
                    <ol className="list-decimal pl-4.5 text-neutral-400 space-y-1 leading-normal list-outside">
                      <li>Register an account on <a href="https://twilio.com" target="_blank" rel="noopener noreferrer" className="text-rose-400 hover:underline flex inline-flex items-center gap-0.5">twilio.com <ExternalLink size={8} /></a>.</li>
                      <li>Navigate to WhatsApp Messaging in the Twilio console.</li>
                      <li>Copy <strong className="text-neutral-200">Account SID</strong>, <strong className="text-neutral-200">Auth Token</strong>, and join the sandbox with your tester line.</li>
                    </ol>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-850 space-y-2">
                  <div className="text-[8px] font-mono text-neutral-500 uppercase tracking-wider font-extrabold">Config Parameters:</div>
                  <div className="bg-neutral-950 p-2 border border-neutral-850 rounded-xs font-mono text-[9.5px] leading-relaxed select-all">
                    <div className="text-amber-400">WHATSAPP_PROVIDER="twilio"</div>
                    <div className="text-neutral-400">WHATSAPP_TWILIO_SID="your_account_sid"</div>
                    <div className="text-neutral-400">WHATSAPP_TWILIO_AUTH_TOKEN="your_auth_token"</div>
                    <div className="text-neutral-400">WHATSAPP_SENDER_PHONE="whatsapp:+14155238886"</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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
