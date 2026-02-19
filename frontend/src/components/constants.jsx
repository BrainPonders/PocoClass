/**
 * @file constants.jsx
 * @description Shared constants used across the frontend for POCO scoring weights,
 * threshold ranges, validation limits, rule statuses, log categories, and UI timing.
 * Centralizes magic numbers to keep components consistent and maintainable.
 */

// ============================================
// POCO SCORING CONSTANTS
// ============================================

export const WEIGHTS = {
  // Base weights per identifier type
  OCR_BASE: 3,
  FILENAME_BASE: 1,
  VERIFICATION_BASE: 1.0,  // Fixed: was 0.5, should be 1.0 per design
  
  // Default multipliers
  OCR_MULTIPLIER_DEFAULT: 3,
  FILENAME_MULTIPLIER_DEFAULT: 1,
  VERIFICATION_MULTIPLIER_DEFAULT: 0.5,
  
  // Multiplier ranges
  OCR_MULTIPLIER_MIN: 1,
  OCR_MULTIPLIER_MAX: 10,
  FILENAME_MULTIPLIER_MIN: 1,
  FILENAME_MULTIPLIER_MAX: 10,
  VERIFICATION_MULTIPLIER_MIN: 0.1,
  VERIFICATION_MULTIPLIER_MAX: 10,
};

export const THRESHOLDS = {
  // Default threshold values
  POCO_DEFAULT: 75,
  POCO_MIN: 50,
  POCO_MAX: 100,
  
  OCR_DEFAULT: 75,
  OCR_MIN: 50,
  OCR_MAX: 100,
  
  // Threshold categories
  PERMISSIVE: 65,
  RECOMMENDED: 75,
  STRICT: 85,
};

export const VALIDATION = {
  // Minimum requirements
  MIN_RULE_NAME_LENGTH: 3,
  MIN_DESCRIPTION_LENGTH: 10,
  MIN_OCR_LOGIC_GROUPS: 3,
  
  // Field lengths
  MAX_RULE_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  
  // Pattern ranges
  DEFAULT_OCR_RANGE: '0-1600',
};

export const STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

export const LOG_TYPES = {
  RULE_EXECUTION: 'rule_execution',
  CLASSIFICATION: 'classification',
  SYSTEM: 'system',
  ERROR: 'error',
  PAPERLESS_API: 'paperless_api',
};

export const LOG_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success',
};

export const UI = {
  TOAST_DURATION: 3000,
  DEBOUNCE_DELAY: 500,
  ITEMS_PER_PAGE: 10,
  MAX_TOAST_COUNT: 5,
};