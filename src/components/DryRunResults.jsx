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
    <div className="rounded-lg p-6 space-y-6" style={{backgroundColor: 'var(--paperless-surface)', border: '1px solid var(--paperless-border)'}}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{color: 'var(--paperless-text)'}}>
          {result.document.title}
        </h3>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
          result.status === 'pass' 
            ? 'text-white' 
            : 'text-white'
        }`}
        style={{
          backgroundColor: result.status === 'pass' ? 'var(--paperless-accent)' : 'var(--paperless-red)'
        }}
        >
          {result.status === 'pass' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {result.status === 'pass' ? 'PASS' : 'FAIL'}
        </div>
      </div>

      {/* POCO Score Breakdown */}
      <div>
        <h4 className="font-medium mb-3" style={{color: 'var(--paperless-text)'}}>🎯 POCO Score Breakdown</h4>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 rounded" style={{backgroundColor: 'var(--paperless-surface-light)'}}>
            <div className="text-2xl font-bold" style={{color: 'var(--paperless-text)'}}>{result.ocrScore}</div>
            <div className="text-xs" style={{color: 'var(--paperless-text-secondary)'}}>OCR Base</div>
          </div>
          <div className="text-center p-3 rounded" style={{backgroundColor: 'var(--paperless-surface-light)'}}>
            <div className={`text-2xl font-bold ${result.filenameBonus >= 0 ? '' : ''}`} style={{color: result.filenameBonus >= 0 ? 'var(--paperless-accent)' : 'var(--paperless-red)'}}>
              {result.filenameBonus >= 0 ? '+' : ''}{result.filenameBonus}
            </div>
            <div className="text-xs" style={{color: 'var(--paperless-text-secondary)'}}>Filename</div>
          </div>
          <div className="text-center p-3 rounded" style={{backgroundColor: 'var(--paperless-surface-light)'}}>
            <div className={`text-2xl font-bold ${result.paperlessBonus >= 0 ? '' : ''}`} style={{color: result.paperlessBonus >= 0 ? 'var(--paperless-accent)' : 'var(--paperless-red)'}}>
              {result.paperlessBonus >= 0 ? '+' : ''}{result.paperlessBonus}
            </div>
            <div className="text-xs" style={{color: 'var(--paperless-text-secondary)'}}>Paperless</div>
          </div>
          <div className="text-center p-3 rounded" style={{backgroundColor: result.status === 'pass' ? 'var(--paperless-accent)' : 'var(--paperless-red)', color: result.status === 'pass' ? '#000' : 'white'}}>
            <div className="text-2xl font-bold">{result.finalScore}</div>
            <div className="text-xs">Final Score</div>
          </div>
        </div>
      </div>

      {/* Identifier Matches */}
      <div>
        <h4 className="font-medium mb-3" style={{color: 'var(--paperless-text)'}}>🔍 Identifier Matches</h4>
        <div className="space-y-2">
          {result.identifierMatches.map((match, index) => (
            <div key={index} className="flex items-center justify-between p-2 rounded" style={{backgroundColor: 'var(--paperless-surface-light)'}}>
              <div className="flex items-center gap-2">
                {match.matched ? 
                  <CheckCircle size={16} style={{color: 'var(--paperless-accent)'}} /> : 
                  <XCircle size={16} style={{color: 'var(--paperless-red)'}} />
                }
                <span className="font-medium" style={{color: 'var(--paperless-text)'}}>{match.name}</span>
              </div>
              <span className="text-sm" style={{color: 'var(--paperless-text-secondary)'}}>{match.location}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Extracted Dynamic Data */}
      <div>
        <h4 className="font-medium mb-3" style={{color: 'var(--paperless-text)'}}>📊 Extracted Dynamic Data</h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-2 rounded" style={{backgroundColor: 'var(--paperless-surface-light)'}}>
            <div className="text-xs" style={{color: 'var(--paperless-text-secondary)'}}>Date</div>
            <div className="font-medium" style={{color: 'var(--paperless-text)'}}>{result.extractedData.date}</div>
          </div>
          <div className="p-2 rounded" style={{backgroundColor: 'var(--paperless-surface-light)'}}>
            <div className="text-xs" style={{color: 'var(--paperless-text-secondary)'}}>Amount</div>
            <div className="font-medium" style={{color: 'var(--paperless-text)'}}>{result.extractedData.amount}</div>
          </div>
          <div className="p-2 rounded" style={{backgroundColor: 'var(--paperless-surface-light)'}}>
            <div className="text-xs" style={{color: 'var(--paperless-text-secondary)'}}>Correspondent</div>
            <div className="font-medium" style={{color: 'var(--paperless-text)'}}>{result.extractedData.correspondent}</div>
          </div>
        </div>
      </div>

      {/* Paperless Classifier Changes */}
      <div>
        <h4 className="font-medium mb-3" style={{color: 'var(--paperless-text)'}}>📝 Paperless Classifier Changes</h4>
        <div className="space-y-2">
          {Object.entries(result.classifierChanges).map(([field, change]) => (
            <div key={field} className="flex items-center justify-between p-2 rounded" style={{backgroundColor: 'var(--paperless-surface-light)'}}>
              <span className="text-sm font-medium capitalize" style={{color: 'var(--paperless-text)'}}>{field.replace(/([A-Z])/g, ' $1').trim()}</span>
              <div className="text-sm">
                {change.changed ? (
                  <span>
                    <span style={{color: 'var(--paperless-text-secondary)'}}>{JSON.stringify(change.from)}</span>
                    <span className="mx-2" style={{color: 'var(--paperless-text-secondary)'}}>→</span>
                    <span className="font-medium" style={{color: 'var(--paperless-accent)'}}>{JSON.stringify(change.to)}</span>
                  </span>
                ) : (
                  <span style={{color: 'var(--paperless-text-muted)'}}>No change</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col" style={{backgroundColor: 'var(--paperless-bg)'}}>
      {/* Welcome Message */}
      <div className="px-6 py-4" style={{backgroundColor: 'var(--paperless-surface)', borderBottom: '1px solid var(--paperless-border)'}}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors hover:bg-opacity-10"
              style={{color: 'var(--paperless-text-secondary)'}}
            >
              <ArrowLeft size={16} />
              Back to Documents
            </button>
            <div style={{width: '1px', height: '24px', backgroundColor: 'var(--paperless-border)'}}></div>
            <div>
              <h2 className="text-lg font-semibold" style={{color: 'var(--paperless-text)'}}>Rule Test Results</h2>
              <p className="text-sm" style={{color: 'var(--paperless-text-secondary)'}}>
                Testing {documents.length} document{documents.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="px-6 py-4" style={{backgroundColor: 'var(--paperless-surface)', borderBottom: '1px solid var(--paperless-border)'}}>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-4 rounded" style={{backgroundColor: 'var(--paperless-surface-light)'}}>
            <div className="text-3xl font-bold mb-1" style={{color: 'var(--paperless-text)'}}>{summaryStats.total}</div>
            <div className="text-sm" style={{color: 'var(--paperless-text-secondary)'}}>Total Documents</div>
          </div>
          <div className="text-center p-4 rounded" style={{backgroundColor: 'var(--paperless-surface-light)'}}>
            <div className="text-3xl font-bold mb-1" style={{color: 'var(--paperless-accent)'}}>{summaryStats.passed}</div>
            <div className="text-sm" style={{color: 'var(--paperless-text-secondary)'}}>Passed</div>
          </div>
          <div className="text-center p-4 rounded" style={{backgroundColor: 'var(--paperless-surface-light)'}}>
            <div className="text-3xl font-bold mb-1" style={{color: 'var(--paperless-red)'}}>{summaryStats.failed}</div>
            <div className="text-sm" style={{color: 'var(--paperless-text-secondary)'}}>Failed</div>
          </div>
          <div className="text-center p-4 rounded" style={{backgroundColor: 'var(--paperless-surface-light)'}}>
            <div className="text-3xl font-bold mb-1" style={{color: 'var(--paperless-text)'}}>{summaryStats.avgScore}%</div>
            <div className="text-sm" style={{color: 'var(--paperless-text-secondary)'}}>Avg POCO Score</div>
          </div>
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* Left side - Document list */}
          <div className="w-1/3 overflow-y-auto scrollbar-thin" style={{backgroundColor: 'var(--paperless-surface)', borderRight: '1px solid var(--paperless-border)'}}>
            <div className="p-4">
              <h3 className="font-medium mb-3" style={{color: 'var(--paperless-text)'}}>Documents Tested</h3>
              <div className="space-y-2">
                {mockResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded cursor-pointer transition-colors ${
                      selectedDocument === index ? 'ring-2' : ''
                    }`}
                    style={{
                      backgroundColor: selectedDocument === index ? 'var(--paperless-surface-light)' : 'transparent',
                      ringColor: selectedDocument === index ? 'var(--paperless-accent)' : 'transparent',
                      border: '1px solid var(--paperless-border)'
                    }}
                    onClick={() => setSelectedDocument(index)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-sm truncate" style={{color: 'var(--paperless-text)'}}>
                        {result.document.title}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded ${
                        result.status === 'pass' ? 'text-white' : 'text-white'
                      }`}
                      style={{
                        backgroundColor: result.status === 'pass' ? 'var(--paperless-accent)' : 'var(--paperless-red)'
                      }}
                      >
                        {result.finalScore}%
                      </div>
                    </div>
                    <div className="text-xs" style={{color: 'var(--paperless-text-secondary)'}}>
                      ID: {result.document.id}
                    </div>
                    <div className={`text-xs mt-1 flex items-center gap-1 ${
                      result.status === 'pass' ? '' : ''
                    }`}
                    style={{
                      color: result.status === 'pass' ? 'var(--paperless-accent)' : 'var(--paperless-red)'
                    }}
                    >
                      {result.status === 'pass' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {result.status === 'pass' ? 'PASSED' : 'FAILED'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right side - Detailed results */}
          <div className="flex-1 p-6 overflow-y-auto scrollbar-thin">
            {selectedDocument !== null ? (
              <DetailedResult result={mockResults[selectedDocument]} />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Eye size={48} className="mx-auto mb-4" style={{color: 'var(--paperless-text-muted)'}} />
                  <h3 className="text-lg font-medium mb-2" style={{color: 'var(--paperless-text)'}}>Select a Document</h3>
                  <p className="text-sm" style={{color: 'var(--paperless-text-secondary)'}}>
                    Click on a document from the list to see detailed test results
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DryRunResults