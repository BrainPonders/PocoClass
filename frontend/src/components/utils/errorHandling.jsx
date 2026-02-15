/**
 * @file errorHandling.jsx
 * @description Centralized error handling utilities for the application.
 * Provides functions to parse error messages into user-friendly text,
 * determine error severity levels, create structured log entries,
 * and handle API errors with toast notifications.
 */

import { LOG_TYPES, LOG_LEVELS } from '../constants';

/**
 * Parse error message from various error types
 * @param {Error|Object|string} error - Error object
 * @returns {string} User-friendly error message
 */
export function parseErrorMessage(error) {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.message) {
    // Check for specific error types
    if (error.message.includes('Rate limit')) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    if (error.message.includes('Network')) {
      return 'Network error. Please check your connection.';
    }
    if (error.message.includes('Not found')) {
      return 'The requested resource was not found.';
    }
    if (error.message.includes('Unauthorized')) {
      return 'You don\'t have permission to perform this action.';
    }
    
    return error.message;
  }
  
  if (error?.detail) {
    return error.detail;
  }
  
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Get error level from error object
 * @param {Error|Object} error - Error object
 * @returns {string} Error level (error, warning, info)
 */
export function getErrorLevel(error) {
  if (typeof error === 'string') {
    return LOG_LEVELS.ERROR;
  }
  
  const message = error?.message || '';
  
  if (message.includes('Rate limit')) {
    return LOG_LEVELS.WARNING;
  }
  if (message.includes('Not found') || message.includes('No data')) {
    return LOG_LEVELS.INFO;
  }
  
  return LOG_LEVELS.ERROR;
}

/**
 * Create a log entry for an error
 * @param {Error|Object} error - Error object
 * @param {string} context - Context where error occurred
 * @param {Object} additionalData - Additional data to log
 * @returns {Object} Log entry object
 */
export function createErrorLog(error, context, additionalData = {}) {
  return {
    timestamp: new Date().toISOString(),
    type: LOG_TYPES.ERROR,
    level: getErrorLevel(error),
    message: `${context}: ${parseErrorMessage(error)}`,
    details: {
      errorMessage: error?.message || error,
      errorStack: error?.stack,
      context,
      ...additionalData
    },
    source: 'pococlass'
  };
}

/**
 * Handle API errors consistently
 * @param {Error} error - Error from API call
 * @param {Function} showToast - Toast notification function
 * @param {string} context - Context of the operation
 * @returns {Object} Processed error information
 */
export function handleApiError(error, showToast, context) {
  const message = parseErrorMessage(error);
  const level = getErrorLevel(error);
  
  // Show toast based on error level
  if (level === LOG_LEVELS.ERROR) {
    showToast(message, 'error');
  } else if (level === LOG_LEVELS.WARNING) {
    showToast(message, 'warning');
  }
  
  // Log error
  console.error(createErrorLog(error, context));
  
  return {
    message,
    level,
    error
  };
}