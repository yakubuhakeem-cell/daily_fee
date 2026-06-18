/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LoginMFA } from './components/LoginMFA';
import { ClassRegister } from './components/ClassRegister';
import { Dashboard } from './components/Dashboard';
import { AdminPanel } from './components/AdminPanel';
import { ReportPanel } from './components/ReportPanel';
import { SchoolLogo } from './components/SchoolLogo';
import { TermPayersTab } from './components/TermPayersTab';
import { db } from './lib/firebase';
import { StudentClass } from './types';
import { 
  Fingerprint, 
  LayoutDashboard, 
  FolderEdit, 
  Receipt, 
  LogOut, 
  Settings, 
  Menu, 
  X, 
  ShieldCheck, 
  GraduationCap,
  Printer,
  Sun,
  Moon,
  CreditCard,
  Plus,
  Upload,
  User,
  Phone,
  Coins,
  Award,
  AlertCircle,
  Check,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function NavigationWrapper() {
  const { 
    currentUser, 
    logout, 
    currentDate, 
    resetData, 
    firebaseConnected,
    storageMode,
    setStorageMode,
    seedFirebaseFromLocal,
    students,
    users,
    payments,
    theme,
    setTheme,
    saveStatus,
    addStudent,
    playFeedbackSound
  } = useApp();

  // Compute unassigned pupils & missing registration records for the current day
  const unassignedCount = React.useMemo(() => {
    if (!students || !users) return 0;
    const activeStudents = students.filter(s => s.active);
    return activeStudents.filter(s => {
      const hasTeacher = users.some(u => u.role === 'Teacher' && (u.assignedClass === s.class || u.assignedClasses?.includes(s.class)) && u.active !== false);
      return !hasTeacher;
    }).length;
  }, [students, users]);

  const missingRegCount = React.useMemo(() => {
    if (!students || !payments) return 0;
    const activeStudents = students.filter(s => s.active);
    const paidStudentIds = new Set(
      payments.filter(p => p.date === currentDate).map(p => p.studentId)
    );
    return activeStudents.filter(s => !paidStudentIds.has(s.id)).length;
  }, [students, payments, currentDate]);

  const totalAdminAlerts = unassignedCount + missingRegCount;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'register' | 'admin' | 'reports' | 'termPayers'>('register');
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncErrorMessage, setSyncErrorMessage] = useState('');

  // Tutorial overlay persistence
  const [tutorialDismissed, setTutorialDismissed] = useState<boolean>(() => {
    return localStorage.getItem('s_sync_tutorial_dismissed') === 'true';
  });

  const dismissTutorial = () => {
    localStorage.setItem('s_sync_tutorial_dismissed', 'true');
    setTutorialDismissed(true);
  };

  const showTutorialAgain = () => {
    localStorage.setItem('s_sync_tutorial_dismissed', 'false');
    setTutorialDismissed(false);
  };

  const getSafeAppOrigin = () => {
    try {
      if (window.location.origin && window.location.origin !== 'null') {
        return window.location.origin;
      }
      const parsed = new URL(window.location.href);
      if (parsed.origin && parsed.origin !== 'null') {
        return parsed.origin;
      }
    } catch (e) {
      console.warn("Unable to parse origin, falling back to relative paths", e);
    }
    return '';
  };

  const [showPrintIframeWarning, setShowPrintIframeWarning] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const [isAddPupilModalOpen, setIsAddPupilModalOpen] = useState(false);
  const [newPupilName, setNewPupilName] = useState('');
  const [newPupilClass, setNewPupilClass] = useState<StudentClass>('B1');
  const [newPupilPhone, setNewPupilPhone] = useState('');
  const [newPupilGender, setNewPupilGender] = useState<'Male' | 'Female'>('Male');
  const [newPupilPaymentType, setNewPupilPaymentType] = useState<'Daily' | 'Term'>('Daily');
  const [newPupilDiscount, setNewPupilDiscount] = useState<number>(0);
  const [newPupilTermFee, setNewPupilTermFee] = useState<number>(350);
  const [newPupilLegacyDebt, setNewPupilLegacyDebt] = useState<number>(0);
  const [newPupilPhoto, setNewPupilPhoto] = useState<string | null>(null);

  const [appToast, setAppToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const triggerAppToast = (message: string, type: 'success' | 'error' = 'success') => {
    setAppToast({ message, type });
    setTimeout(() => setAppToast(null), 4000);
  };

  const PRE_SCHOOL_CLASSES: StudentClass[] = ['Nursery', 'KG1', 'KG2'];
  const PRIMARY_CLASSES: StudentClass[] = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'];
  const JHS_CLASSES: StudentClass[] = ['B7', 'B8', 'B9'];

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        triggerAppToast('File size must be strictly under 2MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setNewPupilPhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPupilSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPupilName.trim()) {
      triggerAppToast('Please enter a valid pupil name.', 'error');
      return;
    }

    const isDuplicate = (students || []).some(
      s => s.name.trim().toLowerCase() === newPupilName.trim().toLowerCase() && s.class === newPupilClass
    );

    if (isDuplicate) {
      playFeedbackSound('error');
      triggerAppToast(`Conflict: Pupil "${newPupilName.trim()}" is already registered in class ${newPupilClass}!`, 'error');
      return;
    }

    try {
      addStudent(
        newPupilName.trim(),
        newPupilClass,
        newPupilPhone.trim() || undefined,
        newPupilPhoto || undefined,
        newPupilDiscount,
        newPupilGender,
        newPupilPaymentType,
        newPupilTermFee,
        newPupilLegacyDebt
      );

      playFeedbackSound('success');
      triggerAppToast(`Pupil "${newPupilName.trim()}" enrolled successfully into Class ${newPupilClass}!`, 'success');
      
      setNewPupilName('');
      setNewPupilClass('B1');
      setNewPupilPhone('');
      setNewPupilGender('Male');
      setNewPupilPaymentType('Daily');
      setNewPupilDiscount(0);
      setNewPupilTermFee(350);
      setNewPupilLegacyDebt(0);
      setNewPupilPhoto(null);
      setIsAddPupilModalOpen(false);
    } catch (err) {
      playFeedbackSound('error');
      triggerAppToast(err instanceof Error ? err.message : 'Failed to register pupil.', 'error');
    }
  };

  React.useEffect(() => {
    // Intercept default window.print to handle iframe sandboxing constraints
    const originalPrint = window.print;
    window.print = function() {
      const isIframe = window.self !== window.top;
      if (isIframe) {
        window.dispatchEvent(new CustomEvent('show-print-iframe-warning'));
      } else {
        try {
          originalPrint.call(window);
        } catch (e) {
          console.warn("Native print interface blocked:", e);
          window.dispatchEvent(new CustomEvent('show-print-iframe-warning'));
        }
      }
    };

    const handleCustomPrintWarning = () => {
      setShowPrintIframeWarning(true);
    };

    window.addEventListener('show-print-iframe-warning', handleCustomPrintWarning);

    return () => {
      window.print = originalPrint;
      window.removeEventListener('show-print-iframe-warning', handleCustomPrintWarning);
    };
  }, []);

  // Set up global keyboard shortcuts (Ctrl+K to focus search, Ctrl+P to print)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        
        let searchId = 'class-register-search';
        if (activeTab === 'dashboard') searchId = 'dashboard-roster-search';
        else if (activeTab === 'admin') searchId = 'admin-student-search';
        else if (activeTab === 'reports') searchId = 'reports-student-search';
        else if (activeTab === 'termPayers') searchId = 'term-payers-search';

        const searchInput = document.getElementById(searchId) as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }

      // Check for Ctrl+P or Cmd+P
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        window.print();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [activeTab]);

  // Programmatic switch and cloud sync flow trigger helper function
  const triggerSwitchAndSyncCloud = async () => {
    setShowSyncConfirm(true);
    setSyncStatus('syncing');
    setSyncErrorMessage('');
    try {
      const response = await seedFirebaseFromLocal();
      if (response.success) {
        setSyncStatus('success');
        setTimeout(() => {
          setStorageMode('cloud');
          setShowSyncConfirm(false);
          setSyncStatus('idle');
        }, 2000);
        return { success: true };
      } else {
        setSyncStatus('error');
        setSyncErrorMessage(response.message);
        return { success: false, message: response.message };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSyncStatus('error');
      setSyncErrorMessage(msg);
      return { success: false, message: msg };
    }
  };

  // If nobody is logged in, show login page
  if (!currentUser || !currentUser.role) {
    return <LoginMFA />;
  }

  // Define tab security accessibility by role
  const canAccessTab = (tab: string) => {
    const role = currentUser.role;
    if (role === 'Administrator' || role === 'Headmaster') return true;
    if (role === 'Accountant') {
      return ['dashboard', 'register', 'reports', 'termPayers'].includes(tab);
    }
    if (role === 'Teacher') {
      return ['register'].includes(tab);
    }
    return false;
  };

  // Adjust default tab based on security access on load
  const tabs = [
    { id: 'register', label: 'Check-In GHC 5', icon: Receipt },
    { id: 'termPayers', label: 'Term Payers Status', icon: CreditCard },
    { id: 'dashboard', label: 'Cash Flow Trends & Stats', icon: LayoutDashboard },
    { id: 'reports', label: 'Audits & Exports', icon: FolderEdit },
    { id: 'admin', label: 'Pupil Enrollment Core', icon: Settings },
  ];

  const visibleTabs = tabs.filter(t => canAccessTab(t.id));

  // Determine standard page contents
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'register':
        return <ClassRegister />;
      case 'termPayers':
        return <TermPayersTab />;
      case 'admin':
        return <AdminPanel />;
      case 'reports':
        return <ReportPanel />;
      default:
        return <ClassRegister />;
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'daylight' ? 'daylight bg-white text-neutral-900' : 'bg-neutral-950 text-white'} flex flex-col font-sans selection:bg-amber-400 selection:text-black`}>
      {/* Dynamic Top Workspace Ribbon */}
      <header className="bg-neutral-900 shrink-0 border-b-4 border-neutral-800">
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <SchoolLogo size={44} />
            <div className="bg-amber-400 text-black font-black p-1 text-xl px-3 leading-none tracking-tighter">
              FEETRACK
            </div>
            <span className="hidden sm:inline text-neutral-500 font-bold uppercase text-[10px] tracking-widest pt-0.5">
              SAAKO HOLY CHILD ACADEMY Daily Portal
            </span>
          </div>

          {/* Desktop Right items */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2">
              {firebaseConnected ? (
                <>
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 border border-emerald-990/80 bg-emerald-950/40 px-2 py-0.5" title="Firebase Firestore Connected">
                    Firebase Live
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-amber-400"></span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 border border-amber-990/80 bg-amber-950/40 px-2 py-0.5" title="Offline mode using local browser storage">
                    Local Ledger
                  </span>
                </>
              )}

              {/* Real-time Visual Local/Firebase Save Status Badge inline */}
              <AnimatePresence mode="wait">
                {saveStatus && saveStatus !== 'idle' && (
                  <motion.span
                    key={saveStatus}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className={`ml-2 inline-flex items-center gap-1.5 px-2 py-0.5 border text-[9px] font-black uppercase tracking-widest ${
                      saveStatus === 'saving'
                        ? 'bg-amber-950/50 text-amber-400 border-amber-900'
                        : saveStatus === 'saved'
                        ? 'bg-emerald-950/50 text-emerald-400 border-emerald-900'
                        : 'bg-red-950/50 text-red-400 border-red-900'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      saveStatus === 'saving' ? 'bg-amber-400 animate-pulse' :
                      saveStatus === 'saved' ? 'bg-emerald-400' : 'bg-red-500'
                    }`}></span>
                    <span>{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Error'}</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <div className="h-8 w-[1px] bg-neutral-800" />

            <div className="text-right">
              <p className="text-xs font-black uppercase tracking-tight text-white">{currentUser.name}</p>
              <span className="text-[9px] text-amber-400 uppercase font-black tracking-widest block">
                {currentUser.role} Session Active
              </span>
            </div>

            <div className="h-8 w-[1px] bg-neutral-800" />

            {/* Direct quick registry enrollment action available for Administrators and Teachers */}
            {(currentUser.role === 'Administrator' || currentUser.role === 'Headmaster' || currentUser.role === 'Teacher') && (
              <>
                <button
                  onClick={() => setIsAddPupilModalOpen(true)}
                  className="bg-amber-400 hover:bg-amber-300 text-neutral-900 border-2 border-neutral-950 px-4 py-2 font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none shrink-0 rounded-none no-print"
                  title="Quick Register Active Pupil"
                  id="btn-desktop-quick-add-pupil"
                >
                  <Plus size={14} className="stroke-[3.5]" />
                  <span>+ Pupil Quick Add</span>
                </button>
                <div className="h-8 w-[1px] bg-neutral-800" />
              </>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setTheme(theme === 'daylight' ? 'dark' : 'daylight')}
                className="bg-neutral-800 hover:bg-amber-400 hover:text-black text-neutral-400 p-2 border border-neutral-700 hover:border-amber-400 transition-colors cursor-pointer"
                title={theme === 'daylight' ? "Switch to Dark Night Mode" : "Switch to Daylight High-Contrast Mode"}
                id="btn-desktop-theme-toggle"
              >
                {theme === 'daylight' ? <Moon size={16} /> : <Sun size={16} className="text-amber-400" />}
              </button>
              <button 
                onClick={logout}
                className="bg-neutral-800 hover:bg-amber-400 hover:text-black text-neutral-400 p-2 border border-neutral-700 hover:border-amber-400 transition-colors"
                title="Log out securely"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>

          {/* Mobile responsive toggle & actions */}
          <div className="flex md:hidden items-center gap-2.5">
            {(currentUser.role === 'Administrator' || currentUser.role === 'Headmaster' || currentUser.role === 'Teacher') && (
              <button
                onClick={() => setIsAddPupilModalOpen(true)}
                className="bg-amber-400 hover:bg-amber-300 text-neutral-900 border-2 border-neutral-950 px-3 py-1.5 font-mono text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] rounded-none no-print"
                title="Quick Register Active Pupil"
                id="btn-mobile-quick-add-pupil"
              >
                <Plus size={12} className="stroke-[4]" />
                <span>+ Pupil</span>
              </button>
            )}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-white/85 hover:text-white hover:bg-white/5 border border-neutral-800 transition-all"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Sync Link Warning banner */}
      {db.isActive() && storageMode === 'local' && (
        <div className="bg-amber-500 text-black px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-bold border-b-4 border-amber-600 animate-fade-in shrink-0 transition-all duration-350">
          {!showSyncConfirm ? (
            <>
              <div className="flex items-center gap-3">
                <span className="text-sm">⚠️</span>
                <span className="leading-relaxed">
                  <strong>Offline Mode Detected:</strong> Any pupil registers or check-ins (such as class <strong>B5</strong> pupil registers) logged on this device are saved only inside this browser. Enable Cloud Sync to synchronize your phone and laptop!
                </span>
              </div>
              <button
                onClick={() => {
                  setShowSyncConfirm(true);
                  setSyncStatus('idle');
                }}
                className="shrink-0 bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 text-amber-400 hover:text-amber-300 font-mono tracking-wider uppercase text-[10px] font-black px-4 py-2.5 shadow transition-all cursor-pointer"
              >
                Switch & Sync Cloud
              </button>
            </>
          ) : (
            <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4">
              {syncStatus === 'idle' && (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-sm flex-shrink-0">❓</span>
                    <span className="leading-relaxed">
                      <strong>Are you sure you want to switch to Cloud and Synchronize?</strong> This will bundle your local pupil records & payments and merge them with live Firestore so your phone & laptop match.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={async () => {
                        try {
                          setSyncStatus('syncing');
                          const response = await seedFirebaseFromLocal();
                          if (response.success) {
                            setSyncStatus('success');
                            // Delay actual cloud switch of view slightly so user sees the nice green success state
                            setTimeout(() => {
                              setStorageMode('cloud');
                              setShowSyncConfirm(false);
                              setSyncStatus('idle');
                            }, 2000);
                          } else {
                            setSyncStatus('error');
                            setSyncErrorMessage(response.message);
                          }
                        } catch (err) {
                          setSyncStatus('error');
                          setSyncErrorMessage(err instanceof Error ? err.message : String(err));
                        }
                      }}
                      className="bg-neutral-950 hover:bg-neutral-900 text-emerald-400 font-mono tracking-wider uppercase text-[10px] font-black px-3.5 py-2 cursor-pointer shadow border border-neutral-900"
                    >
                      ✓ Yes, Merge & Sync
                    </button>
                    <button
                      onClick={() => setShowSyncConfirm(false)}
                      className="bg-transparent hover:bg-black/10 text-neutral-900 hover:text-black font-mono tracking-wider uppercase text-[10px] font-black px-3 py-2 cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}

              {syncStatus === 'syncing' && (
                <div className="flex items-center gap-3 py-1">
                  <span className="animate-spin text-sm flex-shrink-0 pb-0.5">⌛</span>
                  <span>Synchronizing internal ledger records with live Firestore Cloud database... Please stay on this page.</span>
                </div>
              )}

              {syncStatus === 'success' && (
                <div className="flex items-center gap-3 py-1 text-neutral-950">
                  <span className="text-sm flex-shrink-0">🎉</span>
                  <span className="font-extrabold uppercase tracking-wide">Handshake successfully verified! Switch completes instantly...</span>
                </div>
              )}

              {syncStatus === 'error' && (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-sm flex-shrink-0">❌</span>
                    <span className="leading-relaxed">
                      <strong>Handshake Failed:</strong> {syncErrorMessage}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setSyncStatus('idle');
                      }}
                      className="bg-neutral-950 hover:bg-neutral-900 text-amber-500 font-mono tracking-wider uppercase text-[10px] font-black px-3.5 py-2 cursor-pointer"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => {
                        setShowSyncConfirm(false);
                        setSyncStatus('idle');
                      }}
                      className="bg-transparent text-neutral-900 font-mono tracking-wider uppercase text-[10px] px-2 py-1"
                    >
                      Dismiss
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main workspace layout */}
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="hidden md:flex w-64 bg-neutral-900 border-r-4 border-neutral-800 p-6 flex-col justify-between shrink-0">
          <div className="space-y-8">
            <div>
              <h3 className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mb-4">
                Main Menu
              </h3>
              <nav className="space-y-2">
                {visibleTabs.map(tab => {
                  const active = activeTab === tab.id;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full text-left font-black text-lg tracking-tight transition-all flex items-center justify-between py-1 select-none border-l-4 pr-1.5 ${
                        active
                          ? 'text-amber-400 border-amber-400 pl-3'
                          : 'text-neutral-500 hover:text-white border-transparent pl-3'
                      }`}
                    >
                      <span className="uppercase">
                        {tab.id === 'register' 
                          ? 'Daily Check-In' 
                          : tab.id === 'termPayers' 
                          ? 'Term Payers Status' 
                          : tab.id === 'dashboard' 
                          ? 'Cash Flow Feed' 
                          : tab.id === 'reports' 
                          ? 'Audits & Exports' 
                          : 'Staff & Pupils'}
                      </span>
                      {tab.id === 'admin' && totalAdminAlerts > 0 && (
                        <span 
                          id="admin-security-badge-indicator"
                          className="bg-red-500 text-neutral-950 font-mono text-[9px] font-black px-1.5 py-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full animate-bounce shrink-0"
                          title={`${unassignedCount} unassigned pupil(s), ${missingRegCount} missing registration(s) today`}
                        >
                          {totalAdminAlerts}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="bg-neutral-800/60 p-4 border-l-4 border-amber-400 space-y-3">
              <p className="text-[11px] font-black text-neutral-300 leading-tight uppercase tracking-wide">
                Daily Fee Baseline
              </p>
              <p className="text-[11px] text-neutral-400 leading-relaxed font-bold">
                Every pupil must register exactly <strong className="text-white font-mono font-black border-b border-light/10">GHC 5.00</strong> daily on entry.
              </p>
            </div>
          </div>

        </aside>

        {/* Mobile menu panel sliding display */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden w-full bg-neutral-900 border-b-4 border-neutral-800 px-6 py-5 space-y-4 text-white shrink-0 z-20 absolute top-0 left-0 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-3 border-b border-neutral-800">
                <div>
                  <p className="text-xs font-black uppercase text-white">{currentUser.name}</p>
                  <p className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-bold">{currentUser.role} Session</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTheme(theme === 'daylight' ? 'dark' : 'daylight')}
                    className="bg-neutral-800 hover:bg-amber-400 hover:text-black border border-neutral-700 text-white p-2 transition-all cursor-pointer"
                    title={theme === 'daylight' ? 'Switch to Dark Mode' : 'Switch to Daylight Mode'}
                    id="btn-mobile-theme-toggle"
                  >
                    {theme === 'daylight' ? <Moon size={14} /> : <Sun size={14} className="text-amber-400" />}
                  </button>
                  <button 
                    onClick={logout}
                    className="bg-neutral-850 hover:bg-amber-400 hover:text-black border border-neutral-700 text-white px-3 py-1.5 font-black text-xs transition-all uppercase tracking-widest"
                  >
                    Log Out
                  </button>
                </div>
              </div>

              <nav className="space-y-3 py-2">
                {visibleTabs.map(tab => {
                  const active = activeTab === tab.id;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as any);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full text-left font-black text-base tracking-tight transition-all flex items-center justify-between py-1.5 border-l-4 pr-1.5 ${
                        active
                          ? 'text-amber-400 border-amber-400 pl-3'
                          : 'text-neutral-500 hover:text-neutral-200 border-transparent pl-3'
                      }`}
                    >
                      <span>
                        {tab.id === 'register' 
                          ? 'DAILY CHECK-IN' 
                          : tab.id === 'termPayers' 
                          ? 'TERM PAYERS STATUS' 
                          : tab.id === 'dashboard' 
                          ? 'CASH FLOW FEED' 
                          : tab.id === 'reports' 
                          ? 'AUDITS & EXPORTS' 
                          : 'STAFF & PUPIL REGISTRY'}
                      </span>
                      {tab.id === 'admin' && totalAdminAlerts > 0 && (
                        <span 
                          id="admin-security-badge-indicator-mobile"
                          className="bg-red-500 text-neutral-950 font-mono text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse shrink-0"
                        >
                          {totalAdminAlerts}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic content sandbox workspace */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {renderTabContent()}
        </main>
      </div>

      {/* FOOTER ACTION BAR */}
      <footer className="h-12 bg-neutral-950 border-t-2 border-neutral-800/80 flex items-center px-8 justify-between text-[10px] text-neutral-500 font-bold shrink-0">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-amber-400"></span>
            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">MFA Active</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-neutral-600"></span>
            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Ver 2.6.0-Pro</span>
          </div>
          
          {/* Synchronized state indicator footer widget */}
          <div className="flex items-center gap-2 border-l border-neutral-850 pl-4">
            <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
              saveStatus === 'saving' ? 'bg-amber-400 animate-pulse' :
              saveStatus === 'saved' ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-500'
            }`}></span>
            <span className={`text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${
              saveStatus === 'saving' ? 'text-amber-400' :
              saveStatus === 'saved' ? 'text-emerald-400' : 'text-neutral-500'
            }`}>
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'LEDGER SYNCED'}
            </span>
          </div>
        </div>

        {currentUser?.role === 'Administrator' && (
          <button
            onClick={() => {
              if (activeTab !== 'reports') {
                setActiveTab('reports');
                setTimeout(() => {
                  window.print();
                }, 250);
              } else {
                window.print();
              }
            }}
            className="no-print bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-2 border-neutral-800 hover:border-amber-400 px-3 py-1 font-mono text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors cursor-pointer"
            id="btn-global-admin-print"
            title="Generate Clean Audit Reports (Administrators Only)"
          >
            <Printer size={12} className="text-amber-400" />
            <span>Print Report</span>
          </button>
        )}

        <div className="text-[9px] font-black text-neutral-600 uppercase tracking-wider hidden sm:block">
          &copy; {new Date().getFullYear()} SAAKO HOLY CHILD ACADEMY • Saako Holy Child Ledger Authority
        </div>
      </footer>

      {/* Dynamic Sync Tutorial / Multi-Device Warning Overlay */}
      {db.isActive() && storageMode === 'local' && (
        <AnimatePresence>
          {!tutorialDismissed ? (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed bottom-16 right-6 z-50 max-w-sm w-full bg-neutral-900 border-4 border-amber-500 p-5 rounded font-sans text-neutral-200 shadow-[6px_6px_0px_0px_rgba(245,158,11,0.25)]"
              id="sync-tutorial-overlay"
            >
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">👥</span>
                  <h4 className="text-[11px] font-black uppercase text-amber-400 tracking-wider font-mono">
                    Multi-Device Sync Guide
                  </h4>
                </div>
                <button
                  onClick={dismissTutorial}
                  className="text-neutral-500 hover:text-white transition-colors cursor-pointer text-xs p-1 leading-none font-bold"
                  title="Minimize tutorial"
                  id="btn-dismiss-tutorial-cross"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold leading-relaxed text-neutral-150">
                  Are your colleagues not seeing your additions?
                </p>
                <p className="text-[11px] leading-relaxed text-neutral-400 font-medium">
                  Your device is currently on <strong className="text-amber-400 font-mono text-[10px]">LOCAL LEDGER</strong> offline mode. Any pupil attendances, checklist revisions, or fee registers logged on this screen are saved <em className="not-italic text-neutral-300 underline font-semibold">only inside this device's browser</em>.
                </p>
                <p className="text-[11px] leading-relaxed text-neutral-400 font-medium bg-neutral-950 p-2.5 border border-neutral-800 rounded">
                  💡 <strong className="text-white">To Share with Coworkers:</strong> You and your colleagues <strong className="text-white">MUST</strong> click the orange <strong>"Switch & Sync Cloud"</strong> button to sync with the live Cloud Database so laptop & phone indicators match!
                </p>

                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    onClick={dismissTutorial}
                    className="text-[10px] font-black uppercase tracking-wider text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    id="btn-hide-sync-tutorial"
                  >
                    Got It, Hide
                  </button>
                  <button
                    onClick={async () => {
                      dismissTutorial();
                      await triggerSwitchAndSyncCloud();
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-black font-black font-mono tracking-wider uppercase text-[10px] px-3 py-2 transition-all cursor-pointer rounded-sm hover:-translate-y-0.5 active:translate-y-0"
                    id="btn-trigger-programmatic-sync"
                  >
                    ⚡ Sync & Cloud Link
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            // Small badge to restore/reopen guide if dismissed
            <motion.button
              type="button"
              onClick={showTutorialAgain}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="fixed bottom-16 right-6 z-50 bg-neutral-900 border-2 border-amber-500 hover:bg-amber-500 hover:text-neutral-950 text-amber-400 px-3 py-1.5 text-[10px] uppercase font-black tracking-widest cursor-pointer shadow-lg font-mono flex items-center gap-1.5 transition-all"
              id="btn-reopen-sync-tutorial"
            >
              <span>❓ Sync Guide</span>
              <span className="w-1.5 h-1.5 bg-amber-400 animate-pulse rounded-full"></span>
            </motion.button>
          )}
        </AnimatePresence>
      )}

      {/* Iframe Sandbox Print Warning Overlay Modal */}
      <AnimatePresence>
        {showPrintIframeWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-sm flex items-center justify-center p-4 font-sans no-print"
            id="print-iframe-warning-modal"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-lg bg-neutral-900 border-4 border-amber-400 p-6 md:p-8 space-y-6 shadow-[8px_8px_0px_0px_rgba(251,191,36,0.15)] text-white flex flex-col"
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-amber-400/10 border border-amber-400 text-amber-300 shrink-0">
                    <Printer size={20} className="text-amber-400" />
                  </div>
                  <div>
                    <span className="text-[9px] text-amber-400 font-mono tracking-widest font-black uppercase block font-bold">Security Alert</span>
                    <h3 className="text-base font-black uppercase tracking-tight">Print Sandbox Restriction</h3>
                    <p className="text-[11px] text-neutral-400 mt-1">
                      Browser security blocks the print preview screen when running inside an interactive development frame.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowPrintIframeWarning(false);
                    setCopiedUrl(false);
                  }} 
                  className="p-1 cursor-pointer text-neutral-400 hover:text-white transition-colors"
                  title="Close Alert"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Steps Body */}
              <div className="space-y-4 text-xs leading-relaxed text-neutral-300 font-medium">
                <div className="bg-neutral-950 p-3.5 border border-neutral-800 rounded font-mono text-[11px] text-amber-300">
                  ⚡ <strong>The Solution:</strong> You must open safety-secured tabs in a standard browser window to allow direct printing.
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 font-mono">1</span>
                    <p className="pt-0.5">
                      Look at the <strong>top-right corner</strong> of your AI Studio preview box and click the <strong>"Open App in New Tab"</strong> icon (external link ↗ symbol).
                    </p>
                  </div>

                  <div className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 font-mono">2</span>
                    <div className="pt-0.5 space-y-2 flex-1">
                      <p>
                        Alternatively, copy this direct application link and paste it into some regular desktop web browser tab:
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={getSafeAppOrigin()}
                          className="flex-1 bg-neutral-950 border border-neutral-800 px-3 py-1.5 font-mono text-[10px] text-neutral-300 select-all outline-none rounded"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(getSafeAppOrigin());
                            setCopiedUrl(true);
                            setTimeout(() => setCopiedUrl(false), 2000);
                          }}
                          className="px-3 bg-neutral-800 hover:bg-neutral-750 font-mono text-[9px] font-black uppercase tracking-wider border border-neutral-700 hover:text-white rounded transition-all shrink-0 cursor-pointer"
                        >
                          {copiedUrl ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 font-mono">3</span>
                    <p className="pt-0.5">
                      Once opened in the new browser tab, click the <strong>Print</strong> buttons again. Your receipts, ID cards, and files will print flawlessly!
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-neutral-800 pt-4 flex gap-3">
                <a
                  href={getSafeAppOrigin()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 bg-amber-400 hover:bg-amber-300 text-black font-black uppercase text-xs tracking-widest transition-all cursor-pointer text-center font-mono flex items-center justify-center gap-2"
                >
                  Open in New Tab Now ↗
                </a>
                <button
                  onClick={() => {
                    setShowPrintIframeWarning(false);
                    setCopiedUrl(false);
                  }}
                  className="px-5 py-3 bg-neutral-950 hover:bg-neutral-850 text-neutral-400 hover:text-white font-mono uppercase text-xs tracking-wider transition-colors border border-neutral-800 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QUICK ENROLL PUPIL MODAL OVERLAY */}
      <AnimatePresence>
        {isAddPupilModalOpen && (
          <div className="fixed inset-0 bg-neutral-950/95 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-2xl bg-neutral-900 border-4 border-amber-400 p-6 md:p-8 space-y-6 shadow-[10px_10px_0px_0px_rgba(251,191,36,0.2)] text-white flex flex-col my-8"
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-amber-400/10 border border-amber-400 text-amber-300 shrink-0">
                    <GraduationCap size={22} className="text-amber-400" />
                  </div>
                  <div>
                    <span className="text-[9px] text-amber-400 font-mono tracking-widest font-black uppercase block">CORE REGISTRY ACTION</span>
                    <h3 className="text-lg font-black uppercase tracking-tight">Quick Enroll Pupil Portal</h3>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Directly register and admit a new student into Saako Holy Child Academy. Changes propagate instantly to active databases.
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsAddPupilModalOpen(false)} 
                  className="p-1 cursor-pointer text-neutral-400 hover:text-white hover:bg-neutral-850 border border-transparent hover:border-neutral-800 transition-all"
                  title="Collapse Register View"
                  id="btn-close-enroll-pupil-modal"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleAddPupilSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Student Name */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest font-mono">
                      Student Full Name <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-neutral-500">
                        <User size={14} />
                      </span>
                      <input 
                        type="text"
                        required
                        value={newPupilName}
                        onChange={(e) => setNewPupilName(e.target.value)}
                        placeholder="e.g. Kwame Mensah Kofi"
                        className="w-full bg-neutral-950 border border-neutral-800 py-2.5 pl-9 pr-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder-neutral-600 rounded-none uppercase"
                      />
                    </div>
                  </div>

                  {/* Student Class */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest font-mono">
                      Assigned Class Group <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3.5 text-neutral-500 pointer-events-none">
                        <GraduationCap size={14} />
                      </span>
                      <select
                        value={newPupilClass}
                        onChange={(e) => setNewPupilClass(e.target.value as StudentClass)}
                        className="w-full bg-neutral-950 border border-neutral-800 py-3 pl-9 pr-10 text-xs font-mono font-black text-amber-400 focus:outline-none focus:border-amber-400 uppercase cursor-pointer appearance-none rounded-none"
                      >
                        <optgroup label="Pre-School" className="bg-neutral-950 text-neutral-500">
                          {PRE_SCHOOL_CLASSES.map(cls => (
                            <option key={cls} value={cls} className="bg-neutral-900 text-white font-mono">{cls}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Primary School" className="bg-neutral-950 text-neutral-500">
                          {PRIMARY_CLASSES.map(cls => (
                            <option key={cls} value={cls} className="bg-neutral-900 text-white font-mono">{cls}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Junior High School (JHS)" className="bg-neutral-950 text-neutral-500">
                          {JHS_CLASSES.map(cls => (
                            <option key={cls} value={cls} className="bg-neutral-900 text-white font-mono">{cls}</option>
                          ))}
                        </optgroup>
                      </select>
                      <div className="absolute right-3.5 top-4 pointer-events-none text-neutral-500">
                        <ChevronDown size={14} className="stroke-[3]" />
                      </div>
                    </div>
                  </div>

                  {/* Gender Selector */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest font-mono">
                      Pupil Gender <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="flex gap-4">
                      {['Male', 'Female'].map((gender) => (
                        <label 
                          key={gender}
                          className={`flex-1 flex items-center justify-center gap-2 border-2 py-2.5 px-4 text-xs font-mono font-black uppercase cursor-pointer transition-all ${
                            newPupilGender === gender
                              ? 'bg-amber-400/10 border-amber-400 text-amber-400'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-600'
                          }`}
                        >
                          <input 
                            type="radio" 
                            name="pupil-gender"
                            value={gender}
                            checked={newPupilGender === gender}
                            onChange={() => setNewPupilGender(gender as any)}
                            className="hidden" 
                          />
                          <span>{gender}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Guardian Phone */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest font-mono">
                      Guardian WhatsApp / SMS contact
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-neutral-500">
                        <Phone size={14} />
                      </span>
                      <input 
                        type="tel"
                        value={newPupilPhone}
                        onChange={(e) => setNewPupilPhone(e.target.value)}
                        placeholder="e.g. 0541234567 (defaults fallback)"
                        className="w-full bg-neutral-950 border border-neutral-800 py-2.5 pl-9 pr-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder-neutral-600 rounded-none"
                      />
                    </div>
                  </div>

                  {/* Payment Billing Type Mode */}
                  <div className="space-y-1.5 col-span-1 md:col-span-2 border-t border-neutral-850 pt-4">
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest font-mono">
                      Tuition/Fee Billing Model
                    </label>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setNewPupilPaymentType('Daily')}
                        className={`flex-1 border-2 py-3 px-4 font-mono text-center transition-all ${
                          newPupilPaymentType === 'Daily'
                            ? 'bg-amber-400/10 border-amber-400 text-amber-400'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:border-neutral-700'
                        }`}
                      >
                        <div className="text-xs font-black uppercase">Daily Porter (GHC 5.00)</div>
                        <div className="text-[9px] mt-0.5 uppercase tracking-wider font-bold">Standard cash-on-check-in daily ledger</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setNewPupilPaymentType('Term')}
                        className={`flex-1 border-2 py-3 px-4 font-mono text-center transition-all ${
                          newPupilPaymentType === 'Term'
                            ? 'bg-amber-400/10 border-amber-400 text-amber-400'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:border-neutral-700'
                        }`}
                      >
                        <div className="text-xs font-black uppercase">Term Payer (Static Subscription)</div>
                        <div className="text-[9px] mt-0.5 uppercase tracking-wider font-bold">Consolidated whole-term single billing rate</div>
                      </button>
                    </div>
                  </div>

                  {/* Conditional billing parameters */}
                  {newPupilPaymentType === 'Daily' ? (
                    <div className="space-y-1.5 col-span-1 md:col-span-2 bg-neutral-950/60 p-4 border border-neutral-800/80 flex flex-col sm:flex-row gap-4 items-center justify-between">
                      <div className="space-y-1 w-full sm:w-1/2">
                        <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest font-mono">
                          Daily Discount / Scholarship (GHC)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 px-1.5 py-0.5 bg-neutral-900 border border-neutral-800 text-[10px] font-mono text-amber-400 font-bold top-2">GHC</span>
                          <input 
                            type="number"
                            min="0"
                            max="5"
                            step="0.5"
                            value={newPupilDiscount}
                            onChange={(e) => setNewPupilDiscount(parseFloat(e.target.value) || 0)}
                            className="w-full bg-neutral-900 border border-neutral-800 py-2 pl-14 pr-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 rounded-none"
                          />
                        </div>
                      </div>
                      <div className="w-full sm:w-1/2 text-left sm:text-right font-mono space-y-0.5">
                        <p className="text-[9px] text-neutral-400 uppercase font-black tracking-widest">Effective Daily Rate</p>
                        <p className="text-xl font-bold text-white leading-none">
                          GHC {(5.00 - newPupilDiscount).toFixed(2)}
                        </p>
                        <p className="text-[8px] text-neutral-500 uppercase">
                          Standard GHC 5.00 daily fee subtracted by discount rate
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 col-span-1 md:col-span-2 bg-neutral-950/60 p-4 border border-neutral-800/80">
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest font-mono">
                        Consolidated Term Subscription Fee (GHC)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 px-1.5 py-0.5 bg-neutral-900 border border-neutral-800 text-[10px] font-mono text-amber-400 font-bold top-2">GHC</span>
                        <input 
                          type="number"
                          min="0"
                          step="10"
                          value={newPupilTermFee}
                          onChange={(e) => setNewPupilTermFee(parseFloat(e.target.value) || 0)}
                          className="w-full bg-neutral-900 border border-neutral-800 py-2 pl-14 pr-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 rounded-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Legacy Arrears / Debt */}
                  <div className="space-y-1.5 col-span-1 md:col-span-2">
                    <label className="block text-[10px] font-black text-red-400 uppercase tracking-widest font-mono">
                      Adoption Legacy Outstanding Arrears / Debt (GHC)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 px-1.5 py-0.5 bg-neutral-950 border border-neutral-800 text-[10px] font-mono text-red-400 font-bold top-2.5">GHC</span>
                      <input 
                        type="number"
                        min="0"
                        step="1"
                        value={newPupilLegacyDebt}
                        onChange={(e) => setNewPupilLegacyDebt(parseFloat(e.target.value) || 0)}
                        placeholder="e.g. 150 (defaults 0)"
                        className="w-full bg-neutral-950 border border-neutral-800 py-2.5 pl-14 pr-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-red-400 rounded-none"
                      />
                    </div>
                    <p className="text-[8px] font-mono text-neutral-500 uppercase leading-snug">
                      Outstanding baseline bills outstanding from prior academic years to seed their digital profile ledger.
                    </p>
                  </div>

                  {/* Pupil Photograph Picture Upload */}
                  <div className="space-y-1.5 col-span-1 md:col-span-2">
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest font-mono">
                      Pupil Photograph
                    </label>
                    {newPupilPhoto ? (
                      <div className="relative w-full aspect-video bg-neutral-950 border-2 border-dashed border-amber-400 p-4 flex flex-col items-center justify-center gap-3">
                        <img 
                          src={newPupilPhoto} 
                          alt="Pupil passport preview" 
                          className="w-16 h-16 rounded-full object-cover border-2 border-amber-400"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => setNewPupilPhoto(null)}
                          className="text-[10px] font-mono font-black text-red-500 hover:text-red-400 uppercase tracking-wider bg-neutral-900 border border-neutral-800 px-3 py-1.5 transition-colors cursor-pointer"
                        >
                          Remove Photograph
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full min-h-[96px] bg-neutral-950 border-2 border-dashed border-neutral-800 hover:border-neutral-600 p-4 cursor-pointer transition-all">
                        <Upload size={18} className="text-neutral-500 mb-1.5" />
                        <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider text-center">Upload Photo/Passport</span>
                        <span className="text-[8px] font-mono text-neutral-600 uppercase mt-0.5">JPEG / PNG up to 2MB</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handlePhotoUpload} 
                          className="hidden" 
                        />
                      </label>
                    )}
                  </div>

                </div>

                {/* Confirm Actions */}
                <div className="border-t border-neutral-800 pt-5 flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-amber-400 hover:bg-amber-300 text-black font-black uppercase text-xs tracking-widest transition-all cursor-pointer text-center font-mono flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  >
                    <Check size={14} className="stroke-[3]" />
                    <span>Confirm Admission Registration</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddPupilModalOpen(false)}
                    className="px-5 py-3 bg-neutral-950 hover:bg-neutral-850 text-neutral-400 hover:text-white font-mono uppercase text-xs tracking-wider transition-colors border border-neutral-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GLOBAL TOAST BANNER */}
      <AnimatePresence>
        {appToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className={`fixed top-6 right-6 z-[100] border-4 p-4 flex items-center gap-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${
              appToast.type === 'success' 
                ? 'bg-neutral-900 border-emerald-500 text-emerald-400' 
                : 'bg-neutral-900 border-red-500 text-red-400'
            }`}
          >
            {appToast.type === 'success' ? <Check size={18} className="stroke-[3]" /> : <AlertCircle size={18} />}
            <span className="text-xs font-mono font-black uppercase tracking-wider">
              {appToast.message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <NavigationWrapper />
    </AppProvider>
  );
}
