import { Student } from '../types';

/**
 * Common speech-to-text mistranscriptions for West African / Ghanaian names.
 * Web Speech API in browser often converts African names to standard English words.
 */
const GHANAIAN_NAME_ALIASES: Record<string, string[]> = {
  mutala: ['metal', 'mortal', 'mutter', 'mural', 'mortala', 'mutal', 'muntala', 'murtala', 'moutala', 'matter', 'matala', 'medall', 'mettle', 'motel', 'metall', 'medtle'],
  murtala: ['metal', 'mortal', 'mutter', 'mural', 'mortala', 'mutal', 'muntala', 'mutala', 'moutala', 'matter', 'matala', 'medall', 'mettle', 'motel', 'metall'],
  kofi: ['coffee', 'coffe', 'koffi', 'copy', 'cofy', 'cofi', 'kophie'],
  ama: ['armor', 'alma', 'ammer', 'ahma', 'amma', 'ammar'],
  kwame: ['squame', 'kwami', 'quame', 'quami', 'kwam', 'quamy', 'kwamie'],
  yakubu: ['jacob', 'yacob', 'yakob', 'yakub', 'yacubu', 'jacobu', 'yaakubu'],
  fuseini: ['foster', 'husseini', 'fousseni', 'hussein', 'fuseni', 'fusseni', 'husseini'],
  sulemana: ['solomon', 'suleman', 'suleiman', 'salaman', 'sulaimana'],
  issah: ['isaac', 'isack', 'israh', 'issa', 'eisa', 'isa'],
  musah: ['moses', 'musa', 'musaah', 'mussa', 'mousse'],
  abena: ['abina', 'arena', 'abenaa', 'avena'],
  adwoa: ['adjua', 'ajwa', 'adjoa', 'adjwoa'],
  akua: ['aqua', 'ackua', 'akoa', 'accua'],
  yaa: ['yah', 'ya', 'yar', 'yeah'],
  afia: ['affia', 'afiya', 'affya', 'aphia'],
  alhassan: ['al hassan', 'hassan', 'alhasan', 'al hasan', 'al-hassan'],
  alhasan: ['al hassan', 'hassan', 'alhassan', 'al hasan'],
  ibrahim: ['abraham', 'ibrahim', 'ibraheem', 'ebrima', 'ibraim'],
  muntari: ['montari', 'munfari', 'muntari', 'muntari'],
  seidu: ['saydu', 'saidu', 'seidu', 'seydu'],
  salifu: ['salifo', 'salifu', 'salifou'],
  ayisha: ['aisha', 'ayesha', 'ayisha', 'aiesha'],
  fatima: ['fatimat', 'fatim', 'fatma', 'fatuma'],
  rahinatu: ['rahina', 'rahinatu', 'raheenatu'],
  sawla: ['sahla', 'sawla', 'soula', 'saula'],
  saako: ['sako', 'sacko', 'psycho', 'socco'],
  holy: ['wholly', 'holly', 'hole'],
  child: ['childe', 'chilled']
};

/**
 * Calculates Levenshtein Distance between two strings.
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const a = str1.toLowerCase().trim();
  const b = str2.toLowerCase().trim();

  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Extracts consonant skeleton (phonetic core) from a name string.
 */
function getConsonantSkeleton(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/[aeiouy]/g, '');
}

/**
 * Calculates American Soundex phonetic code for string comparison.
 */
export function getSoundex(str: string): string {
  const s = str.toUpperCase().replace(/[^A-Z]/g, '');
  if (!s) return '';
  const firstLetter = s.charAt(0);
  const codes: Record<string, string> = {
    B: '1', F: '1', P: '1', V: '1',
    C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
    D: '3', T: '3',
    L: '4',
    M: '5', N: '5',
    R: '6'
  };
  let soundex = firstLetter;
  let prevCode = codes[firstLetter] || '';
  for (let i = 1; i < s.length && soundex.length < 4; i++) {
    const char = s.charAt(i);
    const code = codes[char] || '';
    if (code && code !== prevCode) {
      soundex += code;
      prevCode = code;
    } else if (!code) {
      prevCode = '';
    }
  }
  return soundex.padEnd(4, '0');
}

/**
 * Computes similarity ratio (0.0 to 1.0) between two individual tokens or strings.
 */
