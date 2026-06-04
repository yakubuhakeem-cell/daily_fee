/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { SchoolCategory, StudentClass } from '../types';
import { 
  TrendingUp, 
  Award, 
  AlertTriangle, 
  Coins, 
  RefreshCw, 
  Calendar, 
  PhoneCall, 
  Check, 
  ExternalLink,
  LayoutGrid,
  ListFilter,
  Users,
  Search,
  Activity,
  ArrowRightLeft,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend 
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { 
    currentDate,
    setCurrentDate,
    payments, 
    getDailyStats, 
    getTeacherMetrics, 
    getCashFlowTrend, 
    getPendingAlerts,
    currentUser,
    terms,
    activeTerm,
    setActiveTerm,
    students,
    clearAllPayments,
    clearSampleStudents,
    pendingLocalEdits,
    seedFirebaseFromLocal,
    storageMode
  } = useApp();

  const [syncStatus, setSyncStatus] = useState<{ loading: boolean; error: string | null; successMessage: string | null }>({
    loading: false,
    error: null,
    successMessage: null
  });

  const handleSyncNow = async () => {
    setSyncStatus({ loading: true, error: null, successMessage: null });
    try {
      const result = await seedFirebaseFromLocal();
      if (result.success) {
        setSyncStatus({ loading: false, error: null, successMessage: result.message || 'Ledger successfully pushed to cloud database!' });
        setTimeout(() => {
          setSyncStatus(prev => ({ ...prev, successMessage: null }));
        }, 5500);
      } else {
        setSyncStatus({ loading: false, error: result.message || 'Seeding rejected. Target database is unreachable.', successMessage: null });
      }
    } catch (err: any) {
      setSyncStatus({ loading: false, error: err.message || 'Sync network error', successMessage: null });
    }
  };

  // Active Layout perspective state
  const [activeLayout, setActiveLayout] = useState<'bento' | 'class-perf' | 'alerts-desk'>('bento');

  // Confirmation state for resetting revenue or pupils list
  const [resetConfirming, setResetConfirming] = useState<'none' | 'payments' | 'both'>('none');

  // Dynamic daily goal for collections
  const [dailyGoal, setDailyGoal] = useState<number>(() => {
    const saved = localStorage.getItem('daily_collection_goal');
    return saved ? parseInt(saved, 10) : 500;
  });

  const handleUpdateDailyGoal = (newGoal: number) => {
    const goal = Math.max(1, newGoal);
    setDailyGoal(goal);
    localStorage.setItem('daily_collection_goal', goal.toString());
  };

  // Target audit date
  const [dateFilter, setDateFilter] = useState<string>(currentDate);

  // Synchronize dynamic dates from the central state
  React.useEffect(() => {
    setDateFilter(currentDate);
  }, [currentDate]);

  // Chart toggle metric state
  const [chartMetric, setChartMetric] = useState<'revenue' | 'volume'>('revenue');

  // Chart active view mode switch: 'trends' for manual SVG, 'recharts' for Recharts Line Chart
  const [chartView, setChartView] = useState<'trends' | 'recharts'>('recharts');

  // Custom Recharts dark-theme tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-neutral-900 border-2 border-neutral-800 p-3 font-mono text-[10px] text-left uppercase space-y-1.5 shadow-2xl">
          <p className="font-extrabold text-amber-400 tracking-wider mb-1.5 border-b border-neutral-800 pb-1">{label}</p>
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between gap-6 items-center">
              <span className="text-neutral-500 font-bold">{item.name}:</span>
              <span className="font-black" style={{ color: item.color || item.stroke }}>GHC {Number(item.value).toFixed(2)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Memoized data for last 7 days of the selected term
  const last7DaysData = useMemo(() => {
    if (!activeTerm || !activeTerm.schoolDays) return [];
    
    // Find index of the currently selected date map in the active term
    const selectedIndex = activeTerm.schoolDays.indexOf(dateFilter);
    let daysToUse: string[] = [];
    
    if (selectedIndex !== -1) {
      // Get up to 7 days ending at selectedIndex
      const startIdx = Math.max(0, selectedIndex - 6);
      daysToUse = activeTerm.schoolDays.slice(startIdx, selectedIndex + 1);
    } else {
      // Fallback: take the last 7 days of the entire term
      daysToUse = activeTerm.schoolDays.slice(-7);
    }
    
    // Support ensuring we always have at least 7 days/points if the term has enough
    if (daysToUse.length < 7 && activeTerm.schoolDays.length >= 7) {
      daysToUse = activeTerm.schoolDays.slice(-7);
    }

    return daysToUse.map(dStr => {
      const parts = dStr.split('-');
      const formattedDate = parts[2] && parts[1] ? `${parts[2]}/${parts[1]}` : dStr;
      
      const dayPayments = payments.filter(p => p.date === dStr && p.verified);
      const totalCollected = dayPayments.reduce((sum, p) => sum + p.amount, 0);
      
      // Target Goal: customized daily collection goal configured by teachers
      const targetGoal = dailyGoal;
      
      return {
        date: dStr,
        formattedDate,
        "Total Collected": totalCollected,
        "Target Goal": targetGoal,
      };
    });
  }, [activeTerm, dateFilter, payments, students, dailyGoal]);

  // Search inside filters for sub-views
  const [alertSearch, setAlertSearch] = useState('');
  const [classPerfSearch, setClassPerfSearch] = useState('');

  const stats = useMemo(() => getDailyStats(dateFilter), [getDailyStats, dateFilter]);
  const teacherMetrics = useMemo(() => getTeacherMetrics(dateFilter), [getTeacherMetrics, dateFilter]);
  const trends = useMemo(() => getCashFlowTrend(), [getCashFlowTrend]);
  const pendingAlerts = useMemo(() => getPendingAlerts(dateFilter), [getPendingAlerts, dateFilter]);

  const totalVerifiedAccumulatedRevenue = useMemo(() => {
    return (payments || []).reduce((acc, p) => p.verified ? acc + p.amount : acc, 0);
  }, [payments]);

  const dailyProgressPercent = useMemo(() => {
    return dailyGoal > 0 ? (stats.totalCollected / dailyGoal) * 100 : 0;
  }, [stats.totalCollected, dailyGoal]);

  const customCollectionRate = dailyProgressPercent;

  // Handle manual date changing to explore other days
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      setDateFilter(val);
      setCurrentDate(val);
    }
  };

  // Helper to resolve specific quick dates in YYYY-MM-DD
  const getQuickDateStr = (type: 'today' | 'yesterday' | 'last_friday') => {
    const refDate = new Date();
    const year = refDate.getFullYear();
    const baseDate = (year === 2026) ? refDate : new Date('2026-06-01');

    if (type === 'today') {
      const yyyy = baseDate.getFullYear();
      const mm = String(baseDate.getMonth() + 1).padStart(2, '0');
      const dd = String(baseDate.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } else if (type === 'yesterday') {
      const prev = new Date(baseDate);
      prev.setDate(baseDate.getDate() - 1);
      const yyyy = prev.getFullYear();
      const mm = String(prev.getMonth() + 1).padStart(2, '0');
      const dd = String(prev.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } else if (type === 'last_friday') {
      const prevFriday = new Date(baseDate);
      const currentDay = baseDate.getDay();
      let daysToSub = 0;
      if (currentDay === 5) {
        daysToSub = 7;
      } else {
        daysToSub = (currentDay - 5 + 7) % 7;
        if (daysToSub === 0) daysToSub = 7;
      }
      prevFriday.setDate(baseDate.getDate() - daysToSub);
      const yyyy = prevFriday.getFullYear();
      const mm = String(prevFriday.getMonth() + 1).padStart(2, '0');
      const dd = String(prevFriday.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return currentDate;
  };

  const handleQuickDateSelect = (type: 'today' | 'yesterday' | 'last_friday') => {
    const val = getQuickDateStr(type);
    setDateFilter(val);
    setCurrentDate(val);
  };

  // Find maximum trend amount for scaling SVG chart
  const maxTrendAmount = useMemo(() => {
    const vals = trends.map(t => chartMetric === 'revenue' ? t.amount : t.transactions);
    return Math.max(...vals, 1); // avoid division by zero
  }, [trends, chartMetric]);

  const [notifiedStudents, setNotifiedStudents] = useState<Record<string, boolean>>({});

  const handleDialGuardian = (studentId: string, phone: string) => {
    setNotifiedStudents(prev => ({ ...prev, [studentId]: true }));
    // Simulate dialing visually for 3 seconds
    setTimeout(() => {
      setNotifiedStudents(prev => ({ ...prev, [studentId]: false }));
    }, 3000);
  };

  // Filtered lists for specialized tabs
  const filteredAlerts = useMemo(() => {
    if (!alertSearch.trim()) return pendingAlerts;
    const lower = alertSearch.toLowerCase();
    return pendingAlerts.filter(s => 
      s.studentName.toLowerCase().includes(lower) || 
      s.class.toLowerCase().includes(lower)
    );
  }, [pendingAlerts, alertSearch]);

  const filteredTeacherMetrics = useMemo(() => {
    if (!classPerfSearch.trim()) return teacherMetrics;
    const lower = classPerfSearch.toLowerCase();
    return teacherMetrics.filter(m => 
      m.className.toLowerCase().includes(lower) || 
      m.teacherName.toLowerCase().includes(lower)
    );
  }, [teacherMetrics, classPerfSearch]);

  return (
    <div className="space-y-6 font-sans">
      {/* Date & Layout Control Header */}
      <div className="bg-neutral-900 border-4 border-neutral-800 p-6 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-6">
        
        {/* Date Selector controls */}
        <div className="flex flex-wrap items-center gap-4">
          {activeTerm && (
            <div className="bg-neutral-950 border-2 border-neutral-800 px-4 py-1.5 text-[10px] font-black uppercase font-mono text-amber-400 tracking-wider">
              Active Term Tracker: {activeTerm.name}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 dashboard-header-date-controls">
            <Calendar className="text-amber-400 shrink-0" size={18} />
            <span className="text-[11px] font-black uppercase tracking-wider text-neutral-400">Target Audit Date:</span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={dateFilter}
                onChange={handleDateChange}
                className="bg-neutral-950 border-2 border-neutral-800 text-[11px] font-black text-white px-3 py-1.5 focus:border-amber-400 outline-none uppercase tracking-wider font-mono cursor-pointer"
              />
              {dateFilter !== getQuickDateStr('today') && (
                <button
                  type="button"
                  onClick={() => handleQuickDateSelect('today')}
                  className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider font-mono border-2 border-amber-400 bg-amber-400 hover:bg-amber-300 text-black hover:scale-105 active:scale-95 transition-all duration-200 transform cursor-pointer flex items-center gap-1.5"
                  title="Reset to current day's analytics"
                >
                  <RefreshCw size={11} className="stroke-[2.5]" />
                  <span>Reset to Today</span>
                </button>
              )}
            </div>
            {/* Quick Date buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleQuickDateSelect('today')}
                className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider font-mono border-2 transition-all duration-200 hover:scale-105 active:scale-95 transform cursor-pointer ${
                  dateFilter === getQuickDateStr('today')
                    ? 'bg-amber-400 border-amber-400 text-black'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600'
                }`}
                title="Filter to Dynamic Today"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleQuickDateSelect('yesterday')}
                className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider font-mono border-2 transition-all duration-200 hover:scale-105 active:scale-95 transform cursor-pointer ${
                  dateFilter === getQuickDateStr('yesterday')
                    ? 'bg-amber-400 border-amber-400 text-black'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600'
                }`}
                title="Filter to Yesterday"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => handleQuickDateSelect('last_friday')}
                className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider font-mono border-2 transition-all duration-200 hover:scale-105 active:scale-95 transform cursor-pointer ${
                  dateFilter === getQuickDateStr('last_friday')
                    ? 'bg-amber-400 border-amber-400 text-black'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600'
                }`}
                title="Filter to Last Friday"
              >
                Last Friday
              </button>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 bg-amber-400 rounded-none animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-neutral-400 font-mono">Real-Time Core Analytics Live</span>
          </div>
        </div>

        {/* Layout Switcher tabs */}
        <div className="flex flex-wrap bg-neutral-950 p-1.5 border-2 border-neutral-850 gap-1.5">
          <button
            onClick={() => setActiveLayout('bento')}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 ${
              activeLayout === 'bento' 
                ? 'bg-white text-black font-black' 
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900/40'
            }`}
          >
            <LayoutGrid size={14} /> Sleek Bento Grid
          </button>
          <button
            onClick={() => setActiveLayout('class-perf')}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 ${
              activeLayout === 'class-perf' 
                ? 'bg-white text-black font-black' 
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900/40'
            }`}
          >
            <Activity size={14} /> Classrooms Tracker
          </button>
          <button
            onClick={() => setActiveLayout('alerts-desk')}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 ${
              activeLayout === 'alerts-desk' 
                ? 'bg-white text-black font-black' 
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900/40'
            }`}
          >
            <AlertTriangle size={14} className={pendingAlerts.length > 0 ? 'text-amber-450 animate-bounce' : ''} /> Alerts Deck ({pendingAlerts.length})
          </button>
        </div>
      </div>

      {/* 5 Interactive KPI Cards - Heightened Design with Side Accent borders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">

        {/* Metric 1: Total Accumulated Revenue */}
        <div className="bg-neutral-900 border-4 border-neutral-800 border-l-amber-400 p-6 flex flex-col justify-between min-h-[145px] hover:border-r-neutral-700 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest font-mono">Accumulated Revenue</span>
            <Coins size={16} className="text-amber-400" />
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-black font-mono text-white tracking-tight leading-none" id="total-accumulated-revenue">GHC {totalVerifiedAccumulatedRevenue.toFixed(2)}</h3>
            
            {resetConfirming === 'none' ? (
              <div className="flex justify-between items-center mt-2.5">
                <p className="text-[9px] text-amber-500 uppercase font-black tracking-widest flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 bg-amber-400 animate-pulse" /> All verified dates
                </p>
                <button
                  type="button"
                  onClick={() => setResetConfirming('payments')}
                  className="text-[9px] font-mono font-black bg-red-950/40 hover:bg-red-900 border border-red-800/60 text-red-400 hover:text-white px-2 py-0.5 tracking-wider uppercase transition-colors cursor-pointer rounded-sm"
                  title="Reset collected revenue records to starting fresh"
                >
                  Reset To 0 GHC
                </button>
              </div>
            ) : resetConfirming === 'payments' ? (
              <div className="mt-2.5 space-y-1.5 bg-neutral-950 p-2 border border-dashed border-red-800 rounded-sm">
                <p className="text-[8px] font-mono font-bold text-red-400 uppercase tracking-wide leading-none">Confirm Reset?</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      clearAllPayments();
                      setResetConfirming('none');
                    }}
                    className="text-[8px] font-mono font-black bg-red-600 hover:bg-red-500 text-white uppercase px-1.5 py-0.5 rounded-xs cursor-pointer transition-colors"
                  >
                    Set GHC 0
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetConfirming('both')}
                    className="text-[8px] font-mono font-black bg-neutral-800 hover:bg-neutral-700 text-neutral-200 uppercase px-1.5 py-0.5 rounded-xs cursor-pointer transition-colors"
                    title="Also wipe sample student roster to load real students listing"
                  >
                    Wipe Pupils too
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetConfirming('none')}
                    className="text-[8px] font-mono text-neutral-400 hover:text-white uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2.5 space-y-1.5 bg-neutral-950 p-2 border border-dashed border-red-850 rounded-sm">
                <p className="text-[8px] font-mono font-bold text-red-400 uppercase tracking-wide leading-tight">Wipe pupil register & reset payments?</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      clearSampleStudents();
                      setResetConfirming('none');
                    }}
                    className="text-[8px] font-mono font-black bg-red-600 hover:bg-red-500 text-white uppercase px-1.5 py-0.5 rounded-xs cursor-pointer transition-colors"
                  >
                    Wipe Both
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetConfirming('none')}
                    className="text-[8px] font-mono text-neutral-400 hover:text-white uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Metric 2: Total Collected with Interactive Progress Ring */}
        <div className={`bg-neutral-900 border-4 border-neutral-800 ${dailyProgressPercent >= 100 ? 'border-l-emerald-400 shadow-[inset_y_0_12px_rgba(16,185,129,0.05)]' : 'border-l-amber-400'} p-6 flex flex-col justify-between min-h-[145px] hover:border-r-neutral-700 transition-all`}>
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest font-mono">Collections & progress</span>
            <Coins size={16} className={dailyProgressPercent >= 100 ? 'text-emerald-400 animate-bounce' : 'text-amber-400'} />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-3xl font-black font-mono text-white tracking-tight leading-none">GHC {stats.totalCollected.toFixed(2)}</h3>
              <div className="flex flex-col gap-1.5 mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider">GOAL GHC:</span>
                  <input
                    type="number"
                    value={dailyGoal}
                    onChange={(e) => handleUpdateDailyGoal(Number(e.target.value) || 0)}
                    className="w-14 bg-neutral-950 border border-neutral-800 text-amber-400 font-mono font-black text-[10px] px-1 py-0.5 text-center focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-sm"
                    min="1"
                    title="Change school daily collection target"
                  />
                </div>
                <div className="flex items-center gap-1 border border-neutral-800 bg-neutral-950 p-0.5 max-w-fit">
                  <button 
                    type="button"
                    onClick={() => handleUpdateDailyGoal(dailyGoal - 50)} 
                    title="Lower Daily Goal (-50 GHC)"
                    className="px-1.5 py-0.5 text-[9px] font-black text-neutral-400 hover:text-white hover:bg-neutral-900 font-mono border-r border-neutral-850 cursor-pointer"
                  >
                    -50
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleUpdateDailyGoal(dailyGoal + 50)} 
                    title="Raise Daily Goal (+50 GHC)"
                    className="px-1.5 py-0.5 text-[9px] font-black text-neutral-400 hover:text-white hover:bg-neutral-900 font-mono cursor-pointer"
                  >
                    +50
                  </button>
                </div>
                {dailyProgressPercent >= 100 && (
                  <span className="text-[8px] font-mono leading-none font-black text-emerald-400 tracking-widest uppercase bg-emerald-950/40 border border-emerald-900/60 px-1.5 py-1 max-w-fit flex items-center gap-1.5 animate-pulse mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Target Met
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className={`relative w-14 h-14 flex items-center justify-center ${dailyProgressPercent >= 100 ? 'animate-pulse' : ''}`}>
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="28"
                    cy="28"
                    r="22"
                    className="stroke-neutral-850 fill-none"
                    strokeWidth="4"
                  />
                  {/* Subtle inner shadow track */}
                  <circle
                    cx="28"
                    cy="28"
                    r="22"
                    className="stroke-neutral-800 fill-none"
                    strokeWidth="4"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r="22"
                    className={`fill-none transition-all duration-700 ${
                      dailyProgressPercent >= 100 
                        ? 'stroke-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]' 
                        : dailyProgressPercent >= 50 
                        ? 'stroke-amber-400' 
                        : 'stroke-orange-500'
                    }`}
                    strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 22}`}
                    strokeDashoffset={`${(2 * Math.PI * 22) * (1 - Math.min(dailyProgressPercent, 100) / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center font-mono leading-none">
                  <span className={`text-[10px] font-black ${dailyProgressPercent >= 100 ? 'text-emerald-400 drop-shadow-[0_0_2px_rgba(52,211,153,0.6)]' : 'text-neutral-200'}`}>
                    {Math.round(dailyProgressPercent)}%
                  </span>
                </div>
              </div>
              <span className={`text-[8px] font-black font-mono tracking-widest uppercase ${dailyProgressPercent >= 100 ? 'text-emerald-400' : 'text-neutral-500'}`}>Goal %</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Expected vs Actual Collection Rate */}
        <div className="bg-neutral-900 border-4 border-neutral-800 border-l-white p-6 flex flex-col justify-between min-h-[145px] hover:border-r-neutral-700 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest font-mono">Collection Rate</span>
            <TrendingUp size={16} className="text-white" />
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="space-y-1">
              <h3 className="text-3xl font-black font-mono text-white tracking-tight leading-none">{customCollectionRate.toFixed(1)}%</h3>
              <div className="flex flex-col gap-1.5 mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider">Goal GHC:</span>
                  <input
                    type="number"
                    value={dailyGoal}
                    onChange={(e) => handleUpdateDailyGoal(Number(e.target.value) || 0)}
                    className="w-14 bg-neutral-950 border border-neutral-800 text-amber-400 font-mono font-black text-[10px] px-1 py-0.5 text-center focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-sm"
                    min="1"
                    title="Change school daily collection target"
                  />
                </div>
                <div className="flex items-center gap-1 border border-neutral-800 bg-neutral-950 p-0.5 max-w-fit">
                  <button 
                    type="button"
                    onClick={() => handleUpdateDailyGoal(dailyGoal - 50)} 
                    title="Lower Daily Goal (-50 GHC)"
                    className="px-1.5 py-0.5 text-[9px] font-black text-neutral-400 hover:text-white hover:bg-neutral-900 font-mono border-r border-neutral-850 cursor-pointer"
                  >
                    -50
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleUpdateDailyGoal(dailyGoal + 50)} 
                    title="Raise Daily Goal (+50 GHC)"
                    className="px-1.5 py-0.5 text-[9px] font-black text-neutral-400 hover:text-white hover:bg-neutral-900 font-mono cursor-pointer"
                  >
                    +50
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              {/* D3-style SVG 'Daily Goal Progress' ring chart */}
              <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="19"
                    className="stroke-neutral-850 fill-none"
                    strokeWidth="4"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="19"
                    className="stroke-amber-400 fill-none transition-all duration-700"
                    strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 19}`}
                    strokeDashoffset={`${(2 * Math.PI * 19) * (1 - Math.min(customCollectionRate, 100) / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-mono">
                  <span className="text-[8px] font-black text-neutral-400">
                    {customCollectionRate.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Informational text tooltip next to the ring chart */}
              <div className="relative group/tooltip">
                <button
                  type="button"
                  className="p-1 text-neutral-500 hover:text-amber-400 transition-colors cursor-help"
                  aria-label="Daily Goal Info"
                >
                  <Info size={14} />
                </button>
                <div className="absolute right-0 bottom-full mb-2 w-48 p-3 bg-neutral-950 border border-neutral-850 text-neutral-300 text-[9px] tracking-wide uppercase font-mono leading-relaxed shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-150 z-50 pointer-events-none">
                  <span className="text-amber-400 font-black block mb-1">🎯 Daily Goal Progress</span>
                  The daily target is set to <span className="text-white font-extrabold">{dailyGoal} GHC</span>. You can input any value in the custom field to adjust the goal rate.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Metric 3: Total Paid Count */}
        <div className="bg-neutral-900 border-4 border-neutral-800 border-l-neutral-400 p-6 flex flex-col justify-between min-h-[145px] hover:border-r-neutral-700 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest font-mono">Paid Cohort</span>
            <Users size={16} className="text-neutral-400" />
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-black font-mono text-white tracking-tight leading-none">{stats.paidCount} PUPILS</h3>
            <p className="text-[9px] text-neutral-400 uppercase font-bold tracking-widest mt-2 block">
              Entered classrooms cleared
            </p>
          </div>
        </div>

        {/* Metric 4: Pending Alerts */}
        <div className="bg-neutral-900 border-4 border-neutral-800 border-l-red-500 p-6 flex flex-col justify-between min-h-[145px] hover:border-r-neutral-700 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest font-mono">Pending Gate Checks</span>
            <AlertTriangle size={16} className="text-red-500 animate-pulse" />
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-black font-mono text-red-500 tracking-tight leading-none">{stats.pendingCount} PENDING</h3>
            <p className="text-[9px] text-red-400 uppercase font-black tracking-widest mt-2 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 bg-red-500 animate-ping" /> Alert state active
            </p>
          </div>
        </div>
      </div>

      {/* Enrollment & Sync Health Double Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Total Enrollment Banner */}
        <div className="lg:col-span-3 bg-neutral-900 border-4 border-neutral-800 p-4 flex flex-col sm:flex-row justify-between items-center gap-4 hover:border-neutral-700 transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="bg-amber-400 text-black p-2 rounded-none">
              <Users size={18} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono">Student Registry Overview</span>
              <h4 className="text-sm font-black text-white uppercase tracking-wider">Total Enrollment</h4>
            </div>
          </div>
          <div className="bg-neutral-950 border-2 border-neutral-850 px-6 py-2 flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 font-mono">Registered across all classes:</span>
            <span className="text-xl font-black font-mono text-amber-400" id="total-enrollment-counter">{students?.length || 0} Pupils</span>
          </div>
        </div>

        {/* Sync Health Monitor Widget */}
        <div className={`lg:col-span-2 bg-neutral-900 border-4 border-neutral-800 ${pendingLocalEdits.length > 0 ? 'border-l-amber-500' : 'border-l-emerald-400'} p-4 flex flex-col justify-between gap-3 relative select-none hover:border-neutral-700 transition-all duration-300`}>
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-none ${pendingLocalEdits.length > 0 ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 font-mono">Ledger Node Health</span>
            </div>
            {storageMode === 'local' ? (
              <span className="bg-neutral-950 border border-amber-500/30 text-amber-400 text-[8px] font-mono px-2 py-0.5 uppercase tracking-wider font-extrabold rounded-none">
                Local Ledger Mode
              </span>
            ) : (
              <span className="bg-neutral-950 border border-emerald-500/30 text-emerald-400 text-[8px] font-mono px-2 py-0.5 uppercase tracking-wider font-extrabold rounded-none">
                Cloud Synced (Firestore)
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 mt-1">
            <div className="space-y-0.5 text-left">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                {pendingLocalEdits.length > 0 ? 'Pending Local Changes' : 'Ledger In Sync'}
              </h4>
              <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-wide">
                {pendingLocalEdits.length > 0 
                  ? `${pendingLocalEdits.length} edits not pushed to cloud` 
                  : '0 unsaved edits'
                }
              </p>
            </div>

            {pendingLocalEdits.length > 0 ? (
              <button
                type="button"
                disabled={syncStatus.loading}
                onClick={handleSyncNow}
                className="px-3 py-1.5 text-[9px] font-black uppercase tracking-wider font-mono border-2 border-amber-400 bg-amber-400 text-black hover:bg-amber-300 active:scale-95 transform cursor-pointer flex items-center gap-1.5 transition-all duration-200"
              >
                {syncStatus.loading ? (
                  <RefreshCw size={11} className="animate-spin stroke-[2.5]" />
                ) : (
                  <ArrowRightLeft size={11} className="stroke-[2.5]" />
                )}
                <span>{syncStatus.loading ? 'Syncing...' : 'Push & Sync'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-450 font-mono text-[9px] font-bold uppercase tracking-wider bg-emerald-950/20 border border-emerald-900/45 px-2 py-1">
                <Check size={11} className="stroke-[3] text-emerald-400" />
                <span className="text-emerald-400">Secured</span>
              </div>
            )}
          </div>

          {/* Micro-logs / warnings of pending edits */}
          {pendingLocalEdits.length > 0 && (
            <div className="mt-1 border-t border-dashed border-neutral-800 pt-2 space-y-1">
              <div className="text-[8px] font-mono font-bold text-neutral-500 uppercase flex items-center gap-1">
                <AlertTriangle size={9} className="text-amber-500 shrink-0" />
                <span className="text-left leading-none">Unsynced offline modifications (browser-bound):</span>
              </div>
              <div className="bg-neutral-950 px-2 py-1.5 font-mono text-[9px] text-neutral-400 uppercase tracking-wide flex flex-col gap-1 max-h-[50px] overflow-y-auto rounded-none">
                {pendingLocalEdits.slice(0, 2).map((edit) => (
                  <div key={edit.id} className="flex justify-between items-center gap-2 truncate">
                    <span className="truncate border-l-2 border-amber-500 pl-1.5 text-[8.5px] leading-none text-left">{edit.description}</span>
                    <span className="text-[8px] text-neutral-600 shrink-0 font-medium font-mono">{edit.timestamp}</span>
                  </div>
                ))}
                {pendingLocalEdits.length > 2 && (
                  <span className="text-[8px] text-neutral-600 font-bold tracking-wider leading-none text-left">
                    + {pendingLocalEdits.length - 2} more log operations...
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Sync status toast overlay messages inside the widget */}
          {syncStatus.error && (
            <div className="mt-1.5 bg-red-950/40 border border-red-950 p-1.5 flex items-start gap-1.5 text-red-400 text-[9px] uppercase font-mono tracking-wider">
              <span className="font-extrabold shrink-0">ERR:</span>
              <span className="flex-1 text-left">{syncStatus.error}</span>
            </div>
          )}
          {syncStatus.successMessage && (
            <div className="mt-1.5 bg-emerald-950/40 border border-emerald-950 p-1.5 flex items-start gap-1.5 text-emerald-400 text-[9px] uppercase font-mono tracking-wider">
              <Check size={10} className="text-emerald-400 shrink-0 mt-0.5" />
              <span className="flex-1 text-left text-emerald-400">{syncStatus.successMessage}</span>
            </div>
          )}
        </div>

      </div>

      {/* Main Dynamic Workspace Presentation based on tab selection */}
      <AnimatePresence mode="wait">
        {activeLayout === 'bento' && (
          <motion.div
            key="bento-layout"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Top row: Trend Graphics & Category split Bento block */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Cash Flow Trends Graph Block */}
              <div className="bg-neutral-900 border-4 border-neutral-800 p-8 col-span-1 lg:col-span-2 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black uppercase italic text-white tracking-tight">Ledger Cash Flow Analytics</h3>
                    <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mt-1">Weekly financial status logs</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    {/* View Switcher: Recharts vs Custom SVG */}
                    <div className="flex bg-neutral-950 p-1 border border-neutral-800 max-w-fit">
                      <button
                        onClick={() => setChartView('recharts')}
                        className={`px-3 py-1 text-[9px] font-black font-mono uppercase tracking-widest transition-colors cursor-pointer ${
                          chartView === 'recharts' ? 'bg-amber-400 text-black font-extrabold' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        Target Goal (Recharts)
                      </button>
                      <button
                        onClick={() => setChartView('trends')}
                        className={`px-3 py-1 text-[9px] font-black font-mono uppercase tracking-widest transition-colors cursor-pointer ${
                          chartView === 'trends' ? 'bg-amber-400 text-black font-extrabold' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        Trend Curve
                      </button>
                    </div>

                    {/* Interactive toggle between Revenue GHC values and transaction count volumes */}
                    {chartView === 'trends' && (
                      <div className="flex bg-neutral-950 p-1 border border-neutral-800 max-w-fit">
                        <button
                          onClick={() => setChartMetric('revenue')}
                          className={`px-3 py-1 text-[9px] font-black font-mono uppercase tracking-widest transition-colors cursor-pointer ${
                            chartMetric === 'revenue' ? 'bg-amber-400 text-black font-extrabold' : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          Revenue (GHC)
                        </button>
                        <button
                          onClick={() => setChartMetric('volume')}
                          className={`px-3 py-1 text-[9px] font-black font-mono uppercase tracking-widest transition-colors cursor-pointer ${
                            chartMetric === 'volume' ? 'bg-amber-400 text-black font-extrabold' : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          Tx Volume
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Plot Area */}
                <div className="h-68 w-full relative pt-6 bg-neutral-950 border-2 border-neutral-850 p-4">
                  {chartView === 'recharts' ? (
                    last7DaysData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={last7DaysData}
                          margin={{ top: 15, right: 15, left: -20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                          <XAxis 
                            dataKey="formattedDate" 
                            stroke="#737373" 
                            fontSize={9} 
                            fontFamily="JetBrains Mono, monospace"
                            fontWeight="bold"
                            tickLine={false}
                            axisLine={false}
                            dy={8}
                          />
                          <YAxis 
                            stroke="#737373" 
                            fontSize={9} 
                            fontFamily="JetBrains Mono, monospace"
                            fontWeight="bold"
                            tickLine={false}
                            axisLine={false}
                            dx={-5}
                          />
                          <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#fbbf24', strokeWidth: 1, strokeDasharray: '3 3' }} />
                          <Legend 
                            verticalAlign="bottom"
                            height={24}
                            iconType="square" 
                            iconSize={8}
                            wrapperStyle={{ 
                              fontSize: '9px', 
                              fontWeight: '900', 
                              textTransform: 'uppercase', 
                              fontFamily: 'JetBrains Mono, monospace', 
                              color: '#a3a3a3', 
                              paddingTop: '15px' 
                            }} 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="Total Collected" 
                            name="Total Collected"
                            stroke="#fbbf24" 
                            strokeWidth={3} 
                            activeDot={{ r: 6, strokeWidth: 1 }}
                            dot={{ r: 3, fill: '#fbbf24', strokeWidth: 1 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="Target Goal" 
                            name="Target Goal"
                            stroke="#ffffff" 
                            strokeWidth={2} 
                            strokeDasharray="4 4"
                            activeDot={{ r: 5, strokeWidth: 1 }}
                            dot={{ r: 2, fill: '#ffffff', strokeWidth: 1 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-neutral-600 text-xs font-bold uppercase tracking-widest font-mono">
                        No term days configured.
                      </div>
                    )
                  ) : trends.length > 0 ? (
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                      {/* Grid Horizontal Guide Lines */}
                      <line x1="0" y1="180" x2="100%" y2="180" stroke="#1c1c1c" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="0" y1="120" x2="100%" y2="120" stroke="#1c1c1c" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="0" y1="60" x2="100%" y2="60" stroke="#1c1c1c" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="0" y1="5" x2="100%" y2="5" stroke="#262626" strokeWidth="1.5" />

                      {/* Render line path nodes */}
                      {trends.map((t, idx) => {
                        const xPercent = trends.length > 1 ? (idx / (trends.length - 1)) * 100 : 50;
                        const targetVal = chartMetric === 'revenue' ? t.amount : t.transactions;
                        const normalizedY = 195 - (targetVal / maxTrendAmount) * 165; 

                        return (
                          <g key={t.date} className="group cursor-pointer">
                            {/* Vertical Hover Guides */}
                            <line 
                              x1={`${xPercent}%`} 
                              y1="5" 
                              x2={`${xPercent}%`} 
                              y2="200" 
                              stroke="#1f1f1f" 
                              strokeWidth="1.5" 
                              className="group-hover:stroke-neutral-850 transition-colors"
                            />
                            
                            {/* Visual Highlight column trigger bars */}
                            <rect
                              x={`calc(${xPercent}% - 14px)`}
                              y={normalizedY}
                              width="28"
                              height={200 - normalizedY}
                              fill={chartMetric === 'revenue' ? '#fbbf24' : '#ffffff'}
                              className="opacity-[0.03] hover:opacity-100 group-hover:opacity-[0.15] transition-opacity"
                            />

                            {/* Node points */}
                            <circle 
                              cx={`${xPercent}%`} 
                              cy={normalizedY} 
                              r="7" 
                              fill={chartMetric === 'revenue' ? '#fbbf24' : '#ffffff'} 
                              className="stroke-neutral-900 stroke-2 group-hover:scale-125 transition-transform"
                            />

                            {/* Dynamic Text value tags */}
                            <text
                              x={`${xPercent}%`}
                              y={normalizedY - 14}
                              textAnchor="middle"
                              className="text-[10px] font-black font-semi font-mono fill-white tracking-tighter"
                            >
                              {chartMetric === 'revenue' ? `GHC ${t.amount}` : `${t.transactions} tx`}
                            </text>

                            {/* Horizontal timeline labels */}
                            <text
                              x={`${xPercent}%`}
                              y="218"
                              textAnchor="middle"
                              className="text-[9px] font-black font-mono fill-neutral-500 uppercase tracking-widest"
                            >
                              {t.formattedDate}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  ) : (
                    <div className="h-full flex items-center justify-center text-neutral-600 text-xs font-bold uppercase tracking-widest">
                      Ledger data is empty.
                    </div>
                  )}
                </div>
              </div>

              {/* Category Collections split bento card */}
              <div className="bg-neutral-900 border-4 border-neutral-800 p-8 flex flex-col justify-between space-y-6">
                <div>
                  <h3 className="text-xl font-black uppercase italic text-white tracking-tight">Balanced Cohort Ratios</h3>
                  <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mt-1 font-bold">Aggregate payment shares</p>
                </div>

                <div className="space-y-4 py-2">
                  {(['Pre-school', 'Primary', 'JHS'] as SchoolCategory[]).map(cat => {
                    const amount = stats.byCategory[cat] || 0;
                    const percent = stats.totalCollected > 0 ? (amount / stats.totalCollected) * 100 : 0;

                    return (
                      <div key={cat} className="space-y-2 bg-neutral-950 border-2 border-neutral-850 p-4">
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 ${cat === 'Pre-school' ? 'bg-amber-400' : cat === 'Primary' ? 'bg-white' : 'bg-neutral-500'}`} /> {cat}
                          </span>
                          <span className="font-mono text-amber-400 font-extrabold text-[12px]">GHC {amount.toFixed(2)}</span>
                        </div>
                        
                        <div className="w-full bg-neutral-900 h-2 border border-neutral-850">
                          <div 
                            className={`h-full ${cat === 'Pre-school' ? 'bg-amber-400' : cat === 'Primary' ? 'bg-white' : 'bg-neutral-500'} transition-all duration-500`} 
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-neutral-500 font-mono uppercase mt-1">
                          <span>Verified weight quota</span>
                          <span className="font-black text-neutral-400">{percent.toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-neutral-950 p-4 border border-neutral-850 text-center">
                  <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest font-mono">
                    Total: GHC {stats.totalCollected.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Row: Checkpoints preview and alert priorities */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Class Performance Tracker table overview */}
              <div className="bg-neutral-900 border-4 border-neutral-800 p-8 col-span-1 lg:col-span-2 space-y-6">
                <div className="flex justify-between items-center pb-2 border-b-2 border-neutral-850">
                  <div>
                    <h3 className="text-xl font-black uppercase italic text-white tracking-tight">Teacher Performance Dockets</h3>
                    <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mt-1">Active class checking rates</p>
                  </div>
                  <button 
                    onClick={() => setActiveLayout('class-perf')}
                    className="text-[9px] font-black font-mono uppercase tracking-wider text-amber-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    Manage Classrooms <ArrowRightLeft size={10} />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b-2 border-neutral-800 text-[10px] font-black text-neutral-400 uppercase tracking-widest font-mono">
                        <th className="py-2.5">Class level</th>
                        <th className="py-2.5">Staff In-Charge</th>
                        <th className="py-2.5">Cleared Pupils</th>
                        <th className="py-2.5 text-right">Sum (GHC)</th>
                        <th className="py-2.5 text-right">Coverage Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-850">
                      {teacherMetrics.slice(0, 5).map((met) => (
                        <tr key={met.className} className="hover:bg-neutral-950/20">
                          <td className="py-3.5 font-black font-mono text-white text-sm">{met.className}</td>
                          <td className="py-3.5 font-sans font-black text-neutral-300 uppercase tracking-wide text-xs">{met.teacherName}</td>
                          <td className="py-3.5 font-mono text-neutral-400 font-bold">
                            {met.paidCount} / {met.studentsCount}
                          </td>
                          <td className="py-3.5 text-right font-black font-mono text-white">
                            {met.collected.toFixed(2)}
                          </td>
                          <td className="py-3.5 text-right">
                            <span className={`inline-block px-2.5 py-1 text-[10px] font-black font-mono tracking-widest uppercase ${
                              met.rate > 85 ? 'bg-emerald-950 border border-emerald-800 text-emerald-400' :
                              met.rate > 50 ? 'bg-amber-950 border border-amber-800 text-amber-450' : 'bg-red-950 border border-red-800 text-red-450'
                            }`}>
                              {met.rate.toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Alert Center preview list */}
              <div className="bg-neutral-900 border-4 border-neutral-800 p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-1 pb-2 border-b-2 border-neutral-850">
                  <h3 className="text-xl font-black uppercase italic text-white tracking-tight flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-red-500 shrink-0" /> Critical Warnings
                  </h3>
                  <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest font-bold">Pupils lacking daily clear keys</p>
                </div>

                {pendingAlerts.length === 0 ? (
                  <div className="py-12 text-center text-neutral-500 space-y-2 flex-1 flex flex-col justify-center items-center">
                    <Check className="text-amber-400" size={28} />
                    <p className="text-sm font-black uppercase tracking-wider text-white">No active errors</p>
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">100% daily compliance</p>
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[290px] overflow-y-auto flex-1 py-1 pr-1">
                    {pendingAlerts.slice(0, 4).map((st) => (
                      <div key={st.studentId} className="flex justify-between items-center bg-neutral-950 border-2 border-neutral-855 p-3.5">
                        <div className="space-y-1 overflow-hidden">
                          <p className="text-xs font-black text-white uppercase tracking-tight truncate max-w-[140px]">{st.studentName}</p>
                          <div className="flex gap-2 items-center text-[9px] text-neutral-500 font-mono font-black uppercase tracking-wide">
                            <span className="text-amber-400">{st.class}</span>
                            <span>•</span>
                            <span className="truncate">GDN: {st.guardianPhone}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDialGuardian(st.studentId, st.guardianPhone)}
                          disabled={notifiedStudents[st.studentId]}
                          className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border-2 transition-all cursor-pointer ${
                            notifiedStudents[st.studentId] 
                              ? 'bg-amber-400 border-amber-400 text-black' 
                              : 'bg-neutral-950 border-neutral-800 hover:border-neutral-600 text-neutral-300 animate-pulse'
                          }`}
                        >
                          {notifiedStudents[st.studentId] ? 'DIALING...' : 'DIAL GDN'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setActiveLayout('alerts-desk')}
                  className="w-full text-center bg-neutral-950 border-2 border-neutral-800 text-stone-300 hover:text-white hover:border-neutral-600 text-[10px] py-2.5 uppercase font-black tracking-widest"
                >
                  View All Alerts Desk
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Perspective Tab 2: Full classroom list performance tracker with customizable search */}
        {activeLayout === 'class-perf' && (
          <motion.div
            key="class-perf-layout"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="bg-neutral-900 border-4 border-neutral-800 p-8 space-y-6"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b-2 border-neutral-800">
              <div>
                <h3 className="text-2xl font-black uppercase italic text-white tracking-tight">Active Classroom Gates Tracker</h3>
                <p className="text-xs text-neutral-400 font-bold mt-1">Search or analyze response rates across schools</p>
              </div>

              {/* Incremental search search input bar */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-3.5 text-neutral-500" size={14} />
                <input
                  type="text"
                  placeholder="Query class level or staff name..."
                  value={classPerfSearch}
                  onChange={(e) => setClassPerfSearch(e.target.value)}
                  className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 pl-10 pr-4 text-xs font-mono outline-none text-white focus:border-amber-400 placeholder:text-neutral-700 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredTeacherMetrics.length === 0 ? (
                <div className="col-span-full py-16 text-center text-neutral-600 font-black uppercase tracking-widest text-xs">
                  No classroom records match query.
                </div>
              ) : (
                filteredTeacherMetrics.map((met) => {
                  const rateColor = met.rate > 85 
                    ? 'text-emerald-400 border-emerald-950 bg-emerald-950/25' 
                    : met.rate > 50 
                      ? 'text-amber-400 border-amber-950 bg-amber-950/25' 
                      : 'text-red-500 border-red-950 bg-red-950/25';
                  
                  return (
                    <div key={met.className} className="bg-neutral-950 border-2 border-neutral-850 p-6 flex flex-col justify-between gap-5 hover:border-neutral-700 transition">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest bg-neutral-900 border border-neutral-800 px-2 py-0.5 font-mono">
                            {met.category} LEVEL
                          </span>
                          <h4 className="text-2xl font-black text-white font-mono leading-none pt-2">{met.className} Checkpoint</h4>
                        </div>
                        <span className={`text-lg font-black font-mono border px-3 py-1.5 ${rateColor}`}>
                          {met.rate.toFixed(0)}%
                        </span>
                      </div>

                      <div className="space-y-3.5 py-1 border-t border-b border-neutral-850">
                        <div className="flex justify-between text-xs font-bold font-mono">
                          <span className="text-neutral-500 uppercase tracking-wider">Gate Teacher:</span>
                          <span className="text-white uppercase tracking-wide">{met.teacherName}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold font-mono">
                          <span className="text-neutral-500 uppercase tracking-wider">Payments Cleared:</span>
                          <span className="text-white">{met.paidCount} pupils of {met.studentsCount}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold font-mono">
                          <span className="text-neutral-500 uppercase tracking-wider">Total Fund sum:</span>
                          <span className="text-white font-black">GHC {met.collected.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] text-neutral-500 font-mono uppercase tracking-wider">
                          <span>Progress Gauge</span>
                          <span>{met.rate.toFixed(1)}% Completed</span>
                        </div>
                        <div className="w-full bg-neutral-900 h-2 border border-neutral-850">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              met.rate > 85 ? 'bg-emerald-400' : met.rate > 50 ? 'bg-amber-400' : 'bg-red-500'
                            }`}
                            style={{ width: `${met.rate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}

        {/* Perspective Tab 3: Detailed Alerts desk for high-priority uncollected payments */}
        {activeLayout === 'alerts-desk' && (
          <motion.div
            key="alerts-desk-layout"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="bg-neutral-900 border-4 border-neutral-800 p-8 space-y-6"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b-2 border-neutral-800">
              <div>
                <h3 className="text-2xl font-black uppercase italic text-white tracking-tight flex items-center gap-3">
                  <span className="w-3 h-3 bg-red-500 animate-ping" /> Guardian Alerts Dispatcher Console
                </h3>
                <p className="text-xs text-neutral-400 font-bold mt-1">Manage, notify, or dial parents of unverified pupil entries</p>
              </div>

              {/* Incremental alert list search */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-3.5 text-neutral-500" size={14} />
                <input
                  type="text"
                  placeholder="Query pupil name or grade level..."
                  value={alertSearch}
                  onChange={(e) => setAlertSearch(e.target.value)}
                  className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 pl-10 pr-4 text-xs font-mono outline-none text-white focus:border-amber-400 placeholder:text-neutral-700 font-bold"
                />
              </div>
            </div>

            {filteredAlerts.length === 0 ? (
              <div className="py-20 text-center bg-neutral-950 border-2 border-neutral-850 space-y-3">
                <Check className="mx-auto text-amber-400" size={36} />
                <h4 className="text-lg font-black uppercase tracking-wider text-white">Workspace Cleared</h4>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">No unverified pupils lack ledger keys today.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAlerts.map((st) => (
                  <div key={st.studentId} className="bg-neutral-950 border-2 border-neutral-850 p-6 flex flex-col justify-between gap-5 hover:border-neutral-700 transition">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black bg-red-950 border border-red-800 text-red-400 px-2 py-0.5 uppercase tracking-widest font-mono">
                          {st.class} Checkpoint
                        </span>
                        <h4 className="text-lg font-black text-white uppercase tracking-tight leading-none pt-2">{st.studentName}</h4>
                      </div>
                      <span className="text-[10px] text-neutral-500 font-bold tracking-widest uppercase font-mono">#{st.studentId.substring(4, 9)}</span>
                    </div>

                    <div className="bg-neutral-900 border border-neutral-850 p-3.5 space-y-2 text-xs font-mono">
                      <div className="flex justify-between font-bold">
                        <span className="text-neutral-500 uppercase">Primary Category:</span>
                        <span className="text-white uppercase font-bold">{st.category}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span className="text-neutral-500 uppercase">Registered Contact:</span>
                        <span className="text-amber-400 select-all font-mono font-black">{st.guardianPhone}</span>
                      </div>
                      <div className="flex justify-between font-bold text-red-405">
                        <span className="text-red-500 uppercase">Alert reason:</span>
                        <span className="text-red-450 uppercase font-bold">Unpaid daily lock (GHC 5.00)</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDialGuardian(st.studentId, st.guardianPhone)}
                      disabled={notifiedStudents[st.studentId]}
                      className={`w-full text-center text-xs font-black uppercase tracking-widest py-3.5 border-2 transition-all cursor-pointer ${
                        notifiedStudents[st.studentId]
                          ? 'bg-amber-400 border-amber-400 text-black font-black'
                          : 'bg-neutral-950 border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900/50 text-white'
                      }`}
                    >
                      {notifiedStudents[st.studentId] ? (
                        <span className="flex items-center justify-center gap-1.5">
                          Dialing secure link... Dial OK
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1.5">
                          <PhoneCall size={12} /> Contact Parent Guardian
                        </span>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
