import React, { useState } from 'react'
import { ArrowLeft, Save, Eye, FileText, Code, Plus, Trash2, Settings, Edit } from 'lucide-react'

const RuleEditor = ({ document, rule, onBack }) => {
  const [showRawYaml, setShowRawYaml] = useState(false)
  const [ruleName, setRuleName] = useState(rule?.name || '')
  const [threshold, setThreshold] = useState(rule?.threshold || 70)
  const [identifiers, setIdentifiers] = useState(rule?.identifiers || [])
  const [selectedText, setSelectedText] = useState('')

  // Mock OCR text for demonstration
  const mockOcrText = document ? `
BANK STATEMENT
Account Number: 123-456-789
Statement Period: January 1, 2024 to January 31, 2024

Dear Account Holder,

This is your monthly bank statement for the period ending January 31, 2024.

ACCOUNT SUMMARY
Previous Balance: $1,250.00
Total Deposits: $3,500.00
Total Withdrawals: $2,100.00
Service Charges: $25.00
Current Balance: $2,625.00

TRANSACTION DETAILS
Date        Description             Amount      Balance
01/02/2024  Direct Deposit Salary   +2,500.00   3,750.00
01/05/2024  Grocery Store          -125.00     3,625.00
01/08/2024  Gas Station            -65.00      3,560.00
01/12/2024  Online Transfer        -500.00     3,060.00
01/15/2024  ATM Withdrawal         -100.00     2,960.00
01/20/2024  Utility Bill           -150.00     2,810.00
01/25/2024  Service Fee            -25.00      2,785.00
01/31/2024  Interest Earned        +15.00      2,800.00

For questions regarding your account, please contact us at:
Phone: 1-800-BANK-123
Website: www.mybank.com

Thank you for banking with us.
My Bank
` : 'Select a document to view OCR content.'

  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (selection.toString().length > 0) {
      setSelectedText(selection.toString().trim())
    }
  }

  const addIdentifier = () => {
    if (selectedText) {
      const newIdentifier = {
        id: Date.now(),
        name: `Identifier ${identifiers.length + 1}`,
        pattern: selectedText,
        mandatory: false,
        type: 'text'
      }
      setIdentifiers([...identifiers, newIdentifier])
      setSelectedText('')
      window.getSelection().removeAllRanges()
    }
  }

  // Mock rule story generation
  const generateRuleStory = () => {
    if (!ruleName) return 'Enter a rule name to see the rule story...'
    
    return `
📋 RULE: ${ruleName}

🔍 STEP 1: OCR PATTERN MATCHING
   Find these identifiers in document text:
   ${identifiers.length === 0 
     ? '   • No identifiers defined yet' 
     : identifiers.map((id, idx) => 
         `   • ${id.name}: "${id.pattern}" ${id.mandatory ? '(mandatory)' : ''}`
       ).join('\n')
   }
   
   📊 Threshold: Need ${threshold}% match to continue
   ❌ If mandatory identifiers missing → STOP (POCO = 0%)

📅 STEP 2: EXTRACT DYNAMIC DATA
   ✅ Extract dates, amounts, reference numbers from OCR text
   ✅ No dynamic extractors defined yet
   
📝 STEP 3: SET PAPERLESS CLASSIFIERS
   Apply these document classifications to Paperless-ngx:
      • Correspondent: [Auto-detected from patterns]
      • Document Type: [Auto-detected from patterns]  
      • Archive Serial Number: [Pattern-based]
      • Created Date: [Extracted from document]
      • Tags: [Rule-based + POCO]
      • Storage Path: [Classification-based]

📁 STEP 4: FILENAME CROSS-CHECK (Optional)
   ⚠️ Validate against filename patterns (+/-5 POCO points)
   ⚠️ Not configured

📋 STEP 5: PAPERLESS CROSS-CHECK (Optional) 
   ⚠️ Validate against existing Paperless data (+/-3 POCO points)
   ⚠️ Not configured

⚖️ FINAL POCO SCORE: OCR Base (0-100) + Filename Bonus + Paperless Bonus
   📈 Target: 70+ points for automatic processing
`
  }

  // Mock YAML generation
  const generateRawYaml = () => {
    return `name: "${ruleName || 'Untitled Rule'}"
description: "Auto-generated rule for ${document?.title || 'unknown document'}"

ocr_identifiers:
${identifiers.length === 0 
  ? '  # No identifiers defined yet' 
  : identifiers.map(id => 
      `  - name: "${id.name}"\n    pattern: "${id.pattern}"\n    mandatory: ${id.mandatory}`
    ).join('\n')
}

threshold: ${threshold}

paperless_classifiers:
  correspondent: null
  document_type: null
  tags: []
  archive_serial: null
  
scoring:
  ocr_base: 0-100
  filename: -5 to +5
  paperless: -3 to +3`
  }

  return (
    <div className="h-full flex flex-col" style={{backgroundColor: 'var(--paperless-bg)'}}>
      {/* Welcome Message */}
      <div className="px-6 py-4" style={{backgroundColor: 'var(--paperless-surface)', borderBottom: '1px solid var(--paperless-border)'}}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold" style={{color: 'var(--paperless-text)', marginLeft: '20px'}}>
                Rule Editor
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1 px-3 py-2 rounded-md text-sm" style={{ color: 'var(--paperless-text)', backgroundColor: 'var(--paperless-surface-light)'}}>
              <Eye size={14} />
              Test Rule
            </button>
            <button className="flex items-center gap-1 px-4 py-2 rounded-md text-sm font-medium" style={{backgroundColor: 'var(--paperless-accent)', color: '#000'}}>
              <Save size={14} />
              Save Rule
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - 3 Panes with spacing */}
      <div className="flex flex-1 overflow-hidden gap-0">
        {/* Left Pane - OCR Text */}
        <div className="w-1/3 flex flex-col min-h-0 rounded" style={{backgroundColor: 'var(--paperless-surface)'}}>
          <div className="flex-shrink-0 rounded-t" style={{ backgroundColor: 'var(--paperless-surface-light)', padding: '16px', height: '100px'}}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold" style={{color: 'var(--paperless-text)'}}>📄 OCR Content</h3>
              <button className="flex items-center gap-1 px-2 py-1 text-xs rounded" style={{backgroundColor: 'var(--paperless-accent)', color: '#000'}}>
                <FileText size={12} />
                View PDF
              </button>
            </div>
            <div className="text-xs mb-3" style={{color: 'var(--paperless-text-secondary)'}}>
              📄 {document?.title || 'No document selected'}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0" style={{padding: '5px'}}>
            <pre
              className="text-xs font-mono leading-relaxed whitespace-pre-wrap cursor-text select-text p-3 rounded"
              style={{backgroundColor: 'var(--paperless-bg)', color: 'var(--paperless-text)'}}
              onMouseUp={handleTextSelection}
            >
              {mockOcrText}
            </pre>
          </div>
        </div>

        {/* Middle Pane - Rule Edit Tools */}
        <div className="w-1/3 flex flex-col min-h-0 rounded" style={{backgroundColor: 'var(--paperless-surface)'}}>
          <div className="flex-shrink-0 rounded-t" style={{ backgroundColor: 'var(--paperless-surface-light)', padding: '16px', height: '100px'}}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold" style={{color: 'var(--paperless-text)'}}>🔧 Rule Configuration</h3>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm font-medium" style={{color: 'var(--paperless-text)'}}>{ruleName || 'New_Rule_Name'}</span>
              <Edit size={14} className="cursor-pointer" style={{color: 'var(--paperless-text-secondary)'}} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin space-y-6 min-h-0" style={{padding: '5px'}}>
            
            {/* Basic Settings */}
            <div className="space-y-3">
              <h4 className="font-medium" style={{color: 'var(--paperless-text)'}}>Basic Settings</h4>
              <div>
                <label className="block text-sm mb-1" style={{color: 'var(--paperless-text-secondary)'}}>Threshold ({threshold}%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="w-full"
                  style={{accentColor: 'var(--paperless-accent)'}}
                />
              </div>
            </div>

            {/* OCR Identifiers */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium" style={{color: 'var(--paperless-text)'}}>OCR Identifiers</h4>
                <button 
                  className="text-xs px-2 py-1 rounded"
                  style={{backgroundColor: 'var(--paperless-accent)', color: '#000'}}
                >
                  + Add
                </button>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {identifiers.map((identifier, index) => (
                  <div key={identifier.id} className="p-2 rounded" style={{backgroundColor: 'var(--paperless-surface-light)', }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" style={{color: 'var(--paperless-text)'}}>{identifier.name}</span>
                      <button 
                        onClick={() => setIdentifiers(identifiers.filter(id => id.id !== identifier.id))}
                        className="text-xs p-1"
                        style={{color: 'var(--paperless-red)'}}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="text-xs mt-1" style={{color: 'var(--paperless-text-secondary)'}}>\"{identifier.pattern}\"</div>
                    <div className="text-xs mt-1">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${identifier.mandatory ? 'bg-red-600 text-white' : 'bg-gray-600 text-white'}`}>
                        {identifier.mandatory ? 'Mandatory' : 'Optional'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Paperless Classifiers */}
            <div className="space-y-3">
              <h4 className="font-medium" style={{color: 'var(--paperless-text)'}}>Paperless Classifiers</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs block mb-1" style={{color: 'var(--paperless-text-secondary)'}}>Correspondent:</label>
                    <input type="text" placeholder="Auto-detected" className="w-full text-xs rounded px-2 py-1" style={{backgroundColor: 'var(--paperless-surface-light)',  color: 'var(--paperless-text)'}} />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{color: 'var(--paperless-text-secondary)'}}>Document Type:</label>
                    <input type="text" placeholder="Auto-detected" className="w-full text-xs rounded px-2 py-1" style={{backgroundColor: 'var(--paperless-surface-light)',  color: 'var(--paperless-text)'}} />
                  </div>
                </div>
                
                <div>
                  <label className="text-xs block mb-1" style={{color: 'var(--paperless-text-secondary)'}}>Tags (comma-separated):</label>
                  <input type="text" placeholder="banking, statement, processed" className="w-full text-xs rounded px-2 py-1" style={{backgroundColor: 'var(--paperless-surface-light)',  color: 'var(--paperless-text)'}} />
                </div>
                
                <div>
                  <label className="text-xs block mb-1" style={{color: 'var(--paperless-text-secondary)'}}>Archive Serial:</label>
                  <input type="text" placeholder="ASN pattern" className="w-full text-xs rounded px-2 py-1" style={{backgroundColor: 'var(--paperless-surface-light)',  color: 'var(--paperless-text)'}} />
                </div>
              </div>
            </div>

            {/* Dynamic Data */}
            <div className="space-y-3">
              <h4 className="font-medium" style={{color: 'var(--paperless-text)'}}>Dynamic Data</h4>
              <div className="text-sm p-3 rounded" style={{backgroundColor: 'var(--paperless-surface-light)', color: 'var(--paperless-text-secondary)', }}>
                Dynamic extractors (dates, amounts) coming soon...
              </div>
            </div>
          </div>
        </div>

        {/* Right Pane - Rule Preview */}
        <div className="w-1/3 flex flex-col min-h-0 rounded" style={{backgroundColor: 'var(--paperless-surface)'}}>
          <div className="flex-shrink-0 rounded-t" style={{ backgroundColor: 'var(--paperless-surface-light)', padding: '16px', height: '100px'}}>
            <h3 className="text-base font-semibold mb-3" style={{color: 'var(--paperless-text)'}}>📖 Rule Preview</h3>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setShowRawYaml(false)}
                className={`px-3 py-1.5 text-sm rounded font-medium ${
                  !showRawYaml 
                    ? 'shadow-sm' 
                    : ''
                }`}
                style={{
                  backgroundColor: !showRawYaml ? 'var(--paperless-accent)' : 'var(--paperless-surface)',
                  color: !showRawYaml ? '#000' : 'var(--paperless-text-secondary)',
                  
                }}
              >
                Rule Story
              </button>
              <button
                onClick={() => setShowRawYaml(true)}
                className={`px-3 py-1.5 text-sm rounded font-medium ${
                  showRawYaml 
                    ? 'shadow-sm' 
                    : ''
                }`}
                style={{
                  backgroundColor: showRawYaml ? 'var(--paperless-accent)' : 'var(--paperless-surface)',
                  color: showRawYaml ? '#000' : 'var(--paperless-text-secondary)',
                  
                }}
              >
                Raw YAML
              </button>
            </div>
            <div className="text-xs" style={{color: 'var(--paperless-text-secondary)'}}>
              {!showRawYaml ? 'Human-readable rule description' : 'Technical YAML configuration'}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0" style={{padding: '5px'}}>
            {!showRawYaml ? (
              <pre className="text-sm leading-relaxed whitespace-pre-wrap p-3 rounded" style={{backgroundColor: 'var(--paperless-bg)', color: 'var(--paperless-text)'}}>
                {generateRuleStory()}
              </pre>
            ) : (
              <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap p-3 rounded" style={{backgroundColor: '#1a1a1a', color: '#4ade80', }}>
                {generateRawYaml()}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default RuleEditor