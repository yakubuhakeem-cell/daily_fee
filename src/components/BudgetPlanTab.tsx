import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Target, 
  Plus, 
  Trash2, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Coins, 
  Sparkles, 
  Check, 
  Clock,
  HelpCircle,
  PiggyBank,
  ChevronRight,
  Lightbulb,
  Lock,
  Compass,
  BarChart3,
  CalendarDays,
  Activity,
  History,
  ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BudgetTarget } from '../types';

export function BudgetPlanTab() {
  const { 
    payments, 
    budgetTargets, 
    addBudgetTarget, 
    updateBudgetTarget, 
    deleteBudgetTarget,
    playFeedbackSound,
    systemSettings,
    theme
  } = useApp();

  const [itemName, setItemName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [savedPercentage, setSavedPercentage] = useState('20');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Infrastructure');
  const [customCategory, setCustomCategory] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All Categories');
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [historyLimit, setHistoryLimit] = useState(5);

  const currencySymbol = systemSettings?.currencyCode || 'GHC';

  // Math calculation
  const totalFeesReceived = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const totalSchoolDaysWithFees = new Set(payments.map(p => p.date)).size;

  const firstActiveTarget = budgetTargets.find(t => !t.completed) || budgetTargets[0];
  const activeSelectedTarget = budgetTargets.find(t => t.id === selectedTargetId) || firstActiveTarget;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !targetAmount || !savedPercentage) return;

    const amountNum = parseFloat(targetAmount);
    const percentNum = parseFloat(savedPercentage);

    if (isNaN(amountNum) || amountNum <= 0) return;
    if (isNaN(percentNum) || percentNum < 1 || percentNum > 100) return;

    const finalCategory = category === 'Custom' ? (customCategory.trim() || 'Other') : category;

    try {
      await addBudgetTarget(
        itemName.trim(),
        amountNum,
        percentNum,
        description.trim() || undefined,
        finalCategory
      );
      playFeedbackSound();
      setItemName('');
      setTargetAmount('');
      setSavedPercentage('20');
      setDescription('');
      setCategory('Infrastructure');
      setCustomCategory('');
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleComplete = async (target: BudgetTarget) => {
    try {
      await updateBudgetTarget({
        ...target,
        completed: !target.completed
      });
      playFeedbackSound();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (target: BudgetTarget) => {
    try {
      await updateBudgetTarget({
        ...target,
        active: !target.active
      });
      playFeedbackSound();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this target? This action is irreversible.")) {
      try {
        await deleteBudgetTarget(id);
        playFeedbackSound();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Filter list
  const filteredTargets = budgetTargets.filter(target => {
    // 1. Completion filter
    if (activeFilter === 'active' && target.completed) return false;
    if (activeFilter === 'completed' && !target.completed) return false;

    // 2. Category filter
    if (selectedCategoryFilter !== 'All Categories') {
      const targetCat = target.category || 'Uncategorized';
      if (targetCat !== selectedCategoryFilter) return false;
    }
    return true;
  });

  return (
    <div id="budget-plan-viewport" className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Upper header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-neutral-900 p-6 rounded-xl border border-neutral-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-400 text-black font-black uppercase tracking-tight rounded font-mono text-xs">
              MANDATE 4
            </span>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-amber-400" /> Administrative Action Plans & Target Budgets
            </h2>
          </div>
          <p className="text-xs text-neutral-400 max-w-3xl">
            Designate strategic items to purchase (e.g., School Bus, Classroom Projector, General Renovations) by allocating a custom saving ratio from daily portal collections. Live savings update instantly as check-ins are stamped.
          </p>
        </div>

        <button
          onClick={() => {
            playFeedbackSound();
            setShowAddForm(!showAddForm);
          }}
          className="flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-black px-4 py-2.5 rounded-lg text-xs font-black uppercase font-mono tracking-wider transition-all shadow-md self-start md:self-auto shrink-0"
        >
          {showAddForm ? 'Cancel Form' : 'New Action Plan'}
          <Plus className={`w-4 h-4 transition-transform duration-200 ${showAddForm ? 'rotate-45' : ''}`} />
        </button>
      </div>

      {/* Grid of Aggregate Live Portal Revenue */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Total revenue */}
        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl flex items-center justify-between shadow">
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono font-black">
              Total Portal Fees Received
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight">
              {currencySymbol} {totalFeesReceived.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Live ledger collection entries
            </div>
          </div>
          <div className="p-3 bg-amber-405/10 rounded-lg text-amber-400 border border-amber-400/20">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        {/* School Days Stamp */}
        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl flex items-center justify-between shadow">
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono font-black">
              Check-In Stamping Days
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight">
              {totalSchoolDaysWithFees} Days
            </div>
            <div className="text-[10px] text-neutral-400 font-mono font-bold">
              Aggregated from payments dates lists
            </div>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Allocated Items Count */}
        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl flex items-center justify-between shadow">
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono font-black">
              Pending Strategy Targets
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight">
              {budgetTargets.filter(t => !t.completed).length} items
            </div>
            <div className="text-[10px] text-amber-400 font-mono font-bold">
              {budgetTargets.filter(t => t.completed).length} items achieved successfully 🎉
            </div>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-neutral-900 border-2 border-amber-400 rounded-xl p-6 shadow-2xl relative overflow-hidden"
          >
            {/* Ambient visual badge */}
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-32 h-32 bg-amber-400/5 rounded-full blur-2xl" />

            <div className="flex items-center gap-2 mb-4 border-b border-neutral-805 pb-3">
              <Target className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Configure Strategic Purchase Goal
                </h3>
                <p className="text-[10px] text-neutral-400">
                  Target items automatically project prospective savings based on all cumulative daily entries.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-mono text-neutral-400 font-black mb-1.5">
                    Target Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g. mercedes bus"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded p-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-mono text-neutral-400 font-black mb-1.5">
                    Target Amount Required ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="e.g. 200000"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded p-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-mono text-neutral-400 font-black mb-1.5">
                    Reserved Saving Portion (%) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="1"
                      max="100"
                      value={savedPercentage}
                      onChange={(e) => setSavedPercentage(e.target.value)}
                      placeholder="e.g. 20"
                      className="w-full bg-neutral-950 border border-neutral-700 rounded p-2.5 text-xs text-white focus:outline-none focus:border-amber-400 pr-10 transition-colors"
                    />
                    <span className="absolute right-3 top-2.5 text-neutral-500 text-xs font-mono font-bold">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-mono text-neutral-400 font-black mb-1.5">
                    Strategic Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => {
                      playFeedbackSound();
                      setCategory(e.target.value);
                    }}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded p-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors"
                  >
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Staff Bonus">Staff Bonus</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Supplies">Supplies</option>
                    <option value="Custom">Custom / Other...</option>
                  </select>
                </div>

              </div>

              {category === 'Custom' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-1.5"
                >
                  <label className="block text-[10px] uppercase tracking-widest font-mono text-neutral-400 font-black mb-1">
                    Custom Category Name *
                  </label>
                  <input
                    type="text"
                    required={category === 'Custom'}
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="e.g. Technology Upgrades"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded p-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </motion.div>
              )}

              <div>
                <label className="block text-[10px] uppercase tracking-widest font-mono text-neutral-400 font-black mb-1.5">
                  Item Description & Strategic Justification (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Replacing old, highly inefficient transit methods to double enrollment across distant Sawla sub-districts."
                  className="w-full bg-neutral-950 border border-neutral-700 rounded p-2.5 text-xs text-white focus:outline-none focus:border-amber-400 h-20 transition-colors"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    playFeedbackSound();
                    setShowAddForm(false);
                  }}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 rounded text-xs font-mono font-bold transition-all"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-black rounded text-xs font-black uppercase font-mono tracking-wider transition-all shadow-md"
                >
                  Create Plan Item
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Saving Target Visualizer & Projection Chart */}
      {budgetTargets.length > 0 && (
        <div id="goal-performance-analytics-console" className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase tracking-wider font-mono text-amber-400 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400" /> Goal Performance Analytics & Forecaster
              </h3>
              <p className="text-xs text-neutral-400">
                Analyze accumulated savings, progress charts, and prospective check-in timelines for any specific administrative item.
              </p>
            </div>

            {/* Target Selector Dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="target-selector" className="text-[10px] text-neutral-400 font-mono font-bold uppercase whitespace-nowrap">
                Select Option:
              </label>
              <select
                id="target-selector"
                value={activeSelectedTarget?.id || ''}
                onChange={(e) => {
                  playFeedbackSound();
                  setSelectedTargetId(e.target.value);
                }}
                className="bg-neutral-950 border border-neutral-700 hover:border-amber-400 rounded px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none transition-colors"
              >
                {budgetTargets.map(target => (
                  <option key={target.id} value={target.id}>
                    {target.itemName} ({target.savedPercentage}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {activeSelectedTarget && (() => {
            const ratio = activeSelectedTarget.savedPercentage / 100;
            const progress = totalFeesReceived * ratio;
            const target = activeSelectedTarget.targetAmount;
            const fraction = progress / target;
            const percent = Math.min(100, Math.floor(fraction * 100));
            const remaining = Math.max(0, target - progress);
            
            // Calculate school day projections
            const avgDaily = totalSchoolDaysWithFees > 0 ? (totalFeesReceived / totalSchoolDaysWithFees) : 250;
            const dailyContrib = avgDaily * ratio;
            const daysLeft = dailyContrib > 0 ? Math.ceil(remaining / dailyContrib) : 0;

            // Gauge calculations for SVG
            const radius = 70;
            const strokeWidth = 14;
            const circumference = 2 * Math.PI * radius;
            const arcLength = circumference * 0.75; // 270 degrees arc
            const strokeDashoffset = arcLength - (Math.min(100, percent) / 100) * arcLength;
            const rotationAngle = 135; // centered symmetrical gauge

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                
                {/* Left Column: Radial Indicator Gauge Chart */}
                <div id="radial-gauge-container" className="lg:col-span-4 flex flex-col items-center justify-center bg-neutral-950/40 p-6 rounded-xl border border-neutral-805/40 text-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-t from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  
                  <div className="relative w-44 h-44 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 180 180">
                      {/* Background Track Arc */}
                      <circle
                        cx="90"
                        cy="90"
                        r={radius}
                        fill="transparent"
                        stroke="#1f1f1f"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${arcLength} ${circumference}`}
                        strokeLinecap="round"
                        style={{
                          transform: `rotate(${rotationAngle}deg)`,
                          transformOrigin: '50% 50%',
                        }}
                      />
                      {/* Animated Progress Arc */}
                      <motion.circle
                        cx="90"
                        cy="90"
                        r={radius}
                        fill="transparent"
                        stroke={activeSelectedTarget.completed ? "#10b981" : percent >= 100 ? "#fbbf24" : "url(#amber-radial-gradient)"}
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${arcLength} ${circumference}`}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        style={{
                          transform: `rotate(${rotationAngle}deg)`,
                          transformOrigin: '50% 50%',
                        }}
                        initial={{ strokeDashoffset: arcLength }}
                        animate={{ strokeDashoffset: strokeDashoffset }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                      />
                      <defs>
                        <linearGradient id="amber-radial-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#fbbf24" />
                        </linearGradient>
                      </defs>
                    </svg>

                    {/* Gauge Inner Font Display */}
                    <div className="absolute flex flex-col items-center justify-center space-y-0.5">
                      <motion.span 
                        className="text-3xl font-black font-mono tracking-tight text-white"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.5, type: 'spring' }}
                      >
                        {percent}%
                      </motion.span>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400 font-mono">
                        Saved
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs font-black uppercase tracking-wider text-neutral-300 font-mono">
                       {activeSelectedTarget.itemName}
                    </h4>
                    <p className="text-[10px] text-neutral-400 max-w-[200px]">
                      Ratio allocation of <span className="text-amber-400 font-mono font-bold">{activeSelectedTarget.savedPercentage}%</span> of total daily school intake.
                    </p>
                  </div>
                </div>

                {/* Right Column: Numeric Milestones & Projective Timeline */}
                <div className="lg:col-span-8 flex flex-col gap-5 justify-between">
                  
                  {/* Performance stats bento strips */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    
                    <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-805">
                      <div className="text-[9px] uppercase tracking-wider text-neutral-500 font-mono font-bold mb-1">
                        Current Savings Pot
                      </div>
                      <div className="text-lg font-black text-emerald-400 font-mono">
                        {currencySymbol} {progress.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[9px] text-neutral-400 mt-1">
                        Deducted from registered entries
                      </div>
                    </div>

                    <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-805">
                      <div className="text-[9px] uppercase tracking-wider text-neutral-500 font-mono font-bold mb-1">
                        Funding Shortfall
                      </div>
                      <div className="text-lg font-black text-amber-500 font-mono">
                        {remaining === 0 ? 'Fulfillable!' : `${currencySymbol} ${remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </div>
                      <div className="text-[9px] text-neutral-400 mt-1">
                        Remaining amount required
                      </div>
                    </div>

                    <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-805 col-span-2 sm:col-span-1">
                      <div className="text-[9px] uppercase tracking-wider text-neutral-500 font-mono font-bold mb-1">
                        Academic Days Extrapolation
                      </div>
                      <div className="text-lg font-black text-white font-mono flex items-center gap-1">
                        <CalendarDays className="w-4 h-4 text-amber-400" />
                        {remaining === 0 ? '0 Days' : `~ ${daysLeft} Days`}
                      </div>
                      <div className="text-[9px] text-neutral-400 mt-1">
                        Based on {currencySymbol} {dailyContrib.toFixed(0)} savings/day
                      </div>
                    </div>

                  </div>

                  {/* Progressive Milestone Timeline Chart */}
                  <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-850 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] uppercase font-mono font-black text-neutral-400 tracking-wider flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-amber-400" /> Multi-tier Saving Milestones
                      </h4>
                      <span className="text-[9px] font-mono text-neutral-500 uppercase">
                        Current Milestone Trace
                      </span>
                    </div>

                    {/* Milestone Track Line */}
                    <div className="relative pt-4 pb-2">
                      <div className="absolute top-[26px] left-0 right-0 h-1 bg-neutral-900 rounded" />
                      <motion.div 
                        className="absolute top-[26px] left-0 h-1 bg-gradient-to-r from-amber-550 to-amber-400 rounded"
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                      />

                      {/* Notches */}
                      <div className="relative flex justify-between">
                        
                        {/* Notch 1: Setup */}
                        <div className="flex flex-col items-center">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center z-10 transition-colors ${
                            percent >= 0 ? 'bg-black border-amber-400 text-amber-405' : 'bg-neutral-900 border-neutral-700 text-neutral-500'
                          }`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          </div>
                          <span className="text-[8px] font-mono font-bold text-neutral-405 mt-1.5 font-mono">0% Base</span>
                          <span className="text-[9px] font-mono font-bold text-neutral-500 mt-0.5 font-mono">{currencySymbol} 0</span>
                        </div>

                        {/* Notch 2: Milestone 25% */}
                        <div className="flex flex-col items-center">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center z-10 transition-colors ${
                            percent >= 25 ? 'bg-black border-amber-400 text-amber-405' : 'bg-neutral-900 border-neutral-700 text-neutral-500'
                          }`}>
                            {percent >= 25 ? (
                              <Check className="w-2.5 h-2.5 text-amber-400" strokeWidth={3} />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
                            )}
                          </div>
                          <span className="text-[8px] font-mono font-bold text-neutral-450 mt-1.5 font-mono">25% Quarter</span>
                          <span className="text-[9px] font-mono font-bold text-neutral-500 mt-0.5 font-mono">{currencySymbol} {(target * 0.25).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>

                        {/* Notch 3: Milestone 50% */}
                        <div className="flex flex-col items-center">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center z-10 transition-colors ${
                            percent >= 50 ? 'bg-black border-amber-400 text-amber-405' : 'bg-neutral-900 border-neutral-700 text-neutral-500'
                          }`}>
                            {percent >= 50 ? (
                              <Check className="w-2.5 h-2.5 text-amber-400" strokeWidth={3} />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
                            )}
                          </div>
                          <span className="text-[8px] font-mono font-bold text-neutral-450 mt-1.5 font-mono">50% Half</span>
                          <span className="text-[9px] font-mono font-bold text-neutral-500 mt-0.5 font-mono">{currencySymbol} {(target * 0.5).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>

                        {/* Notch 4: Milestone 75% */}
                        <div className="flex flex-col items-center">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center z-10 transition-colors ${
                            percent >= 75 ? 'bg-black border-amber-400 text-amber-405' : 'bg-neutral-900 border-neutral-700 text-neutral-500'
                          }`}>
                            {percent >= 75 ? (
                              <Check className="w-2.5 h-2.5 text-amber-400" strokeWidth={3} />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
                            )}
                          </div>
                          <span className="text-[8px] font-mono font-bold text-neutral-450 mt-1.5 font-mono">75% Three-Qtr</span>
                          <span className="text-[9px] font-mono font-bold text-neutral-500 mt-0.5 font-mono">{currencySymbol} {(target * 0.75).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>

                        {/* Notch 5: Goal */}
                        <div className="flex flex-col items-center">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center z-10 transition-colors ${
                            percent >= 100 ? 'bg-amber-400 border-amber-400 text-black' : 'bg-neutral-900 border-neutral-700 text-neutral-500'
                          }`}>
                            {percent >= 100 ? (
                              <Check className="w-2.5 h-2.5 font-extrabold text-black" strokeWidth={3} />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
                            )}
                          </div>
                          <span className="text-[8px] font-mono font-bold text-amber-400 mt-1.5 font-mono">100% Target</span>
                          <span className="text-[9px] font-mono font-semibold text-neutral-500 mt-0.5 font-mono">{currencySymbol} {target.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>

                      </div>
                    </div>
                  </div>

                </div>

              </div>
            );
          })()}
        </div>
      )}

      {/* SAVINGS HISTORY ACCUMULATION HISTORY */}
      {budgetTargets.length > 0 && activeSelectedTarget && (
        <div id="savings-history-journal" className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase tracking-wider font-mono text-amber-400 flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" /> Historical Allocation Ledger
              </h3>
              <p className="text-xs text-neutral-400">
                A historical breakdown showing daily contributions credited to the <span className="text-amber-400 font-bold">{activeSelectedTarget.itemName}</span> pot based on actual ledger revenue.
              </p>
            </div>
            
            <div className="bg-neutral-950 px-3 py-1.5 rounded border border-neutral-800 flex items-center gap-1 text-[10px] font-mono font-bold text-neutral-400 select-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>LIVE INTEGRATOR</span>
            </div>
          </div>

          {/* Core historical statistics block */}
          {(() => {
            const ratio = activeSelectedTarget.savedPercentage / 100;
            
            // Collect all historical payment days
            const paymentsByDate = payments.reduce<Record<string, number>>((acc, payment) => {
              if (payment.amount && !payment.isAbsent) {
                acc[payment.date] = (acc[payment.date] || 0) + payment.amount;
              }
              return acc;
            }, {});

            const sortedHistoryDates = Object.keys(paymentsByDate).sort((a, b) => b.localeCompare(a));
            
            // Compute helper values
            const dailyContributions = sortedHistoryDates.map(date => {
              const dailyTotal = paymentsByDate[date];
              const dailySave = dailyTotal * ratio;
              return { date, dailyTotal, dailySave };
            });

            const totalSavedForTarget = dailyContributions.reduce((sum, item) => sum + item.dailySave, 0);
            const totalContributingDays = dailyContributions.length;
            const avgDailySave = totalContributingDays > 0 ? (totalSavedForTarget / totalContributingDays) : 0;
            const maxDailySaveItem = dailyContributions.reduce((max, item) => item.dailySave > (max?.dailySave || 0) ? item : max, null as any);

            const visibleHistory = dailyContributions.slice(0, historyLimit);

            return (
              <div className="space-y-5">
                {/* Micro statistics cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-850/60 flex flex-col justify-between">
                    <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-mono font-bold mb-1">Total Contributions</span>
                    <span className="text-xl font-extrabold text-white font-mono flex items-baseline gap-1">
                      {currencySymbol} {totalSavedForTarget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[9px] text-neutral-400 mt-1">To Date Accumulated</span>
                  </div>

                  <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-850/60 flex flex-col justify-between">
                    <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-mono font-bold mb-1">Ledger Days</span>
                    <span className="text-xl font-extrabold text-amber-400 font-mono">
                      {totalContributingDays} <span className="text-xs text-neutral-400">Days</span>
                    </span>
                    <span className="text-[9px] text-neutral-400 mt-1">With fee payments</span>
                  </div>

                  <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-850/60 flex flex-col justify-between">
                    <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-mono font-bold mb-1">Average / Day</span>
                    <span className="text-xl font-extrabold text-[#10b981] font-mono">
                      {currencySymbol} {avgDailySave.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-neutral-400 mt-1">Mean Daily Allocation</span>
                  </div>

                  <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-850/60 flex flex-col justify-between">
                    <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-mono font-bold mb-1">Peak Save Day</span>
                    <span className="text-xl font-extrabold text-amber-500 font-mono">
                      {maxDailySaveItem ? `${currencySymbol} ${maxDailySaveItem.dailySave.toFixed(2)}` : `${currencySymbol} 0.00`}
                    </span>
                    <span className="text-[9px] text-neutral-400 mt-1 truncate">
                      {maxDailySaveItem ? `On ${new Date(maxDailySaveItem.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}` : 'No records yet'}
                    </span>
                  </div>
                </div>

                {/* Timeline and list */}
                {dailyContributions.length === 0 ? (
                  <div className="text-center py-8 bg-neutral-950/40 rounded-xl border border-neutral-805/40 font-mono">
                    <AlertCircle className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
                    <p className="text-xs text-white uppercase font-bold">No registered collections available</p>
                    <p className="text-[11px] text-neutral-500 mt-1">Please register or log pupil daily fee payments to produce history data logs.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400 font-bold uppercase tracking-wider">
                      <span>Historical Record Listings</span>
                      <span>Showing {visibleHistory.length} of {dailyContributions.length} Days</span>
                    </div>

                    <div className="overflow-hidden border border-neutral-805 rounded-xl bg-neutral-950 divide-y divide-neutral-900">
                      {visibleHistory.map((item, index) => {
                        const dateFormatted = new Date(item.date).toLocaleDateString(undefined, {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        });

                        return (
                          <motion.div 
                            key={item.date}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.15, delay: index * 0.03 }}
                            className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between hover:bg-neutral-900/50 transition-colors gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-amber-450/10 border border-amber-400/20 flex items-center justify-center text-amber-400 font-mono text-xs shrink-0 font-bold">
                                {index + 1}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-white font-mono">{dateFormatted}</h4>
                                <p className="text-[10px] text-neutral-400 flex items-center gap-1 mt-0.5">
                                  <span>Gross Intake Daily Fees:</span>
                                  <span className="text-neutral-300 font-mono font-bold">{currencySymbol} {item.dailyTotal.toFixed(2)}</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-6 border-t border-neutral-900 sm:border-0 pt-2.5 sm:pt-0">
                              <div className="text-right">
                                <span className="text-[9px] uppercase font-mono font-bold text-neutral-500 block">Deduction Segment</span>
                                <span className="text-[10px] font-mono font-semibold text-neutral-300 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                                  {activeSelectedTarget.savedPercentage}% Portion
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <span className="text-[9px] uppercase font-mono font-bold text-neutral-500 block">Portion Shared</span>
                                  <span className="text-xs font-black font-mono text-emerald-400 flex items-center justify-end gap-0.5">
                                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    +{currencySymbol} {item.dailySave.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Show more / show less toggle actions */}
                    {dailyContributions.length > 5 && (
                      <div className="flex justify-center pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            playFeedbackSound();
                            setHistoryLimit(prev => prev === 5 ? dailyContributions.length : 5);
                          }}
                          className="bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-amber-400 rounded-lg px-4 py-2 text-xs font-mono font-bold text-neutral-400 hover:text-white transition-all uppercase tracking-wider flex items-center gap-1.5"
                        >
                          <History className="w-3.5 h-3.5 text-amber-400" />
                          {historyLimit === 5 ? `Expand to View All (${dailyContributions.length}) Entries` : 'Collapse to Show Less'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Target Budgets List Workspace Header */}
      <div className="space-y-6">

        {/* Dynamic Categories summary filter dashboard */}
        {(() => {
          // List of unique categories with targets
          const categoriesPresent = Array.from(new Set(
            budgetTargets
              .map(t => t.category || 'Uncategorized')
          ));
          
          return (
            <div className="space-y-3 bg-neutral-900/50 p-5 rounded-xl border border-neutral-805/80">
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-500" /> Category Summaries & Allocation Filters
                </div>
                {selectedCategoryFilter !== 'All Categories' && (
                  <button
                    onClick={() => {
                      playFeedbackSound();
                      setSelectedCategoryFilter('All Categories');
                    }}
                    className="text-[10px] font-mono font-black text-amber-400 hover:text-white uppercase transition-colors"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 'All Categories' filter card */}
                <button
                  type="button"
                  onClick={() => {
                    playFeedbackSound();
                    setSelectedCategoryFilter('All Categories');
                  }}
                  className={`p-4 rounded-xl text-left border transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-28 ${
                    selectedCategoryFilter === 'All Categories'
                      ? 'border-amber-405 bg-amber-500/10 shadow-lg'
                      : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <span className="text-[9px] uppercase font-mono font-bold tracking-wider text-neutral-400">
                      All Goals Combined
                    </span>
                    <span className="bg-neutral-900 text-neutral-400 rounded-full w-5 h-5 flex items-center justify-center font-mono text-[9px] font-bold border border-neutral-800">
                      {budgetTargets.length}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white font-mono uppercase tracking-wide">
                      Show All Categories
                    </h4>
                    <p className="text-[10px] text-neutral-400 mt-1">
                      Clear specific categorization filter
                    </p>
                  </div>
                </button>

                {/* For each category */}
                {categoriesPresent.map(cat => {
                  const targetsInCat = budgetTargets.filter(t => (t.category || 'Uncategorized') === cat);
                  const totalTarVal = targetsInCat.reduce((sum, t) => sum + t.targetAmount, 0);
                  
                  // Compute accumulated savings for targets in this category
                  const totalSavVal = targetsInCat.reduce((sum, t) => {
                    const savingsRatio = t.savedPercentage / 100;
                    const savingsProgress = totalFeesReceived * savingsRatio;
                    return sum + Math.min(t.targetAmount, savingsProgress);
                  }, 0);

                  const progressPercent = totalTarVal > 0 ? Math.min(100, Math.floor((totalSavVal / totalTarVal) * 100)) : 0;
                  const isSelected = selectedCategoryFilter === cat;

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        playFeedbackSound();
                        setSelectedCategoryFilter(cat);
                      }}
                      className={`p-4 rounded-xl text-left border transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-28 ${
                        isSelected
                          ? 'border-amber-405 bg-amber-500/10 shadow-lg font-bold'
                          : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700'
                      }`}
                    >
                      {/* Progress background line */}
                      <div className="absolute bottom-0 left-0 h-1 bg-amber-400/5 w-full" />
                      <div className="absolute bottom-0 left-0 h-1 bg-amber-400 transition-all duration-500" style={{ width: `${progressPercent}%` }} />

                      <div className="flex justify-between items-start w-full gap-1">
                        <span className="text-[9px] uppercase font-mono font-black tracking-wider text-amber-400 truncate max-w-[120px]">
                          {cat}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="bg-neutral-900 text-neutral-300 rounded px-1 py-0.5 font-mono text-[8px] font-bold border border-neutral-800">
                            {progressPercent}% Saved
                          </span>
                          <span className="bg-neutral-900 text-neutral-400 rounded-full w-5 h-5 flex items-center justify-center font-mono text-[9px] font-bold border border-neutral-800">
                            {targetsInCat.length}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2">
                        <div className="text-white font-black font-mono text-xs">
                          {currencySymbol} {totalSavVal.toLocaleString('en-US', { maximumFractionDigits: 0 })} / {totalTarVal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </div>
                        <p className="text-[9px] text-neutral-400 mt-1 truncate">
                          Combined status projection
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}
        
        {/* Navigation Tabs filter */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
          <div className="flex gap-2">
            {[
              { id: 'active', label: 'Active Goals', icon: Compass },
              { id: 'completed', label: 'Completed Targets', icon: CheckCircle2 },
              { id: 'all', label: 'All Action Plans', icon: Target }
            ].map(tab => {
              const active = activeFilter === tab.id;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    playFeedbackSound();
                    setActiveFilter(tab.id as any);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all uppercase tracking-wider ${
                    active 
                      ? 'bg-amber-400 text-black border border-amber-400 shadow-md' 
                      : 'bg-neutral-900 border border-neutral-801 text-neutral-400 hover:text-white'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase">
            Viewing {filteredTargets.length} action plans
          </span>
        </div>

        {/* Empty placeholder */}
        {filteredTargets.length === 0 && (
          <div className="bg-neutral-900/40 border border-neutral-802 rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="p-3 bg-neutral-900 rounded-full border border-neutral-800 text-neutral-500">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                No Plans Located under {activeFilter} Filter
              </h4>
              <p className="text-xs text-neutral-500 max-w-md mx-auto">
                No strategic administrative items have been registered or fulfilled under this category. Tap "New Action Plan" above to create one.
              </p>
            </div>
          </div>
        )}

        {/* Action Board list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence>
            {filteredTargets.map((target, index) => {
              // Mathematical savings deduction based on portal revenue list
              const savingsRatio = target.savedPercentage / 100;
              const savingsProgress = totalFeesReceived * savingsRatio;
              const fractionSaved = savingsProgress / target.targetAmount;
              const savingsPercent = Math.min(100, Math.floor(fractionSaved * 100));
              const remainingAmount = Math.max(0, target.targetAmount - savingsProgress);
              const isGoalAchieved = savingsProgress >= target.targetAmount;

              // Estimated completion projections
              const avgDailyRev = totalSchoolDaysWithFees > 0 ? (totalFeesReceived / totalSchoolDaysWithFees) : 250;
              const targetDailyContrib = avgDailyRev * savingsRatio;
              const targetDaysLeft = targetDailyContrib > 0 ? Math.ceil(remainingAmount / targetDailyContrib) : 0;
              let estCompletionDateStr = 'Fully Funded';
              if (remainingAmount > 0) {
                if (targetDailyContrib > 0) {
                  const estDate = new Date();
                  estDate.setDate(estDate.getDate() + targetDaysLeft);
                  estCompletionDateStr = estDate.toLocaleDateString(undefined, { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  }) + ` (~${targetDaysLeft} days)`;
                } else {
                  estCompletionDateStr = 'No Intake Logged';
                }
              }

              // Suggested visual icon or color
              const badgeStyle = target.completed 
                ? 'border-emerald-500 bg-emerald-950/20' 
                : isGoalAchieved 
                  ? 'border-amber-400' 
                  : 'border-neutral-810 bg-neutral-900/60';

              return (
                <motion.div
                  key={target.id}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  id={`target-card-${target.id}`}
                  className={`border-2 rounded-xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden transition-all duration-300 hover:border-amber-400/45 ${badgeStyle}`}
                >
                  {/* Subtle completed background stamp */}
                  {target.completed && (
                    <div className="absolute right-0 top-0 -translate-x-4 translate-y-4 rotate-12 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono text-[8px] font-black uppercase p-1 px-2.5 z-0 select-none">
                      Completed & Paid
                    </div>
                  )}

                  <div className="space-y-3 relative z-10">
                    {/* Header item */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-extrabold text-white tracking-tight">
                            {target.itemName}
                          </h3>
                          <span className="bg-neutral-950 text-amber-400 border border-neutral-800 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider shrink-0">
                            {target.category || 'Uncategorized'}
                          </span>
                        </div>
                        <div className="text-[10px] text-neutral-400 font-mono font-bold flex items-center gap-1">
                          Created on {new Date(target.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                      </div>

                      <div className="flex gap-1">
                        {/* Toggle active / active indicator */}
                        <button
                          onClick={() => handleToggleActive(target)}
                          className={`p-1 px-2 rounded text-[9px] font-mono font-bold uppercase border transition-all ${
                            target.active 
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                              : 'bg-neutral-800 text-neutral-500 border-neutral-700'
                          }`}
                          title="Toggle Active Plan"
                        >
                          {target.active ? 'Active Saving' : 'Paused'}
                        </button>

                        {/* Complete button manually */}
                        <button
                          onClick={() => handleToggleComplete(target)}
                          className={`p-1.5 rounded transition-all ${
                            target.completed 
                              ? 'bg-emerald-500 text-black' 
                              : isGoalAchieved 
                                ? 'bg-amber-400 text-black animate-pulse' 
                                : 'bg-neutral-800 hover:bg-neutral-750 text-neutral-400'
                          }`}
                          title={target.completed ? "Mark as Incomplete" : "Mark as Achieved/Acquired"}
                        >
                          <Check className="w-3.5 h-3.5 font-bold" />
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={() => handleDelete(target.id)}
                          className="p-1.5 bg-neutral-800 hover:bg-red-900 hover:text-white text-neutral-500 rounded transition-all"
                          title="Delete Action Plan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Justification descriptive label */}
                    {target.description && (
                      <p className="text-xs text-neutral-400 bg-neutral-950/40 p-2.5 rounded border border-neutral-805 leading-relaxed font-sans italic">
                        "{target.description}"
                      </p>
                    )}

                    {/* Progress details stats rows */}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-3 border-t border-neutral-805 pt-2.5 text-xs">
                      <div>
                        <span className="text-neutral-500 block text-[9px] font-mono uppercase tracking-wider font-bold">Goal Target</span>
                        <span className="font-mono text-white font-black">
                          {currencySymbol} {target.targetAmount.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[9px] font-mono uppercase tracking-wider font-bold">Dedicated Portion</span>
                        <span className="font-mono text-amber-400 font-black">
                          {target.savedPercentage}% from daily
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[9px] font-mono uppercase tracking-wider font-bold">Accumulated Savings</span>
                        <span className="font-mono text-emerald-400 font-extrabold">
                          {currencySymbol} {savingsProgress.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[9px] font-mono uppercase tracking-wider font-bold">Portion Needed</span>
                        <span className={`font-mono font-extrabold ${remainingAmount === 0 ? 'text-neutral-400 line-through' : 'text-amber-500'}`}>
                          {remainingAmount === 0 ? 'Goal Reached' : `${currencySymbol} ${remainingAmount.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}
                        </span>
                      </div>
                    </div>

                    {/* Completion Projection ribbon */}
                    <div className="border-t border-b border-neutral-805 py-2.5 my-1.5 bg-neutral-950/30 -mx-5 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="text-neutral-500 block text-[9px] font-mono uppercase tracking-wider font-bold">Avg. Daily Allocation</span>
                        <span className="font-mono text-neutral-300 font-bold block mt-0.5">
                          {currencySymbol} {targetDailyContrib.toFixed(2)}/day
                        </span>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-neutral-500 block text-[9px] font-mono uppercase tracking-wider font-bold">Est. Completion Date</span>
                        <span className={`font-mono font-extrabold flex items-center justify-start sm:justify-end gap-1 mt-0.5 ${
                          remainingAmount === 0 ? 'text-emerald-400' : 'text-amber-450'
                        }`}>
                          <CalendarDays className="w-3.5 h-3.5" />
                          {estCompletionDateStr}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Percentage Slider Progress Bar */}
                  <div className="space-y-1.5 pt-3 relative z-10 mt-2">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-neutral-400 font-bold uppercase tracking-wide">
                        Progress Saved Towards Goal
                      </span>
                      <span className={`font-black uppercase tracking-tight rounded px-1.5 leading-none ${
                        target.completed 
                          ? 'bg-emerald-500 text-black' 
                          : savingsPercent >= 100 
                            ? 'bg-amber-400 text-black' 
                            : 'text-amber-400'
                      }`}>
                        {savingsPercent}% Reached
                      </span>
                    </div>

                    <div className="relative w-full h-3 bg-neutral-950 rounded-full border border-neutral-800 overflow-hidden shadow-inner">
                      {/* Interactive filling status bar */}
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${savingsPercent}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={`h-full rounded-full ${
                          target.completed 
                            ? 'bg-emerald-500' 
                            : savingsPercent >= 100 
                              ? 'bg-amber-400' 
                              : 'bg-gradient-to-r from-amber-550 to-amber-400'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Visual helper card prompt */}
                  {savingsPercent >= 100 && !target.completed && (
                    <div className="mt-3.5 p-2 bg-amber-400/10 text-[10px] border border-amber-400/20 rounded font-mono text-amber-300 leading-normal flex items-center gap-1.5 animate-pulse">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Savings project is 100% complete! Push the check button above to mark this item as purchased/acquired.</span>
                    </div>
                  )}

                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

      </div>

      {/* Admin strategic planning tips bento list card */}
      <div id="school-planning-bento" className="bg-neutral-900 border border-neutral-805 p-6 rounded-xl space-y-4">
        <h4 className="text-xs uppercase font-mono font-black text-amber-400 tracking-wider flex items-center gap-1.5">
          <Lightbulb className="w-4 h-4" /> Strategic School Planning Tips
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs leading-relaxed text-neutral-400">
          <div className="space-y-1.5 bg-neutral-950 p-3.5 rounded border border-neutral-802">
            <h5 className="font-bold text-white uppercase font-mono tracking-tight flex items-center gap-1">
              <span className="p-0.5 bg-amber-450/15 rounded text-amber-400 text-[10px]">1</span> Auto-Deductions
            </h5>
            <p className="text-[11px]">
              Every daily check-in payment (such as the standard GHC 5.00 level) dynamically triggers prospective contributions across multiple active target budgets. Your primary balance is untouched; saving proportions are projected values.
            </p>
          </div>

          <div className="space-y-1.5 bg-neutral-950 p-3.5 rounded border border-neutral-802">
            <h5 className="font-bold text-white uppercase font-mono tracking-tight flex items-center gap-1">
              <span className="p-0.5 bg-amber-450/15 rounded text-amber-400 text-[10px]">2</span> Real-Time Audits
            </h5>
            <p className="text-[11px]">
              If payments are adjusted or backdated inside the "Check-In GHC 5" or "Audits & Exports" tabs, the system automatically recalibrates savings to match actual verified ledger totals in real-time.
            </p>
          </div>

          <div className="space-y-1.5 bg-neutral-950 p-3.5 rounded border border-neutral-802">
            <h5 className="font-bold text-white uppercase font-mono tracking-tight flex items-center gap-1">
              <span className="p-0.5 bg-amber-450/15 rounded text-amber-400 text-[10px]">3</span> Goal Acquisition
            </h5>
            <p className="text-[11px]">
              When an item reaches 100% portion completed, stamp it completed. Completed goals are securely stored offline or synced with google cloud systems under your active FEETRACK database profile.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
