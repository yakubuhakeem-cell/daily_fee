import React, { useState, useMemo, useEffect } from 'react';
import QRCode from 'qrcode';
import { useApp } from '../context/AppContext';
import { TeacherEvaluation, STANDARD_ETHICS, UserAccount, EthicConfig } from '../types';
import { 
  Plus, 
  Trash2, 
  Award, 
  FileText, 
  Check, 
  X, 
  Printer, 
  TrendingDown, 
  TrendingUp, 
  Calendar, 
  AlertTriangle, 
  Info, 
  User, 
  Percent, 
  Printer as PrintIcon,
  Eye,
  EyeOff
} from 'lucide-react';

export const PerformanceTab: React.FC = () => {
  const { 
    users, 
    teacherEvaluations, 
    addTeacherEvaluation, 
    deleteTeacherEvaluation,
    currentDate,
    currentUser,
    playFeedbackSound
  } = useApp();

  // Filter users to get only staff / teachers / workers (Admin, Accountant, Teacher, Headmaster)
  const staffMembers = useMemo(() => {
    const list = users.filter(u => {
      const r = (u.role || '').toLowerCase().trim();
      return (
        r === 'teacher' || 
        r === 'accountant' || 
        r === 'admin' || 
        r === 'administrator' || 
        r === 'headmaster' || 
        r === 'headmistress' || 
        r === 'cashier' || 
        r === 'staff'
      );
    });
    return list.length > 0 ? list : users;
  }, [users]);

  // UI state
  const [activeSubView, setActiveSubView] = useState<'log' | 'payslip' | 'hardcopy'>('log');
  
  // Evaluation Form States
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [evalMonthYear, setEvalMonthYear] = useState(() => {
    const d = new Date(currentDate);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  });
  const [selectedEthics, setSelectedEthics] = useState<string[]>([]);
  const [customPercentages, setCustomPercentages] = useState<Record<string, number>>({});
  const [customAttendancePct, setCustomAttendancePct] = useState<number | null>(null);
  const [customPunctualityPct, setCustomPunctualityPct] = useState<number | null>(null);
  const [attendanceRating, setAttendanceRating] = useState<'Excellent' | 'Good' | 'Fair' | 'Poor'>('Excellent');
  const [punctualityRating, setPunctualityRating] = useState<'Excellent' | 'Good' | 'Fair' | 'Poor'>('Excellent');
  const [negligenceNotes, setNegligenceNotes] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Payslip Viewer States
  const [payslipTeacherId, setPayslipTeacherId] = useState('');
  const [payslipMonthYear, setPayslipMonthYear] = useState(() => {
    const d = new Date(currentDate);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  });
  const [isPrintPreview, setIsPrintPreview] = useState(false);
  const [payslipQrUrl, setPayslipQrUrl] = useState<string>('');

  const officialTimestamp = useMemo(() => {
    const d = currentDate ? new Date(currentDate) : new Date();
    const realNow = new Date();
    d.setHours(realNow.getHours(), realNow.getMinutes(), realNow.getSeconds());
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    return `${dateStr} ${timeStr}`;
  }, [currentDate, payslipTeacherId, payslipMonthYear]);

  useEffect(() => {
    if (!payslipTeacherId || !payslipMonthYear) {
      setPayslipQrUrl('');
      return;
    }
    const origin = window.location.origin || 'https://ais-dev-aoc3iz2g6frsl72zbyzxop-371600577437.europe-west3.run.app';
    const refCode = `SHC-PAY-${payslipTeacherId.substring(0, 6).toUpperCase()}-${payslipMonthYear.replace(/\s+/g, '-').toUpperCase()}`;
    const verificationUrl = `${origin}/?tab=performance&teacherId=${payslipTeacherId}&period=${encodeURIComponent(payslipMonthYear)}&ref=${refCode}&action=verify-payslip`;
    
    QRCode.toDataURL(verificationUrl, {
      margin: 1,
      width: 100,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
      .then(url => setPayslipQrUrl(url))
      .catch(err => {
        console.error("Failed to generate payslip QR Code", err);
      });
  }, [payslipTeacherId, payslipMonthYear]);

  // Checklist Generator State
  const [hardcopyTeacherId, setHardcopyTeacherId] = useState('');

  // Handle ethic selection toggles
  const handleEthicToggle = (ethicId: string) => {
    if (selectedEthics.includes(ethicId)) {
      setSelectedEthics(prev => prev.filter(id => id !== ethicId));
    } else {
      setSelectedEthics(prev => [...prev, ethicId]);
    }
  };

  // Submit evaluation form
  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedTeacherId) {
      setFormError('Please select a teacher/worker to evaluate.');
      return;
    }

    if (!evalMonthYear.trim()) {
      setFormError('Please provide a month and year (e.g., July 2026).');
      return;
    }

    setIsSubmitting(true);
    
    // Find selected teacher details
    const teacher = users.find(u => u.id === selectedTeacherId);
    const teacherName = teacher ? teacher.name : 'Unknown';

    // Calculate dynamic percentages
    let calculatedDeduction = 0;
    let calculatedBenefit = 0;

    // Deductions from selected negative ethics
    selectedEthics.forEach(id => {
      const config = STANDARD_ETHICS.find(e => e.id === id);
      if (config) {
        const pct = customPercentages[id] !== undefined ? customPercentages[id] : config.percentage;
        if (config.type === 'negative') {
          calculatedDeduction += pct;
        } else {
          calculatedBenefit += pct;
        }
      }
    });

    // Deduct for attendance rating
    if (attendanceRating === 'Fair') {
      calculatedDeduction += customAttendancePct !== null ? customAttendancePct : 2;
    }
    if (attendanceRating === 'Poor') {
      calculatedDeduction += customAttendancePct !== null ? customAttendancePct : 5;
    }

    // Deduct for punctuality rating
    if (punctualityRating === 'Fair') {
      calculatedDeduction += customPunctualityPct !== null ? customPunctualityPct : 2;
    }
    if (punctualityRating === 'Poor') {
      calculatedDeduction += customPunctualityPct !== null ? customPunctualityPct : 5;
    }

    try {
      const success = await addTeacherEvaluation({
        teacherId: selectedTeacherId,
        teacherName,
        monthYear: evalMonthYear,
        attendanceScore: attendanceRating,
        punctualityScore: punctualityRating,
        negligenceReports: negligenceNotes,
        checkedEthics: selectedEthics,
        calculatedDeduction,
        calculatedBenefit,
        notes: generalNotes,
        recordedBy: currentUser?.name || 'Administrator',
        customPercentages,
        customAttendancePct,
        customPunctualityPct
      });

      if (success) {
        // Reset states
        setSelectedEthics([]);
        setCustomPercentages({});
        setCustomAttendancePct(null);
        setCustomPunctualityPct(null);
        setAttendanceRating('Excellent');
        setPunctualityRating('Excellent');
        setNegligenceNotes('');
        setGeneralNotes('');
        playFeedbackSound('success');
        alert(`Successfully saved performance evaluation for ${teacherName} (${evalMonthYear})`);
      } else {
        setFormError('Failed to persist evaluation. Please try again.');
        playFeedbackSound('error');
      }
    } catch (err) {
      console.error(err);
      setFormError('An error occurred. Please try again.');
      playFeedbackSound('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick action: prefill and switch to payslip tab
  const handleViewPayslip = (teacherId: string, monthYear: string) => {
    setPayslipTeacherId(teacherId);
    setPayslipMonthYear(monthYear);
    setActiveSubView('payslip');
  };

  // Find targeted evaluation for virtual payslip preview
  const currentSlipEvaluation = useMemo(() => {
    if (!payslipTeacherId || !payslipMonthYear) return null;
    return teacherEvaluations.find(
      e => e.teacherId === payslipTeacherId && 
      e.monthYear.trim().toLowerCase() === payslipMonthYear.trim().toLowerCase()
    );
  }, [payslipTeacherId, payslipMonthYear, teacherEvaluations]);

  // Find details for payslip teacher
  const payslipTeacher = useMemo(() => {
    return users.find(u => u.id === payslipTeacherId) || null;
  }, [payslipTeacherId, users]);

  // Calculate payslip math
  const payslipCalculations = useMemo(() => {
    if (!payslipTeacher) return { base: 0, benefit: 0, deduction: 0, net: 0, benefitGhc: 0, deductionGhc: 0 };
    const base = payslipTeacher.stipendSalary || 0;
    
    const evaluation = currentSlipEvaluation;
    const benefitPercent = evaluation ? evaluation.calculatedBenefit : 0;
    const deductionPercent = evaluation ? evaluation.calculatedDeduction : 0;

    const benefitGhc = (base * benefitPercent) / 100;
    const deductionGhc = (base * deductionPercent) / 100;
    const net = base + benefitGhc - deductionGhc;

    return {
      base,
      benefit: benefitPercent,
      deduction: deductionPercent,
      benefitGhc,
      deductionGhc,
      net
    };
  }, [payslipTeacher, currentSlipEvaluation]);

  // Print function
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Header section with print-hide control */}
      {!isPrintPreview && (
        <div className="bg-neutral-900 border-4 border-neutral-800 p-6 shadow-xl print:hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-400 text-black">
              <Award size={24} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-wider font-sans">Teacher Performance & Ethics</h3>
              <p className="text-xs text-neutral-400">Record evaluations, apply salary percentage changes, and generate hard-copy checklists</p>
            </div>
          </div>

          {/* View Switcher buttons */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={() => setActiveSubView('log')}
              className={`flex-1 sm:flex-none px-4 py-2 text-[10px] uppercase font-black tracking-wider transition-all border ${
                activeSubView === 'log'
                  ? 'bg-amber-400 border-amber-400 text-black'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              Digital Register
            </button>
            <button
              onClick={() => setActiveSubView('payslip')}
              className={`flex-1 sm:flex-none px-4 py-2 text-[10px] uppercase font-black tracking-wider transition-all border ${
                activeSubView === 'payslip'
                  ? 'bg-amber-400 border-amber-400 text-black'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              Monthly PDF Payslips
            </button>
            <button
              onClick={() => setActiveSubView('hardcopy')}
              className={`flex-1 sm:flex-none px-4 py-2 text-[10px] uppercase font-black tracking-wider transition-all border ${
                activeSubView === 'hardcopy'
                  ? 'bg-amber-400 border-amber-400 text-black'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              Printable Blank Checklists
            </button>
          </div>
        </div>
      )}

      {/* SUBVIEW 1: Digital Register & New Evaluation */}
      {activeSubView === 'log' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:hidden">
          
          {/* Record form column */}
          <div className="lg:col-span-5 bg-neutral-900 border-4 border-neutral-800 p-6 space-y-4">
            <div className="border-b border-neutral-800 pb-3">
              <span className="text-[10px] font-mono font-black text-amber-500 uppercase">OFFICIAL SCHOOL EVALUATOR</span>
              <h4 className="text-sm font-black text-white uppercase tracking-wider">Record Teacher Ethics</h4>
            </div>

            {formError && (
              <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEvaluation} className="space-y-4">
              
              {/* Select Staff */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase font-black text-neutral-400">Target Staff / Teacher</label>
                <select
                  required
                  value={selectedTeacherId}
                  onChange={e => setSelectedTeacherId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white font-bold rounded"
                >
                  <option value="">-- Choose Staff Member --</option>
                  {staffMembers.map(staff => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} ({staff.role}) - Base: GHC {(staff.stipendSalary || 0).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month/Year reference period */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase font-black text-neutral-400">Reference Period</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. July 2026"
                  value={evalMonthYear}
                  onChange={e => setEvalMonthYear(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white font-semibold rounded"
                />
              </div>

              {/* Attendance & Punctuality Dropdowns */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase font-black text-neutral-400">Attendance Rating</label>
                  <select
                    value={attendanceRating}
                    onChange={e => {
                      setAttendanceRating(e.target.value as any);
                      setCustomAttendancePct(null); // Reset when category changes to default
                    }}
                    className="w-full bg-neutral-950 border border-neutral-800 p-2 text-xs text-white font-semibold rounded"
                  >
                    <option value="Excellent">Excellent (+0%)</option>
                    <option value="Good">Good (+0%)</option>
                    <option value="Fair">Fair (-2% ded.)</option>
                    <option value="Poor">Poor (-5% ded.)</option>
                  </select>
                  {(attendanceRating === 'Fair' || attendanceRating === 'Poor') && (
                    <div className="mt-1.5 flex items-center justify-between bg-neutral-950 p-1.5 border border-neutral-850 rounded">
                      <span className="text-[9px] text-neutral-400 font-mono">Custom %:</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={customAttendancePct !== null ? customAttendancePct : (attendanceRating === 'Fair' ? 2 : 5)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setCustomAttendancePct(isNaN(val) ? 0 : val);
                        }}
                        className="w-14 bg-neutral-900 border border-neutral-700 text-white text-[10px] font-bold px-1 py-0.5 rounded text-center"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase font-black text-neutral-400">Punctuality Rating</label>
                  <select
                    value={punctualityRating}
                    onChange={e => {
                      setPunctualityRating(e.target.value as any);
                      setCustomPunctualityPct(null); // Reset when category changes to default
                    }}
                    className="w-full bg-neutral-950 border border-neutral-800 p-2 text-xs text-white font-semibold rounded"
                  >
                    <option value="Excellent">Excellent (+0%)</option>
                    <option value="Good">Good (+0%)</option>
                    <option value="Fair">Fair (-2% ded.)</option>
                    <option value="Poor">Poor (-5% ded.)</option>
                  </select>
                  {(punctualityRating === 'Fair' || punctualityRating === 'Poor') && (
                    <div className="mt-1.5 flex items-center justify-between bg-neutral-950 p-1.5 border border-neutral-850 rounded">
                      <span className="text-[9px] text-neutral-400 font-mono">Custom %:</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={customPunctualityPct !== null ? customPunctualityPct : (punctualityRating === 'Fair' ? 2 : 5)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setCustomPunctualityPct(isNaN(val) ? 0 : val);
                        }}
                        className="w-14 bg-neutral-900 border border-neutral-700 text-white text-[10px] font-bold px-1 py-0.5 rounded text-center"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Negligence Reports */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase font-black text-neutral-400">Negligence / Misconduct Incidents (Optional)</label>
                <textarea
                  placeholder="Describe any negligent actions (e.g. absent from classroom duty)"
                  value={negligenceNotes}
                  onChange={e => setNegligenceNotes(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white font-medium rounded h-16 resize-none"
                />
              </div>

              {/* Dropdown list of ethics for admin */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase font-black text-neutral-400 block">Checked Ethics & Behaviours</label>
                <div className="border border-neutral-800 bg-neutral-950 p-3 rounded h-48 overflow-y-auto space-y-2">
                  <span className="text-[9px] uppercase font-bold text-neutral-500 font-mono tracking-widest block mb-1">Negative Behaviors (Deductions)</span>
                  {STANDARD_ETHICS.filter(et => et.type === 'negative').map(et => (
                    <label key={et.id} className="flex items-start gap-2.5 text-xs cursor-pointer text-neutral-300 hover:text-white pb-1 border-b border-neutral-900/60">
                      <input
                        type="checkbox"
                        checked={selectedEthics.includes(et.id)}
                        onChange={() => handleEthicToggle(et.id)}
                        className="mt-0.5 rounded border-neutral-700 bg-neutral-950 text-red-500 focus:ring-0 focus:ring-offset-0"
                      />
                      <div>
                        <span className="font-semibold block text-red-400">
                          {et.label} <span className="text-[10px] font-mono text-red-500">-{customPercentages[et.id] !== undefined ? customPercentages[et.id] : et.percentage}%</span>
                        </span>
                        <span className="text-[10px] text-neutral-500 block">{et.description}</span>
                        {selectedEthics.includes(et.id) && (
                          <div className="mt-1 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                            <span className="text-[9px] text-neutral-400 font-mono">Custom %:</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={customPercentages[et.id] !== undefined ? customPercentages[et.id] : et.percentage}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setCustomPercentages(prev => ({ ...prev, [et.id]: isNaN(val) ? 0 : val }));
                              }}
                              className="w-14 bg-neutral-900 border border-neutral-700 text-white text-[10px] font-bold px-1 py-0.5 rounded text-center"
                            />
                          </div>
                        )}
                      </div>
                    </label>
                  ))}

                  <div className="h-2 border-t border-neutral-900 my-2"></div>
                  <span className="text-[9px] uppercase font-bold text-neutral-500 font-mono tracking-widest block mb-1">Positive Ethics (Benefits)</span>
                  {STANDARD_ETHICS.filter(et => et.type === 'positive').map(et => (
                    <label key={et.id} className="flex items-start gap-2.5 text-xs cursor-pointer text-neutral-300 hover:text-white pb-1 border-b border-neutral-900/60">
                      <input
                        type="checkbox"
                        checked={selectedEthics.includes(et.id)}
                        onChange={() => handleEthicToggle(et.id)}
                        className="mt-0.5 rounded border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-0 focus:ring-offset-0"
                      />
                      <div>
                        <span className="font-semibold block text-emerald-400">
                          {et.label} <span className="text-[10px] font-mono text-emerald-500">+{customPercentages[et.id] !== undefined ? customPercentages[et.id] : et.percentage}%</span>
                        </span>
                        <span className="text-[10px] text-neutral-500 block">{et.description}</span>
                        {selectedEthics.includes(et.id) && (
                          <div className="mt-1 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                            <span className="text-[9px] text-neutral-400 font-mono">Custom %:</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={customPercentages[et.id] !== undefined ? customPercentages[et.id] : et.percentage}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setCustomPercentages(prev => ({ ...prev, [et.id]: isNaN(val) ? 0 : val }));
                              }}
                              className="w-14 bg-neutral-900 border border-neutral-700 text-white text-[10px] font-bold px-1 py-0.5 rounded text-center"
                            />
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* General Comments */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase font-black text-neutral-400">Additional Evaluator Comments</label>
                <textarea
                  placeholder="General notes regarding moral status"
                  value={generalNotes}
                  onChange={e => setGeneralNotes(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white font-medium rounded h-16 resize-none"
                />
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer rounded"
              >
                {isSubmitting ? 'SAVING EVALUATION...' : 'SAVE DIGITAL EVALUATION'}
              </button>

            </form>
          </div>

          {/* List column */}
          <div className="lg:col-span-7 bg-neutral-900 border-4 border-neutral-800 p-6 space-y-4">
            <div className="border-b border-neutral-800 pb-3 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-mono font-black text-neutral-500 uppercase">HISTORIC TALLIES</span>
                <h4 className="text-sm font-black text-white uppercase tracking-wider">Saved Evaluation Logs</h4>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-bold bg-neutral-950 border border-neutral-800 text-neutral-400 font-mono">
                {teacherEvaluations.length} RECORDS
              </span>
            </div>

            {teacherEvaluations.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-neutral-800 rounded flex flex-col items-center justify-center space-y-2">
                <Award size={36} className="text-neutral-600 stroke-[1.5]" />
                <p className="text-xs text-neutral-400 font-medium">No performance evaluations have been logged yet.</p>
                <p className="text-[10px] text-neutral-500">Record a teacher above to initiate benefits or deductions.</p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[640px] overflow-y-auto pr-1">
                {teacherEvaluations.map(record => {
                  const teacher = users.find(u => u.id === record.teacherId);
                  const base = teacher?.stipendSalary || 0;
                  const dedAmount = (base * record.calculatedDeduction) / 100;
                  const benAmount = (base * record.calculatedBenefit) / 100;
                  const netEst = base + benAmount - dedAmount;

                  return (
                    <div 
                      key={record.id} 
                      className="p-4 bg-neutral-950 border border-neutral-850 hover:border-neutral-700 transition-all rounded space-y-3"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="text-[9px] font-black bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            {record.monthYear}
                          </span>
                          <h5 className="text-xs font-black text-white uppercase mt-1">{record.teacherName}</h5>
                          <p className="text-[10px] text-neutral-500 font-mono mt-0.5">Recorded by {record.recordedBy}</p>
                        </div>

                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleViewPayslip(record.teacherId, record.monthYear)}
                            className="p-1.5 bg-neutral-900 border border-neutral-800 hover:border-neutral-600 text-neutral-300 hover:text-amber-400 rounded transition-colors text-[10px] font-black uppercase font-mono px-2"
                            title="Generate and view printable monthly payslip"
                          >
                            Payslip PDF
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete this evaluation for ${record.teacherName}?`)) {
                                deleteTeacherEvaluation(record.id);
                              }
                            }}
                            className="p-1.5 bg-red-950/40 border border-red-900 text-red-400 hover:bg-red-900 hover:text-white rounded transition-colors"
                            title="Delete record"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Ratings summary banner */}
                      <div className="grid grid-cols-2 gap-2 bg-neutral-900/60 p-2 border border-neutral-850 rounded text-[10px]">
                        <div>
                          <span className="text-neutral-500 block">Attendance:</span>
                          <span className={`font-bold ${record.attendanceScore === 'Excellent' || record.attendanceScore === 'Good' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {record.attendanceScore}
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-500 block">Punctuality:</span>
                          <span className={`font-bold ${record.punctualityScore === 'Excellent' || record.punctualityScore === 'Good' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {record.punctualityScore}
                          </span>
                        </div>
                      </div>

                      {/* Calculated rates info */}
                      <div className="flex justify-between items-center text-[11px] border-t border-neutral-900 pt-2.5">
                        <div className="flex gap-4">
                          <div className="flex items-center gap-1">
                            <TrendingUp size={12} className="text-emerald-500" />
                            <span className="text-neutral-400">Benefit:</span>
                            <span className="font-bold text-emerald-400">+{record.calculatedBenefit}%</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingDown size={12} className="text-red-500" />
                            <span className="text-neutral-400">Deduction:</span>
                            <span className="font-bold text-red-500">-{record.calculatedDeduction}%</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-neutral-500">Take Home Est: </span>
                          <span className="font-bold text-white font-mono">GHC {netEst.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Checked ethics tags */}
                      {record.checkedEthics && record.checkedEthics.length > 0 && (
                        <div className="flex flex-wrap gap-1 border-t border-neutral-900 pt-2">
                          {record.checkedEthics.map(ethicId => {
                            const config = STANDARD_ETHICS.find(e => e.id === ethicId);
                            if (!config) return null;
                            const pct = record.customPercentages?.[ethicId] !== undefined 
                              ? record.customPercentages[ethicId] 
                              : config.percentage;
                            return (
                              <span 
                                key={ethicId} 
                                className={`text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${
                                  config.type === 'positive' 
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                                }`}
                              >
                                {config.label} ({config.type === 'positive' ? '+' : '-'}{pct}%)
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Comments block */}
                      {(record.negligenceReports || record.notes) && (
                        <div className="text-[10px] bg-neutral-900 border border-neutral-850 p-2 text-neutral-400 rounded leading-relaxed italic space-y-1">
                          {record.negligenceReports && (
                            <div>
                              <span className="text-red-400 font-bold not-italic">Negligence Log: </span>
                              {record.negligenceReports}
                            </div>
                          )}
                          {record.notes && (
                            <div>
                              <span className="text-neutral-400 font-bold not-italic font-mono">Evaluator Note: </span>
                              {record.notes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBVIEW 2: Monthly Payslips (Virtual PDF Frame) */}
      {activeSubView === 'payslip' && (
        <div className={`grid ${isPrintPreview ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'} gap-6 print:block`}>
          
          {/* Controls selector sidebar (Hidden during printing and print preview) */}
          {!isPrintPreview && (
            <div className="lg:col-span-4 bg-neutral-900 border-4 border-neutral-800 p-6 space-y-4 print:hidden">
              <div className="border-b border-neutral-800 pb-3">
                <span className="text-[10px] font-mono font-black text-amber-500 uppercase">MONTHLY REVENUE SLIP</span>
                <h4 className="text-sm font-black text-white uppercase tracking-wider font-sans">Assemble Payslip PDF</h4>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase font-black text-neutral-400">Select Staff</label>
                  <select
                    value={payslipTeacherId}
                    onChange={e => setPayslipTeacherId(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white font-bold rounded"
                  >
                    <option value="">-- Select Staff Member --</option>
                    {staffMembers.map(staff => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name} ({staff.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase font-black text-neutral-400">Salary Period</label>
                  <input
                    type="text"
                    placeholder="e.g. July 2026"
                    value={payslipMonthYear}
                    onChange={e => setPayslipMonthYear(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white font-semibold rounded"
                  />
                </div>

                {payslipTeacherId && (
                  <div className="bg-neutral-950 p-3.5 border border-neutral-850 rounded space-y-2 text-xs">
                    <span className="text-[9px] uppercase font-bold text-neutral-400 font-mono tracking-wider block">Active Database Sync Status</span>
                    {currentSlipEvaluation ? (
                      <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                        ✓ Performance logged for this period
                      </div>
                    ) : (
                      <div className="text-amber-400 font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                        ⚠️ No custom evaluation found. Defaulting to pure base salary.
                      </div>
                    )}
                    <p className="text-[10px] text-neutral-500 leading-relaxed">
                      Evaluations directly feed the payout slip. Save an evaluation under the "Digital Register" sub-view to assign ethics.
                    </p>
                  </div>
                )}

                {payslipTeacherId && (
                  <div className="space-y-2">
                    <button
                      onClick={handlePrint}
                      className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer rounded"
                    >
                      <PrintIcon size={14} />
                      Print / Save as PDF
                    </button>

                    <button
                      onClick={() => setIsPrintPreview(true)}
                      className="w-full py-2.5 bg-neutral-950 border-2 border-neutral-800 hover:border-amber-400 text-neutral-400 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer rounded"
                      title="Simulates printing with accurate layout sizing, spacing, and border rules directly on your screen."
                    >
                      <Eye size={12} className="text-amber-400" />
                      Diagnostic Print Preview
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Monthly Payslip Virtual PDF Viewer */}
          <div className={`${isPrintPreview ? 'w-full' : 'lg:col-span-8'} space-y-4`}>
            
            {isPrintPreview && (
              <div className="bg-amber-500/10 border-2 border-amber-500/50 p-4 rounded flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono font-bold text-amber-400 no-print animate-fade-in">
                <div className="flex items-center gap-2.5">
                  <Eye size={16} className="text-amber-400 animate-pulse" />
                  <span>DIAGNOSTIC PRINT PREVIEW ACTIVE • Displaying exact paper size, borders & high-contrast styling</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="bg-amber-400 hover:bg-amber-300 text-neutral-900 px-3 py-1.5 font-sans font-black uppercase tracking-wider text-[10px] transition-colors flex items-center gap-1 cursor-pointer rounded"
                  >
                    <PrintIcon size={12} />
                    Execute Print
                  </button>
                  <button
                    onClick={() => setIsPrintPreview(false)}
                    className="bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 px-3 py-1.5 font-sans font-black uppercase tracking-wider text-[10px] transition-colors flex items-center gap-1 cursor-pointer rounded"
                  >
                    <EyeOff size={12} />
                    Exit Preview
                  </button>
                </div>
              </div>
            )}

            {!payslipTeacherId ? (
              <div className="py-16 text-center bg-neutral-900 border-4 border-neutral-800 p-6 rounded flex flex-col items-center justify-center space-y-3 print:hidden">
                <FileText size={48} className="text-neutral-600 stroke-[1.5]" />
                <p className="text-xs text-neutral-400 font-medium">Please select a teacher in the sidebar to load their monthly payslip.</p>
                <p className="text-[10px] text-neutral-500">Renders a professional, print-ready document formatted to high-contrast standard.</p>
              </div>
            ) : (
              <div 
                id="print-payslip-area" 
                className={`bg-white border-8 border-neutral-300 text-black space-y-6 mx-auto ${
                  isPrintPreview 
                    ? 'p-10 max-w-[190mm] shadow-none border-neutral-300 rounded-none' 
                    : 'p-8 sm:p-12 shadow-2xl rounded max-w-[800px]'
                } print:shadow-none print:bg-white print:text-black`}
              >
                
                {/* Official Slip Header */}
                <div className="text-center space-y-1.5 border-b-2 border-black pb-4">
                  <h2 className="text-2xl font-black uppercase tracking-tight font-sans">SAAKO HOLY CHILD ACADEMY</h2>
                  <p className="text-[10px] font-mono tracking-widest uppercase font-bold text-neutral-600">
                    P. O. Box LS 15, Sawla Savannah Region.
                  </p>
                  <span className="inline-block bg-black text-white text-[11px] font-black uppercase tracking-wider px-3 py-1 font-mono mt-2">
                    MONTHLY PERFORMANCE & SALARY DISBURSEMENT SLIP
                  </span>
                </div>

                {/* Meta details grid */}
                <div className="grid grid-cols-2 gap-4 text-xs font-mono border-b border-dashed border-neutral-400 pb-4">
                  <div className="space-y-1.5">
                    <div><span className="font-bold text-neutral-500">BENEFICIARY NAME:</span> <span className="font-black text-black uppercase">{payslipTeacher?.name}</span></div>
                    <div><span className="font-bold text-neutral-500">OCCUPATION / ROLE:</span> <span className="font-bold uppercase text-black">{payslipTeacher?.role}</span></div>
                    <div><span className="font-bold text-neutral-500">STIPEND BASE SALARY:</span> <span className="font-bold text-black">GHC {payslipCalculations.base.toFixed(2)}</span></div>
                  </div>
                  <div className="space-y-1.5 text-right">
                    <div><span className="font-bold text-neutral-500">PAYMENT PERIOD:</span> <span className="font-black text-black uppercase">{payslipMonthYear}</span></div>
                    <div><span className="font-bold text-neutral-500">SLIP PRINT DATE:</span> <span className="font-bold text-black">{new Date().toLocaleDateString()}</span></div>
                    <div><span className="font-bold text-neutral-500">DISBURSEMENT MODE:</span> <span className="font-bold text-black uppercase font-black">{payslipTeacher?.momoNumber ? 'MOBILE MONEY (MOMO)' : 'PHYSICAL CASH'}</span></div>
                  </div>
                </div>

                {/* Ratings & General Ethics list */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wide border-b border-black pb-1">Performance Evaluation & Morality Audit</h4>
                  
                  {currentSlipEvaluation ? (
                    <div className="space-y-3">
                      
                      {/* Ratings */}
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="border border-neutral-300 p-2 bg-neutral-50 flex justify-between items-center">
                          <span className="font-bold text-neutral-600 uppercase font-mono text-[10px]">Monthly Attendance Score:</span>
                          <span className="font-black text-black uppercase">{currentSlipEvaluation.attendanceScore}</span>
                        </div>
                        <div className="border border-neutral-300 p-2 bg-neutral-50 flex justify-between items-center">
                          <span className="font-bold text-neutral-600 uppercase font-mono text-[10px]">Monthly Punctuality Score:</span>
                          <span className="font-black text-black uppercase">{currentSlipEvaluation.punctualityScore}</span>
                        </div>
                      </div>

                      {/* Checked behaviors breakdown */}
                      <div className="border border-black">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-neutral-100 border-b border-black font-bold uppercase text-[10px] font-mono">
                              <th className="p-2 border-r border-black">Moral Ethic / Conduct Standard</th>
                              <th className="p-2 border-r border-black text-center">Type</th>
                              <th className="p-2 border-r border-black text-center">Percentage</th>
                              <th className="p-2 text-right">Monetary Impact</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-300 font-mono">
                            
                            {/* Attendance impact line */}
                            {(currentSlipEvaluation.attendanceScore === 'Fair' || currentSlipEvaluation.attendanceScore === 'Poor') && (() => {
                              const pct = currentSlipEvaluation.customAttendancePct !== undefined && currentSlipEvaluation.customAttendancePct !== null
                                ? currentSlipEvaluation.customAttendancePct
                                : (currentSlipEvaluation.attendanceScore === 'Fair' ? 2 : 5);
                              return (
                                <tr className="text-[11px]">
                                  <td className="p-2 border-r border-black font-sans font-semibold">Attendance Rating Impact ({currentSlipEvaluation.attendanceScore})</td>
                                  <td className="p-2 border-r border-black text-center text-red-600 uppercase font-black">DEDUCTION</td>
                                  <td className="p-2 border-r border-black text-center text-red-600">-{pct}%</td>
                                  <td className="p-2 text-right text-red-600 font-bold">-GHC {((payslipCalculations.base * pct) / 100).toFixed(2)}</td>
                                </tr>
                              );
                            })()}

                            {/* Punctuality impact line */}
                            {(currentSlipEvaluation.punctualityScore === 'Fair' || currentSlipEvaluation.punctualityScore === 'Poor') && (() => {
                              const pct = currentSlipEvaluation.customPunctualityPct !== undefined && currentSlipEvaluation.customPunctualityPct !== null
                                ? currentSlipEvaluation.customPunctualityPct
                                : (currentSlipEvaluation.punctualityScore === 'Fair' ? 2 : 5);
                              return (
                                <tr className="text-[11px]">
                                  <td className="p-2 border-r border-black font-sans font-semibold">Punctuality Rating Impact ({currentSlipEvaluation.punctualityScore})</td>
                                  <td className="p-2 border-r border-black text-center text-red-600 uppercase font-black">DEDUCTION</td>
                                  <td className="p-2 border-r border-black text-center text-red-600">-{pct}%</td>
                                  <td className="p-2 text-right text-red-600 font-bold">-GHC {((payslipCalculations.base * pct) / 100).toFixed(2)}</td>
                                </tr>
                              );
                            })()}

                            {currentSlipEvaluation.checkedEthics && currentSlipEvaluation.checkedEthics.length > 0 ? (
                              currentSlipEvaluation.checkedEthics.map(ethicId => {
                                const config = STANDARD_ETHICS.find(e => e.id === ethicId);
                                if (!config) return null;
                                const pct = currentSlipEvaluation.customPercentages?.[ethicId] !== undefined 
                                  ? currentSlipEvaluation.customPercentages[ethicId] 
                                  : config.percentage;
                                const amountGhc = (payslipCalculations.base * pct) / 100;
                                const isPos = config.type === 'positive';

                                return (
                                  <tr key={ethicId} className="text-[11px]">
                                    <td className="p-2 border-r border-black font-sans">
                                      <span className="font-semibold block">{config.label}</span>
                                      <span className="text-[9px] text-neutral-500 block leading-tight">{config.description}</span>
                                    </td>
                                    <td className={`p-2 border-r border-black text-center uppercase font-black ${isPos ? 'text-emerald-700' : 'text-red-600'}`}>
                                      {isPos ? 'BENEFIT' : 'DEDUCTION'}
                                    </td>
                                    <td className={`p-2 border-r border-black text-center ${isPos ? 'text-emerald-700' : 'text-red-600'}`}>
                                      {isPos ? '+' : '-'}{pct}%
                                    </td>
                                    <td className={`p-2 text-right font-bold ${isPos ? 'text-emerald-700' : 'text-red-600'}`}>
                                      {isPos ? '+' : '-'}GHC {amountGhc.toFixed(2)}
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={4} className="p-3 text-center text-neutral-500 italic font-sans">
                                  No additional specific ethics checked on-record.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-neutral-400 p-4 text-center text-xs text-neutral-500 italic">
                      No active performance log found for this worker in {payslipMonthYear}.
                      Paying standard basic salary rate with zero active behavioral percentage additions or deductions.
                    </div>
                  )}
                </div>

                {/* Financial Take-Home Summary Box */}
                <div className="border-2 border-black p-4 bg-neutral-50 space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider font-sans border-b border-neutral-300 pb-1">Earnings Tally Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div className="space-y-1">
                      <div className="flex justify-between"><span className="text-neutral-500">BASE PAY RATE:</span> <span className="font-bold text-black">GHC {payslipCalculations.base.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-neutral-500">TOTAL MORAL ADDITIONS:</span> <span className="font-bold text-emerald-700">+GHC {payslipCalculations.benefitGhc.toFixed(2)} ({payslipCalculations.benefit}%)</span></div>
                      <div className="flex justify-between"><span className="text-neutral-500">TOTAL MORAL DEDUCTIONS:</span> <span className="font-bold text-red-600">-GHC {payslipCalculations.deductionGhc.toFixed(2)} ({payslipCalculations.deduction}%)</span></div>
                    </div>
                    <div className="flex flex-col justify-center items-end border-l border-dashed border-neutral-300 pl-4">
                      <span className="text-[10px] font-sans font-black text-neutral-500 uppercase tracking-widest">NET PAY TAKE-HOME</span>
                      <span className="text-2xl font-black text-black font-sans">GHC {payslipCalculations.net.toFixed(2)}</span>
                      <span className="text-[9px] text-neutral-500 font-mono mt-0.5">ESTIMATED NET VALUE</span>
                    </div>
                  </div>
                </div>

                {/* Additional instructions and signatures */}
                <div className="space-y-6 pt-4 text-[10px]">
                  
                  {/* Evaluator notes if present */}
                  {currentSlipEvaluation?.notes && (
                    <div className="border border-neutral-300 p-3 bg-neutral-50 italic text-neutral-600 leading-relaxed rounded">
                      <span className="font-black uppercase tracking-wider not-italic block text-neutral-700 text-[8px] font-sans mb-1">Evaluator Notes:</span>
                      "{currentSlipEvaluation.notes}"
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-x-12 gap-y-8 pt-8 text-center font-mono border-t border-neutral-250">
                    <div className="border-t border-black pt-2 flex flex-col justify-between min-h-[52px]">
                      <p className="font-bold text-black uppercase text-[9px]">{payslipTeacher?.name || 'TEACHER / WORKER'}</p>
                      <span className="text-[8px] text-neutral-500 block mt-1">Teacher Signature / Thumbprint</span>
                    </div>
                    
                    <div className="border-t border-black pt-2 flex flex-col justify-between min-h-[52px]">
                      <p className="font-bold text-black uppercase text-[9px]">{currentSlipEvaluation?.recordedBy || 'System Administrator'}</p>
                      <span className="text-[8px] text-neutral-500 block mt-1">Log Recorded By</span>
                    </div>

                    <div className="border-t border-black pt-2 flex flex-col justify-between min-h-[52px] items-center">
                      <div className="flex flex-col items-center">
                        <div className="h-4 flex items-center justify-center relative px-2 py-0.5 bg-neutral-100 border border-neutral-300 rounded text-[7px] text-neutral-600 tracking-wider font-bold uppercase select-none">
                          ✓ SECURE ERP SIGNED
                        </div>
                        <p className="font-bold text-black uppercase text-[9px] mt-1.5">Authorized School Official</p>
                      </div>
                      <span className="text-[7.5px] text-neutral-500 font-bold block mt-1">
                        TS: {officialTimestamp}
                      </span>
                    </div>

                    <div className="border-t border-black pt-2 flex flex-col justify-between min-h-[52px]">
                      <p className="font-bold text-black uppercase text-[9px]">SAAKO HOLY CHILD ACADEMY</p>
                      <span className="text-[8px] text-neutral-500 block mt-1">Headmaster Stamp & Seal</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-6 pt-4 border-t border-neutral-200 text-left">
                    <div className="flex-1 space-y-1">
                      <div className="text-[8px] text-neutral-400 font-mono leading-relaxed">
                        This document is an official financial evaluation generated by the Saako Holy Child Academy ERP. 
                        Any alterations render this certificate null and void.
                      </div>
                      <div className="text-[7.5px] text-neutral-500 font-mono uppercase tracking-wider font-bold">
                        Secure Payroll Verification Key: SHC-PAY-{(payslipTeacherId || '').substring(0, 6).toUpperCase()}-{(payslipMonthYear || '').replace(/\s+/g, '-').toUpperCase()}
                      </div>
                    </div>
                    {payslipQrUrl && (
                      <div className="flex flex-col items-center shrink-0 border border-neutral-300 p-1 bg-white rounded shadow-sm">
                        <img 
                          src={payslipQrUrl} 
                          alt="Verification QR Code" 
                          className="w-12 h-12"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-[5.5px] font-mono font-black text-black tracking-widest mt-0.5">VERIFY AUDIT</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>
      )}

      {/* SUBVIEW 3: Printable Blank Checklist (Hard Copy Format with Checkboxes) */}
      {activeSubView === 'hardcopy' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
          
          {/* Print instructions sidebar (Hidden on print) */}
          <div className="lg:col-span-4 bg-neutral-900 border-4 border-neutral-800 p-6 space-y-4 print:hidden">
            <div className="border-b border-neutral-800 pb-3">
              <span className="text-[10px] font-mono font-black text-amber-500 uppercase">PHYSICAL VISIT RATING</span>
              <h4 className="text-sm font-black text-white uppercase tracking-wider font-sans">Hard Copy Sheets</h4>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Generate a hard copy rating checklist with checkboxes designed for manual classroom assessments. 
              Assessors can carry these physical templates on clipboard visits and manually check off teacher ethics.
            </p>

            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase font-black text-neutral-400">Pre-fill Staff Name (Optional)</label>
                <select
                  value={hardcopyTeacherId}
                  onChange={e => setHardcopyTeacherId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white font-bold rounded"
                >
                  <option value="">-- Leave Blank (Manual Write) --</option>
                  {staffMembers.map(staff => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} ({staff.role})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handlePrint}
                className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer rounded font-sans"
              >
                <PrintIcon size={14} />
                Print Assessment Sheet
              </button>
            </div>
          </div>

          {/* Hard Copy Page Paper Render */}
          <div className="lg:col-span-8">
            <div id="print-hardcopy-area" className="bg-white border-8 border-neutral-300 text-black p-8 sm:p-12 space-y-6 shadow-2xl rounded max-w-[800px] mx-auto print:shadow-none print:bg-white print:text-black">
              
              {/* Header */}
              <div className="text-center space-y-1 pb-4 border-b-2 border-black">
                <h3 className="text-xl font-black uppercase font-sans">SAAKO HOLY CHILD ACADEMY</h3>
                <p className="text-[10px] font-mono font-bold text-neutral-600">CLASSROOM VISIT & TEACHER MORALITY EVALUATION CHECKLIST</p>
                <span className="inline-block border border-black px-3 py-0.5 text-[9px] font-black uppercase font-mono mt-1">
                  HARD COPY ASSESSMENT SHEET (CLIPBOARD MANUAL RATING)
                </span>
              </div>

              {/* Blank Meta Lines for physical handwriting */}
              <div className="grid grid-cols-2 gap-6 text-xs font-mono pt-2">
                <div className="space-y-3">
                  <div>
                    <span className="font-bold text-neutral-600">TEACHER NAME:</span> 
                    <span className="border-b border-black inline-block w-48 ml-2 font-black text-black">
                      {hardcopyTeacherId ? (users.find(u => u.id === hardcopyTeacherId)?.name || '').toUpperCase() : '________________________'}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-neutral-600">CLASS VISITED:</span> 
                    <span className="border-b border-black inline-block w-48 ml-2">________________________</span>
                  </div>
                  <div>
                    <span className="font-bold text-neutral-600">DATE OF VISIT:</span> 
                    <span className="border-b border-black inline-block w-48 ml-2">________________________</span>
                  </div>
                </div>
                <div className="space-y-3 text-right">
                  <div>
                    <span className="font-bold text-neutral-600">EVALUATION MONTH:</span> 
                    <span className="border-b border-black inline-block w-36 ml-2 text-center font-bold">
                      {new Date().toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-neutral-600">VISITING EVALUATOR:</span> 
                    <span className="border-b border-black inline-block w-36 ml-2">________________________</span>
                  </div>
                  <div>
                    <span className="font-bold text-neutral-600">START / END TIME:</span> 
                    <span className="border-b border-black inline-block w-36 ml-2">________________________</span>
                  </div>
                </div>
              </div>

              {/* Core ratings section with checkboxes */}
              <div className="space-y-4 pt-4">
                <h4 className="text-xs font-black uppercase tracking-wider border-b border-black pb-1 font-sans">1. core behavior ratings</h4>
                
                <div className="grid grid-cols-2 gap-6 text-xs font-mono">
                  
                  {/* Attendance Checkboxes */}
                  <div className="border border-black p-3 space-y-2">
                    <span className="font-black uppercase text-[10px] border-b border-neutral-300 block pb-1">Teacher Attendance Rate:</span>
                    <label className="flex items-center gap-3 py-1 cursor-pointer">
                      <span className="inline-block w-4 h-4 border border-black text-center align-middle leading-none"></span>
                      <span>EXCELLENT RATING (+0% impact)</span>
                    </label>
                    <label className="flex items-center gap-3 py-1 cursor-pointer">
                      <span className="inline-block w-4 h-4 border border-black text-center align-middle leading-none"></span>
                      <span>GOOD RATING (+0% impact)</span>
                    </label>
                    <label className="flex items-center gap-3 py-1 cursor-pointer">
                      <span className="inline-block w-4 h-4 border border-black text-center align-middle leading-none"></span>
                      <span className="font-bold text-red-600">FAIR RATING (-2% deduction)</span>
                    </label>
                    <label className="flex items-center gap-3 py-1 cursor-pointer">
                      <span className="inline-block w-4 h-4 border border-black text-center align-middle leading-none"></span>
                      <span className="font-black text-red-600">POOR RATING (-5% deduction)</span>
                    </label>
                  </div>

                  {/* Punctuality Checkboxes */}
                  <div className="border border-black p-3 space-y-2">
                    <span className="font-black uppercase text-[10px] border-b border-neutral-300 block pb-1">Teacher Punctuality & Morale:</span>
                    <label className="flex items-center gap-3 py-1 cursor-pointer">
                      <span className="inline-block w-4 h-4 border border-black text-center align-middle leading-none"></span>
                      <span>EXCELLENT RATING (+0% impact)</span>
                    </label>
                    <label className="flex items-center gap-3 py-1 cursor-pointer">
                      <span className="inline-block w-4 h-4 border border-black text-center align-middle leading-none"></span>
                      <span>GOOD RATING (+0% impact)</span>
                    </label>
                    <label className="flex items-center gap-3 py-1 cursor-pointer">
                      <span className="inline-block w-4 h-4 border border-black text-center align-middle leading-none"></span>
                      <span className="font-bold text-red-600">FAIR RATING (-2% deduction)</span>
                    </label>
                    <label className="flex items-center gap-3 py-1 cursor-pointer">
                      <span className="inline-block w-4 h-4 border border-black text-center align-middle leading-none"></span>
                      <span className="font-black text-red-600">POOR RATING (-5% deduction)</span>
                    </label>
                  </div>

                </div>
              </div>

              {/* Ethics checklist checkboxes */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black uppercase tracking-wider border-b border-black pb-1 font-sans">2. school ethics & professional conduct standards</h4>
                
                <table className="w-full text-left border-collapse text-[11px] border border-black">
                  <thead>
                    <tr className="bg-neutral-100 border-b border-black font-bold uppercase text-[9px] font-mono">
                      <th className="p-2 border-r border-black text-center w-12">CHECK</th>
                      <th className="p-2 border-r border-black">Moral Ethic / Conduct Standard</th>
                      <th className="p-2 border-r border-black text-center">Standard Type</th>
                      <th className="p-2 text-right">Salary Percentage Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black font-mono">
                    {STANDARD_ETHICS.map(et => {
                      const isPos = et.type === 'positive';
                      return (
                        <tr key={et.id} className="align-middle">
                          <td className="p-2 border-r border-black text-center">
                            <span className="inline-block w-4 h-4 border border-black align-middle leading-none"></span>
                          </td>
                          <td className="p-2 border-r border-black font-sans leading-tight">
                            <span className="font-bold block">{et.label}</span>
                            <span className="text-[9px] text-neutral-500 block">{et.description}</span>
                          </td>
                          <td className={`p-2 border-r border-black text-center font-bold text-[9px] uppercase ${isPos ? 'text-emerald-700' : 'text-red-600'}`}>
                            {isPos ? 'MORAL BENEFIT' : 'NEGLIGENCE'}
                          </td>
                          <td className={`p-2 text-right font-bold text-[10px] ${isPos ? 'text-emerald-700' : 'text-red-600'}`}>
                            {isPos ? '+' : '-'}{et.percentage}% ON STIPEND BASE
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Offline Field Notes for clips */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-black uppercase tracking-wider border-b border-black pb-1 font-sans">3. offline field observation notes</h4>
                <div className="space-y-4 pt-2">
                  <div className="border-b border-neutral-400 h-6"></div>
                  <div className="border-b border-neutral-400 h-6"></div>
                  <div className="border-b border-neutral-400 h-6"></div>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-12 pt-8 text-center text-xs font-mono">
                <div className="border-t border-black pt-2">
                  <span className="text-[9px] text-neutral-500 block uppercase">Teacher / Staff Signature & Date</span>
                </div>
                <div className="border-t border-black pt-2">
                  <span className="text-[9px] text-neutral-500 block uppercase">Headmaster / Evaluator Approval Signature</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
};
