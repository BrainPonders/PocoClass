import React, { useState } from 'react'
import { ArrowLeft, Save, Eye, FileText, Code, Plus, Trash2, Settings, Edit, ChevronDown, ChevronRight } from 'lucide-react'

const RuleEditor = ({ document, rule, onBack }) => {
  const [showRawYaml, setShowRawYaml] = useState(false)
  const [ruleName, setRuleName] = useState(rule?.name || '')
  const [threshold, setThreshold] = useState(rule?.threshold || 70)
  const [identifiers, setIdentifiers] = useState(rule?.identifiers || [])
  const [selectedText, setSelectedText] = useState('')
  
  // Classifier field states
  const [classifierEnabled, setClassifierEnabled] = useState({
    title: false,
    archiveSerial: false,
    dateCreated: false,
    correspondent: true, // Always enabled
    documentType: true, // Always enabled
    storagePath: false, // Cannot be enabled
    tags: false,
    documentCategory: false,
    pocoScore: false // Cannot be enabled
  })
  
  const toggleClassifier = (field) => {
    if (field === 'correspondent' || field === 'documentType' || field === 'storagePath' || field === 'pocoScore') {
      return // These fields cannot be toggled
    }
    setClassifierEnabled(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  // Collapsible section states
  const [collapsedSections, setCollapsedSections] = useState({
    ocrIdentifiers: false,
    threshold: false,
    dynamicData: false,
    paperlessClassifiers: false
  })

  const toggleSection = (section) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

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
          <div className="flex-shrink-0 rounded-t" style={{ backgroundColor: 'var(--paperless-surface-light)', padding: '16px', height: '100px', borderRight: '3px solid var(--paperless-bg)'}}>
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
          <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0" style={{padding: '5px', borderRight: '3px solid black'}}>
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
          <div className="flex-shrink-0 rounded-t" style={{ backgroundColor: 'var(--paperless-surface-light)', padding: '16px', height: '100px', borderRight: '3px solid var(--paperless-bg)'}}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold" style={{color: 'var(--paperless-text)'}}>🔧 Rule Configuration</h3>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm font-medium" style={{color: 'var(--paperless-text)'}}>{ruleName || 'New_Rule_Name'}</span>
              <Edit size={14} className="cursor-pointer" style={{color: 'var(--paperless-text-secondary)'}} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin space-y-6 min-h-0" style={{padding: '5px', borderRight: '3px solid black'}}>
            
            {/* OCR Identifiers */}
            <div className="space-y-3">
              <div 
                className="flex items-center justify-between p-1 rounded cursor-pointer"
                style={{backgroundColor: 'rgba(37, 99, 235, 0.05)', border: '1px solid rgba(37, 99, 235, 0.1)'}}
                onClick={() => toggleSection('ocrIdentifiers')}
              >
                <h4 className="font-medium" style={{color: 'var(--paperless-text)'}}>OCR Identifiers</h4>
                {collapsedSections.ocrIdentifiers ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              </div>
              {!collapsedSections.ocrIdentifiers && (
                <div className="space-y-2.5" style={{gap: '10px', display: 'flex', flexDirection: 'column', paddingTop: '10px'}}>
                  {/* Title */}
                  <div className="grid grid-cols-12 gap-3 items-center">
                    <label className="col-span-3 text-sm text-left" style={{color: 'var(--paperless-text-secondary)'}}>Title:</label>
                    <input 
                      type="text" 
                      placeholder="Enter identifier title" 
                      className="col-span-8 text-sm rounded px-3" 
                      style={{
                        backgroundColor: 'var(--paperless-surface-light)', 
                        color: 'var(--paperless-text)', 
                        border: '1px solid var(--paperless-border)',
                        height: '30px'
                      }} 
                    />
                    <div className="col-span-1"></div>
                  </div>

                  {/* Pattern */}
                  <div className="grid grid-cols-12 gap-3 items-center">
                    <label className="col-span-3 text-sm text-left" style={{color: 'var(--paperless-text-secondary)'}}>Pattern:</label>
                    <input 
                      type="text" 
                      placeholder="Enter pattern" 
                      className="col-span-6 text-sm rounded px-3" 
                      style={{
                        backgroundColor: 'var(--paperless-surface-light)', 
                        color: 'var(--paperless-text)', 
                        border: '1px solid var(--paperless-border)',
                        height: '30px'
                      }} 
                    />
                    <button 
                      className="col-span-2 text-sm px-3 py-2 rounded" 
                      style={{backgroundColor: '#2563eb', color: '#fff', height: '30px'}}
                    >
                      Use Selected Text
                    </button>
                    <div className="col-span-1"></div>
                  </div>

                  {/* Between lines */}
                  <div className="grid grid-cols-12 gap-3 items-center">
                    <label className="col-span-3 text-sm text-left" style={{color: 'var(--paperless-text-secondary)'}}>Between lines:</label>
                    <div className="col-span-8 flex items-center gap-2">
                      <input 
                        type="number" 
                        placeholder="0" 
                        className="flex-1 text-sm rounded px-3" 
                        style={{
                          backgroundColor: 'var(--paperless-surface-light)', 
                          color: 'var(--paperless-text)', 
                          border: '1px solid var(--paperless-border)',
                          height: '30px'
                        }} 
                      />
                      <span className="text-sm" style={{color: 'var(--paperless-text-secondary)'}}>to</span>
                      <input 
                        type="number" 
                        placeholder="100" 
                        className="flex-1 text-sm rounded px-3" 
                        style={{
                          backgroundColor: 'var(--paperless-surface-light)', 
                          color: 'var(--paperless-text)', 
                          border: '1px solid var(--paperless-border)',
                          height: '30px'
                        }} 
                      />
                    </div>
                    <div className="col-span-1"></div>
                  </div>

                  {/* Logic */}
                  <div className="grid grid-cols-12 gap-3 items-center">
                    <label className="col-span-3 text-sm text-left" style={{color: 'var(--paperless-text-secondary)'}}>Logic:</label>
                    <select 
                      className="col-span-8 text-sm rounded px-3" 
                      style={{
                        backgroundColor: 'var(--paperless-surface-light)', 
                        color: 'var(--paperless-text)', 
                        border: '1px solid var(--paperless-border)',
                        height: '30px'
                      }}
                    >
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                    <div className="col-span-1"></div>
                  </div>

                  {/* Mandatory */}
                  <div className="grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-3 flex items-center gap-2">
                      <label className="text-sm" style={{color: 'var(--paperless-text-secondary)'}}>Mandatory:</label>
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded" 
                        style={{accentColor: '#2563eb'}} 
                      />
                      <button 
                        className="text-sm px-3 py-1 rounded ml-2" 
                        style={{backgroundColor: '#2563eb', color: '#fff', height: '30px'}}
                      >
                        Add
                      </button>
                    </div>
                    <div className="col-span-9"></div>
                  </div>
                </div>
              )}
            </div>

            {/* Threshold */}
            <div className="space-y-3">
              <div 
                className="flex items-center justify-between p-1 rounded cursor-pointer"
                style={{backgroundColor: 'rgba(37, 99, 235, 0.05)', border: '1px solid rgba(37, 99, 235, 0.1)'}}
                onClick={() => toggleSection('threshold')}
              >
                <h4 className="font-medium" style={{color: 'var(--paperless-text)'}}>Threshold</h4>
                {collapsedSections.threshold ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              </div>
              {!collapsedSections.threshold && (
                <div style={{paddingTop: '10px'}}>
                  <label className="block text-sm mb-1" style={{color: 'var(--paperless-text-secondary)'}}>Threshold ({threshold}%)</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="w-full"
                    style={{accentColor: '#2563eb'}}
                  />
                </div>
              )}
            </div>
            <div style={{height: '10px'}}></div>

            {/* Dynamic Data */}
            <div className="space-y-3">
              <div 
                className="flex items-center justify-between p-1 rounded cursor-pointer"
                style={{backgroundColor: 'rgba(37, 99, 235, 0.05)', border: '1px solid rgba(37, 99, 235, 0.1)'}}
                onClick={() => toggleSection('dynamicData')}
              >
                <h4 className="font-medium" style={{color: 'var(--paperless-text)'}}>Dynamic Data</h4>
                {collapsedSections.dynamicData ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              </div>
              {!collapsedSections.dynamicData && (
                <div style={{paddingTop: '10px'}}>
                  <div className="text-sm p-3 rounded" style={{backgroundColor: 'var(--paperless-surface-light)', color: 'var(--paperless-text-secondary)'}}>
                    Dynamic extractors (dates, amounts) coming soon...
                  </div>
                </div>
              )}
            </div>
            <div style={{height: '10px'}}></div>

            {/* Paperless Classifiers */}
            <div className="space-y-3">
              <div 
                className="flex items-center justify-between p-1 rounded cursor-pointer"
                style={{backgroundColor: 'rgba(37, 99, 235, 0.05)', border: '1px solid rgba(37, 99, 235, 0.1)'}}
                onClick={() => toggleSection('paperlessClassifiers')}
              >
                <h4 className="font-medium" style={{color: 'var(--paperless-text)'}}>Paperless Classifiers</h4>
                {collapsedSections.paperlessClassifiers ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              </div>
              {!collapsedSections.paperlessClassifiers && (
              <div className="space-y-2.5" style={{gap: '10px', display: 'flex', flexDirection: 'column', paddingTop: '10px'}}>
                {/* Title */}
                <div className="grid grid-cols-12 gap-3 items-center">
                  <label className="col-span-3 text-sm text-left" style={{color: 'var(--paperless-text-secondary)'}}>Title:</label>
                  <input 
                    type="text" 
                    placeholder="Enter title pattern" 
                    disabled={!classifierEnabled.title}
                    className="col-span-8 text-sm rounded px-3" 
                    style={{
                      backgroundColor: 'var(--paperless-surface-light)', 
                      color: classifierEnabled.title ? 'var(--paperless-text)' : 'var(--paperless-text-secondary)', 
                      border: '1px solid var(--paperless-border)',
                      opacity: classifierEnabled.title ? 1 : 0.5,
                      height: '30px'
                    }} 
                  />
                  <input 
                    type="checkbox" 
                    checked={classifierEnabled.title}
                    onChange={() => toggleClassifier('title')}
                    className="col-span-1 w-4 h-4 rounded justify-self-center" 
                    style={{accentColor: '#2563eb'}} 
                  />
                </div>
                
                {/* Archive Serial Number */}
                <div className="grid grid-cols-12 gap-3 items-center">
                  <label className="col-span-3 text-sm text-left" style={{color: 'var(--paperless-text-secondary)'}}>Archive serial number:</label>
                  <input 
                    type="number" 
                    placeholder="123" 
                    disabled={!classifierEnabled.archiveSerial}
                    className="col-span-8 text-sm rounded px-3" 
                    style={{
                      backgroundColor: 'var(--paperless-surface-light)', 
                      color: classifierEnabled.archiveSerial ? 'var(--paperless-text)' : 'var(--paperless-text-secondary)', 
                      border: '1px solid var(--paperless-border)',
                      opacity: classifierEnabled.archiveSerial ? 1 : 0.5,
                      height: '30px'
                    }} 
                  />
                  <input 
                    type="checkbox" 
                    checked={classifierEnabled.archiveSerial}
                    onChange={() => toggleClassifier('archiveSerial')}
                    className="col-span-1 w-4 h-4 rounded justify-self-center" 
                    style={{accentColor: '#2563eb'}} 
                  />
                </div>
                
                {/* Date Created */}
                <div className="grid grid-cols-12 gap-3 items-center">
                  <label className="col-span-3 text-sm text-left" style={{color: 'var(--paperless-text-secondary)'}}>Date created:</label>
                  <select 
                    disabled={!classifierEnabled.dateCreated}
                    className="col-span-8 text-sm rounded px-3" 
                    style={{
                      backgroundColor: 'var(--paperless-surface-light)', 
                      color: classifierEnabled.dateCreated ? 'var(--paperless-text)' : 'var(--paperless-text-secondary)', 
                      border: '1px solid var(--paperless-border)',
                      opacity: classifierEnabled.dateCreated ? 1 : 0.5,
                      height: '30px'
                    }}
                  >
                    <option value="">Select date option...</option>
                    <option value="manual_date">Manual Date Entry</option>
                    <option value="invoice_date">Dynamic: Invoice Date</option>
                    <option value="statement_date">Dynamic: Statement Date</option>
                    <option value="due_date">Dynamic: Due Date</option>
                  </select>
                  <input 
                    type="checkbox" 
                    checked={classifierEnabled.dateCreated}
                    onChange={() => toggleClassifier('dateCreated')}
                    className="col-span-1 w-4 h-4 rounded justify-self-center" 
                    style={{accentColor: '#2563eb'}} 
                  />
                </div>
                
                {/* Correspondent - Always enabled (mandatory) */}
                <div className="grid grid-cols-12 gap-3 items-center">
                  <label className="col-span-3 text-sm text-left" style={{color: 'var(--paperless-text-secondary)'}}>Correspondent:</label>
                  <select className="col-span-8 text-sm rounded px-3" style={{backgroundColor: 'var(--paperless-surface-light)', color: 'var(--paperless-text)', border: '1px solid var(--paperless-border)', height: '30px'}}>
                    <option value="">Select correspondent...</option>
                    <option value="bank">Bank of America</option>
                    <option value="utility">Electric Company</option>
                    <option value="insurance">Insurance Co.</option>
                    <option value="rabobank">Rabobank</option>
                  </select>
                  <input 
                    type="checkbox" 
                    checked={true}
                    disabled={true}
                    className="col-span-1 w-4 h-4 rounded justify-self-center" 
                    style={{accentColor: '#2563eb'}} 
                  />
                </div>
                
                {/* Document Type - Always enabled (mandatory) */}
                <div className="grid grid-cols-12 gap-3 items-center">
                  <label className="col-span-3 text-sm text-left" style={{color: 'var(--paperless-text-secondary)'}}>Document type:</label>
                  <select className="col-span-8 text-sm rounded px-3" style={{backgroundColor: 'var(--paperless-surface-light)', color: 'var(--paperless-text)', border: '1px solid var(--paperless-border)', height: '30px'}}>
                    <option value="">Select document type...</option>
                    <option value="statement">Bank Statement</option>
                    <option value="invoice">Invoice</option>
                    <option value="receipt">Receipt</option>
                    <option value="contract">Contract</option>
                    <option value="report">Report</option>
                  </select>
                  <input 
                    type="checkbox" 
                    checked={true}
                    disabled={true}
                    className="col-span-1 w-4 h-4 rounded justify-self-center" 
                    style={{accentColor: '#2563eb'}} 
                  />
                </div>
                
                {/* Storage Path - Cannot be enabled (always greyed out) */}
                <div className="grid grid-cols-12 gap-3 items-center">
                  <label className="col-span-3 text-sm text-left opacity-50" style={{color: 'var(--paperless-text-secondary)'}}>Storage path:</label>
                  <input 
                    type="text" 
                    value="Disabled" 
                    disabled 
                    className="col-span-8 text-sm rounded px-3 opacity-50" 
                    style={{backgroundColor: 'var(--paperless-surface-light)', color: 'var(--paperless-text-secondary)', border: '1px solid var(--paperless-border)', height: '30px'}} 
                  />
                  <input 
                    type="checkbox" 
                    checked={false}
                    disabled={true}
                    className="col-span-1 w-4 h-4 rounded justify-self-center opacity-50" 
                  />
                </div>
                
                {/* Tags */}
                <div className="grid grid-cols-12 gap-3 items-center">
                  <label className="col-span-3 text-sm text-left" style={{color: 'var(--paperless-text-secondary)'}}>Tags:</label>
                  <div 
                    className="col-span-8 flex flex-wrap gap-1 p-2 rounded border" 
                    style={{
                      backgroundColor: 'var(--paperless-surface-light)', 
                      border: '1px solid var(--paperless-border)', 
                      minHeight: '30px',
                      opacity: classifierEnabled.tags ? 1 : 0.5
                    }}
                  >
                    {classifierEnabled.tags ? (
                      <>
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded" style={{backgroundColor: '#dc2626', color: 'white'}}>NEW <button className="text-white hover:text-gray-200">×</button></span>
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded" style={{backgroundColor: '#059669', color: 'white'}}>Check Account <button className="text-white hover:text-gray-200">×</button></span>
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded" style={{backgroundColor: '#7c2d12', color: 'white'}}>Clothing <button className="text-white hover:text-gray-200">×</button></span>
                        <button className="text-xs px-2 py-1 rounded" style={{color: '#2563eb', border: '1px dashed var(--paperless-border)'}}>+</button>
                      </>
                    ) : (
                      <div className="text-sm px-3 py-2 rounded" style={{color: 'var(--paperless-text-secondary)', backgroundColor: 'var(--paperless-surface-light)', border: '1px solid var(--paperless-border)', height: '30px', display: 'flex', alignItems: 'center'}}>Select Tags</div>
                    )}
                  </div>
                  <input 
                    type="checkbox" 
                    checked={classifierEnabled.tags}
                    onChange={() => toggleClassifier('tags')}
                    className="col-span-1 w-4 h-4 rounded justify-self-center" 
                    style={{accentColor: '#2563eb'}} 
                  />
                </div>
                
                {/* Document Category */}
                <div className="grid grid-cols-12 gap-3 items-center">
                  <label className="col-span-3 text-sm text-left" style={{color: 'var(--paperless-text-secondary)'}}>Document Category:</label>
                  <select 
                    disabled={!classifierEnabled.documentCategory}
                    className="col-span-8 text-sm rounded px-3" 
                    style={{
                      backgroundColor: 'var(--paperless-surface-light)', 
                      color: classifierEnabled.documentCategory ? 'var(--paperless-text)' : 'var(--paperless-text-secondary)', 
                      border: '1px solid var(--paperless-border)',
                      opacity: classifierEnabled.documentCategory ? 1 : 0.5,
                      height: '30px'
                    }}
                  >
                    <option value="">Select category...</option>
                    <option value="financial">Financial</option>
                    <option value="personal">Personal</option>
                    <option value="business">Business</option>
                    <option value="legal">Legal</option>
                  </select>
                  <input 
                    type="checkbox" 
                    checked={classifierEnabled.documentCategory}
                    onChange={() => toggleClassifier('documentCategory')}
                    className="col-span-1 w-4 h-4 rounded justify-self-center" 
                    style={{accentColor: '#2563eb'}} 
                  />
                </div>
                
                {/* POCO Score - Cannot be enabled (always greyed out) */}
                <div className="grid grid-cols-12 gap-3 items-center">
                  <label className="col-span-3 text-sm text-left opacity-50" style={{color: 'var(--paperless-text-secondary)'}}>POCO Score:</label>
                  <input 
                    type="number" 
                    value="0" 
                    min="0" 
                    max="100" 
                    disabled 
                    className="col-span-8 text-sm rounded px-3 opacity-50" 
                    style={{backgroundColor: 'var(--paperless-surface-light)', color: 'var(--paperless-text-secondary)', border: '1px solid var(--paperless-border)', height: '30px'}} 
                  />
                  <input 
                    type="checkbox" 
                    checked={false}
                    disabled={true}
                    className="col-span-1 w-4 h-4 rounded justify-self-center opacity-50" 
                  />
                </div>
              </div>
              )}
            </div>
            <div style={{height: '10px'}}></div>
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
                  backgroundColor: !showRawYaml ? '#2563eb' : 'var(--paperless-surface)',
                  color: !showRawYaml ? '#fff' : 'var(--paperless-text-secondary)',
                  
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
                  backgroundColor: showRawYaml ? '#2563eb' : 'var(--paperless-surface)',
                  color: showRawYaml ? '#fff' : 'var(--paperless-text-secondary)',
                  
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