import { Injectable } from '@angular/core';

export interface ValidationResult {
  valid: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ValidationService {

  constructor() { }

  /**
   * Validate username
   */
  validateUsername(username: string): ValidationResult {
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
   */
  validatePassword(password: string): ValidationResult {
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
   */
  validateEmail(email: string): ValidationResult {
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
   */
  validatePhone(phone: string): ValidationResult {
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
   */
  validateName(name: string, fieldName: string = 'Name'): ValidationResult {
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
   */
  validateUserType(type: string): ValidationResult {
    const validTypes = ['student', 'admin'];
    
    if (!type || !validTypes.includes(type)) {
      return { valid: false, error: 'Type must be either student or admin' };
    }
    
    return { valid: true, error: null };
  }

  /**
   * Validate required fields and return all errors
   */
  validateRequiredFields(fields: { [key: string]: any }, requiredFields: string[]): string[] {
    const errors: string[] = [];
    
    requiredFields.forEach(fieldName => {
      if (!fields[fieldName] || (typeof fields[fieldName] === 'string' && !fields[fieldName].trim())) {
        errors.push(`${fieldName} is required`);
      }
    });
    
    return errors;
  }

  /**
   * Validate all fields in a form
   */
  validateForm(formData: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Username validation
    if (formData.uname !== undefined) {
      const usernameResult = this.validateUsername(formData.uname);
      if (!usernameResult.valid && usernameResult.error) {
        errors.push(usernameResult.error);
      }
    }

    // Password validation
    if (formData.pass !== undefined) {
      const passwordResult = this.validatePassword(formData.pass);
      if (!passwordResult.valid && passwordResult.error) {
        errors.push(passwordResult.error);
      }
    }

    // Email validation
    if (formData.email !== undefined) {
      const emailResult = this.validateEmail(formData.email);
      if (!emailResult.valid && emailResult.error) {
        errors.push(emailResult.error);
      }
    }

    // Phone validation
    if (formData.phone !== undefined) {
      const phoneResult = this.validatePhone(formData.phone);
      if (!phoneResult.valid && phoneResult.error) {
        errors.push(phoneResult.error);
      }
    }

    // First name validation
    if (formData.fname !== undefined) {
      const fnameResult = this.validateName(formData.fname, 'First name');
      if (!fnameResult.valid && fnameResult.error) {
        errors.push(fnameResult.error);
      }
    }

    // Last name validation
    if (formData.lname !== undefined) {
      const lnameResult = this.validateName(formData.lname, 'Last name');
      if (!lnameResult.valid && lnameResult.error) {
        errors.push(lnameResult.error);
      }
    }

    // Type validation
    if (formData.type !== undefined) {
      const typeResult = this.validateUserType(formData.type);
      if (!typeResult.valid && typeResult.error) {
        errors.push(typeResult.error);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
}
