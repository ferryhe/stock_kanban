/**
 * Password validation utilities
 * Implements stronger password requirements based on security best practices
 */

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxLength?: number;
}

// Default strong password requirements
export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxLength: 128,
};

/**
 * Validate password against requirements
 */
export function validatePassword(
  password: string,
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS
): PasswordValidationResult {
  const errors: string[] = [];

  // Check length
  if (password.length < requirements.minLength) {
    errors.push(`Password must be at least ${requirements.minLength} characters long`);
  }

  if (requirements.maxLength && password.length > requirements.maxLength) {
    errors.push(`Password must not exceed ${requirements.maxLength} characters`);
  }

  // Check uppercase
  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  // Check lowercase
  if (requirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  // Check numbers
  if (requirements.requireNumbers && !/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  // Check special characters
  if (requirements.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character (!@#$%^&* etc.)");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if password is commonly used (basic check)
 */
const COMMON_PASSWORDS = new Set([
  "password",
  "password123",
  "12345678",
  "qwerty123",
  "admin123",
  "letmein",
  "welcome123",
  "monkey123",
  "dragon123",
]);

export function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.has(password.toLowerCase());
}

/**
 * Calculate password strength (0-100)
 */
export function calculatePasswordStrength(password: string): number {
  let strength = 0;

  // Length bonus
  strength += Math.min(password.length * 4, 40);

  // Character variety bonus
  if (/[a-z]/.test(password)) strength += 10;
  if (/[A-Z]/.test(password)) strength += 10;
  if (/[0-9]/.test(password)) strength += 10;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 15;

  // Complexity bonus
  const uniqueChars = new Set(password).size;
  strength += Math.min(uniqueChars * 2, 15);

  // Penalty for common passwords
  if (isCommonPassword(password)) {
    strength = Math.max(strength - 30, 0);
  }

  return Math.min(strength, 100);
}

/**
 * Get password strength label
 */
export function getPasswordStrengthLabel(strength: number): {
  label: string;
  color: string;
} {
  if (strength < 30) return { label: "Weak", color: "red" };
  if (strength < 60) return { label: "Fair", color: "orange" };
  if (strength < 80) return { label: "Good", color: "yellow" };
  return { label: "Strong", color: "green" };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if email domain is disposable (basic check)
 */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "tempmail.com",
  "throwaway.email",
  "guerrillamail.com",
  "10minutemail.com",
  "mailinator.com",
  "trashmail.com",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? DISPOSABLE_EMAIL_DOMAINS.has(domain) : false;
}
