/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CurriculumSubject, GESGrade, NaCCALevel, StudentClass, AcademicSettings, AcademicAssessment, Student } from '../types';

export const DEFAULT_GHANA_SUBJECTS: CurriculumSubject[] = [
  // Kindergarten (KG1 - KG2)
  {
    id: 'sub_kg_lit',
    name: 'Language and Literacy',
    code: 'LIT',
    level: 'KG',
    isCore: true,
    category: 'Core',
    description: 'Foundational listening, speaking, pre-reading and emergent writing skills',
    order: 1
  },
  {
    id: 'sub_kg_num',
    name: 'Numeracy & Mathematics',
    code: 'NUM',
    level: 'KG',
    isCore: true,
    category: 'Core',
    description: 'Early number concepts, shapes, counting, patterns and measurement',
    order: 2
  },
  {
    id: 'sub_kg_owop',
    name: 'Our World and Our People (OWOP)',
    code: 'OWOP',
    level: 'KG',
    isCore: true,
    category: 'Core',
    description: 'Environmental studies, self, family, community and culture',
    order: 3
  },
  {
    id: 'sub_kg_ca',
    name: 'Creative Arts',
    code: 'CA',
    level: 'KG',
    isCore: true,
    category: 'Core',
    description: 'Drawing, coloring, music, dance and creative expression',
    order: 4
  },
  {
    id: 'sub_kg_pe',
    name: 'Physical Development',
    code: 'PD',
    level: 'KG',
    isCore: true,
    category: 'Core',
    description: 'Motor skills, outdoor activities, health and safety habits',
    order: 5
  },

  // Primary (BS1 - BS6)
  {
    id: 'sub_pri_eng',
    name: 'English Language',
    code: 'ENG',
    level: 'Primary',
    isCore: true,
    category: 'Core',
    description: 'Grammar, reading comprehension, composition, phonics and vocabulary',
    order: 1
  },
  {
    id: 'sub_pri_math',
    name: 'Mathematics',
    code: 'MATH',
    level: 'Primary',
    isCore: true,
    category: 'Core',
    description: 'Number operations, geometry, measurement, fractions and data handling',
    order: 2
  },
  {
    id: 'sub_pri_sci',
    name: 'Science',
    code: 'SCI',
    level: 'Primary',
    isCore: true,
    category: 'Core',
    description: 'Living things, materials, earth and space, energy and forces',
    order: 3
  },
  {
    id: 'sub_pri_owop',
    name: 'Our World and Our People (OWOP)',
    code: 'OWOP',
    level: 'Primary',
    isCore: true,
    category: 'Core',
    description: 'Ghanaian culture, nation building, civic rights and citizenship',
    order: 4
  },
  {
    id: 'sub_pri_hist',
    name: 'History of Ghana',
    code: 'HIST',
    level: 'Primary',
    isCore: true,
    category: 'Core',
    description: 'Pre-colonial Ghana, major ethnic groups, heroes and national milestones',
    order: 5
  },
  {
    id: 'sub_pri_ghl',
    name: 'Ghanaian Language & Culture',
    code: 'GHL',
    level: 'Primary',
    isCore: true,
    category: 'Core',
    description: 'Reading, writing and orature in Twi, Fante, Ga, Ewe or local language',
    order: 6
  },
  {
    id: 'sub_pri_rme',
    name: 'Religious and Moral Education (RME)',
    code: 'RME',
    level: 'Primary',
    isCore: true,
    category: 'Core',
    description: 'Moral teachings from Christianity, Islam and African Traditional Religion',
    order: 7
  },
  {
    id: 'sub_pri_comp',
    name: 'Computing & ICT',
    code: 'COMP',
    level: 'Primary',
    isCore: true,
    category: 'Core',
    description: 'Computer literacy, word processing, Internet safety and digital tools',
    order: 8
  },
  {
    id: 'sub_pri_ca',
    name: 'Creative Arts',
    code: 'CA',
    level: 'Primary',
    isCore: true,
    category: 'Core',
    description: 'Visual arts, performing arts, design, craftwork and music',
    order: 9
  },
  {
    id: 'sub_pri_phe',
    name: 'Physical and Health Education (PHE)',
    code: 'PHE',
    level: 'Primary',
    isCore: true,
    category: 'Core',
    description: 'Athletics, games, personal hygiene, fitness and nutrition',
    order: 10
  },
  {
    id: 'sub_pri_fre',
    name: 'French Language',
    code: 'FRE',
    level: 'Primary',
    isCore: false,
    category: 'Elective',
    description: 'Introductory French oral communication, vocabulary and writing',
    order: 11
  },

  // Junior High School / Common Core Programme (BS7 - BS9)
  {
    id: 'sub_jhs_eng',
    name: 'English Language',
    code: 'ENG',
    level: 'JHS',
    isCore: true,
    category: 'Core',
    description: 'Advanced grammar, literature in English, essay writing and summary',
    order: 1
  },
  {
    id: 'sub_jhs_math',
    name: 'Mathematics',
    code: 'MATH',
    level: 'JHS',
    isCore: true,
    category: 'Core',
    description: 'Algebra, geometry, trigonometry, business arithmetic and probability',
    order: 2
  },
  {
    id: 'sub_jhs_sci',
    name: 'Integrated Science',
    code: 'SCI',
    level: 'JHS',
    isCore: true,
    category: 'Core',
    description: 'Physics, chemistry, biology and agricultural science principles',
    order: 3
  },
  {
    id: 'sub_jhs_soc',
    name: 'Social Studies',
    code: 'SOC',
    level: 'JHS',
    isCore: true,
    category: 'Core',
    description: 'Governance, socio-economic development, environment and constitution',
    order: 4
  },
  {
    id: 'sub_jhs_comp',
    name: 'Computing',
    code: 'COMP',
    level: 'JHS',
    isCore: true,
    category: 'Core',
    description: 'Computer systems, programming logic, networks and web technology',
    order: 5
  },
  {
    id: 'sub_jhs_ct',
    name: 'Career Technology',
    code: 'CT',
    level: 'JHS',
    isCore: true,
    category: 'Core',
    description: 'Pre-technical skills, food & clothing, building construction and wood technology',
    order: 6
  },
  {
    id: 'sub_jhs_cad',
    name: 'Creative Arts and Design',
    code: 'CAD',
    level: 'JHS',
    isCore: true,
    category: 'Core',
    description: 'Visual communication, design thinking, music and dramatic arts',
    order: 7
  },
  {
    id: 'sub_jhs_ghl',
    name: 'Ghanaian Language (Twi/Ga/Fante)',
    code: 'GHL',
    level: 'JHS',
    isCore: true,
    category: 'Core',
    description: 'Literature, translation, customs, oral traditions and linguistics',
    order: 8
  },
  {
    id: 'sub_jhs_rme',
    name: 'Religious and Moral Education (RME)',
    code: 'RME',
    level: 'JHS',
    isCore: true,
    category: 'Core',
    description: 'Ethics, moral decision making, comparative religion and social values',
    order: 9
  },
  {
    id: 'sub_jhs_phe',
    name: 'Physical and Health Education (PHE)',
    code: 'PHE',
    level: 'JHS',
    isCore: true,
    category: 'Core',
    description: 'Sports physiology, team tournaments, first aid and community health',
    order: 10
  },
  {
    id: 'sub_jhs_fre',
    name: 'French Language',
    code: 'FRE',
    level: 'JHS',
    isCore: false,
    category: 'Elective',
    description: 'Intermediate French grammar, conversation, comprehension and essay',
    order: 11
  }
];

