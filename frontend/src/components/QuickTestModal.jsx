import React, { useState } from 'react';
import { X, Upload, PlayCircle, CheckCircle, XCircle } from 'lucide-react';
import { UploadFile } from '@/api/integrations';

export default function QuickTestModal({ isOpen, onClose, rule }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setTestResult(null);
    }
  };

  const handleTest = async () => {
    if (!selectedFile) return;

    setIsTesting(true);
    try {
      // Upload file first
      setIsUploading(true);
      const { file_url } = await UploadFile({ file: selectedFile });
      setIsUploading(false);

      // Simulate rule testing (in real app, this would call a backend API)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock test results
      const ocrMatches = Math.floor(Math.random() * (rule.ocrIdentifiers?.length || 3)) + 1;
      const ocrTotal = rule.ocrIdentifiers?.length || 3;
      const ocrScore = Math.floor((ocrMatches / ocrTotal) * 100);
      const pocoScore = Math.floor(Math.random() * 40) + 60;
      const passed = pocoScore >= (rule.threshold || 75);

      setTestResult({
        passed,
        pocoScore,
        ocrScore,
        ocrMatches,
        ocrTotal,
        threshold: rule.threshold || 75,
        details: {
          correspondent: rule.predefinedData?.correspondent || 'N/A',
          documentType: rule.predefinedData?.documentType || 'N/A',
          tags: rule.predefinedData?.tags || []
        }
      });
    } catch (error) {
      console.error('Test failed:', error);
      alert('Failed to test document');
    } finally {
      setIsTesting(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Quick Test: {rule.ruleName}</h2>
            <p className="text-sm text-gray-500">Test a document against this rule</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="modal-body">
          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Test Document
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileSelect}
                className="hidden"
                id="quick-test-file"
              />
              <label htmlFor="quick-test-file" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                {selectedFile ? (
                  <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-900">Click to upload</p>
                    <p className="text-xs text-gray-500 mt-1">PDF, PNG, or JPG (Max 10MB)</p>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Test Button */}
          <button
            onClick={handleTest}
            disabled={!selectedFile || isTesting || isUploading}
            className="btn btn-primary w-full mb-6"
            aria-label="Run test on uploaded document"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Uploading...
              </>
            ) : isTesting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Testing...
              </>
            ) : (
              <>
                <PlayCircle className="w-5 h-5" />
                Run Test
              </>
            )}
          </button>

          {/* Test Results */}
          {testResult && (
            <div className={`border-2 rounded-lg p-6 ${testResult.passed ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
              <div className="flex items-center gap-3 mb-4">
                {testResult.passed ? (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600" />
                )}
                <div>
                  <h3 className={`text-lg font-bold ${testResult.passed ? 'text-green-900' : 'text-red-900'}`}>
                    {testResult.passed ? 'Test Passed' : 'Test Failed'}
                  </h3>
                  <p className={`text-sm ${testResult.passed ? 'text-green-700' : 'text-red-700'}`}>
                    POCO Score: {testResult.pocoScore}% (Threshold: {testResult.threshold}%)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                <div>
                  <p className="text-xs text-gray-600 mb-1">OCR Matches</p>
                  <p className="font-semibold">{testResult.ocrMatches}/{testResult.ocrTotal} patterns ({testResult.ocrScore}%)</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">POCO Score</p>
                  <p className="font-semibold">{testResult.pocoScore}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Correspondent</p>
                  <p className="font-semibold text-sm">{testResult.details.correspondent}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Document Type</p>
                  <p className="font-semibold text-sm">{testResult.details.documentType}</p>
                </div>
              </div>

              {testResult.details.tags.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-600 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {testResult.details.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}