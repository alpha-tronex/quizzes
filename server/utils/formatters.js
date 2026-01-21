/**
 * Common formatting functions for the quiz application
 */

/**
 * Format date to readable string
 * @param {Date|string} date - Date to format
 * @param {string} format - Format type ('short', 'long', 'iso')
 * @returns {string} - Formatted date string
 */
function formatDate(date, format = 'short') {
  if (!date) return 'N/A';
  
  const d = new Date(date);
  
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    case 'long':
      return d.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    case 'iso':
      return d.toISOString();
    default:
      return d.toLocaleDateString();
  }
}

/**
 * Format phone number to standard format
 * @param {string} phone - Phone number to format
 * @returns {string} - Formatted phone number
 */
function formatPhoneNumber(phone) {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX for 10-digit US numbers
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  // Format as +X (XXX) XXX-XXXX for 11-digit numbers
  if (cleaned.length === 11) {
    return `+${cleaned.slice(0, 1)} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  // Return original if not standard length
  return phone;
}

/**
 * Calculate quiz score percentage
 * @param {number} score - Number of correct answers
 * @param {number} total - Total number of questions
 * @returns {number} - Percentage (0-100)
 */
function calculatePercentage(score, total) {
  if (!total || total === 0) return 0;
  return Math.round((score / total) * 100);
}

/**
 * Get grade letter based on percentage
 * @param {number} percentage - Score percentage
 * @returns {string} - Grade letter (A, B, C, D, F)
 */
function getGradeLetter(percentage) {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
}

/**
 * Format quiz score with percentage and grade
 * @param {number} score - Number of correct answers
 * @param {number} total - Total number of questions
 * @returns {object} - { score, total, percentage, grade }
 */
function formatQuizScore(score, total) {
  const percentage = calculatePercentage(score, total);
  const grade = getGradeLetter(percentage);
  
  return {
    score,
    total,
    percentage,
    grade,
    display: `${score}/${total} (${percentage}%) - ${grade}`
  };
}

/**
 * Format user's full name
 * @param {object} user - User object with fname and lname
 * @returns {string} - Full name or username
 */
function formatUserName(user) {
  if (!user) return 'Unknown User';
  
  const firstName = user.fname || '';
  const lastName = user.lname || '';
  const fullName = `${firstName} ${lastName}`.trim();
  
  return fullName || user.username || user.uname || 'Unknown User';
}

/**
 * Format user display name with username
 * @param {object} user - User object
 * @returns {string} - Display name (e.g., "John Doe (johndoe)")
 */
function formatUserDisplayName(user) {
  if (!user) return 'Unknown User';
  
  const fullName = formatUserName(user);
  const username = user.username || user.uname;
  
  if (fullName === username || fullName === 'Unknown User') {
    return username || 'Unknown User';
  }
  
  return `${fullName} (${username})`;
}

/**
 * Calculate time elapsed in human-readable format
 * @param {Date|string} startDate - Start date/time
 * @param {Date|string} endDate - End date/time (optional, defaults to now)
 * @returns {string} - Formatted time elapsed
 */
function formatTimeElapsed(startDate, endDate = new Date()) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const diff = Math.abs(end - start);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
}

/**
 * Sanitize string for safe display
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeString(str) {
  if (!str || typeof str !== 'string') return '';
  
  return str
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .trim();
}

module.exports = {
  formatDate,
  formatPhoneNumber,
  calculatePercentage,
  getGradeLetter,
  formatQuizScore,
  formatUserName,
  formatUserDisplayName,
  formatTimeElapsed,
  sanitizeString
};
