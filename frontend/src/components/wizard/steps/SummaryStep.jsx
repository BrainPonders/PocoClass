import React from 'react';
import { CheckCircle } from 'lucide-react';
import Tooltip from '@/components/Tooltip';

import { 
  calculateTotalMaxWeight, 
  calculateExampleScore,
  OCR_DEFAULT_MULTIPLIER,
  FILENAME_DEFAULT_MULTIPLIER,
  VERIFICATION_DEFAULT_MULTIPLIER
} from '@/components/utils/pocoCalculations';

export default function SummaryStep({ 
  ruleData, 
  showInfoBoxes,
  setShowInfoBoxes,
  updateRuleData
}) {
  const ocrMultiplier = ruleData.ocrMultiplier ?? OCR_DEFAULT_MULTIPLIER;
  const filenameMultiplier = ruleData.filenameMultiplier ?? FILENAME_DEFAULT_MULTIPLIER;
  const verificationMultiplier = ruleData.verificationMultiplier ?? VERIFICATION_DEFAULT_MULTIPLIER;

  const totalOcrIdentifiers = ruleData.ocrIdentifiers?.reduce((sum, group) => sum + (group.conditions?.length || 0), 0) || 0;
  const totalFilenamePatterns = (ruleData.filenamePatterns?.patterns?.length || 0) + (ruleData.filenamePatterns?.dateFormats?.length || 0);
  const totalVerificationFields = Object.values(ruleData.verification?.enabledFields || {}).filter(Boolean).length;

  const weights = calculateTotalMaxWeight(
    totalOcrIdentifiers,
    totalFilenamePatterns,
    totalVerificationFields,
    ocrMultiplier,
    filenameMultiplier,
    verificationMultiplier
  );
  
  const exampleMatchRate = 0.8;
  const exampleScore = calculateExampleScore(weights, exampleMatchRate);

  return (
    <div className="wizard-container">
      <div className="flex items-center gap-2 mb-6" style={{minHeight: '32px'}}>
        <h2 className="text-2xl font-bold">Step 6 of 6: Review & Summary</h2>
        <Tooltip content="Review all your rule configurations before saving. You can go back to any step to make changes if needed." />
      </div>
      <p className="text-gray-600 mb-6">
        Review your rule configuration before saving
      </p>

      <div className="space-y-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-lg">Basic Information</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Rule Name:</span>
              <span className="font-medium">{ruleData.ruleName || 'Not set'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Rule ID:</span>
              <span className="font-medium font-mono text-xs">{ruleData.ruleId || 'Not set'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Threshold:</span>
              <span className="font-medium">{ruleData.threshold}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Status:</span>
              <select
                value={ruleData.status || 'new'}
                onChange={(e) => {
                  const newStatus = e.target.value;
                  if (newStatus === 'active') {
                    if (window.confirm('⚠️ WARNING: Activating this rule will allow it to automatically process documents in your Paperless archive during background processing. This may modify your documents. Are you sure you want to activate this rule?')) {
                      updateRuleData('status', newStatus);
                    } else {
                      // Reset dropdown to current value
                      e.target.value = ruleData.status || 'new';
                    }
                  } else {
                    updateRuleData('status', newStatus);
                  }
                }}
                className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {ruleData.status === 'new' ? (
                  <>
                    <option value="new">New</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </>
                ) : (
                  <>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </>
                )}
              </select>
            </div>
            {ruleData.status === 'active' && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                <strong>⚠️ Active Rule:</strong> This rule will process documents automatically during background processing.
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-lg">OCR Identifiers</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Logic Groups:</span>
              <span className="font-medium">{ruleData.ocrIdentifiers?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Identifiers:</span>
              <span className="font-medium">{totalOcrIdentifiers} patterns</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">OCR Threshold:</span>
              <span className="font-medium">{ruleData.ocrThreshold || 75}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">OCR Multiplier:</span>
              <span className="font-medium">{ocrMultiplier}×</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Maximum OCR Weight:</span>
              <span className="font-medium text-blue-600">{weights.ocrMax} points</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-lg">Document Classifications</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Correspondent:</span>
              <span className="font-medium">{ruleData.predefinedData?.correspondent || 'Not set'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Document Type:</span>
              <span className="font-medium">{ruleData.predefinedData?.documentType || 'Not set'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tags:</span>
              <span className="font-medium">{ruleData.predefinedData?.tags?.length || 0} tags</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Dynamic Extraction Rules:</span>
              <span className="font-medium">{ruleData.dynamicData?.extractionRules?.length || 0}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-lg">Filename Identification</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Filename Patterns:</span>
              <span className="font-medium">{ruleData.filenamePatterns?.patterns?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date Formats:</span>
              <span className="font-medium">{ruleData.filenamePatterns?.dateFormats?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Patterns:</span>
              <span className="font-medium">{totalFilenamePatterns}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Filename Multiplier:</span>
              <span className="font-medium">{filenameMultiplier}×</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Maximum Filename Weight:</span>
              <span className="font-medium text-blue-600">{weights.filenameMax} points</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-lg">Data Verification</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Enabled Fields:</span>
              <span className="font-medium">{totalVerificationFields}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Verification Multiplier:</span>
              <span className="font-medium">{verificationMultiplier}×</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Maximum Verification Weight:</span>
              <span className="font-medium text-blue-600">{weights.verificationMax.toFixed(1)} points</span>
            </div>
          </div>
        </div>

        <div className="card bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-lg mb-3 text-blue-900">POCO Score Calculation</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold text-blue-800 mb-2">Maximum Possible Weights:</p>
              <div className="space-y-1 text-blue-700 ml-4">
                <p>• OCR: {weights.ocrMax.toFixed(1)} points</p>
                <p>• Filename: {weights.filenameMax.toFixed(1)} points</p>
                <p>• Verification: {weights.verificationMax.toFixed(1)} points</p>
                <p className="font-semibold pt-2 border-t border-blue-300">
                  Total Maximum Weight: {weights.totalMax.toFixed(1)} points
                </p>
              </div>
            </div>

            <div>
              <p className="font-semibold text-blue-800 mb-2">Example Calculation ({exampleMatchRate * 100}% match rate):</p>
              <div className="space-y-1 text-blue-700 ml-4">
                <p>• OCR Score: {exampleScore.ocrScore.toFixed(1)}</p>
                <p>• Filename Score: {exampleScore.filenameScore.toFixed(1)}</p>
                <p>• Verification Score: {exampleScore.verificationScore.toFixed(1)}</p>
                <p className="font-semibold pt-2 border-t border-blue-300">
                  POCO Score: {exampleScore.pocoPercentage}%
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-blue-300">
              <p className="font-semibold text-blue-800 mb-1">Thresholds:</p>
              <div className="space-y-1 text-blue-700 ml-4">
                <p>• OCR Threshold: {ruleData.ocrThreshold || 75}% (must be reached for rule to pass)</p>
                <p>• POCO Threshold: {ruleData.threshold}% (must be reached for classification)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}