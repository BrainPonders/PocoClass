/**
 * @file pocoCalculations.jsx
 * @description POCO (Percentage of Confidence) score calculation utilities.
 * Computes maximum weights for OCR, filename, and verification categories
 * based on item counts, base weights, and multipliers. Used throughout
 * the wizard to display weight breakdowns and example confidence scores.
 */

import { WEIGHTS } from '../constants';
export const OCR_DEFAULT_MULTIPLIER = WEIGHTS.OCR_MULTIPLIER_DEFAULT;
export const FILENAME_DEFAULT_MULTIPLIER = WEIGHTS.FILENAME_MULTIPLIER_DEFAULT;
export const VERIFICATION_DEFAULT_MULTIPLIER = WEIGHTS.VERIFICATION_MULTIPLIER_DEFAULT;

/**
 * Calculate maximum possible weight for a scoring category
 * @param {number} itemCount - Number of items (patterns, fields, etc.)
 * @param {number} baseWeight - Base weight per item
 * @param {number} multiplier - Multiplier for this category
 * @returns {number} Maximum possible weight
 */
export function calculateMaxWeight(itemCount, baseWeight, multiplier) {
  return itemCount * baseWeight * multiplier;
}

/**
 * Calculate OCR maximum weight
 * @param {Array} ocrIdentifiers - Array of OCR logic groups
 * @param {number} multiplier - OCR multiplier
 * @returns {number} Maximum OCR weight
 */
export function calculateOcrMaxWeight(ocrIdentifiers = [], multiplier = WEIGHTS.OCR_MULTIPLIER_DEFAULT) {
  const totalIdentifiers = ocrIdentifiers.reduce((sum, group) => 
    sum + (group.conditions?.length || 0), 0
  );
  return calculateMaxWeight(totalIdentifiers, WEIGHTS.OCR_BASE, multiplier);
}

/**
 * Calculate filename maximum weight
 * @param {Object} filenamePatterns - Filename patterns object
 * @param {number} multiplier - Filename multiplier
 * @returns {number} Maximum filename weight
 */
export function calculateFilenameMaxWeight(filenamePatterns = {}, multiplier = WEIGHTS.FILENAME_MULTIPLIER_DEFAULT) {
  const totalPatterns = (filenamePatterns.patterns?.length || 0) + 
                        (filenamePatterns.dateFormats?.length || 0);
  return calculateMaxWeight(totalPatterns, WEIGHTS.FILENAME_BASE, multiplier);
}

/**
 * Calculate verification maximum weight
 * @param {Object} verification - Verification object with enabledFields
 * @param {number} multiplier - Verification multiplier
 * @returns {number} Maximum verification weight
 */
export function calculateVerificationMaxWeight(verification = {}, multiplier = WEIGHTS.VERIFICATION_MULTIPLIER_DEFAULT) {
  const enabledCount = Object.values(verification.enabledFields || {}).filter(Boolean).length;
  return calculateMaxWeight(enabledCount, WEIGHTS.VERIFICATION_BASE, multiplier);
}

/**
 * Calculate total maximum POCO weight
 * @param {Object} ruleData - Complete rule data
 * @returns {Object} Breakdown of all weights
 */
export function calculateTotalMaxWeight(ruleData) {
  const ocrMax = calculateOcrMaxWeight(
    ruleData.ocrIdentifiers,
    ruleData.ocrMultiplier
  );
  
  const filenameMax = calculateFilenameMaxWeight(
    ruleData.filenamePatterns,
    ruleData.filenameMultiplier
  );
  
  const verificationMax = calculateVerificationMaxWeight(
    ruleData.verification,
    ruleData.verificationMultiplier
  );
  
  return {
    ocrMax,
    filenameMax,
    verificationMax,
    totalMax: ocrMax + filenameMax + verificationMax
  };
}

/**
 * Calculate example POCO score
 * @param {Object} weights - Weight breakdown from calculateTotalMaxWeight
 * @param {number} matchRate - Match rate (0-1)
 * @returns {Object} Score breakdown
 */
export function calculateExampleScore(weights, matchRate = 0.8) {
  const ocrScore = weights.ocrMax * matchRate;
  const filenameScore = weights.filenameMax * matchRate;
  const verificationScore = weights.verificationMax * matchRate;
  const totalScore = ocrScore + filenameScore + verificationScore;
  
  const pocoPercentage = weights.totalMax > 0 
    ? Math.round((totalScore / weights.totalMax) * 100)
    : 0;
  
  return {
    ocrScore,
    filenameScore,
    verificationScore,
    totalScore,
    pocoPercentage
  };
}

/**
 * Count filled OCR logic groups
 * @param {Array} ocrIdentifiers - Array of OCR logic groups
 * @returns {number} Count of groups with at least one pattern
 */
export function countFilledOcrGroups(ocrIdentifiers = []) {
  return ocrIdentifiers.filter(group => 
    group.conditions?.some(c => c.pattern && c.pattern.trim() !== '')
  ).length;
}

/**
 * Check if a step is enabled (has data)
 * @param {Object} ruleData - Rule data
 * @param {number} stepNumber - Step number to check
 * @returns {boolean} Whether step is enabled
 */
export function isStepEnabled(ruleData, stepNumber) {
  switch(stepNumber) {
    case 4: // Filename
      return (ruleData.filenamePatterns?.patterns?.length || 0) > 0 ||
             (ruleData.filenamePatterns?.dateFormats?.length || 0) > 0;
    case 5: // Verification
      return Object.values(ruleData.verification?.enabledFields || {}).some(Boolean);
    default:
      return true;
  }
}