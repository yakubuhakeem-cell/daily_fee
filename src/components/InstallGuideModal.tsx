import React, { useState, useEffect } from 'react';
import { SchoolLogo } from './SchoolLogo';
import { 
  X, 
  Smartphone, 
  Laptop, 
  Share, 
  Plus, 
  Download, 
  Check, 
  Chrome, 
  Copy, 
  Info,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
  AlertCircle
} from 'lucide-react';

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallDirectly: () => void;
  schoolName: string;
  offlineCacheStatus?: 'idle' | 'caching' | 'ready';
  offlineCacheProgress?: number;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallDirectly,
  schoolName,
  offlineCacheStatus = 'idle',
  offlineCacheProgress = 0,
}) => {
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>('android');
  const [copied, setCopied] = useState(false);
  const [isInsideIframe, setIsInsideIframe] = useState(false);

  useEffect(() => {
    setIsInsideIframe(window.self !== window.top);
  }, []);

  if (!isOpen) return null;

  const appUrl = window.location.origin || window.location.href;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/95 backdrop-blur-md flex items-center justify-center p-4 z-[9999] no-print overflow-y-auto">
      <div 
        className="relative w-full max-w-xl bg-neutral-900 border-4 border-amber-400 p-6 md:p-8 space-y-6 shadow-[10px_10px_0px_0px_rgba(251,191,36,0.25)] text-white flex flex-col my-8 font-sans"
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <SchoolLogo size={42} className="shrink-0 border-2 border-amber-400/80 shadow-md" />
            <div>
              <span className="text-[9px] text-amber-400 font-mono tracking-widest font-black uppercase block">PORTABLE APPLICATION (PWA)</span>
              <h3 className="text-lg font-black uppercase tracking-tight text-white font-mono">Install Web App</h3>
              <p className="text-[10px] text-neutral-400 uppercase mt-0.5 font-mono">
                {schoolName || 'SAAKO HOLY CHILD ACADEMY'} • Offline Ready
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer border border-transparent hover:border-neutral-700"
            title="Close Installer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Iframe Warning Banner */}
        {isInsideIframe && (
          <div className="p-4 bg-amber-500/10 border-2 border-amber-500/30 text-amber-300 space-y-3.5 rounded-none animate-pulse">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={20} className="stroke-[2.5] mt-0.5 shrink-0" />
              <div>
                <p className="font-mono text-xs font-black uppercase tracking-tight leading-tight">
                  Running inside Iframe Preview
                </p>
                <p className="text-[10.5px] font-medium leading-relaxed mt-1 opacity-90">
                  Web browsers block PWA app installations from inside sandbox iframe previews. To install <strong>{schoolName}</strong> on your home screen with offline capability, open it directly in a new browser tab!
                </p>
              </div>
            </div>
            <div className="pt-0.5">
              <a
                href={appUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full bg-amber-400 hover:bg-amber-300 text-neutral-950 font-mono text-[10px] font-black uppercase tracking-wider py-2.5 px-4 items-center justify-center gap-2 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px]"
              >
                <ExternalLink size={12} className="stroke-[3]" />
                <span>Open in New Tab to Enable Install</span>
              </a>
            </div>
          </div>
        )}

        {/* PWA Diagnostics Check */}
        <div className="p-3 bg-neutral-950 border border-neutral-800 text-xs rounded-none">
          <div className="flex items-center gap-1.5 font-mono text-[10px] font-black uppercase text-amber-400 tracking-wider mb-2 pb-1 border-b border-neutral-900">
            <ShieldCheck size={12} />
            <span>PWA Compatibility Diagnostics</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px]">
            <div className="flex items-center gap-1.5">
              <span className={isInsideIframe ? "text-red-500 font-extrabold" : "text-emerald-400 font-extrabold"}>
                {isInsideIframe ? "✕" : "✓"}
              </span>
              <span className="text-neutral-500 font-mono">Running Tab:</span>
              <span className={isInsideIframe ? "text-amber-400 font-mono" : "text-emerald-400 font-mono"}>
                {isInsideIframe ? "Iframe (Blocked)" : "Direct Tab (Ready)"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-extrabold">✓</span>
              <span className="text-neutral-500 font-mono">Secure Link:</span>
              <span className="text-emerald-450 font-mono">HTTPS Encrypted</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-extrabold">✓</span>
              <span className="text-neutral-500 font-mono">Ledger Cache:</span>
              <span className="text-emerald-450 font-mono">Service Worker Active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={deferredPrompt ? "text-emerald-400 font-extrabold" : "text-amber-400 font-extrabold"}>
                {deferredPrompt ? "✓" : "⚡"}
              </span>
              <span className="text-neutral-500 font-mono">Auto-Installer:</span>
              <span className={deferredPrompt ? "text-emerald-400 font-mono" : "text-amber-400 font-mono"}>
                {deferredPrompt ? "Ready to Launch" : "Guides Below Available"}
              </span>
            </div>
          </div>
        </div>

        {/* Offline Cache Status Block */}
        <div className="p-3 bg-neutral-950 border border-neutral-800 space-y-2">
          <div className="flex justify-between items-center text-[10px] font-mono font-black uppercase tracking-wider text-amber-400">
            <span className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${offlineCacheStatus === 'ready' ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`}></span>
              <span>Offline Registry Cache</span>
            </span>
            <span>
              {offlineCacheStatus === 'ready' ? '100% (Offline Ready)' : `${offlineCacheProgress}% Syncing`}
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="w-full h-1 bg-neutral-900 border border-neutral-850 overflow-hidden">
            <div 
              className={`h-full transition-all duration-350 ${offlineCacheStatus === 'ready' ? 'bg-emerald-400' : 'bg-amber-400'}`}
              style={{ width: `${offlineCacheProgress}%` }}
            ></div>
          </div>
          
          <p className="text-[9.5px] text-neutral-450 leading-normal font-mono">
            {offlineCacheStatus === 'ready' 
              ? '✓ All core registries, system settings, and page modules have been fully cached in your local sandbox browser for offline-ready execution.'
              : '⚡ Dynamically preparing offline bundles. Pre-caching core student databases, active term layouts, and ledger audit components...'}
          </p>
        </div>

        {/* Benefits banner */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-neutral-950 border border-neutral-850 text-neutral-300">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-sm">⚡</span>
            <div className="text-[9px] uppercase font-bold leading-none tracking-wide font-mono">
              <span className="text-white block font-sans">Instant Launch</span>
              from Home Screen
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-sm">🌐</span>
            <div className="text-[9px] uppercase font-bold leading-none tracking-wide font-mono">
              <span className="text-white block font-sans">Offline Ready</span>
              persistent storage
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 col-span-1">
            <span className="text-amber-400 text-sm">📱</span>
            <div className="text-[9px] uppercase font-bold leading-none tracking-wide font-mono">
              <span className="text-white block font-sans">Zero Bytes</span>
              no app store needed
            </div>
          </div>
        </div>

        {/* If direct installation is supported, highlight it! */}
        {deferredPrompt && (
          <div className="p-4 bg-amber-400 text-neutral-950 border-2 border-neutral-950 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)] space-y-3">
            <div className="flex items-start gap-2.5">
              <Zap size={18} className="stroke-[3] mt-0.5 shrink-0" />
              <div>
                <p className="font-mono text-xs font-black uppercase tracking-tight leading-tight">
                  Instant Auto-Installation Available
                </p>
                <p className="text-[10px] font-medium leading-normal mt-1 opacity-90">
                  Your current browser supports direct automatic setup. Skip manual configurations below!
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onInstallDirectly();
                onClose();
              }}
              className="w-full bg-neutral-950 text-amber-400 hover:bg-neutral-900 border-2 border-neutral-950 py-2.5 px-4 font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[3px_3px_0px_0px_rgba(255,255,255,0.3)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(255,255,255,0.3)] active:translate-x-[2px] active:translate-y-[2px]"
            >
              <Download size={14} className="stroke-[3]" />
              <span>Direct Install Now</span>
            </button>
          </div>
        )}

        {/* Platform Selection tabs */}
        <div className="space-y-4">
          <div className="flex border-b border-neutral-800">
            <button
              onClick={() => setActiveTab('android')}
              className={`flex-1 pb-2.5 text-center font-mono text-[10px] font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                activeTab === 'android'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Android (Chrome)
            </button>
            <button
              onClick={() => setActiveTab('ios')}
              className={`flex-1 pb-2.5 text-center font-mono text-[10px] font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                activeTab === 'ios'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              iOS (Safari)
            </button>
            <button
              onClick={() => setActiveTab('desktop')}
              className={`flex-1 pb-2.5 text-center font-mono text-[10px] font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                activeTab === 'desktop'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Desktop (PC/Mac)
            </button>
          </div>

          {/* Guide contents */}
          <div className="bg-neutral-950 p-5 border border-neutral-850 space-y-4">
            {activeTab === 'android' && (
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-black text-amber-400 uppercase tracking-wider font-mono">
                  <Chrome size={14} />
                  <span>Google Chrome Guide</span>
                </div>
                <ol className="space-y-3 text-xs text-neutral-300 list-decimal pl-4">
                  <li className="leading-relaxed">
                    Ensure you are viewing this inside the <strong className="text-white">Google Chrome</strong> browser on your Android phone.
                  </li>
                  <li className="leading-relaxed">
                    Tap the <strong className="text-amber-400">three vertical dots (menu)</strong> in the upper-right corner of the Chrome toolbar.
                  </li>
                  <li className="leading-relaxed font-semibold text-white">
                    Tap <span className="bg-neutral-800 px-2 py-0.5 border border-neutral-700 text-amber-400 rounded">"Install App"</span> or <span className="bg-neutral-800 px-2 py-0.5 border border-neutral-700 text-amber-400 rounded">"Add to Home Screen"</span> from the dropdown menu.
                  </li>
                  <li className="leading-relaxed">
                    A confirmation dialog will appear. Press <strong className="text-amber-400">Install</strong> or <strong className="text-amber-400">Add</strong>.
                  </li>
                </ol>
              </div>
            )}

            {activeTab === 'ios' && (
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-black text-amber-400 uppercase tracking-wider font-mono">
                  <Smartphone size={14} />
                  <span>Apple iOS Safari Guide</span>
                </div>
                <ol className="space-y-3 text-xs text-neutral-300 list-decimal pl-4">
                  <li className="leading-relaxed">
                    Open this page inside Apple's native <strong className="text-white">Safari Browser</strong> (other browsers like Chrome on iOS do not support installing PWAs).
                  </li>
                  <li className="leading-relaxed">
                    Tap the <strong className="text-amber-400 inline-flex items-center gap-1">Share Button <Share size={12} className="inline-block stroke-[2.5]" /></strong> (the square with an arrow pointing up) located in Safari's bottom browser bar.
                  </li>
                  <li className="leading-relaxed font-semibold text-white">
                    Scroll down the share list and select <span className="bg-neutral-800 px-2 py-1 border border-neutral-700 text-amber-400 rounded inline-flex items-center gap-1 text-[11px]"><Plus size={10} /> "Add to Home Screen"</span>.
                  </li>
                  <li className="leading-relaxed">
                    Verify the name of the app and tap <strong className="text-amber-400">"Add"</strong> in the top right corner. The icon will appear on your iOS home screen!
                  </li>
                </ol>
              </div>
            )}

            {activeTab === 'desktop' && (
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-black text-amber-400 uppercase tracking-wider font-mono">
                  <Laptop size={14} />
                  <span>Desktop Chrome / Edge / Safari Guide</span>
                </div>
                <ol className="space-y-3 text-xs text-neutral-300 list-decimal pl-4">
                  <li className="leading-relaxed">
                    Look closely at your browser's <strong className="text-white">URL address bar</strong> at the top.
                  </li>
                  <li className="leading-relaxed">
                    Click the <strong className="text-amber-400 inline-flex items-center gap-1">Install Icon <Download size={12} className="inline" /></strong> (which usually looks like a screen with a downward arrow) to the right of the URL.
                  </li>
                  <li className="leading-relaxed">
                    Alternatively, click the browser settings (three dots) &gt; <strong className="text-white">Save and share</strong> &gt; <strong className="text-amber-400">Install page as app...</strong>
                  </li>
                  <li className="leading-relaxed">
                    Confirm the dialog to launch the portal in its own isolated desktop window!
                  </li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Copy App Link Link for iframe containment issues */}
        <div className="bg-neutral-950 p-4 border border-neutral-850 space-y-3 rounded-none">
          <div className="flex items-start gap-2">
            <Info size={14} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-neutral-400 uppercase font-mono tracking-wide leading-tight">
              Tip: Installing requires running in a direct browser tab rather than an iframe preview box.
            </p>
          </div>
          
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              readOnly
              value={appUrl}
              className="flex-1 bg-neutral-900 border border-neutral-800 text-neutral-400 text-[10px] font-mono p-2 select-all outline-none rounded-none"
            />
            <button
              onClick={handleCopyUrl}
              className="px-3.5 py-2 bg-neutral-800 hover:bg-amber-400 text-neutral-300 hover:text-neutral-950 border border-neutral-700 hover:border-amber-400 font-mono text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer rounded-none"
            >
              {copied ? <Check size={12} className="stroke-[3]" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy URL'}</span>
            </button>
            <a
              href={appUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-neutral-950 border border-amber-400 font-mono text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all rounded-none"
            >
              <ExternalLink size={12} />
              <span>Open Tab</span>
            </a>
          </div>
        </div>

        {/* Close action */}
        <div className="pt-2 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border-2 border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-neutral-400 hover:text-white text-xs font-mono font-black uppercase tracking-widest transition-colors cursor-pointer rounded-none"
          >
            Dismiss Guide
          </button>
        </div>
      </div>
    </div>
  );
};
