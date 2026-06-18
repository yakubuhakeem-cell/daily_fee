import React, { useState } from 'react';
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
  ArrowRightLeft
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
    playFeedbackSound
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
  const [salMethod, setSalMethod] = useState<PaymentMethod>('Cash');
  const [salMonthYear, setSalMonthYear] = useState(() => {
    const d = new Date();
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${months[d.getMonth()]} 2026`;
  });
  const [salDate, setSalDate] = useState(currentDate);
  const [salNotes, setSalNotes] = useState('');

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
    const netVal = baseVal + allowanceVal - deductionVal;

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
      userIdValue
    );
    playFeedbackSound('success');

    // Reset Form
    setSalBase('');
    setSalAllowance('');
    setSalDeduction('');
    setSalNotes('');
    setSalCustomWorkerName('');
    setSalSelectedStaffId('');
    setSalDate(currentDate);
    setShowSalaryModal(false);
  };

  // Auto calculate net in salary modal
  const calcBase = parseFloat(salBase) || 0;
  const calcAllow = parseFloat(salAllowance) || 0;
  const calcDeduct = parseFloat(salDeduction) || 0;
  const currentNetPay = calcBase + calcAllow - calcDeduct;

  const handleStaffChange = (staffId: string) => {
    setSalSelectedStaffId(staffId);
    const selected = users.find(u => u.id === staffId);
    if (selected) {
      setSalRole(selected.role);
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
                        GH₵ {item.baseSalary.toFixed(2)} • <span className="text-emerald-400">+{item.allowance.toFixed(2)}</span> • <span className="text-red-400">-{item.deduction.toFixed(2)}</span>
                      </td>
                      <td className="p-4 text-neutral-300 font-bold">
                        <span className="bg-neutral-950 px-2 py-0.5 border border-neutral-800 text-[10px]">
                          {item.paymentMethod}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-black text-right text-red-400 text-sm">
                        -{parseFloat(item.netPaid.toString()).toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => {
                            if (confirm('Void salary paycheck and delete record?')) {
                              deleteSalary(item.id);
                              playFeedbackSound('warning');
                            }
                          }}
                          className="text-neutral-500 hover:text-red-500 transition-colors p-1"
                          title="Void salary register entry"
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
          <div className="bg-neutral-900 border-4 border-neutral-800 p-8 w-full max-w-xl shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b-2 border-neutral-800 pb-3">
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

            <form onSubmit={handleAddSalary} className="space-y-4">
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
                <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-3 gap-4">
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

              <div className="grid grid-cols-3 gap-4 border-t border-neutral-850 pt-3">
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
                  <label className="text-[10px] font-mono uppercase font-black tracking-wider text-emerald-400">Allowance/Bonus</label>
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
                  <label className="text-[10px] font-mono uppercase font-black tracking-wider text-red-400">Deductions/Taxes</label>
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

              <div className="pt-4 border-t border-neutral-800 flex justify-end gap-3">
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
    </div>
  );
};