export function calculateTokenSimilarity(spokenToken: string, targetToken: string): number {
  const s = spokenToken.toLowerCase().trim();
  const t = targetToken.toLowerCase().trim();

  if (!s || !t) return 0;
  if (s === t) return 1.0;

  // Substring / prefix check
  if (s.length >= 3 && t.length >= 3) {
    if (t.startsWith(s) || s.startsWith(t)) return 0.92;
    if (t.includes(s) || s.includes(t)) return 0.88;
  }

  // Alias dictionary check
  const aliasesForTarget = GHANAIAN_NAME_ALIASES[t] || [];
  if (aliasesForTarget.includes(s)) {
    return 0.96;
  }

  // Check reverse alias lookup
  for (const [canonical, aliases] of Object.entries(GHANAIAN_NAME_ALIASES)) {
    if (canonical === t && aliases.includes(s)) return 0.96;
    if (aliases.includes(t) && (canonical === s || aliases.includes(s))) return 0.94;
  }

  // Soundex phonetic check
  const sSoundex = getSoundex(s);
  const tSoundex = getSoundex(t);
  if (sSoundex && tSoundex && sSoundex === tSoundex && s.length >= 3) {
    return 0.94;
  }

  // Consonant skeleton check
  const sSkeleton = getConsonantSkeleton(s);
  const tSkeleton = getConsonantSkeleton(t);

  if (sSkeleton && tSkeleton && sSkeleton.length >= 2) {
    if (sSkeleton === tSkeleton) {
      return 0.88;
    }
    if (sSkeleton.length >= 3 && tSkeleton.length >= 3) {
      if (sSkeleton.includes(tSkeleton) || tSkeleton.includes(sSkeleton)) {
        return 0.82;
      }
    }
  }

  // Levenshtein distance ratio
  const maxLen = Math.max(s.length, t.length);
  const dist = levenshteinDistance(s, t);
  const levSimilarity = 1.0 - dist / maxLen;

  return Math.max(0, levSimilarity);
}

export interface MatchResult {
  student: Student;
  score: number;
  matchedNamePart: string;
}

/**
 * Finds the best matching student from a candidate list for a given voice command query string.
 * High accuracy for Ghanaian / West African names prone to speech recognition misinterpretations.
 */
export function findBestMatchingStudent(
  rawQuery: string,
  candidateStudents: Student[]
): {
  bestMatch: Student | null;
  score: number;
  allMatches: MatchResult[];
  isAmbiguous: boolean;
} {
  const cleanQuery = rawQuery
    .toLowerCase()
    .replace(/\b(check\s*in|mark\s*absent|absent|present|register|pupil|student|please|is|for|the|status)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanQuery || candidateStudents.length === 0) {
    return { bestMatch: null, score: 0, allMatches: [], isAmbiguous: false };
  }

  const queryTokens = cleanQuery.split(' ').filter(t => t.length > 0);
  const results: MatchResult[] = [];

  for (const student of candidateStudents) {
    const studentFullName = student.name.toLowerCase().trim();
    const studentTokens = studentFullName.split(' ').filter(t => t.length > 0);

    let maxStudentScore = 0;
    let matchedPart = '';

    // 1. Direct full name check
    if (studentFullName === cleanQuery) {
      maxStudentScore = 1.0;
      matchedPart = student.name;
    } else if (studentFullName.includes(cleanQuery) || cleanQuery.includes(studentFullName)) {
      maxStudentScore = 0.95;
      matchedPart = student.name;
    } else {
      // 2. Token-by-token comparison
      for (const qToken of queryTokens) {
        for (const sToken of studentTokens) {
          const tokenScore = calculateTokenSimilarity(qToken, sToken);
          if (tokenScore > maxStudentScore) {
            maxStudentScore = tokenScore;
            matchedPart = sToken;
          }
        }
      }

      // 3. Composite score if query has multiple tokens (e.g., "metal alhassan")
      if (queryTokens.length > 1 && studentTokens.length > 1) {
        let totalTokenScore = 0;
        for (const qToken of queryTokens) {
          let bestForQToken = 0;
          for (const sToken of studentTokens) {
            const score = calculateTokenSimilarity(qToken, sToken);
            if (score > bestForQToken) bestForQToken = score;
          }
          totalTokenScore += bestForQToken;
        }
        const avgCompositeScore = totalTokenScore / queryTokens.length;
        if (avgCompositeScore > maxStudentScore) {
          maxStudentScore = avgCompositeScore;
          matchedPart = student.name;
        }
      }
    }

    if (maxStudentScore >= 0.50) {
      results.push({
        student,
        score: maxStudentScore,
        matchedNamePart: matchedPart
      });
    }
  }

  // Sort candidates descending by score
  results.sort((a, b) => b.score - a.score);

  if (results.length === 0) {
    return { bestMatch: null, score: 0, allMatches: [], isAmbiguous: false };
  }

  const topMatch = results[0];
  const secondMatch = results.length > 1 ? results[1] : null;

  // Check ambiguity: if top two matches both have very high scores and are within 0.05 of each other
  const isAmbiguous =
    secondMatch !== null &&
    topMatch.score >= 0.75 &&
    secondMatch.score >= 0.75 &&
    Math.abs(topMatch.score - secondMatch.score) < 0.05;

  return {
    bestMatch: topMatch.student,
    score: topMatch.score,
    allMatches: results,
    isAmbiguous
  };
}
