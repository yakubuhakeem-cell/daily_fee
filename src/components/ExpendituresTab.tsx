import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Expense, WorkerSalary, ExpenseCategory, PaymentMethod } from '../types';
import { 
  Plus, 
  Trash2, 
  Search, 
  Calendar, 
  Filter, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Receipt, 
  PieChart, 
  CheckCircle,
  FileSpreadsheet,
  Layers,
  ArrowRightLeft,
  FileText,
  AlertCircle,
  Printer,
  MessageSquare,
  X,
  Clock,
  Sparkles,
  Send
} from 'lucide-react';

export const ExpendituresTab: React.FC = () => {
  const { 
    expenses, 
    salaries, 
    payments, 
    users, 
    addExpense, 
    deleteExpense, 
    addSalary, 
    deleteSalary,
    currentDate,
    currentUser,
    playFeedbackSound,
    sendautomatedWhatsApp
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'expenses' | 'salaries' | 'analytics'>('expenses');

  // Expenses Form & Filter States
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('all');
  
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('Supplies');
  const [expDescription, setExpDescription] = useState('');
  const [expApprovedBy, setExpApprovedBy] = useState(currentUser?.name || '');
  const [expDate, setExpDate] = useState(currentDate);

  // Salaries Form & Filter States
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salarySearch, setSalarySearch] = useState('');
  const [salaryMonthFilter, setSalaryMonthFilter] = useState('all');

  const [salWorkerType, setSalWorkerType] = useState<'staff' | 'external'>('staff');
  const [salSelectedStaffId, setSalSelectedStaffId] = useState('');
  const [salCustomWorkerName, setSalCustomWorkerName] = useState('');
  const [salRole, setSalRole] = useState('Teacher');
  const [salBase, setSalBase] = useState('');
  const [salAllowance, setSalAllowance] = useState('');
  const [salDeduction, setSalDeduction] = useState('');
  const [salSsnitDeduction, setSalSsnitDeduction] = useState('');
  const [salIncomeTaxDeduction, setSalIncomeTaxDeduction] = useState('');
  const [salWelfareDeduction, setSalWelfareDeduction] = useState('');
  const [salHealthInsDeduction, setSalHealthInsDeduction] = useState('');
  const [salResponsibilityAllowance, setSalResponsibilityAllowance] = useState('');
  const [salTransportAllowance, setSalTransportAllowance] = useState('');
  const [salRentAllowance, setSalRentAllowance] = useState('');
  const [salMomoFeeAbsorbed, setSalMomoFeeAbsorbed] = useState('');
  const [salMethod, setSalMethod] = useState<PaymentMethod>('Cash');
  const [salMonthYear, setSalMonthYear] = useState(() => {
    const d = new Date();
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${months[d.getMonth()]} 2026`;
  });
  const [salDate, setSalDate] = useState(currentDate);
  const [salNotes, setSalNotes] = useState('');
  const [salMomoNumber, setSalMomoNumber] = useState('');
  const [salMomoName, setSalMomoName] = useState('');

  // Target payment day for worker salaries (e.g. 28th of every month)
  const [salaryPaymentDay, setSalaryPaymentDay] = useState<number>(() => {
    const saved = localStorage.getItem('shc_salary_payment_day');
    return saved ? parseInt(saved, 10) : 28;
  });
  const [isEditingPaymentDay, setIsEditingPaymentDay] = useState(false);
  const [tempPaymentDay, setTempPaymentDay] = useState(salaryPaymentDay.toString());

  // Recent payment success alert for employee (WhatsApp notice)
  const [recentPaymentAlert, setRecentPaymentAlert] = useState<WorkerSalary | null>(null);
  const [isSendingWhatsAppAlert, setIsSendingWhatsAppAlert] = useState(false);
  const [isManualDispatch, setIsManualDispatch] = useState(false);

  // Active Voucher selection for detail card & printable mini-slip
  const [selectedVoucherSalary, setSelectedVoucherSalary] = useState<WorkerSalary | null>(null);

  // Calculations
  const totalVerifiedRevenue = payments
    .filter(p => p.verified && !p.isAbsent)
    .reduce((sum, p) => sum + p.amount, 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSalaries = salaries.reduce((sum, s) => sum + s.netPaid, 0);
  const totalOutflow = totalExpenses + totalSalaries;
  const netPosition = totalVerifiedRevenue - totalOutflow;

  // Filtered Expenses
  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = e.description.toLowerCase().includes(expenseSearch.toLowerCase()) ||
                          e.approvedBy.toLowerCase().includes(expenseSearch.toLowerCase()) ||
                          e.category.toLowerCase().includes(expenseSearch.toLowerCase());
    let matchesCategory = expenseCategoryFilter === 'all';
    if (!matchesCategory) {
      if (expenseCategoryFilter === 'Utility' || expenseCategoryFilter === 'Utilities') {
        matchesCategory = e.category === 'Utility' || e.category === 'Utilities';
      } else {
        matchesCategory = e.category === expenseCategoryFilter;
      }
    }
    return matchesSearch && matchesCategory;
  });

  // Filtered Salaries
  const filteredSalaries = salaries.filter(s => {
    const matchesSearch = s.workerName.toLowerCase().includes(salarySearch.toLowerCase()) ||
                          s.role.toLowerCase().includes(salarySearch.toLowerCase());
    const matchesMonth = salaryMonthFilter === 'all' || s.monthYear === salaryMonthFilter;
    return matchesSearch && matchesMonth;
  });

  // Distinct Salary Months list
  const salaryMonths = Array.from(new Set(salaries.map(s => s.monthYear)));

  // Dynamic salary date schedule information
  const salaryDateAlertInfo = useMemo(() => {
    if (!currentDate) return null;
    
    try {
      const parts = currentDate.split('-');
      if (parts.length < 3) return null;
      
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);

      // We handle months dynamically
      const lastDayOfMonth = new Date(year, month, 0).getDate();
      const targetDay = Math.min(salaryPaymentDay, lastDayOfMonth);

      // Construct target date
      const targetDateStr = `${year}-${String(month).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
      
      const currentObj = new Date(currentDate + "T00:00:00");
      const targetObj = new Date(targetDateStr + "T00:00:00");
      
      // Calculate diff
      const diffTime = targetObj.getTime() - currentObj.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      const months = [
        "January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"
      ];
      const monthName = months[month - 1] || 'Current Month';

      return {
        targetDateStr,
        targetDay,
        monthName,
        diffDays,
        isToday: diffDays === 0,
        isOverdue: diffDays < 0,
        isUpcoming: diffDays > 0 && diffDays <= 5,
        isFar: diffDays > 5
      };
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [currentDate, salaryPaymentDay]);

  const downloadSingleSalaryCsv = (item: WorkerSalary) => {
    const headers = [
      "Voucher ID", "Payment Date", "Worker Name", "Role", "Period", 
      "Payment Mode", "Base Salary (GHC)", "General Allowance (GHC)", 
      "General Deduction (GHC)", "SSNIT contribution (GHC)", "PAYE Tax (GHC)", 
      "Welfare (GHC)", "NHIS Health (GHC)", "Responsibility Allow. (GHC)", 
      "Transport Allow. (GHC)", "Rent Allow. (GHC)", "Momo Fee Absorbed (GHC)", 
      "Net Salary Paid (GHC)", "Reference Notes"
    ];
    const dataRow = [
      `PAY-${item.id.substring(0, 8).toUpperCase()}`,
      item.date,
      item.workerName,
      item.role,
      item.monthYear,
      item.paymentMethod,
      item.baseSalary,
      item.allowance,
      item.deduction,
      item.ssnitDeduction || 0,
      item.incomeTaxDeduction || 0,
      item.welfareDeduction || 0,
      item.healthInsDeduction || 0,
      item.responsibilityAllowance || 0,
      item.transportAllowance || 0,
      item.rentAllowance || 0,
      item.momoFeeAbsorbed || 0,
      item.netPaid,
      item.notes || ''
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), dataRow.map(v => typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v).join(',')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SalarySlip_${item.workerName.replace(/\s+/g, '_')}_${item.monthYear.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Form Submissions
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(expAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      playFeedbackSound('error');
      alert('Please enter a valid expense amount.');
      return;
    }
    if (!expDescription.trim()) {
      playFeedbackSound('error');
      alert('Please enter an expense description.');
      return;
    }

    addExpense(amountVal, expCategory, expDescription.trim(), expApprovedBy.trim() || 'Administrator', expDate);
    playFeedbackSound('success');
    
    // Reset Form
    setExpAmount('');
    setExpDescription('');
    setExpDate(currentDate);
    setShowExpenseModal(false);
  };

  const handleAddSalary = (e: React.FormEvent) => {
    e.preventDefault();
    let workerName = '';
    let roleStr = salRole;
    let userIdValue: string | undefined = undefined;

    if (salWorkerType === 'staff') {
      const matchStaff = users.find(u => u.id === salSelectedStaffId);
      if (!matchStaff) {
        playFeedbackSound('error');
        alert('Please select an active staff member.');
        return;
      }
      workerName = matchStaff.name;
      roleStr = matchStaff.role;
      userIdValue = matchStaff.id;
    } else {
      if (!salCustomWorkerName.trim()) {
        playFeedbackSound('error');
        alert('Please enter the worker name.');
        return;
      }
      workerName = salCustomWorkerName.trim();
    }

    const baseVal = parseFloat(salBase) || 0;
    const allowanceVal = parseFloat(salAllowance) || 0;
    const deductionVal = parseFloat(salDeduction) || 0;
    const ssnitVal = parseFloat(salSsnitDeduction) || 0;
    const incomeTaxVal = parseFloat(salIncomeTaxDeduction) || 0;
    const welfareVal = parseFloat(salWelfareDeduction) || 0;
    const healthVal = parseFloat(salHealthInsDeduction) || 0;
    const respVal = parseFloat(salResponsibilityAllowance) || 0;
    const transVal = parseFloat(salTransportAllowance) || 0;
    const rentVal = parseFloat(salRentAllowance) || 0;
    const momoFeeVal = parseFloat(salMomoFeeAbsorbed) || 0;

    const netVal = baseVal + allowanceVal - deductionVal + respVal + transVal + rentVal + momoFeeVal - ssnitVal - healthVal - incomeTaxVal - welfareVal;

    if (baseVal <= 0) {
      playFeedbackSound('error');
      alert('Please specify a base salary greater than GHC 0.');
      return;
    }
    if (netVal < 0) {
      playFeedbackSound('error');
      alert('Net paid cannot be negative. Please adjust deductions.');
      return;
    }

    addSalary(
      workerName,
      roleStr,
      baseVal,
      allowanceVal,
      deductionVal,
      salMethod,
      salMonthYear,
      salDate,
      salNotes.trim() || undefined,
      userIdValue,
      salMethod === 'Mobile Money' ? (salMomoNumber.trim() || undefined) : undefined,
      salMethod === 'Mobile Money' ? (salMomoName.trim() || undefined) : undefined,
      ssnitVal || undefined,
      incomeTaxVal || undefined,
      welfareVal || undefined,
      healthVal || undefined,
      respVal || undefined,
      transVal || undefined,
      rentVal || undefined,
      momoFeeVal || undefined
    );
    playFeedbackSound('success');

    // Trigger visual payment success alert notice (Requirement 2)
    const newSalaryAlertObj: WorkerSalary = {
      id: `sal-alert-${Date.now()}`,
      workerName,
      role: roleStr,
      baseSalary: baseVal,
      allowance: allowanceVal,
      deduction: deductionVal,
      paymentMethod: salMethod,
      monthYear: salMonthYear,
      date: salDate,
      netPaid: netVal,
      notes: salNotes.trim() || undefined,
      timestamp: new Date().toISOString(),
      momoNumber: salMethod === 'Mobile Money' ? (salMomoNumber.trim() || undefined) : undefined,
      momoName: salMethod === 'Mobile Money' ? (salMomoName.trim() || undefined) : undefined,
      ssnitDeduction: ssnitVal || undefined,
      incomeTaxDeduction: incomeTaxVal || undefined,
      welfareDeduction: welfareVal || undefined,
      healthInsDeduction: healthVal || undefined,
      responsibilityAllowance: respVal || undefined,
      transportAllowance: transVal || undefined,
      rentAllowance: rentVal || undefined,
      momoFeeAbsorbed: momoFeeVal || undefined
    };
    setRecentPaymentAlert(newSalaryAlertObj);
    setIsManualDispatch(false);

    // Reset Form
    setSalBase('');
    setSalAllowance('');
    setSalDeduction('');
    setSalSsnitDeduction('');
    setSalIncomeTaxDeduction('');
    setSalWelfareDeduction('');
    setSalHealthInsDeduction('');
    setSalResponsibilityAllowance('');
    setSalTransportAllowance('');
    setSalRentAllowance('');
    setSalMomoFeeAbsorbed('');
    setSalNotes('');
    setSalCustomWorkerName('');
    setSalSelectedStaffId('');
    setSalMomoNumber('');
    setSalMomoName('');
    setSalDate(currentDate);
    setShowSalaryModal(false);
  };

  // Auto calculate net in salary modal
  const calcBase = parseFloat(salBase) || 0;
  const calcAllow = parseFloat(salAllowance) || 0;
  const calcDeduct = parseFloat(salDeduction) || 0;
  const calcSsnit = parseFloat(salSsnitDeduction) || 0;
  const calcIncomeTax = parseFloat(salIncomeTaxDeduction) || 0;
  const calcWelfare = parseFloat(salWelfareDeduction) || 0;
  const calcHealth = parseFloat(salHealthInsDeduction) || 0;
  const calcResp = parseFloat(salResponsibilityAllowance) || 0;
  const calcTrans = parseFloat(salTransportAllowance) || 0;
  const calcRent = parseFloat(salRentAllowance) || 0;
  const calcMomo = parseFloat(salMomoFeeAbsorbed) || 0;
  const currentNetPay = calcBase + calcAllow - calcDeduct + calcResp + calcTrans + calcRent + calcMomo - calcSsnit - calcHealth - calcIncomeTax - calcWelfare;

  const handleStaffChange = (staffId: string) => {
    setSalSelectedStaffId(staffId);
    const selected = users.find(u => u.id === staffId);
    if (selected) {
      setSalRole(selected.role);
      if (selected.stipendSalary !== undefined) {
        setSalBase(selected.stipendSalary.toString());
      } else {
        setSalBase('');
      }
      setSalMomoNumber(selected.momoNumber || '');
      setSalMomoName(selected.momoName || '');
    } else {
      setSalBase('');
      setSalMomoNumber('');
      setSalMomoName('');
    }
  };

  return (
    <div className="space-y-6">
      {/* 3-Column Financial Bento Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Collections Box */}
        <div className="bg-neutral-900 border-4 border-neutral-800 p-6 flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 font-mono">School Gate Collection</span>
            <h4 className="text-3xl font-black text-emerald-400 font-mono tracking-tight">GH₵ {totalVerifiedRevenue.toFixed(2)}</h4>
            <p className="text-[10px] font-bold text-neutral-500">Excludes absent student tallies</p>
          </div>
          <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-400/20 p-3.5 rounded-full">
            <ArrowRightLeft size={24} />
          </div>
        </div>

        {/* Total Outflow Box */}
        <div className="bg-neutral-900 border-4 border-neutral-800 p-6 flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 font-mono">Total Expenditures</span>
            <h4 className="text-3xl font-black text-red-400 font-mono tracking-tight">GH₵ {totalOutflow.toFixed(2)}</h4>
            <p className="text-[10px] font-bold text-neutral-500">
              GH₵ {totalExpenses.toFixed(2)} expenses • GH₵ {totalSalaries.toFixed(2)} payroll
            </p>
          </div>
          <div className="bg-red-500/10 text-red-400 border border-red-400/20 p-3.5 rounded-full">
            <TrendingDown size={24} />
          </div>
        </div>

        {/* Net Operating Position Box */}
        <div className={`p-6 border-4 flex items-center justify-between shadow-xl transition-all ${
          netPosition >= 0 
            ? 'bg-neutral-900 border-emerald-500/60' 
            : 'bg-neutral-900 border-red-500/60'
        }`}>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 font-mono">Net Operating Position</span>
            <h4 className={`text-3xl font-black font-mono tracking-tight ${
              netPosition >= 0 ? 'text-amber-400' : 'text-red-500'
            }`}>
              GH₵ {netPosition.toFixed(2)}
            </h4>
            <p className="text-[10px] font-bold text-neutral-500">
              {netPosition >= 0 ? "Surplus Cash Position" : "Deficit operating margins"}
            </p>
          </div>
          <div className={`p-3.5 rounded-full border ${
            netPosition >= 0 
              ? 'bg-amber-500/10 text-amber-400 border-amber-400/20' 
              : 'bg-red-500/10 text-red-400 border-red-400/20'
          }`}>
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      {/* Selector Subtabs Menu */}
      <div className="bg-neutral-900 border-4 border-neutral-800 p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2 p-1 bg-neutral-950 border border-neutral-800 w-full sm:w-auto">
          <button
            onClick={() => setActiveSubTab('expenses')}
            className={`px-5 py-2 font-black text-[11px] uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeSubTab === 'expenses'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            <Receipt size={14} />
            Daily Expenses
          </button>
          <button
            onClick={() => setActiveSubTab('salaries')}
            className={`px-5 py-2 font-black text-[11px] uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeSubTab === 'salaries'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            <Users size={14} />
            Workers & Salaries
          </button>
          <button
            onClick={() => setActiveSubTab('analytics')}
            className={`px-5 py-2 font-black text-[11px] uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeSubTab === 'analytics'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            <PieChart size={14} />
            Flow Statements
          </button>
        </div>

        {/* Dynamic Add Trigger Action buttons */}
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          {activeSubTab === 'expenses' && (
            <button
              onClick={() => setShowExpenseModal(true)}
              className="bg-amber-400 hover:bg-amber-500 active:scale-95 text-black px-4 py-2 font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all w-full sm:w-auto justify-center"
            >
              <Plus size={14} />
              Log Expense
            </button>
          )}

          {activeSubTab === 'salaries' && (
            <button
              onClick={() => setShowSalaryModal(true)}
              className="bg-amber-400 hover:bg-amber-500 active:scale-95 text-black px-4 py-2 font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all w-full sm:w-auto justify-center"
            >
              <Plus size={14} />
              Pay Salary
            </button>
          )}
        </div>
      </div>

      {/* Subtab Contents panels */}
      {activeSubTab === 'expenses' && (
        <div className="bg-neutral-900 border-4 border-neutral-800 p-6 space-y-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-neutral-950 p-4 border border-neutral-800">
            {/* Search */}
            <div className="relative w-full md:w-72">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-500">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Search logged expenses..."
                value={expenseSearch}
                onChange={e => setExpenseSearch(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-850 pl-9 pr-4 py-2 text-xs font-bold text-white rounded focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <Filter size={12} className="text-neutral-500" />
              <select
                value={expenseCategoryFilter}
                onChange={e => setExpenseCategoryFilter(e.target.value)}
                className="bg-neutral-900 border border-neutral-850 text-neutral-400 text-xs font-bold px-3 py-1.5 focus:outline-none rounded"
              >
                <option value="all">All Categories</option>
                <option value="Supplies">Supplies</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Utility">Utility</option>
                <option value="Payroll">Payroll</option>
                <option value="Food">Food / Meals</option>
                <option value="Transport">Transport & Travel</option>
                <option value="Uniforms">Uniforms & Merch</option>
                <option value="Others">Others</option>
              </select>
            </div>
          </div>

          {/* Table list */}
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12 bg-neutral-950 border-2 border-neutral-850">
              <Receipt className="mx-auto text-neutral-600 mb-3" size={32} />
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">No matching business expenditures logged.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-950 text-neutral-400 font-mono border-b border-neutral-850">
                    <th className="p-4 font-black uppercase">Logged Date</th>
                    <th className="p-4 font-black uppercase">Expense Category</th>
                    <th className="p-4 font-black uppercase">Description</th>
                    <th className="p-4 font-black uppercase">Witness/Approved By</th>
                    <th className="p-4 font-black uppercase text-right">Debit Cash (GHC)</th>
                    <th className="p-4 font-black uppercase text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850">
                  {filteredExpenses.map(item => (
                    <tr key={item.id} className="hover:bg-neutral-950/40 transition-colors">
                      <td className="p-4 font-mono font-bold text-neutral-300">{item.date}</td>
                      <td className="p-4">
                        <span className="bg-neutral-950 text-neutral-300 px-2.5 py-1 border border-neutral-800 rounded font-bold">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-4 text-neutral-300 font-bold">{item.description}</td>
                      <td className="p-4 text-neutral-400 font-semibold">{item.approvedBy}</td>
                      <td className="p-4 font-mono font-bold text-right text-red-400">
                        -{parseFloat(item.amount.toString()).toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => {
                            if (confirm('Void payment execution and delete record?')) {
                              deleteExpense(item.id);
                              playFeedbackSound('warning');
                            }
                          }}
                          className="text-neutral-500 hover:text-red-500 transition-colors p-1"
                          title="Void expense record"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'salaries' && (
        <div className="bg-neutral-900 border-4 border-neutral-800 p-6 space-y-6">
          {/* Salary Date Alert / Schedule Banner (Requirement 1) */}
          {salaryDateAlertInfo && (
            <div className={`p-4 md:p-5 border-2 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
              salaryDateAlertInfo.isToday 
                ? 'bg-amber-950/40 border-amber-400 text-amber-200 animate-pulse'
                : salaryDateAlertInfo.isOverdue
                ? 'bg-red-950/40 border-red-500/80 text-red-200'
                : 'bg-neutral-950 border-neutral-800 text-neutral-300'
            }`}>
              <div className="flex items-start gap-3.5">
                <div className={`p-2.5 rounded border mt-0.5 ${
                  salaryDateAlertInfo.isToday 
                    ? 'bg-amber-400 text-neutral-950 border-amber-300'
                    : salaryDateAlertInfo.isOverdue
                    ? 'bg-red-500 text-white border-red-400'
                    : 'bg-neutral-900 text-amber-400 border-neutral-800'
                }`}>
                  <Clock size={18} className={salaryDateAlertInfo.isToday ? "animate-spin-slow" : ""} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest font-mono text-white flex items-center gap-2">
                    Staff Salary Disbursement Alert
                    {salaryDateAlertInfo.isToday && <span className="bg-amber-400 text-neutral-950 text-[9px] px-1.5 py-0.5 font-bold animate-bounce rounded-xs">Payday Today</span>}
                    {salaryDateAlertInfo.isOverdue && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 font-bold rounded-xs">Overdue Notice</span>}
                  </h4>
                  <p className="text-[11px] mt-1 text-neutral-400 font-bold">
                    Target payment is configured for day <strong className="text-white text-xs">{salaryDateAlertInfo.targetDay}</strong> of each month (Scheduled: <span className="text-amber-400 font-mono font-black">{salaryDateAlertInfo.monthName} {salaryDateAlertInfo.targetDay}, {new Date().getFullYear()}</span>).
                  </p>
                  <p className="text-[11px] mt-0.5 font-mono">
                    {salaryDateAlertInfo.isToday ? (
                      <span className="text-amber-400 font-black">⚡ PAYDAY TODAY! Please record all payroll transfers below.</span>
                    ) : salaryDateAlertInfo.isOverdue ? (
                      <span className="text-red-400 font-black">⚠️ Payout was scheduled {Math.abs(salaryDateAlertInfo.diffDays)} day(s) ago. Check ledger status!</span>
                    ) : (
                      <span className="text-emerald-400 font-black">📅 {salaryDateAlertInfo.diffDays} day(s) remaining until payroll target date.</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Inline config tool to change target day */}
              <div className="flex items-center gap-2 shrink-0 border-t border-neutral-800 md:border-t-0 pt-3 md:pt-0">
                {isEditingPaymentDay ? (
                  <div className="flex items-center gap-1.5 bg-neutral-900 p-1 border border-neutral-800 rounded">
                    <span className="text-[9px] uppercase font-mono text-neutral-400 px-1">Day:</span>
                    <input 
                      type="number"
                      min="1"
                      max="31"
                      value={tempPaymentDay}
                      onChange={e => setTempPaymentDay(e.target.value)}
                      className="w-12 bg-neutral-950 text-white text-xs font-black font-mono text-center focus:outline-none p-1 border border-neutral-850"
                    />
                    <button
                      onClick={() => {
                        const val = parseInt(tempPaymentDay, 10);
                        if (isNaN(val) || val < 1 || val > 31) {
                          alert("Please specify a day between 1 and 31.");
                          return;
                        }
                        setSalaryPaymentDay(val);
                        try {
                          localStorage.setItem('shc_salary_payment_day', val.toString());
                        } catch (e) {}
                        setIsEditingPaymentDay(false);
                        playFeedbackSound('success');
                      }}
                      className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-[9px] font-black px-2.5 py-1 uppercase rounded-xs transition-colors cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingPaymentDay(false);
                        setTempPaymentDay(salaryPaymentDay.toString());
                      }}
                      className="text-neutral-400 hover:text-white text-[9px] font-mono px-1.5 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setIsEditingPaymentDay(true);
                      playFeedbackSound('click');
                    }}
                    className="bg-neutral-950 hover:bg-neutral-850 text-neutral-300 hover:text-white text-[10px] font-bold uppercase tracking-wider px-3.5 py-2 border border-neutral-800 hover:border-neutral-700 flex items-center gap-1.5 transition-all cursor-pointer rounded"
                  >
                    <Calendar size={12} className="text-amber-400" />
                    <span>Configure Pay Date</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-neutral-950 p-4 border border-neutral-800">
            {/* Search */}
            <div className="relative w-full md:w-72">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-500">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Search staff salaries..."
                value={salarySearch}
                onChange={e => setSalarySearch(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-850 pl-9 pr-4 py-2 text-xs font-bold text-white rounded focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Filter Month */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <Filter size={12} className="text-neutral-500" />
              <select
                value={salaryMonthFilter}
                onChange={e => setSalaryMonthFilter(e.target.value)}
                className="bg-neutral-900 border border-neutral-850 text-neutral-400 text-xs font-bold px-3 py-1.5 focus:outline-none rounded"
              >
                <option value="all">All Operational Months</option>
                {salaryMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table list */}
          {filteredSalaries.length === 0 ? (
            <div className="text-center py-12 bg-neutral-950 border-2 border-neutral-850">
              <Users className="mx-auto text-neutral-600 mb-3" size={32} />
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">No employee wage slips or payroll recorded.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-950 text-neutral-400 font-mono border-b border-neutral-850">
                    <th className="p-4 font-black uppercase">Disbursement Date</th>
                    <th className="p-4 font-black uppercase">Employee / Worker</th>
                    <th className="p-4 font-black uppercase">Role</th>
                    <th className="p-4 font-black uppercase">Pay Period</th>
                    <th className="p-4 font-black uppercase text-center">Base / Allow. / Deduct. (GHC)</th>
                    <th className="p-4 font-black uppercase">Mode</th>
                    <th className="p-4 font-black uppercase text-right">Net Transferred (GHC)</th>
                    <th className="p-4 font-black uppercase text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850">
                  {filteredSalaries.map(item => (
                    <tr key={item.id} className="hover:bg-neutral-950/40 transition-colors">
                      <td className="p-4 font-mono font-bold text-neutral-300">{item.date}</td>
                      <td className="p-4">
                        <div className="font-bold text-neutral-200">{item.workerName}</div>
                        {item.userId && (
                          <div className="text-[10px] text-neutral-500 font-mono uppercase">Staff Linked</div>
                        )}
                      </td>
                      <td className="p-4 text-neutral-400 font-bold">{item.role}</td>
                      <td className="p-4 font-semibold text-neutral-300">{item.monthYear}</td>
                      <td className="p-4 text-center font-mono font-medium text-neutral-400 text-[11px]">
                        <div>
                          GH₵ {item.baseSalary.toFixed(2)} • <span className="text-emerald-400">+{item.allowance.toFixed(2)}</span> • <span className="text-red-400">-{item.deduction.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-wrap justify-center gap-1.5 mt-1 font-mono text-[9px]">
                          {item.responsibilityAllowance ? <span className="text-emerald-500/90 whitespace-nowrap" title="Responsibility Allowance">Resp: +{item.responsibilityAllowance.toFixed(2)}</span> : null}
                          {item.transportAllowance ? <span className="text-emerald-500/90 whitespace-nowrap" title="Transport Allowance">Trn: +{item.transportAllowance.toFixed(2)}</span> : null}
                          {item.rentAllowance ? <span className="text-emerald-500/90 whitespace-nowrap" title="Rent Allowance">Rnt: +{item.rentAllowance.toFixed(2)}</span> : null}
                          {item.momoFeeAbsorbed ? <span className="text-emerald-500/90 whitespace-nowrap" title="MoMo Transaction Fee Absorbed">MoMo Fee: +{item.momoFeeAbsorbed.toFixed(2)}</span> : null}
                          {item.ssnitDeduction ? <span className="text-red-400/95 whitespace-nowrap" title="SSNIT Contribution">SSNIT: -{item.ssnitDeduction.toFixed(2)}</span> : null}
                          {item.incomeTaxDeduction ? <span className="text-red-400/95 whitespace-nowrap" title="Income Tax / PAYE">Tax: -{item.incomeTaxDeduction.toFixed(2)}</span> : null}
                          {item.welfareDeduction ? <span className="text-red-400/95 whitespace-nowrap" title="Welfare Contribution">Welf: -{item.welfareDeduction.toFixed(2)}</span> : null}
                          {item.healthInsDeduction ? <span className="text-red-400/95 whitespace-nowrap" title="Health Insurance (NHIS) Deduction">NHIS: -{item.healthInsDeduction.toFixed(2)}</span> : null}
                        </div>
                      </td>
                      <td className="p-4 text-neutral-300 font-bold">
                        <span className="bg-neutral-950 px-2 py-0.5 border border-neutral-800 text-[10px]">
                          {item.paymentMethod}
                        </span>
                        {item.paymentMethod === 'Mobile Money' && item.momoNumber && (
                          <div className="text-[10px] text-amber-500 font-bold mt-1 font-mono">
                            ☎ {item.momoNumber} {item.momoName ? `(${item.momoName})` : ''}
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-mono font-black text-right text-red-400 text-sm">
                        -{parseFloat(item.netPaid.toString()).toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedVoucherSalary(item);
                              playFeedbackSound('click');
                            }}
                            className="text-amber-400 hover:text-amber-300 font-bold bg-neutral-950 border border-neutral-800 hover:border-amber-400/50 px-2 py-1 flex items-center gap-1 transition-all text-[9px] uppercase font-mono rounded-xs cursor-pointer"
                            title="View Employee Salary Slip & All-Time Ledger Voucher"
                          >
                            <FileText size={11} />
                            <span>Slip</span>
                          </button>
                          <button
                            onClick={() => {
                              setRecentPaymentAlert(item);
                              setIsManualDispatch(true);
                              playFeedbackSound('click');
                            }}
                            className="text-emerald-400 hover:text-emerald-300 font-bold bg-neutral-950 border border-neutral-800 hover:border-emerald-400/50 px-2 py-1 flex items-center gap-1 transition-all text-[9px] uppercase font-mono rounded-xs cursor-pointer"
                            title="Directly Send Salary Alert / Pay Notice via WhatsApp"
                          >
                            <MessageSquare size={11} className="text-emerald-500" />
                            <span>WhatsApp</span>
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Void salary paycheck and delete record?')) {
                                deleteSalary(item.id);
                                playFeedbackSound('warning');
                              }
                            }}
                            className="text-neutral-500 hover:text-red-500 transition-colors p-1 bg-neutral-950 border border-neutral-800 hover:border-red-500/30 rounded-xs cursor-pointer"
                            title="Void salary register entry"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'analytics' && (
        <div className="bg-neutral-900 border-4 border-neutral-800 p-8 space-y-8">
          
          <div className="border-b-4 border-neutral-800 pb-4">
            <h3 className="text-lg font-black uppercase tracking-wider text-white">Consolidated Operating Flow Statement</h3>
            <p className="text-xs text-neutral-400 mt-1">
              Live financial analysis compiling tuition admissions collections versus internal operational overheads.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Ledger summary list */}
            <div className="bg-neutral-950 border-2 border-neutral-850 p-6 space-y-6">
              <h4 className="text-xs uppercase font-bold tracking-widest text-amber-400 font-mono">Consolidated Ledger Detail</h4>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-neutral-850 pb-2">
                  <span className="text-xs font-semibold text-neutral-400">Gross School Gate Revenue (A)</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">GH₵ {totalVerifiedRevenue.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center border-b border-neutral-850 pb-2">
                  <span className="text-xs font-semibold text-neutral-400">Tuition Refunds / Unverified</span>
                  <span className="text-sm font-bold text-neutral-500 font-mono">GH₵ 0.00</span>
                </div>

                <div className="flex justify-between items-center border-b border-neutral-850 pb-2">
                  <span className="text-xs font-semibold text-neutral-400">Daily Administrative Expenses (B)</span>
                  <span className="text-sm font-bold text-red-400 font-mono">GH₵ {totalExpenses.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center border-b border-neutral-850 pb-2">
                  <span className="text-xs font-semibold text-neutral-400">Workers Academic Payroll (C)</span>
                  <span className="text-sm font-bold text-red-400 font-mono">GH₵ {totalSalaries.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center border-b-2 border-neutral-800 pb-2 bg-neutral-900/50 p-2">
                  <span className="text-xs font-semibold text-neutral-300">Total Operating Overhead (B + C)</span>
                  <span className="text-sm font-bold text-red-400 font-mono">GH₵ {totalOutflow.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center bg-neutral-900 p-3 border border-neutral-800">
                  <span className="text-xs font-black uppercase text-white">Net Operating Margin (A - Outflow)</span>
                  <span className={`text-base font-black font-mono ${
                    netPosition >= 0 ? 'text-amber-400' : 'text-red-500'
                  }`}>
                    GH₵ {netPosition.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Categorized Overhead Bar Chart / Breakdown */}
            <div className="bg-neutral-950 border-2 border-neutral-850 p-6 space-y-6">
              <h4 className="text-xs uppercase font-bold tracking-widest text-amber-400 font-mono">Overhead Expenditures Breakdown</h4>
              
              <div className="space-y-4">
                {/* Supplies Block */}
                {(() => {
                  const suppliesTotal = expenses.filter(e => e.category === 'Supplies').reduce((s, e) => s + e.amount, 0);
                  const share = totalOutflow > 0 ? (suppliesTotal / totalOutflow) * 100 : 0;
                  return (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-neutral-300">
                        <span>Supplies</span>
                        <span>GH₵ {suppliesTotal.toFixed(2)} ({share.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-neutral-900 h-2.5 rounded overflow-hidden">
                        <div className="bg-blue-400 h-full" style={{ width: `${share}%` }}></div>
                      </div>
                    </div>
                  );
                })()}

                {/* Maintenance Block */}
                {(() => {
                  const maintenanceTotal = expenses.filter(e => e.category === 'Maintenance').reduce((s, e) => s + e.amount, 0);
                  const share = totalOutflow > 0 ? (maintenanceTotal / totalOutflow) * 100 : 0;
                  return (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-neutral-300">
                        <span>Maintenance</span>
                        <span>GH₵ {maintenanceTotal.toFixed(2)} ({share.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-neutral-900 h-2.5 rounded overflow-hidden">
                        <div className="bg-amber-400 h-full" style={{ width: `${share}%` }}></div>
                      </div>
                    </div>
                  );
                })()}

                {/* Utility Block */}
                {(() => {
                  const utilityTotal = expenses.filter(e => e.category === 'Utility' || e.category === 'Utilities').reduce((s, e) => s + e.amount, 0);
                  const share = totalOutflow > 0 ? (utilityTotal / totalOutflow) * 100 : 0;
                  return (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-neutral-300">
                        <span>Utility</span>
                        <span>GH₵ {utilityTotal.toFixed(2)} ({share.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-neutral-900 h-2.5 rounded overflow-hidden">
                        <div className="bg-cyan-400 h-full" style={{ width: `${share}%` }}></div>
                      </div>
                    </div>
                  );
                })()}

                {/* Payroll Block */}
                {(() => {
                  const payrollExps = expenses.filter(e => e.category === 'Payroll').reduce((s, e) => s + e.amount, 0);
                  const totalPayrollAndSalaries = totalSalaries + payrollExps;
                  const share = totalOutflow > 0 ? (totalPayrollAndSalaries / totalOutflow) * 100 : 0;
                  return (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-neutral-300">
                        <span>Payroll & Worker Salaries</span>
                        <span>GH₵ {totalPayrollAndSalaries.toFixed(2)} ({share.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-neutral-900 h-2.5 rounded overflow-hidden">
                        <div className="bg-emerald-400 h-full" style={{ width: `${share}%` }}></div>
                      </div>
                    </div>
                  );
                })()}

                {/* Food block */}
                {(() => {
                  const foodTotal = expenses.filter(e => e.category === 'Food').reduce((s, e) => s + e.amount, 0);
                  const share = totalOutflow > 0 ? (foodTotal / totalOutflow) * 100 : 0;
                  return (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-neutral-300">
                        <span>Meals / Kitchen Dining</span>
                        <span>GH₵ {foodTotal.toFixed(2)} ({share.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-neutral-900 h-2.5 rounded overflow-hidden">
                        <div className="bg-indigo-400 h-full" style={{ width: `${share}%` }}></div>
                      </div>
                    </div>
                  );
                })()}

                {/* Other/Misc. block */}
                {(() => {
                  const miscTotal = expenses.filter(e => e.category === 'Transport' || e.category === 'Uniforms' || e.category === 'Others').reduce((s, e) => s + e.amount, 0);
                  const share = totalOutflow > 0 ? (miscTotal / totalOutflow) * 100 : 0;
                  return (
                    <div className="space-y-1 pt-2 border-t border-neutral-850">
                      <div className="flex justify-between text-xs font-bold text-neutral-300">
                        <span>Transport & Other Miscellaneous</span>
                        <span>GH₵ {miscTotal.toFixed(2)} ({share.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-neutral-900 h-2.5 rounded overflow-hidden">
                        <div className="bg-neutral-600 h-full" style={{ width: `${share}%` }}></div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Daily Expense Modal Popup */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-neutral-900 border-4 border-neutral-800 p-8 w-full max-w-lg shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b-2 border-neutral-800 pb-3">
              <h3 className="text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Receipt size={18} className="text-amber-400" />
                Record Daily Overhead Expenditure
              </h3>
              <button 
                onClick={() => setShowExpenseModal(false)}
                className="text-neutral-500 hover:text-white font-mono font-bold text-sm"
              >
                [X] Close
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase font-black tracking-wider text-neutral-400">Expense Date</label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={e => setExpDate(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white font-bold rounded"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase font-black tracking-wider text-neutral-400">Debit Cash Amount (GHC)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 150.00"
                    value={expAmount}
                    onChange={e => setExpAmount(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white font-black rounded focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase font-black tracking-wider text-neutral-400">Expense Category</label>
                  <select
                    value={expCategory}
                    onChange={e => setExpCategory(e.target.value as ExpenseCategory)}
                    className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-neutral-300 font-bold rounded"
                  >
                    <option value="Supplies">Supplies & Desk Stationary</option>
                    <option value="Maintenance">Maintenance & Repairs</option>
                    <option value="Utility">Utility & Bills (Power/Water)</option>
                    <option value="Payroll">Payroll & Outsource Payments</option>
                    <option value="Food">Food / Meals / Catering</option>
                    <option value="Transport">Transport & Motor GHC</option>
                    <option value="Uniforms">Student Uniforms</option>
                    <option value="Others">Others / Miscellaneous</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase font-black tracking-wider text-neutral-400">Approved By</label>
                  <input
                    type="text"
                    required
                    placeholder="Display name of approver"
                    value={expApprovedBy}
                    onChange={e => setExpApprovedBy(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white font-bold rounded"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase font-black tracking-wider text-neutral-400">Purpose Description / Notes</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Purchased 4 boxes of colored dynamic board markers and chalks from warehouse supplier."
                  value={expDescription}
                  onChange={e => setExpDescription(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white font-medium rounded focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="pt-4 border-t border-neutral-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-5 py-2.5 border border-neutral-800 text-[11px] font-black uppercase tracking-wider text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-black text-[11px] font-black uppercase tracking-widest"
                >
                  ✓ Commit Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Worker Salary Modal Popup */}
      {showSalaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-neutral-900 border-4 border-neutral-800 p-6 md:p-8 w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center border-b-2 border-neutral-800 pb-3 shrink-0 mb-4">
              <h3 className="text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Users size={18} className="text-amber-400" />
                Disburse Employee Wages / Salary
              </h3>
              <button 
                onClick={() => setShowSalaryModal(false)}
                className="text-neutral-500 hover:text-white font-mono font-bold text-sm"
              >
                [X] Close
              </button>
            </div>

            <form onSubmit={handleAddSalary} className="flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto pr-2 space-y-4 flex-1 min-h-0 [scrollbar-width:thin] [scrollbar-color:rgba(251,191,36,0.3)_rgba(0,0,0,0)]">
                {/* Worker Type selector */}
                <div className="flex gap-4 p-1 bg-neutral-950 border border-neutral-850">
                  <button
                    type="button"
                    onClick={() => setSalWorkerType('staff')}
                    className={`flex-1 py-1.5 font-bold text-[10px] uppercase tracking-wider ${
                      salWorkerType === 'staff' ? 'bg-amber-400 text-black' : 'text-neutral-500 hover:text-white'
                    }`}
                  >
                    Registered School Staff
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalWorkerType('external')}
                    className={`flex-1 py-1.5 font-bold text-[10px] uppercase tracking-wider ${
                      salWorkerType === 'external' ? 'bg-amber-400 text-black' : 'text-neutral-500 hover:text-white'
                    }`}
                  >
                    External / Temporary Worker
                  </button>
                </div>

                {salWorkerType === 'staff' ? (
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase font-black tracking-wider text-neutral-400">Select Registered Employee</label>
                    <select
                      required
                      value={salSelectedStaffId}
                      onChange={e => handleStaffChange(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-neutral-200 font-bold rounded"
                    >
                      <option value="">-- Choose Staff Profile --</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase font-black tracking-wider text-neutral-400">Contractor / Worker Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ama Serwaa (Cleaning)"
                        value={salCustomWorkerName}
                        onChange={e => setSalCustomWorkerName(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white font-bold rounded"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase font-black tracking-wider text-neutral-400">Assigned Job Designation</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Caretaker, Security, Cleaner"
                        value={salRole}
                        onChange={e => setSalRole(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white font-bold rounded"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase font-black tracking-wider text-neutral-400">Payment Date</label>
                    <input
                      type="date"
                      required
                      value={salDate}
                      onChange={e => setSalDate(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white font-bold rounded"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase font-black tracking-wider text-neutral-400">Salary Reference Period</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. June 2026"
                      value={salMonthYear}
                      onChange={e => setSalMonthYear(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white font-bold rounded"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase font-black tracking-wider text-neutral-400">Disbursement Mode</label>
                    <select
                      value={salMethod}
                      onChange={e => setSalMethod(e.target.value as PaymentMethod)}
                      className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-neutral-300 font-bold rounded"
                    >
                      <option value="Cash">Cash GHC</option>
                      <option value="Mobile Money">Mobile Money (Momo)</option>
                      <option value="Bank Transfer">Bank Electronic Draft</option>
                    </select>
                  </div>
                </div>

                {salMethod === 'Mobile Money' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-amber-400/5 p-4 border border-amber-400/20 rounded">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase font-black tracking-wider text-amber-400">Momo Registered No.</label>
                      <input
                        type="text"
                        placeholder="e.g. 0541234567"
                        value={salMomoNumber}
                        onChange={e => setSalMomoNumber(e.target.value)}
                        className="w-full bg-neutral-950 border border-amber-400/30 focus:border-amber-400 p-2.5 text-xs text-white font-bold rounded font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase font-black tracking-wider text-amber-400">Registered Momo Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Mary Appiah"
                        value={salMomoName}
                        onChange={e => setSalMomoName(e.target.value)}
                        className="w-full bg-neutral-950 border border-amber-400/30 focus:border-amber-400 p-2.5 text-xs text-white font-bold rounded"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-neutral-850 pt-3.5 mt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase font-black tracking-wider text-neutral-400">Base Salary (GHC)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={salBase}
                      onChange={e => setSalBase(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white font-bold rounded"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase font-black tracking-wider text-emerald-400">General Allowance</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={salAllowance}
                      onChange={e => setSalAllowance(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white font-bold rounded"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase font-black tracking-wider text-red-400">General Deduct.</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={salDeduction}
                      onChange={e => setSalDeduction(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white font-bold rounded"
                    />
                  </div>
                </div>

                {/* Additional custom components - Option 1, 2, 3, 4, 5, 6, 7, 8 */}
                <div className="border-t border-neutral-850 pt-3 space-y-3.5">
                  <div>
                    <span className="text-[10px] font-mono uppercase font-black tracking-wider text-emerald-400 block mb-2">
                      Custom Earned Allowances (+ Additions)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono uppercase font-black tracking-wider text-neutral-400">Responsibility Allowance (GHC)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={salResponsibilityAllowance}
                          onChange={e => setSalResponsibilityAllowance(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white font-semibold rounded"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono uppercase font-black tracking-wider text-neutral-400">Transport Allowance (GHC)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={salTransportAllowance}
                          onChange={e => setSalTransportAllowance(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white font-semibold rounded"
                        />
                      </div>
                      <div className="space-y-1 font-mono">
                        <label className="text-[9px] font-mono uppercase font-black tracking-wider text-neutral-400">Housing / Rent Allowance</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={salRentAllowance}
                          onChange={e => setSalRentAllowance(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white font-semibold rounded"
                        />
                      </div>
                      <div className="space-y-1 font-mono">
                        <label className="text-[9px] font-mono uppercase font-black tracking-wider text-neutral-400">Momo Fee Reimbursement</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={salMomoFeeAbsorbed}
                          onChange={e => setSalMomoFeeAbsorbed(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white font-semibold rounded"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono uppercase font-black tracking-wider text-red-400 block mb-2">
                      Custom Statutory Deductions (- Subtractions)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono uppercase font-black tracking-wider text-neutral-400">SSNIT Pension contribution</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={salSsnitDeduction}
                          onChange={e => setSalSsnitDeduction(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white font-semibold rounded"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono uppercase font-black tracking-wider text-neutral-400">Income Tax / PAYE (GHC)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={salIncomeTaxDeduction}
                          onChange={e => setSalIncomeTaxDeduction(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white font-semibold rounded"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono uppercase font-black tracking-wider text-neutral-400">Welfare contribution (GHC)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={salWelfareDeduction}
                          onChange={e => setSalWelfareDeduction(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white font-semibold rounded"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono uppercase font-black tracking-wider text-neutral-400">Health Insurance (NHIS)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={salHealthInsDeduction}
                          onChange={e => setSalHealthInsDeduction(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white font-semibold rounded"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-950 p-4 border border-neutral-850 flex justify-between items-center">
                  <span className="text-[11px] font-black uppercase text-neutral-400 font-mono">Calculated Net Transferred Salary:</span>
                  <span className="text-base font-black text-amber-400 font-mono">GH₵ {currentNetPay.toFixed(2)}</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase font-black tracking-wider text-neutral-400">Payroll Reference Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Paid via MoMo token #91024. Monthly performance allowance included."
                    value={salNotes}
                    onChange={e => setSalNotes(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white font-medium rounded"
                  />
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-neutral-800 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSalaryModal(false)}
                  className="px-5 py-2.5 border border-neutral-800 text-[11px] font-black uppercase tracking-wider text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-black text-[11px] font-black uppercase tracking-widest"
                >
                  ✓ Authorize Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. When Salary is Paid Alert Popup Modal (Requirement 2) */}
      {recentPaymentAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-fade-in" id="salary-paid-alert-backdrop">
          <div className="bg-neutral-900 border-4 border-amber-400 p-6 md:p-8 w-full max-w-lg shadow-2xl relative flex flex-col gap-5 rounded text-left">
            {/* Close */}
            <button
              onClick={() => {
                setRecentPaymentAlert(null);
                setIsManualDispatch(false);
                playFeedbackSound('click');
              }}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white font-mono text-xs p-1 cursor-pointer"
              title="Close modal"
            >
              [X]
            </button>

            <div className="flex items-center gap-3 border-b border-neutral-800 pb-3">
              <CheckCircle className="text-emerald-400 shrink-0 animate-bounce" size={24} />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400 font-mono">
                  {isManualDispatch ? "Manual Salary Alert Dispatch" : "Salary Disbursed & Authorized!"}
                </h3>
                <p className="text-[10px] text-neutral-400 font-bold">
                  {isManualDispatch 
                    ? "Manually review and dispatch the WhatsApp slip notice for this payroll entry." 
                    : "Payroll entry was successfully saved to cloud ledger."}
                </p>
              </div>
            </div>

            {/* Quick Summary Card */}
            <div className="bg-neutral-950 p-4 border border-neutral-850 rounded font-mono text-xs space-y-2 text-left">
              <div className="flex justify-between border-b border-neutral-900 pb-1.5 text-neutral-400">
                <span>Employee Name:</span>
                <strong className="text-white font-black">{recentPaymentAlert.workerName}</strong>
              </div>
              <div className="flex justify-between border-b border-neutral-900 pb-1.5 text-neutral-400">
                <span>Designated Role:</span>
                <span className="text-neutral-300 font-bold">{recentPaymentAlert.role}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-900 pb-1.5 text-neutral-400">
                <span>Pay Period:</span>
                <span className="text-neutral-300 font-bold">{recentPaymentAlert.monthYear}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-900 pb-1.5 text-neutral-400">
                <span>Payment Mode:</span>
                <span className="text-amber-400 font-bold">{recentPaymentAlert.paymentMethod}</span>
              </div>
              <div className="flex justify-between pt-1 text-sm">
                <span className="text-emerald-400 font-black">Net Salary Paid:</span>
                <strong className="text-amber-400 font-black">GH₵ {recentPaymentAlert.netPaid.toFixed(2)}</strong>
              </div>
            </div>

            {/* WhatsApp automated alert dispatcher section */}
            <div className="bg-neutral-950 p-4 border border-neutral-850 rounded space-y-3 text-left">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-400 font-mono">
                <MessageSquare size={12} />
                <span>Dispatch Salary WhatsApp Alert</span>
              </div>
              
              <div className="space-y-2">
                <div>
                  <label className="text-[9px] font-mono uppercase font-black text-neutral-400 block mb-1">Target Phone Number</label>
                  <input
                    type="text"
                    id="salary-alert-target-phone"
                    placeholder="e.g. 0541234567"
                    defaultValue={recentPaymentAlert.momoNumber || ""}
                    className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white font-bold p-2 font-mono focus:outline-none focus:border-amber-400 rounded"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-mono uppercase font-black text-neutral-400 block mb-1">Preview Message</label>
                  <textarea
                    id="salary-alert-preview-msg"
                    rows={4}
                    readOnly
                    value={`*SAAKO HOLY CHILD ACADEMY*
*SALARY DISBURSEMENT SLIP & NOTICE*

Dear ${recentPaymentAlert.workerName},
Your salary for the period ${recentPaymentAlert.monthYear} has been successfully disbursed via ${recentPaymentAlert.paymentMethod}.

Reference details:
- Designation: ${recentPaymentAlert.role}
- Base Salary: GHC ${recentPaymentAlert.baseSalary.toFixed(2)}
- Net Transferred: GHC ${recentPaymentAlert.netPaid.toFixed(2)}
- Voucher Reference: SHC-PAY-${recentPaymentAlert.id.substring(10, 16).toUpperCase()}

Thank you for your dedicated service to Saako Holy Child Academy!`}
                    className="w-full bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-400 p-2 font-mono leading-relaxed rounded"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={isSendingWhatsAppAlert}
                onClick={async () => {
                  const phoneInput = document.getElementById('salary-alert-target-phone') as HTMLInputElement;
                  const phoneVal = phoneInput?.value?.trim() || "";
                  if (!phoneVal) {
                    alert("Please enter a valid WhatsApp phone number.");
                    return;
                  }
                  
                  setIsSendingWhatsAppAlert(true);
                  playFeedbackSound('click');
                  try {
                    const msg = (document.getElementById('salary-alert-preview-msg') as HTMLTextAreaElement)?.value || "";
                    if (sendautomatedWhatsApp) {
                      await sendautomatedWhatsApp(phoneVal, msg);
                      playFeedbackSound('success');
                      alert("Salary alert notification successfully dispatched to " + recentPaymentAlert.workerName + "!");
                    } else {
                      alert("WhatsApp notification service not available. Message copied to clipboard instead!");
                      navigator.clipboard.writeText(msg);
                    }
                  } catch (e) {
                    console.error("WhatsApp notification failed:", e);
                    alert("Notification failed to send. Please check network logs.");
                  } finally {
                    setIsSendingWhatsAppAlert(false);
                  }
                }}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-800 text-neutral-950 font-black text-[10px] uppercase tracking-widest font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer rounded"
              >
                {isSendingWhatsAppAlert ? (
                  <span>Sending dispatch alert...</span>
                ) : (
                  <>
                    <Send size={12} />
                    <span>Send Salary Notice Now</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex gap-2 justify-end mt-1">
              <button
                onClick={() => {
                  setRecentPaymentAlert(null);
                  setIsManualDispatch(false);
                  playFeedbackSound('click');
                }}
                className="bg-neutral-800 hover:bg-neutral-700 text-white px-5 py-2 font-black uppercase text-[10px] tracking-widest cursor-pointer rounded"
              >
                Dismiss Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Detailed Printable Mini-Slip & All-Time Ledger Voucher Modal (Requirement 3) */}
      {selectedVoucherSalary && (() => {
        // Compute all past records for this employee (including current one)
        const workerPastPayments = salaries.filter(s => 
          (selectedVoucherSalary.userId && s.userId === selectedVoucherSalary.userId) ||
          (!selectedVoucherSalary.userId && s.workerName.toLowerCase().trim() === selectedVoucherSalary.workerName.toLowerCase().trim())
        );
        const allTimePaidSum = workerPastPayments.reduce((sum, s) => sum + s.netPaid, 0);
        const voucherRefId = `SHC-PAY-${selectedVoucherSalary.id.substring(0, 8).toUpperCase()}`;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 overflow-y-auto" id="salary-voucher-modal">
            <div className="bg-neutral-900 border-4 border-neutral-800 p-6 md:p-8 w-full max-w-4xl shadow-2xl relative my-8 rounded flex flex-col gap-6 max-h-[90vh]">
              {/* Close Button top-right */}
              <button
                onClick={() => {
                  setSelectedVoucherSalary(null);
                  playFeedbackSound('click');
                }}
                className="absolute top-4 right-4 bg-neutral-950 text-neutral-400 hover:text-white p-2 border border-neutral-800 hover:border-amber-400 cursor-pointer transition-colors"
                title="Close modal"
              >
                <X size={15} />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 border-b-2 border-neutral-800 pb-4 shrink-0 text-left">
                <FileText size={20} className="text-amber-400" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white font-mono">
                    Official Salary Slip & Payment Voucher
                  </h3>
                  <p className="text-[10px] text-neutral-400 font-bold">
                    Official certified copy of employee wage disbursement slip and all-time earnings registry.
                  </p>
                </div>
              </div>

              {/* Scrollable Printable Voucher content */}
              <div className="flex-1 overflow-y-auto pr-1">
                <div className="p-6 bg-neutral-950 border border-neutral-850 rounded text-left" id="printable-salary-voucher-content">
                  {/* CSS Print Styles */}
                  <style>{`
                    @media print {
                      body * {
                        visibility: hidden !important;
                      }
                      #printable-salary-voucher-content, #printable-salary-voucher-content * {
                        visibility: visible !important;
                      }
                      #printable-salary-voucher-content {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100% !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                        border: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                      }
                      .print\\:no-print {
                        display: none !important;
                      }
                      .print\\:text-black {
                        color: #000000 !important;
                      }
                      .print\\:border-black {
                        border-color: #000000 !important;
                      }
                      .print\\:bg-white {
                        background-color: #ffffff !important;
                      }
                      .print\\:text-neutral-600 {
                        color: #525252 !important;
                      }
                    }
                  `}</style>

                  {/* Document Header for Printing */}
                  <div className="mb-6 border-b-2 border-dashed border-neutral-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:border-black">
                    <div>
                      <h1 className="text-base font-black text-white uppercase tracking-wider font-mono print:text-black">
                        SAAKO HOLY CHILD ACADEMY
                      </h1>
                      <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-tight print:text-black">
                        Registry Division & Payroll Bureau
                      </p>
                      <p className="text-[9px] text-amber-400 font-mono font-black uppercase mt-1 print:text-black">
                        Salary Slip Ref: {voucherRefId}
                      </p>
                    </div>
                    <div className="text-left sm:text-right font-mono text-[9px] text-neutral-400 print:text-black">
                      <div>Execution Date: <span className="text-white font-black print:text-black">{selectedVoucherSalary.date}</span></div>
                      <div>Disbursement: <span className="text-emerald-400 font-black uppercase print:text-black">{selectedVoucherSalary.paymentMethod}</span></div>
                      <div>System Status: <span className="text-emerald-400 font-black uppercase print:text-black">Disbursed</span></div>
                    </div>
                  </div>

                  {/* Employee Info Block */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-900/40 border border-neutral-850 p-4 mb-6 print:bg-white print:border-black print:text-black">
                    <div className="space-y-1 font-mono text-[11px] text-left">
                      <div className="text-neutral-500 uppercase text-[8px] font-black tracking-widest print:text-neutral-600">Employee Details</div>
                      <div className="text-sm font-black text-white print:text-black">{selectedVoucherSalary.workerName}</div>
                      <div className="text-neutral-400 font-bold print:text-black">Role: {selectedVoucherSalary.role}</div>
                    </div>
                    <div className="space-y-1 font-mono text-[11px] sm:text-right text-left">
                      <div className="text-neutral-500 uppercase text-[8px] font-black tracking-widest print:text-neutral-600">Disbursement Metadata</div>
                      <div className="text-neutral-300 font-bold print:text-black">Pay Period: <span className="text-white font-black print:text-black">{selectedVoucherSalary.monthYear}</span></div>
                      {selectedVoucherSalary.paymentMethod === 'Mobile Money' && selectedVoucherSalary.momoNumber && (
                        <div className="text-amber-400 font-bold print:text-black">☎ Momo: {selectedVoucherSalary.momoNumber} {selectedVoucherSalary.momoName ? `(${selectedVoucherSalary.momoName})` : ''}</div>
                      )}
                    </div>
                  </div>

                  {/* Calculations Details Table */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 print:border-black font-mono text-xs">
                    {/* Additions Column */}
                    <div className="border border-neutral-800 rounded p-4 bg-neutral-900/20 print:border-black print:bg-white text-left">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 pb-2 border-b border-neutral-800 print:text-black print:border-black flex items-center gap-1">
                        <span>Earnings & Additions</span>
                        <span className="text-neutral-500 ml-auto font-sans font-bold">(+)</span>
                      </h4>
                      <table className="w-full text-left mt-3 text-[11px] space-y-1.5 border-collapse">
                        <tbody>
                          <tr className="border-b border-neutral-850/50 print:border-neutral-200">
                            <td className="py-1.5 text-neutral-400 print:text-black">Base Salary/Stipend</td>
                            <td className="py-1.5 text-right text-white print:text-black font-bold">GHC {selectedVoucherSalary.baseSalary.toFixed(2)}</td>
                          </tr>
                          {selectedVoucherSalary.allowance > 0 && (
                            <tr className="border-b border-neutral-850/50 print:border-neutral-200">
                              <td className="py-1.5 text-neutral-400 print:text-black">General Allowance</td>
                              <td className="py-1.5 text-right text-emerald-400 print:text-black font-bold">+GHC {selectedVoucherSalary.allowance.toFixed(2)}</td>
                            </tr>
                          )}
                          {selectedVoucherSalary.responsibilityAllowance && selectedVoucherSalary.responsibilityAllowance > 0 ? (
                            <tr className="border-b border-neutral-850/50 print:border-neutral-200">
                              <td className="py-1.5 text-neutral-400 print:text-black">Responsibility Allowance</td>
                              <td className="py-1.5 text-right text-emerald-400 print:text-black font-bold">+GHC {selectedVoucherSalary.responsibilityAllowance.toFixed(2)}</td>
                            </tr>
                          ) : null}
                          {selectedVoucherSalary.transportAllowance && selectedVoucherSalary.transportAllowance > 0 ? (
                            <tr className="border-b border-neutral-850/50 print:border-neutral-200">
                              <td className="py-1.5 text-neutral-400 print:text-black">Transport Allowance</td>
                              <td className="py-1.5 text-right text-emerald-400 print:text-black font-bold">+GHC {selectedVoucherSalary.transportAllowance.toFixed(2)}</td>
                            </tr>
                          ) : null}
                          {selectedVoucherSalary.rentAllowance && selectedVoucherSalary.rentAllowance > 0 ? (
                            <tr className="border-b border-neutral-850/50 print:border-neutral-200">
                              <td className="py-1.5 text-neutral-400 print:text-black">Housing/Rent Allowance</td>
                              <td className="py-1.5 text-right text-emerald-400 print:text-black font-bold">+GHC {selectedVoucherSalary.rentAllowance.toFixed(2)}</td>
                            </tr>
                          ) : null}
                          {selectedVoucherSalary.momoFeeAbsorbed && selectedVoucherSalary.momoFeeAbsorbed > 0 ? (
                            <tr className="border-b border-neutral-850/50 print:border-neutral-200">
                              <td className="py-1.5 text-neutral-400 print:text-black">MoMo Fee Reimbursement</td>
                              <td className="py-1.5 text-right text-emerald-400 print:text-black font-bold">+GHC {selectedVoucherSalary.momoFeeAbsorbed.toFixed(2)}</td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>

                    {/* Deductions Column */}
                    <div className="border border-neutral-800 rounded p-4 bg-neutral-900/20 print:border-black print:bg-white text-left">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-red-400 pb-2 border-b border-neutral-800 print:text-black print:border-black flex items-center gap-1">
                        <span>Statutory Deductions</span>
                        <span className="text-neutral-500 ml-auto font-sans font-bold">(-)</span>
                      </h4>
                      <table className="w-full text-left mt-3 text-[11px] space-y-1.5 border-collapse">
                        <tbody>
                          {selectedVoucherSalary.deduction > 0 && (
                            <tr className="border-b border-neutral-850/50 print:border-neutral-200">
                              <td className="py-1.5 text-neutral-400 print:text-black">General Deduction</td>
                              <td className="py-1.5 text-right text-red-400 print:text-black font-bold">-GHC {selectedVoucherSalary.deduction.toFixed(2)}</td>
                            </tr>
                          )}
                          {selectedVoucherSalary.ssnitDeduction && selectedVoucherSalary.ssnitDeduction > 0 ? (
                            <tr className="border-b border-neutral-850/50 print:border-neutral-200">
                              <td className="py-1.5 text-neutral-400 print:text-black">SSNIT Pension contribution</td>
                              <td className="py-1.5 text-right text-red-400 print:text-black font-bold">-GHC {selectedVoucherSalary.ssnitDeduction.toFixed(2)}</td>
                            </tr>
                          ) : null}
                          {selectedVoucherSalary.incomeTaxDeduction && selectedVoucherSalary.incomeTaxDeduction > 0 ? (
                            <tr className="border-b border-neutral-850/50 print:border-neutral-200">
                              <td className="py-1.5 text-neutral-400 print:text-black">Income Tax / PAYE</td>
                              <td className="py-1.5 text-right text-red-400 print:text-black font-bold">-GHC {selectedVoucherSalary.incomeTaxDeduction.toFixed(2)}</td>
                            </tr>
                          ) : null}
                          {selectedVoucherSalary.welfareDeduction && selectedVoucherSalary.welfareDeduction > 0 ? (
                            <tr className="border-b border-neutral-850/50 print:border-neutral-200">
                              <td className="py-1.5 text-neutral-400 print:text-black">Welfare contribution</td>
                              <td className="py-1.5 text-right text-red-400 print:text-black font-bold">-GHC {selectedVoucherSalary.welfareDeduction.toFixed(2)}</td>
                            </tr>
                          ) : null}
                          {selectedVoucherSalary.healthInsDeduction && selectedVoucherSalary.healthInsDeduction > 0 ? (
                            <tr className="border-b border-neutral-850/50 print:border-neutral-200">
                              <td className="py-1.5 text-neutral-400 print:text-black">Health Insurance (NHIS)</td>
                              <td className="py-1.5 text-right text-red-400 print:text-black font-bold">-GHC {selectedVoucherSalary.healthInsDeduction.toFixed(2)}</td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Net Summary block */}
                  <div className="bg-neutral-900 border-2 border-neutral-800 p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3.5 mb-6 print:border-black print:bg-white print:text-black text-left">
                    <span className="text-[11px] font-black uppercase text-neutral-400 font-mono print:text-black">Calculated Net Transferred Wage:</span>
                    <strong className="text-xl font-black text-amber-400 font-mono print:text-black">GHC {selectedVoucherSalary.netPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </div>

                  {/* ALL-TIME LEDGER STATISTICS SUMMARY SECTION (Requirement 3) */}
                  <div className="border-t-2 border-neutral-800 pt-5 mt-5 print:border-black print:text-black text-left">
                    <h3 className="text-xs font-black uppercase tracking-widest text-amber-400 font-mono mb-3.5 flex items-center gap-2 print:text-black">
                      <Sparkles size={13} />
                      <span>Employee All-Time Ledger Summary</span>
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div className="bg-neutral-900/60 p-3.5 border border-neutral-850 print:border-black print:bg-white print:text-black">
                        <span className="text-[8px] text-neutral-500 uppercase font-black tracking-widest block font-sans print:text-black">Cumulative Sum Disbursed To Date</span>
                        <strong className="text-sm text-emerald-400 font-mono font-black mt-1 block print:text-black">
                          GHC {allTimePaidSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </div>
                      <div className="bg-neutral-900/60 p-3.5 border border-neutral-850 print:border-black print:bg-white print:text-black">
                        <span className="text-[8px] text-neutral-500 uppercase font-black tracking-widest block font-sans print:text-black">Total Verified Salary Periods</span>
                        <strong className="text-sm text-white font-mono font-black mt-1 block print:text-black">
                          {workerPastPayments.length} Month Period(s) Paid
                        </strong>
                      </div>
                    </div>

                    {/* Past Payments Small Table */}
                    {workerPastPayments.length <= 1 ? (
                      <p className="text-[10px] text-neutral-500 italic font-medium print:text-black">
                        * Note: This represents the first registered salary disbursement entry for this employee profile.
                      </p>
                    ) : (
                      <div className="border border-neutral-850 overflow-x-auto print:border-black">
                        <table className="w-full text-left font-mono text-[10px] border-collapse">
                          <thead>
                            <tr className="bg-neutral-900 border-b border-neutral-850 uppercase tracking-widest text-[8px] text-neutral-500 font-black print:bg-white print:border-black print:text-black">
                              <th className="px-3 py-2 border-r border-neutral-850 print:border-black">Pay Period</th>
                              <th className="px-3 py-2 border-r border-neutral-850 print:border-black">Disbursement Date</th>
                              <th className="px-3 py-2 border-r border-neutral-850 print:border-black">Payment Method</th>
                              <th className="px-3 py-2 text-right">Net Paid (GHC)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {workerPastPayments.map((item, idx) => (
                              <tr 
                                key={item.id} 
                                className={`border-b border-neutral-850 hover:bg-neutral-900/30 transition-colors print:border-black print:bg-white print:text-black ${
                                  item.id === selectedVoucherSalary.id ? 'bg-amber-400/5 print:bg-neutral-200' : ''
                                }`}
                              >
                                <td className="px-3 py-1.5 font-bold border-r border-neutral-855 print:border-black text-neutral-200 print:text-black">
                                  {item.monthYear} {item.id === selectedVoucherSalary.id ? ' (Current)' : ''}
                                </td>
                                <td className="px-3 py-1.5 border-r border-neutral-855 print:border-black text-neutral-400 print:text-black">{item.date}</td>
                                <td className="px-3 py-1.5 border-r border-neutral-855 print:border-black text-neutral-400 print:text-black">{item.paymentMethod}</td>
                                <td className="px-3 py-1.5 text-right font-bold text-neutral-200 print:text-black">GHC {item.netPaid.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Signatures block for printing */}
                  <div className="mt-10 hidden print:flex justify-between items-center text-[9px] font-mono border-t border-neutral-300 pt-6 print:text-black print:border-black">
                    <div>
                      <div className="border-b border-black w-40 mb-1" />
                      <p className="font-bold text-neutral-600">Authorized Accountant Stamp</p>
                      <p className="text-[8px] text-neutral-400">Saako Holy Child Registry</p>
                    </div>
                    <div className="text-right">
                      <div className="border-b border-black w-40 mb-1 ml-auto" />
                      <p className="font-bold text-neutral-600">Employee Acknowledged Sign</p>
                      <p className="text-[8px] text-neutral-400">{selectedVoucherSalary.workerName}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="border-t border-neutral-800 pt-5 flex flex-wrap gap-3 justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => downloadSingleSalaryCsv(selectedVoucherSalary)}
                  className="bg-neutral-950 hover:bg-neutral-850 text-white hover:text-amber-400 border border-neutral-800 hover:border-amber-400 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer rounded-xs flex items-center gap-1.5"
                >
                  <FileSpreadsheet size={13} />
                  <span>Download Slip CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer rounded-xs flex items-center gap-1.5 border-b-2 border-amber-700"
                >
                  <Printer size={13} />
                  <span>Print Slip / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Let them pre-fill WhatsApp screen for this item!
                    setRecentPaymentAlert(selectedVoucherSalary);
                    setIsManualDispatch(true);
                    setSelectedVoucherSalary(null);
                  }}
                  className="bg-neutral-950 hover:bg-neutral-850 text-white hover:text-emerald-400 border border-neutral-800 hover:border-emerald-400 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer rounded-xs flex items-center gap-1.5"
                >
                  <MessageSquare size={13} className="text-emerald-500" />
                  <span>Dispatch via WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedVoucherSalary(null)}
                  className="bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800 py-2.5 px-5 font-mono text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
