import React, { useState } from 'react'
import { ArrowLeft, Save, Eye, FileText, Code, Plus, Trash2, Settings } from 'lucide-react'

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
   ✅ No dynamic extractors defined yet
   
📝 STEP 3: SET DOCUMENT CLASSIFIERS
   ✅ Apply these classifications:
      • Title: [Not set]
      • Archive serial: [Not set]
      • Date created: [Not set]
      • Correspondent: [Not set]
      • Document type: [Not set]
      • Storage path: [Not set]
      • Tags: [Not set]

📁 STEP 4: FILENAME VALIDATION (Optional)
   ⚠️ Not configured

📋 STEP 5: PAPERLESS CROSS-CHECK (Optional)
   ⚠️ Not configured

⚖️ SCORING: No cross-checks configured
`
  }

  const generateRawYaml = () => {
    return `rule_name: "${ruleName}"
rule_id: "${ruleName.toLowerCase().replace(/\s+/g, '_')}"
threshold: ${threshold}

core_identifiers:
  logic_groups:
${identifiers.map((id, idx) => `    - type: "match"
      score: ${Math.floor(100 / identifiers.length)}
      conditions:
        - pattern: "${id.pattern}"
          source: "content"`).join('\n')}

static_metadata:
  correspondent: ""
  document_type: ""
  tags: []
  custom_fields: {}

poco_weights:
  filename: 5
  paperless: 3`
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-white border-b border-gray-200 z-10 px-4 py-3">
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
            <h2 className="text-lg font-semibold text-gray-900">
              {rule ? `Edit Rule: ${rule.name}` : 'Create New Rule'}
            </h2>
            {document && (
              <span className="text-sm text-gray-600">
                for "{document.title}"
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50">
              <Eye size={14} />
              Test Rule
            </button>
            <button className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
              <Save size={14} />
              Save Rule
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - 3 Panes */}
      <div className="flex w-full pt-16">
        {/* Left Pane - OCR Text */}
        <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">OCR Text</h3>
              <button className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                <FileText size={12} />
                View PDF
              </button>
            </div>
            <div className="text-xs text-gray-600">
              Document: {document?.title || 'No document selected'}
            </div>
            {selectedText && (
              <div className="mt-2 p-2 bg-yellow-100 rounded border-l-4 border-yellow-500">
                <div className="text-xs text-yellow-800 font-medium">Selected Text:</div>
                <div className="text-xs text-yellow-700 mt-1">"{selectedText}"</div>
                <button
                  onClick={addIdentifier}
                  className="mt-2 text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                >
                  Add as Identifier
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 p-4 overflow-y-auto scrollbar-thin">
            <pre
              className="text-sm font-mono leading-relaxed whitespace-pre-wrap cursor-text select-text"
              onMouseUp={handleTextSelection}
            >
              {mockOcrText}
            </pre>
          </div>
        </div>

        {/* Middle Pane - Rule Edit Tools */}
        <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Rule Builder</h3>
          </div>
          <div className="flex-1 p-4 overflow-y-auto scrollbar-thin space-y-6">
            
            {/* Basic Settings */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Basic Settings</h4>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Rule Name</label>
                <input
                  type="text"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="e.g., Bank Statements"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Threshold (%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="w-full"
                />
                <div className="text-sm text-gray-600 mt-1">{threshold}%</div>
              </div>
            </div>

            {/* OCR Identifiers */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">OCR Identifiers</h4>
                <button
                  onClick={() => setIdentifiers([...identifiers, {
                    id: Date.now(),
                    name: `Identifier ${identifiers.length + 1}`,
                    pattern: '',
                    mandatory: false,
                    type: 'text'
                  }])}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                >
                  <Plus size={12} />
                  Add
                </button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
                {identifiers.map((identifier) => (
                  <div key={identifier.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <input
                        type="text"
                        value={identifier.name}
                        onChange={(e) => {
                          const updated = identifiers.map(id => 
                            id.id === identifier.id ? {...id, name: e.target.value} : id
                          )
                          setIdentifiers(updated)
                        }}
                        className="text-sm font-medium border-none bg-transparent p-0 flex-1"
                        placeholder="Identifier name"
                      />
                      <button
                        onClick={() => setIdentifiers(identifiers.filter(id => id.id !== identifier.id))}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={identifier.pattern}
                      onChange={(e) => {
                        const updated = identifiers.map(id => 
                          id.id === identifier.id ? {...id, pattern: e.target.value} : id
                        )
                        setIdentifiers(updated)
                      }}
                      placeholder="Pattern or text to match"
                      className="w-full text-xs border border-gray-200 rounded px-2 py-1 mb-2"
                    />
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={identifier.mandatory}
                          onChange={(e) => {
                            const updated = identifiers.map(id => 
                              id.id === identifier.id ? {...id, mandatory: e.target.checked} : id
                            )
                            setIdentifiers(updated)
                          }}
                        />
                        Mandatory
                      </label>
                    </div>
                  </div>
                ))}
                {identifiers.length === 0 && (
                  <div className="text-sm text-gray-500 text-center py-4">
                    No identifiers defined. Select text from OCR and click "Add as Identifier"
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic Extractors - Placeholder */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Dynamic Data</h4>
              <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded border">
                Dynamic extractors (dates, amounts) coming soon...
              </div>
            </div>

            {/* Classifiers - Placeholder */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Classifiers</h4>
              <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded border">
                Document classifiers configuration coming soon...
              </div>
            </div>

          </div>
        </div>

        {/* Right Pane - Rule Preview */}
        <div className="w-1/3 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRawYaml(false)}
                className={`px-3 py-1 text-sm rounded ${
                  !showRawYaml 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Rule Story
              </button>
              <button
                onClick={() => setShowRawYaml(true)}
                className={`px-3 py-1 text-sm rounded ${
                  showRawYaml 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Raw YAML
              </button>
            </div>
          </div>
          <div className="flex-1 p-4 overflow-y-auto scrollbar-thin">
            {!showRawYaml ? (
              <pre className="text-sm leading-relaxed whitespace-pre-wrap">
                {generateRuleStory()}
              </pre>
            ) : (
              <pre className="text-sm font-mono leading-relaxed whitespace-pre-wrap bg-gray-900 text-green-400 p-4 rounded -mx-4">
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