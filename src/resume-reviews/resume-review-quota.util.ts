/** UTC calendar month bucket for rolling quota rows (`YYYY-MM`). */
export function utcMonthPeriodKey(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}
