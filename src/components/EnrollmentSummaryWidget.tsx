import React, { useState } from 'react';
import { ChevronDown, GraduationCap, Sparkles } from 'lucide-react';
import { Student } from '../types';

interface EnrollmentSummaryWidgetProps {
  students: Student[];
}

export function EnrollmentSummaryWidget({ students }: EnrollmentSummaryWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Enrollment summary stats calculations
  const stats = React.useMemo(() => {
    const data = {
      preSchool: { male: 0, female: 0, total: 0 },
      primary: { male: 0, female: 0, total: 0 },
      jhs: { male: 0, female: 0, total: 0 },
      overall: { male: 0, female: 0, total: 0 }
    };

    if (!students) return data;

    const activeStudents = students.filter(s => s.active !== false);

    activeStudents.forEach(s => {
      const isFemale = s.gender === 'Female';
      const genderKey = isFemale ? 'female' : 'male';

      // Robust category determination based on category property or classes fallback
      let categoryKey: 'preSchool' | 'primary' | 'jhs' | null = null;
      const normalizedCat = (s.category || '').toLowerCase();
      
      if (normalizedCat.includes('pre') || ['Nursery', 'KG1', 'KG2'].includes(s.class)) {
        categoryKey = 'preSchool';
      } else if (normalizedCat.includes('primary') || ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].includes(s.class)) {
        categoryKey = 'primary';
      } else if (normalizedCat.includes('jhs') || ['B7', 'B8', 'B9'].includes(s.class)) {
        categoryKey = 'jhs';
      }

      if (categoryKey) {
        data[categoryKey][genderKey]++;
        data[categoryKey].total++;
      }

      data.overall[genderKey]++;
      data.overall.total++;
    });

    return data;
  }, [students]);

  const getPercentage = (count: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  const sections = [
    {
      label: 'Pre-school',
      icon: '👶',
      data: stats.preSchool,
      color: 'from-sky-500 to-blue-600',
      barColorMale: 'bg-sky-400',
      barColorFemale: 'bg-rose-400'
    },
    {
      label: 'Primary School',
      icon: '🏫',
      data: stats.primary,
      color: 'from-amber-500 to-orange-600',
      barColorMale: 'bg-amber-400',
      barColorFemale: 'bg-emerald-400'
    },
    {
      label: 'Junior High (JHS)',
      icon: '🎓',
      data: stats.jhs,
      color: 'from-purple-500 to-indigo-600',
      barColorMale: 'bg-indigo-400',
      barColorFemale: 'bg-fuchsia-400'
    }
  ];

  return (
    <div className="bg-neutral-800/40 border-l-4 border-amber-400 p-4 space-y-3 rounded-r-lg shadow-inner">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-[11px] font-black text-neutral-300 uppercase tracking-widest focus:outline-none select-none cursor-pointer hover:text-white group"
      >
        <span className="flex items-center gap-1.5">
          <GraduationCap className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          <span>Enrolment Summary ({stats.overall.total})</span>
        </span>
        <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-amber-400' : 'text-neutral-500'}`} />
      </button>

      {isOpen && (
        <div className="space-y-4 pt-1 text-left animate-fadeIn">
          {/* Overall Badge */}
          <div className="bg-neutral-950/65 p-3 border border-neutral-800/80 rounded-none flex items-center justify-between">
            <div>
              <span className="text-[9px] text-neutral-500 font-mono font-bold uppercase tracking-wider block">Total Active Pupils</span>
              <span className="text-xl font-black font-mono text-amber-400 leading-none">
                {stats.overall.total} <span className="text-xs text-neutral-400 font-sans font-medium">registered</span>
              </span>
            </div>
            <div className="text-right font-mono text-[10px] space-y-0.5">
              <div className="flex items-center justify-end gap-1.5 text-sky-400 font-black">
                <span>♂</span>
                <span>{stats.overall.male} Boys</span>
                <span className="text-[8px] text-neutral-500 font-normal">({getPercentage(stats.overall.male, stats.overall.total)}%)</span>
              </div>
              <div className="flex items-center justify-end gap-1.5 text-pink-400 font-black">
                <span>♀</span>
                <span>{stats.overall.female} Girls</span>
                <span className="text-[8px] text-neutral-500 font-normal">({getPercentage(stats.overall.female, stats.overall.total)}%)</span>
              </div>
            </div>
          </div>

          {/* Breakdown cards */}
          <div className="space-y-3">
            {sections.map((sect) => (
              <div key={sect.label} className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-neutral-300 font-bold flex items-center gap-1.5">
                    <span>{sect.icon}</span>
                    <span>{sect.label}</span>
                  </span>
                  <span className="text-amber-400 font-black bg-neutral-950 px-2 py-0.5 border border-neutral-800 rounded-sm">
                    {sect.data.total}
                  </span>
                </div>

                <div className="bg-neutral-950/45 border border-neutral-850 p-2.5 rounded-sm text-[10px] space-y-2 font-mono">
                  {/* Progress bar split */}
                  <div className="h-2 w-full bg-neutral-900 overflow-hidden flex rounded-sm">
                    {sect.data.total > 0 ? (
                      <>
                        <div 
                          style={{ width: `${getPercentage(sect.data.male, sect.data.total)}%` }} 
                          className={`h-full ${sect.barColorMale} transition-all duration-500`}
                          title={`Boys: ${getPercentage(sect.data.male, sect.data.total)}%`}
                        />
                        <div 
                          style={{ width: `${getPercentage(sect.data.female, sect.data.total)}%` }} 
                          className={`h-full ${sect.barColorFemale} transition-all duration-500`}
                          title={`Girls: ${getPercentage(sect.data.female, sect.data.total)}%`}
                        />
                      </>
                    ) : (
                      <div className="w-full bg-neutral-900/40 text-neutral-600 text-center text-[8px] leading-tight pt-0.5 uppercase">
                        No pupils enrolled
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-[9px] text-neutral-400">
                    <span className="flex items-center gap-1">
                      <span className="text-sky-400 font-bold">♂</span>
                      <strong className="text-sky-300">{sect.data.male}</strong> Male
                      <span className="text-[8px] text-neutral-500 font-normal">({getPercentage(sect.data.male, sect.data.total)}%)</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-pink-400 font-bold">♀</span>
                      <strong className="text-pink-300">{sect.data.female}</strong> Female
                      <span className="text-[8px] text-neutral-500 font-normal">({getPercentage(sect.data.female, sect.data.total)}%)</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sparkly dynamic summary info */}
          <div className="text-[9px] text-neutral-300 bg-amber-950/15 border border-amber-900/30 p-2.5 rounded-sm leading-relaxed text-center font-sans">
            <div className="flex items-center justify-center gap-1 text-amber-400 font-bold uppercase tracking-wider text-[8px] mb-1">
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Gender Balance Analytics</span>
            </div>
            {stats.overall.total > 0 ? (
              <span>
                School population is{' '}
                <strong className="text-amber-400">
                  {stats.overall.male > stats.overall.female 
                    ? `Male predominant (${getPercentage(stats.overall.male, stats.overall.total)}%)` 
                    : stats.overall.female > stats.overall.male 
                    ? `Female predominant (${getPercentage(stats.overall.female, stats.overall.total)}%)` 
                    : 'perfectly balanced (50% Male, 50% Female)'}
                </strong>.
              </span>
            ) : (
              <span>Enroll pupils to activate real-time analytics.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
