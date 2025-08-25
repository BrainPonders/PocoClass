import React, { useState } from 'react'
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Eye, BarChart3 } from 'lucide-react'

const DryRunResults = ({ documents, onBack }) => {
  const [selectedDocument, setSelectedDocument] = useState(null)

  // Mock test results for demonstration
  const mockResults = documents.map(doc => ({
    document: doc,
    ocrScore: Math.floor(Math.random() * 40) + 60, // 60-100
    filenameBonus: Math.floor(Math.random() * 10) - 5, // -5 to +5
    paperlessBonus: Math.floor(Math.random() * 6) - 3, // -3 to +3
    finalScore: Math.floor(Math.random() * 40) + 70, // 70-110
    status: Math.random() > 0.3 ? 'pass' : 'fail',
    identifierMatches: [
      { name: 'Bank Statement Header', matched: true, location: 'Line 1' },
      { name: 'Account Number', matched: true, location: 'Line 2' },
      { name: 'Statement Period', matched: Math.random() > 0.2, location: 'Line 3' },
      { name: 'Transaction Table', matched: Math.random() > 0.1, location: 'Line 15+' }
    ],
    extractedData: {
      date: '2024-01-31',
      amount: '$2,625.00',
      correspondent: 'My Bank'
    },
    classifierChanges: {
      correspondent: { from: null, to: 'My Bank', changed: true },
      documentType: { from: 'Unknown', to: 'Bank Statement', changed: true },
      dateCreated: { from: '2024-01-20', to: '2024-01-31', changed: true },
      tags: { from: ['NEW'], to: ['NEW', 'POCO', 'banking'], changed: true },
      archiveSerial: { from: null, to: 'ASN000123', changed: true }
    }
  }))

  const summaryStats = {
    total: mockResults.length,
    passed: mockResults.filter(r => r.status === 'pass').length,
    failed: mockResults.filter(r => r.status === 'fail').length,
    avgScore: Math.round(mockResults.reduce((sum, r) => sum + r.finalScore, 0) / mockResults.length)
  }

  const DetailedResult = ({ result }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {result.document.title}
        </h3>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
          result.status === 'pass' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {result.status === 'pass' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {result.status === 'pass' ? 'PASS' : 'FAIL'}
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">🎯 POCO Score Breakdown</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">OCR Score</div>
            <div className="text-xl font-bold text-gray-900">{result.ocrScore}/100</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Final POCO Score</div>
            <div className="text-xl font-bold text-blue-600">{result.finalScore}/120</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Filename Bonus</div>
            <div className={`text-lg font-semibold ${
              result.filenameBonus >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {result.filenameBonus >= 0 ? '+' : ''}{result.filenameBonus}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Paperless Bonus</div>
            <div className={`text-lg font-semibold ${
              result.paperlessBonus >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {result.paperlessBonus >= 0 ? '+' : ''}{result.paperlessBonus}
            </div>
          </div>
        </div>
      </div>

      {/* Pattern Analysis */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">🔍 Pattern Analysis</h4>
        <div className="space-y-2">
          {result.identifierMatches.map((match, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 rounded border">
              <div className="flex items-center gap-2">
                {match.matched ? (
                  <CheckCircle size={16} className="text-green-600" />
                ) : (
                  <XCircle size={16} className="text-red-600" />
                )}
                <span className="text-sm font-medium">{match.name}</span>
              </div>
              <span className="text-xs text-gray-500">
                {match.matched ? match.location : 'Not found'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Extracted Data */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">📅 Extracted Data</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 p-3 rounded">
            <div className="text-xs text-blue-600 font-medium">Date</div>
            <div className="text-sm font-semibold text-blue-900">{result.extractedData.date}</div>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <div className="text-xs text-green-600 font-medium">Amount</div>
            <div className="text-sm font-semibold text-green-900">{result.extractedData.amount}</div>
          </div>
          <div className="bg-purple-50 p-3 rounded">
            <div className="text-xs text-purple-600 font-medium">Correspondent</div>
            <div className="text-sm font-semibold text-purple-900">{result.extractedData.correspondent}</div>
          </div>
        </div>
      </div>

      {/* Paperless Classifier Changes */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">📝 Paperless Classifier Changes</h4>
        <div className="space-y-2">
          {Object.entries(result.classifierChanges).map(([field, change]) => (
            <div key={field} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm font-medium capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</span>
              <div className="text-sm">
                {change.changed ? (
                  <span>
                    <span className="text-gray-500">{JSON.stringify(change.from)}</span>
                    <span className="mx-2">→</span>
                    <span className="text-blue-600 font-medium">{JSON.stringify(change.to)}</span>
                  </span>
                ) : (
                  <span className="text-gray-400">No change</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={16} />
              Back to Documents
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <h2 className="text-lg font-semibold text-gray-900">Test Results</h2>
            <span className="text-sm text-gray-600">
              {documents.length} document{documents.length !== 1 ? 's' : ''} processed
            </span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="grid grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{summaryStats.total}</div>
            <div className="text-sm text-gray-600">Total Documents</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{summaryStats.passed}</div>
            <div className="text-sm text-gray-600">Passed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{summaryStats.failed}</div>
            <div className="text-sm text-gray-600">Failed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{summaryStats.avgScore}/120</div>
            <div className="text-sm text-gray-600">Avg POCO Score</div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Document List */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Document Results</h3>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="p-2 space-y-2">
              {mockResults.map((result, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedDocument(result)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedDocument === result
                      ? 'bg-blue-50 border-blue-200 border'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {result.status === 'pass' ? (
                      <CheckCircle size={16} className="text-green-600" />
                    ) : (
                      <XCircle size={16} className="text-red-600" />
                    )}
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {result.document.title}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    POCO: {result.finalScore}/120
                  </div>
                  <div className="text-xs text-gray-500">
                    OCR: {result.ocrScore}/100 | Bonus: {result.filenameBonus + result.paperlessBonus}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Detailed Results */}
        <div className="flex-1 p-6 overflow-y-auto scrollbar-thin">
          {selectedDocument ? (
            <DetailedResult result={selectedDocument} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Eye size={48} className="mb-4" />
              <h3 className="text-lg font-medium mb-2">Select a Document</h3>
              <p className="text-sm text-center">
                Click on a document from the left panel to view detailed test results
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DryRunResults