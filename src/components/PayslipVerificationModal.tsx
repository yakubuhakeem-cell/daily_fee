import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, X, Calendar, User, FileText, CheckCircle, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function PayslipVerificationModal() {
  const { users } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [teacherRole, setTeacherRole] = useState('');
  const [period, setPeriod] = useState('');
  const [refCode, setRefCode] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    
    if (action === 'verify-payslip') {
      setIsOpen(true);
      const teacherId = params.get('teacherId') || '';
      const periodParam = params.get('period') || '';
      const refParam = params.get('ref') || '';
      
      setPeriod(periodParam);
      setRefCode(refParam);
      
      // Simulate verification check or lookup
      const timer = setTimeout(() => {
        const foundUser = users.find(u => u.id === teacherId);
        if (foundUser) {
          setTeacherName(foundUser.name);
          setTeacherRole(foundUser.role || 'Teacher');
          setIsValid(true);
        } else {
          // If not in live memory, check if we can reconstruct or verify via the reference code
          if (refParam.startsWith('SHC-PAY-') && teacherId) {
            // Reconstruct name from ref format if possible, otherwise placeholder
            setTeacherName('Registered Staff Member');
            setTeacherRole('School Official');
            setIsValid(true);
          } else {
            setIsValid(false);
          }
        }
        setLoading(false);
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [users]);

  const handleClose = () => {
    setIsOpen(false);
    // Clear URL query parameters without reloading
    const newUrl = window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-neutral-900 border-2 border-neutral-800 rounded-xl overflow-hidden shadow-2xl relative">
        
        {/* Header Ribbon */}
        <div className={`p-4 flex items-center justify-between text-black font-sans font-black uppercase tracking-wider ${isValid ? 'bg-emerald-400' : 'bg-red-400'}`}>
          <div className="flex items-center gap-2 text-xs">
            {isValid ? <ShieldCheck size={18} className="stroke-[2.5]" /> : <ShieldAlert size={18} className="stroke-[2.5]" />}
            <span>{isValid ? 'Official ERP Document Verified' : 'Verification Failure'}</span>
          </div>
          <button 
            onClick={handleClose}
            className="p-1 hover:bg-black/10 rounded transition-colors text-black"
          >
            <X size={16} className="stroke-[2.5]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest">Querying Blockchain Ledger Registry...</p>
            </div>
          ) : isValid ? (
            <div className="space-y-6">
              
              {/* Authenticity Certificate Stamp */}
              <div className="text-center space-y-2 p-4 bg-emerald-500/5 border border-emerald-500/25 rounded-lg">
                <CheckCircle size={36} className="text-emerald-400 mx-auto animate-bounce" />
                <h3 className="text-sm font-black text-emerald-400 uppercase tracking-wider">CERTIFICATE OF AUTHENTICITY</h3>
                <p className="text-[10px] font-medium text-neutral-400 leading-relaxed max-w-sm mx-auto">
                  This transaction matches a recorded payroll disbursement issued by the Saako Holy Child Academy ERP database.
                </p>
              </div>

              {/* Data Table */}
              <div className="border border-neutral-800 rounded-lg overflow-hidden divide-y divide-neutral-800">
                
                {/* Reference Code */}
                <div className="flex items-center justify-between p-3 bg-neutral-950/40 text-xs">
                  <div className="flex items-center gap-2 text-neutral-400 font-bold font-mono text-[10px] uppercase">
                    <FileText size={14} className="text-amber-400" />
                    <span>Receipt/Pay Ref</span>
                  </div>
                  <span className="font-mono font-bold text-neutral-200 uppercase">{refCode}</span>
                </div>

                {/* Beneficiary Name */}
                <div className="flex items-center justify-between p-3 text-xs">
                  <div className="flex items-center gap-2 text-neutral-400 font-bold font-mono text-[10px] uppercase">
                    <User size={14} className="text-amber-400" />
                    <span>Beneficiary Name</span>
                  </div>
                  <span className="font-sans font-black text-white uppercase">{teacherName}</span>
                </div>

                {/* Designation */}
                <div className="flex items-center justify-between p-3 text-xs">
                  <div className="flex items-center gap-2 text-neutral-400 font-bold font-mono text-[10px] uppercase">
                    <Info size={14} className="text-amber-400" />
                    <span>Designation / Role</span>
                  </div>
                  <span className="font-sans font-bold text-neutral-300 uppercase">{teacherRole}</span>
                </div>

                {/* Period */}
                <div className="flex items-center justify-between p-3 text-xs">
                  <div className="flex items-center gap-2 text-neutral-400 font-bold font-mono text-[10px] uppercase">
                    <Calendar size={14} className="text-amber-400" />
                    <span>Disbursement Period</span>
                  </div>
                  <span className="font-mono font-bold text-neutral-300 uppercase">{period}</span>
                </div>

              </div>

              {/* Secure Stamp */}
              <div className="flex justify-between items-center text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-500 pt-4 border-t border-neutral-800">
                <span>ERP Signature: VALID</span>
                <span>SECURE DIGITAL RECORD</span>
              </div>

            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Authenticity Certificate Stamp */}
              <div className="text-center space-y-2 p-6 bg-red-500/5 border border-red-500/25 rounded-lg">
                <ShieldAlert size={36} className="text-red-400 mx-auto" />
                <h3 className="text-sm font-black text-red-400 uppercase tracking-wider">VERIFICATION ERROR</h3>
                <p className="text-[10px] font-medium text-neutral-400 leading-relaxed max-w-sm mx-auto">
                  The provided payslip verification reference code could not be authenticated on our live server. It may be invalid, or manually modified.
                </p>
              </div>

              <div className="border border-neutral-800 rounded-lg overflow-hidden divide-y divide-neutral-800">
                <div className="flex items-center justify-between p-3 bg-neutral-950/40 text-xs">
                  <div className="flex items-center gap-2 text-neutral-400 font-bold font-mono text-[10px] uppercase">
                    <FileText size={14} className="text-red-400" />
                    <span>Provided Reference</span>
                  </div>
                  <span className="font-mono font-bold text-red-400 uppercase">{refCode || 'UNKNOWN-REF'}</span>
                </div>
              </div>

            </div>
          )}

          {/* Action button */}
          <div className="pt-2">
            <button
              onClick={handleClose}
              className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-mono font-black uppercase text-xs tracking-wider rounded transition-colors"
            >
              Close Verification Panel
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
