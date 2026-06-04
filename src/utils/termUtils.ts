/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Calculates a list of school days (Monday to Friday only) starting from a generic start date YYYY-MM-DD
 * until the requested number of school days is reached.
 */
export function generateSchoolDays(startDateStr: string, daysCount: number): string[] {
  const schoolDays: string[] = [];
  if (!startDateStr || daysCount <= 0) return schoolDays;
  
  // Parse startDateStr avoiding timezone offsets
  const parts = startDateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const currentDate = new Date(year, month, day);
  
  // Limit sanity bound of 365 days to prevent infinite calculations if invalid args passed
  let safetyCounter = 0;
  const maxSafety = 365;
  
  while (schoolDays.length < daysCount && safetyCounter < maxSafety) {
    const dayOfWeek = currentDate.getDay(); // 0 is Sunday, 6 is Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Monday to Friday
      const yyyy = currentDate.getFullYear();
      const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
      const dd = String(currentDate.getDate()).padStart(2, '0');
      schoolDays.push(`${yyyy}-${mm}-${dd}`);
    }
    currentDate.setDate(currentDate.getDate() + 1);
    safetyCounter++;
  }
  
  return schoolDays;
}