export const DEFAULT_ACADEMIC_SETTINGS: AcademicSettings = {
  sbaWeight: 50,
  examWeight: 50,
  academicYear: '2025/2026',
  activeTermNumber: 1,
  nextTermReopeningDate: '2026-09-08',
  vacationDate: '2026-07-24',
  headteacherName: 'Yakubu Hakeem',
  headteacherTitle: 'Headmaster',
  headteacherSignatureUrl: '',
  schoolMotto: 'Knowledge is Light & Truth',
  customSchoolCrestUrl: '',
  showPositionOnReport: true,
  showAttendanceOnReport: true,
  showConductOnReport: true,
  showTeacherRemarks: true,
  showHeadteacherRemarks: true,
  gradingScale: 'GES_9_POINT'
};

export function getSubjectsForClass(className: StudentClass, allSubjects: CurriculumSubject[] = DEFAULT_GHANA_SUBJECTS): CurriculumSubject[] {
  let level: 'KG' | 'Primary' | 'JHS';
  if (['Nursery', 'KG1', 'KG2'].includes(className)) {
    level = 'KG';
  } else if (['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].includes(className)) {
    level = 'Primary';
  } else {
    level = 'JHS';
  }
  return allSubjects
    .filter(s => s.level === level || s.level === 'All')
    .sort((a, b) => a.order - b.order);
}

/**
 * Standard GES 9-Point Grading Scale & NaCCA Achievement Descriptors
 */
export function calculateGESGrade(score: number): {
  grade: GESGrade;
  description: string;
  level: NaCCALevel;
  remark: string;
  badgeClass: string;
} {
  const rounded = Math.round(score * 10) / 10;

  if (rounded >= 80) {
    return {
      grade: 1,
      description: 'Advanced (Highest)',
      level: 'Advanced',
      remark: 'Outstanding performance, excellent mastery of curriculum competencies.',
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
    };
  }
  if (rounded >= 75) {
    return {
      grade: 2,
      description: 'Proficient (Higher)',
      level: 'Proficient',
      remark: 'Very good work, demonstrates strong conceptual understanding.',
      badgeClass: 'bg-teal-500/20 text-teal-400 border-teal-500/50'
    };
  }
  if (rounded >= 70) {
    return {
      grade: 3,
      description: 'Proficient (High)',
      level: 'Proficient',
      remark: 'Good performance, meets standard expectations with confidence.',
      badgeClass: 'bg-sky-500/20 text-sky-400 border-sky-500/50'
    };
  }
  if (rounded >= 65) {
    return {
      grade: 4,
      description: 'Proficient (High Average)',
      level: 'Proficient',
      remark: 'Credit pass, solid effort with room for greater excellence.',
      badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/50'
    };
  }
  if (rounded >= 60) {
    return {
      grade: 5,
      description: 'Developing (Average)',
      level: 'Developing',
      remark: 'Satisfactory, grasping key concepts but requires steady practice.',
      badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/50'
    };
  }
  if (rounded >= 50) {
    return {
      grade: 6,
      description: 'Developing (Low Average)',
      level: 'Developing',
      remark: 'Pass, needs more focused attention on foundational areas.',
      badgeClass: 'bg-amber-600/20 text-amber-500 border-amber-600/50'
    };
  }
  if (rounded >= 45) {
    return {
      grade: 7,
      description: 'Developing (Low)',
      level: 'Developing',
      remark: 'Weak pass, pupil requires closer academic monitoring.',
      badgeClass: 'bg-orange-500/20 text-orange-400 border-orange-500/50'
    };
  }
  if (rounded >= 35) {
    return {
      grade: 8,
      description: 'Beginning (Lower)',
      level: 'Beginning',
      remark: 'Weak performance, immediate remedial guidance strongly advised.',
      badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/50'
    };
  }
  return {
    grade: 9,
    description: 'Beginning (Lowest)',
    level: 'Beginning',
    remark: 'Very weak, requires urgent one-on-one intervention and support.',
    badgeClass: 'bg-red-600/20 text-red-400 border-red-600/50'
  };
}

/**
 * Calculates weighted SBA and Exam scores based on curriculum rules.
 */
export function computeTotalAssessment(
  sbaRaw: number,
  sbaMax: number = 50,
  examRaw: number,
  examMax: number = 100,
  sbaWeight: number = 50,
  examWeight: number = 50
): {
  weightedSba: number;
  weightedExam: number;
  totalScore: number;
  grade: GESGrade;
  description: string;
  level: NaCCALevel;
  remark: string;
} {
  // Normalize SBA to weight
  const safeSbaMax = sbaMax > 0 ? sbaMax : 50;
  const safeExamMax = examMax > 0 ? examMax : 100;

  const normalizedSba = (Math.min(Math.max(0, sbaRaw), safeSbaMax) / safeSbaMax) * sbaWeight;
  const normalizedExam = (Math.min(Math.max(0, examRaw), safeExamMax) / safeExamMax) * examWeight;
  const total = Math.round((normalizedSba + normalizedExam) * 10) / 10;

  const gradeInfo = calculateGESGrade(total);

  return {
    weightedSba: Math.round(normalizedSba * 10) / 10,
    weightedExam: Math.round(normalizedExam * 10) / 10,
    totalScore: total,
    grade: gradeInfo.grade,
    description: gradeInfo.description,
    level: gradeInfo.level,
    remark: gradeInfo.remark
  };
}

/**
 * Formats rank number to standard English ordinal string e.g. 1st, 2nd, 3rd, 4th, 21st, 22nd, 23rd
 */
export function formatOrdinal(n: number): string {
  if (!n || n <= 0) return '-';
  const pr = new Intl.PluralRules('en-US', { type: 'ordinal' });
  const suffixes: Record<string, string> = {
    one: 'st',
    two: 'nd',
    few: 'rd',
    other: 'th'
  };
  return `${n}${suffixes[pr.select(n)] || 'th'}`;
}

/**
 * Standard automatic Class Teacher Remark generator based on average score & attendance
 */
export function generateClassTeacherRemark(averageScore: number, daysPresent: number, totalDays: number): string {
  const attendanceRate = totalDays > 0 ? (daysPresent / totalDays) * 100 : 100;

  if (averageScore >= 80) {
    return attendanceRate >= 90
      ? 'An exceptionally gifted and consistent pupil. Demonstrates excellent leadership and exemplary conduct.'
      : 'Brilliant intellectual capabilities shown. Greater attendance consistency will guarantee top placement.';
  }
  if (averageScore >= 70) {
    return 'Very good academic performance. Shows genuine interest in class activities and works diligently.';
  }
  if (averageScore >= 60) {
    return 'Good effort this term. Capable of achieving even higher results with regular study at home.';
  }
  if (averageScore >= 50) {
    return 'Fair academic progress. Needs to improve concentration, submit assignments on time, and seek help in challenging subjects.';
  }
  if (averageScore >= 40) {
    return 'Performance is below average. Pupil must dedicate more time to reading and foundational revision.';
  }
  return 'Struggling with core competencies. Urgent parent-teacher conference and remedial support needed.';
}

/**
 * Standard automatic Headteacher Remark generator based on overall position & average score
 */
export function generateHeadteacherRemark(position: number, totalPupils: number, averageScore: number): string {
  if (position === 1) {
    return 'Outstanding! 1st position overall. Recommended for Academic Excellence citation. Keep shining!';
  }
  if (position <= 3) {
    return 'Distinguished result. Well done for being among the top three in the class. Maintain the momentum!';
  }
  if (position <= 10 && averageScore >= 70) {
    return 'Commendable performance. A very promising student with bright academic prospects.';
  }
  if (averageScore >= 60) {
    return 'Good overall result. Encourage the pupil to aim for the top quartile next term.';
  }
  if (averageScore >= 50) {
    return 'Satisfactory standing. Steady encouragement and homework supervision from guardians recommended.';
  }
  if (averageScore >= 40) {
    return 'Promoted on trial / Needs serious improvement. Extra academic intervention required.';
  }
  return 'Critical review needed. Parents are requested to see the Headteacher regarding academic intervention.';
}

/**
 * Generates initial demo assessment data for existing or new students so the dashboard is immediately populated with realistic Ghanaian school records.
 */
export function generateSeedAcademicRecords(
  students: Student[],
  termId: string = 'term_1_2026',
  academicYear: string = '2025/2026'
): AcademicAssessment[] {
  const records: AcademicAssessment[] = [];
  const teacherNames = ['Mr. Kwame Mensah', 'Madam Faustina Osei', 'Mr. Emmanuel Appiah', 'Madam Grace Boateng', 'Mr. David Addo'];

  students.forEach(student => {
    const subjects = getSubjectsForClass(student.class);
    // Give each student a characteristic ability factor for realistic distributions
    const hash = student.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const baseAbility = 45 + (hash % 45); // between 45 and 90

    subjects.forEach((subject, sIdx) => {
      const subjectVariance = ((hash + sIdx * 17) % 21) - 10; // -10 to +10
      const studentSubjectScore = Math.min(98, Math.max(30, baseAbility + subjectVariance));

      // split into 50% SBA + 50% Exam
      const sbaRaw = Math.min(50, Math.round((studentSubjectScore / 100) * 50 + ((sIdx % 5) - 2)));
      const examRaw = Math.min(100, Math.round((studentSubjectScore / 100) * 100 + (((sIdx * 3) % 7) - 3)));

      const computed = computeTotalAssessment(sbaRaw, 50, examRaw, 100, 50, 50);

      records.push({
        id: `acad_${student.id}_${subject.id}_${termId}`,
        studentId: student.id,
        studentName: student.name,
        class: student.class,
        termId: termId,
        academicYear: academicYear,
        subjectId: subject.id,
        subjectName: subject.name,
        classExercisesScore: Math.round((sbaRaw / 50) * 20),
        homeworkScore: Math.round((sbaRaw / 50) * 15),
        projectScore: Math.round((sbaRaw / 50) * 15),
        classTestScore: Math.round((sbaRaw / 50) * 20),
        sbaRawScore: sbaRaw,
        sbaMaxScore: 50,
        sbaScore: computed.weightedSba,
        examRawScore: examRaw,
        examMaxScore: 100,
        examScore: computed.weightedExam,
        totalScore: computed.totalScore,
        grade: computed.grade,
        gradeDescription: computed.description,
        achievementLevel: computed.level,
        teacherRemark: computed.remark,
        enteredBy: teacherNames[sIdx % teacherNames.length],
        enteredAt: new Date(Date.now() - (sIdx + 1) * 3600000).toISOString()
      });
    });
  });

  return records;
}
