/**
 * Common validation functions for the quiz application
 */

/**
 * Validate username
 * @param {string} username - Username to validate
 * @returns {object} - { valid: boolean, error: string }
 */
function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  
  if (!/^[A-Za-z0-9]+$/.test(trimmed)) {
    return { valid: false, error: 'Username may contain only letters and numbers' };
  }
  
  return { valid: true, error: null };
}

/**
 * Validate password
 * @param {string} password - Password to validate
 * @returns {object} - { valid: boolean, error: string }
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' };
  }
  
  return { valid: true, error: null };
}

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {object} - { valid: boolean, error: string }
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email address' };
  }
  
  return { valid: true, error: null };
}

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {object} - { valid: boolean, error: string }
 */
function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Phone number is required' };
  }
  
  const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
  if (!phoneRegex.test(phone)) {
    return { valid: false, error: 'Phone number must be at least 10 digits' };
  }
  
  return { valid: true, error: null };
}

/**
 * Validate name (first name or last name)
 * @param {string} name - Name to validate
 * @param {string} fieldName - Field name for error message
 * @returns {object} - { valid: boolean, error: string }
 */
function validateName(name, fieldName = 'Name') {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length < 2) {
    return { valid: false, error: `${fieldName} must be at least 2 characters` };
  }
  
  return { valid: true, error: null };
}

/**
 * Validate user type
 * @param {string} type - User type to validate
 * @returns {object} - { valid: boolean, error: string }
 */
function validateUserType(type) {
  const validTypes = ['student', 'admin'];
  
  if (!type || !validTypes.includes(type)) {
    return { valid: false, error: 'Type must be either student or admin' };
  }
  
  return { valid: true, error: null };
}

/**
 * Validate required fields and return all errors
 * @param {object} fields - Object with field names and values
 * @param {array} requiredFields - Array of required field names
 * @returns {array} - Array of error messages
 */
function validateRequiredFields(fields, requiredFields) {
  const errors = [];
  
  requiredFields.forEach(fieldName => {
    if (!fields[fieldName] || (typeof fields[fieldName] === 'string' && !fields[fieldName].trim())) {
      errors.push(`${fieldName} is required`);
    }
  });
  
  return errors;
}

module.exports = {
  validateUsername,
  validatePassword,
  validateEmail,
  validatePhone,
  validateName,
  validateUserType,
  validateRequiredFields
};
