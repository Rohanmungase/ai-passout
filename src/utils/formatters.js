/**
 * Utility formatters for the application.
 */

/**
 * Formats file size from bytes into human-readable string.
 * @param {number} bytes
 * @returns {string} e.g. "1.5 MB" or "320 KB"
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formats a number as a percentage string.
 * @param {number} value
 * @param {number} decimals
 * @returns {string}
 */
export function formatPercentage(value, decimals = 1) {
  return `${Number(value).toFixed(decimals)}%`;
}

/**
 * Formats marks as "obtained/max" string.
 * @param {number} obtained
 * @param {number} max
 * @returns {string}
 */
export function formatMarks(obtained, max) {
  return `${obtained}/${max}`;
}

/**
 * Truncates a string to a maximum length, adding ellipsis.
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
export function truncateText(str, maxLen = 50) {
  if (!str) return '';
  return str.length <= maxLen ? str : str.substring(0, maxLen) + '...';
}

/**
 * Returns a human-readable timestamp.
 * @param {Date} date
 * @returns {string}
 */
export function formatTimestamp(date = new Date()) {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Returns a grade letter based on percentage.
 * @param {number} percentage
 * @returns {string}
 */
export function getGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

/**
 * Returns a color class based on percentage score.
 * @param {number} percentage
 * @returns {string}
 */
export function getScoreColor(percentage) {
  if (percentage >= 80) return 'text-emerald-500';
  if (percentage >= 60) return 'text-amber-500';
  return 'text-red-500';
}

/**
 * Returns a bg color class based on percentage score.
 * @param {number} percentage
 * @returns {string}
 */
export function getScoreBgColor(percentage) {
  if (percentage >= 80) return 'bg-emerald-500';
  if (percentage >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}
