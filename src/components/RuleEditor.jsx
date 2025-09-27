import React, { useState, useCallback } from 'react'
import { ArrowLeft, Save, Eye, FileText, Copy, Download, Plus, Trash2, ChevronDown, ChevronUp, X, Info, Lightbulb, AlertTriangle } from 'lucide-react'

const RuleEditor = ({ document, rule, onBack }) => {
  // Wizard state management
  const [currentStep, setCurrentStep] = useState(1)
  const [showYamlPreview, setShowYamlPreview] = useState(true)
  
  // Form data state for all steps
  const [ruleData, setRuleData] = useState({
    // Step 1: Basic Information
    ruleName: rule?.ruleName || '',
    ruleId: rule?.ruleId || '',
    ruleIdManuallyEdited: false,
    description: rule?.description || '',
    threshold: rule?.threshold || 75,
    
    // Step 2: Core Identifiers
    coreIdentifiers: rule?.coreIdentifiers || [],
    
    // Step 3: Bonus Identifiers  
    bonusIdentifiers: rule?.bonusIdentifiers || [],
    
    // Step 4: Static Metadata
    staticMetadata: {
      correspondent: rule?.staticMetadata?.correspondent || '',
      documentType: rule?.staticMetadata?.documentType || '',
      tags: rule?.staticMetadata?.tags || [],
      customFields: rule?.staticMetadata?.customFields || []
    },
    
    // Step 5: Dynamic Metadata
    dynamicMetadata: {
      datePatterns: rule?.dynamicMetadata?.datePatterns || [
        { name: 'dd-mm-yyyy', pattern: '\\d{2}-\\d{2}-\\d{4}' },
        { name: 'yyyy-mm-dd', pattern: '\\d{4}-\\d{2}-\\d{2}' },
        { name: 'dd-mmm-yyyy', pattern: '\\d{2}-[A-Za-z]{3}-\\d{4}' },
        { name: 'dd mmmm yyyy', pattern: '\\d{2} [A-Za-z]+ \\d{4}' },
        { name: 'mm-yyyy', pattern: '\\d{2}-\\d{4}' },
        { name: 'yyyy-mm', pattern: '\\d{4}-\\d{2}' }
      ],
      ...rule?.dynamicMetadata
    },
    
    // Step 6: Filename Patterns
    filenamePatterns: rule?.filenamePatterns || []
    
    // Step 7: Review & Export
    pocoWeights: rule?.pocoWeights || { filename: 5, paperless: 3, content: 10 }
  })

  // Update rule data and mark step as edited
  const updateRuleData = useCallback((section, data) => {
    setRuleData(prev => ({
      ...prev,
      [section]: typeof data === 'object' && data !== null ? { ...prev[section], ...data } : data
    }))
    
    // Mark current step as edited
    setStepStatus(prev => ({
      ...prev,
      [currentStep]: prev[currentStep] === 'untouched' ? 'edited' : prev[currentStep]
    }))
  }, [currentStep])

  // Auto-generate Rule ID from Rule Name
  const generateRuleId = (ruleName) => {
    return ruleName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
  }

  // Toggle info box visibility
  const toggleInfoBox = (step) => {
    setShowInfoBoxes(prev => ({
      ...prev,
      [step]: !prev[step]
    }))
  }

  // Navigation functions
  const nextStep = () => {
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const goToStep = (step) => {
    setCurrentStep(step)
  }

  // Generate YAML preview
  const generateYaml = () => {
    const yaml = `# =================================================================================================
# Document Identification Rule Builder - Generated Configuration
# =================================================================================================
#
# This YAML file was generated using the POCOclass Rule Builder wizard.
# Each section below corresponds to a step in the 7-step configuration process.
#
# Generated: ${new Date().toISOString().split('T')[0]}
# =================================================================================================

# =============================
# STEP 1: BASIC INFORMATION
# =============================
rule_name: "${ruleData.ruleName || ''}"
rule_id: "${ruleData.ruleId || ''}"
threshold: ${ruleData.threshold}  # Minimum confidence score required (${ruleData.threshold}%)

${ruleData.coreIdentifiers.length > 0 ? `
# =============================
# STEP 2: CORE IDENTIFIERS
# =============================
# Essential patterns that must be found for document identification
core_identifiers:
  logic_groups:
${ruleData.coreIdentifiers.map(group => `    - type: "${group.type || 'match'}"     # Logic type: ALL conditions must match
      score: ${group.score || 20}            # Points awarded if this group matches
      conditions:
${group.conditions.map(condition => `        - pattern: "${condition.pattern || ''}"    # Search pattern
          source: "${condition.source || 'content'}"      # Search in content or filename
          range: "${condition.range || '0-1600'}"        # Character range to search`).join('\n')}`).join('\n')}
` : '# =============================\n# STEP 2: CORE IDENTIFIERS\n# =============================\n# No core identifiers defined yet\n'}

${ruleData.bonusIdentifiers.length > 0 ? `
# =============================
# STEP 3: BONUS IDENTIFIERS
# =============================
# Optional patterns that provide extra confidence points
bonus_identifiers:
  logic_groups:
${ruleData.bonusIdentifiers.map(group => `    - type: "${group.type || 'match'}"     # Logic type: ALL conditions must match
      score: ${group.score || 10}             # Bonus points if this group matches
      conditions:
${group.conditions.map(condition => `        - pattern: "${condition.pattern || ''}"    # Search pattern
          source: "${condition.source || 'content'}"      # Search in content or filename
          range: "${condition.range || '0-1600'}"        # Character range to search`).join('\n')}`).join('\n')}
` : '# =============================\n# STEP 3: BONUS IDENTIFIERS\n# =============================\n# No bonus identifiers defined\n'}

# =============================
# STEP 4: STATIC METADATA
# =============================
# Fixed information applied to all matching documents
static_metadata:
  correspondent: "${ruleData.staticMetadata.correspondent || ''}"    # Always assign this correspondent
  document_type: "${ruleData.staticMetadata.documentType || ''}"    # Always assign this document type
  tags: [${ruleData.staticMetadata.tags.map(tag => `"${tag}"`).join(', ')}]           # Tags to add to matching documents
  custom_fields:${ruleData.staticMetadata.customFields.length > 0 ? '\n' + ruleData.staticMetadata.customFields.map(field => `    ${field.name}: "${field.value}"    # Custom field assignment`).join('\n') : '\n    # No custom fields defined'}

# =============================
# STEP 5: DYNAMIC METADATA
# =============================
# Patterns for extracting data from document content
# (Not yet configured in this version)

# =============================
# STEP 6: FILENAME PATTERNS
# =============================
# Patterns for extracting metadata from filenames
# (Not yet configured in this version)

# =============================
# STEP 7: POCO SCORING WEIGHTS
# =============================
# Configure how different metadata sources contribute to confidence scoring
poco_weights:
  filename: ${ruleData.pocoWeights.filename}     # Weight for filename-based scoring (1-10)
  paperless: ${ruleData.pocoWeights.paperless}    # Weight for existing Paperless metadata (1-10)
  content: ${ruleData.pocoWeights.content}      # Weight for content-based scoring (always 10)`
  }

  // Step completion tracking
  const [stepStatus, setStepStatus] = useState({
    1: 'untouched', // untouched, edited, completed
    2: 'untouched',
    3: 'untouched', 
    4: 'untouched',
    5: 'untouched',
    6: 'untouched',
    7: 'untouched'
  })

  // Info box visibility state
  const [showInfoBoxes, setShowInfoBoxes] = useState({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    6: true,
    7: true
  })

  // Step Progress Indicator
  const StepProgress = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4, 5, 6, 7].map((step) => {
        const status = step === currentStep ? 'current' : stepStatus[step]
        return (
          <div key={step} className="flex items-center">
            <button
              onClick={() => goToStep(step)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                step === currentStep
                  ? 'bg-blue-500 text-white shadow-md'
                  : status === 'completed'
                  ? 'bg-green-500 text-white shadow-sm hover:bg-green-600'
                  : status === 'edited'
                  ? 'bg-blue-400 text-white shadow-sm hover:bg-blue-500'
                  : 'bg-gray-400 text-white hover:bg-gray-500'
              }`}
            >
              Step {step}
            </button>
            {step < 7 && (
              <div className={`w-8 h-1 mx-2 rounded ${
                stepStatus[step] === 'completed' ? 'bg-green-500' : 'bg-gray-300'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )

  const Step5DynamicMetadata = () => (
    <div className="wizard-step">
      <div className="step-header">
        <h2 className="step-title">Step 5 of 7: Dynamic Metadata</h2>
        <p className="step-subtitle">Extract specific data from document content using patterns</p>
      </div>

      <div className="info-box info-box-blue">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold mt-0.5">🔍</div>
          <div>
            <h4 className="font-semibold text-sm mb-1">Dynamic Metadata</h4>
            <p className="text-sm">Extract specific information from documents using regex patterns. For example, extract the year from "Jaaroverzicht 2023" or account numbers from content.</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="form-group">
          <label className="form-label">Date Created Extraction</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label text-xs">Pattern After</label>
              <input
                type="text"
                placeholder="e.g., Jaaroverzicht\\s*(\\d{4})"
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label text-xs">Date Format</label>
              <select className="form-select">
                <option value="%Y">Year only (%Y)</option>
                <option value="%Y-%m-%d">YYYY-MM-DD</option>
                <option value="%d/%m/%Y">DD/MM/YYYY</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-group">
          <div className="flex justify-between items-center mb-3">
            <label className="form-label">Extracted Tags</label>
            <button className="btn btn-secondary btn-sm">+ Add Tag Extractor</button>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <input type="text" placeholder="Pattern (e.g., Account (\d+))" className="form-input" />
              <input type="text" placeholder="Prefix (e.g., ACC)" className="form-input" />
              <button className="btn btn-ghost"><Trash2 size={16} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const Step6FilenamePatterns = () => (
    <div className="wizard-step">
      <div className="step-header">
        <h2 className="step-title">Step 6 of 7: Filename Patterns</h2>
        <p className="step-subtitle">Define patterns for filename-based metadata extraction</p>
      </div>

      <div className="info-box info-box-purple">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold mt-0.5">📁</div>
          <div>
            <h4 className="font-semibold text-sm mb-1">Filename Patterns</h4>
            <p className="text-sm">Extract metadata from filenames when documents follow specific naming conventions. This provides backup extraction when content-based methods fail.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="form-label">Filename Patterns</label>
          <button className="btn btn-secondary">+ Add Pattern</button>
        </div>

        <div className="space-y-4">
          <div className="card">
            <div className="grid grid-cols-1 gap-4">
              <div className="form-group">
                <label className="form-label text-xs">Pattern</label>
                <input
                  type="text"
                  placeholder="e.g., (20\d{2})-12-31_NL[0-9]{2}RABO\d{10}-EUR_.*"
                  className="form-input"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="form-group">
                  <label className="form-label text-xs">Date Group</label>
                  <input type="number" min="1" placeholder="1" className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label text-xs">Year Group</label>
                  <input type="number" min="1" placeholder="2" className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label text-xs">Date Format</label>
                  <select className="form-select">
                    <option value="%Y">%Y (Year)</option>
                    <option value="%Y-%m-%d">%Y-%m-%d</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const Step7ReviewExport = () => (
    <div className="wizard-step">
      <div className="step-header">
        <h2 className="step-title">Step 7 of 7: Review & Export</h2>
        <p className="step-subtitle">Review your configuration and adjust POCO scoring weights</p>
      </div>

      <div className="info-box info-box-blue">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold mt-0.5">🎯</div>
          <div>
            <h4 className="font-semibold text-sm mb-1">POCO Scoring Weights</h4>
            <p className="text-sm">Configure how much each metadata source contributes to the final confidence score. Content always has the highest weight (10).</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="form-group">
            <label className="form-label">Filename Weight</label>
            <input
              type="number"
              min="1"
              max="10"
              value={ruleData.pocoWeights.filename}
              onChange={(e) => updateRuleData('pocoWeights', { filename: parseInt(e.target.value) })}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Paperless Weight</label>
            <input
              type="number"
              min="1"
              max="10"
              value={ruleData.pocoWeights.paperless}
              onChange={(e) => updateRuleData('pocoWeights', { paperless: parseInt(e.target.value) })}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Content Weight</label>
            <input
              type="number"
              value={10}
              disabled
              className="form-input opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">Content always has weight 10 (highest priority)</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Configuration Summary</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">Rule Name:</span>
              <span>{ruleData.ruleName || 'Not set'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Rule ID:</span>
              <span>{ruleData.ruleId || 'Not set'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Threshold:</span>
              <span>{ruleData.threshold}%</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Core Identifiers:</span>
              <span>{ruleData.coreIdentifiers.length} groups</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Bonus Identifiers:</span>
              <span>{ruleData.bonusIdentifiers.length} groups</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Correspondent:</span>
              <span>{ruleData.staticMetadata.correspondent || 'Not set'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Document Type:</span>
              <span>{ruleData.staticMetadata.documentType || 'Not set'}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="btn btn-outline flex-1">
            <Eye size={16} />
            Preview YAML
          </button>
          <button className="btn btn-primary flex-1">
            <Download size={16} />
            Download YAML
          </button>
          <button className="btn btn-primary flex-1">
            <Save size={16} />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  )

  // Step components
  const Step1BasicInfo = () => (
    <div className="wizard-step">
      <div className="step-header">
        <div className="flex items-center gap-2">
          <h2 className="step-title">Step 1 of 7: Basic Information</h2>
          {!showInfoBoxes[1] && (
            <button 
              onClick={() => toggleInfoBox(1)}
              className="text-blue-500 hover:text-blue-700 text-sm"
              title="Show help information"
            >
              (?)
            </button>
          )}
        </div>
        <p className="step-subtitle">Start by defining the basic rule information and identification settings</p>
      </div>

      {showInfoBoxes[1] && (
        <div className="info-box info-box-blue">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">i</div>
              <h4 className="font-semibold text-sm">What you're creating</h4>
            </div>
            <button 
              onClick={() => toggleInfoBox(1)}
              className="text-gray-400 hover:text-gray-600 text-lg font-bold"
            >
              ×
            </button>
          </div>
          <p className="text-sm pl-7">A document identification rule teaches the system to recognize specific types of documents (like bank statements, invoices, or contracts) by looking for patterns in the text and filename.</p>
        </div>
      )}

      <div className="space-y-6">
        <div className="form-group">
          <label className="form-label">Rule Name</label>
          <input
            type="text"
            value={ruleData.ruleName}
            onChange={(e) => {
              const newName = e.target.value
              updateRuleData('ruleName', newName)
              // Auto-generate Rule ID if it hasn't been manually edited
              if (!ruleData.ruleIdManuallyEdited) {
                updateRuleData('ruleId', generateRuleId(newName))
              }
            }}
            placeholder="e.g., ExampleBank Year Statement"
            className="form-input"
          />
          <p className="text-xs text-gray-500 mt-1">Human-readable name displayed in the interface</p>
        </div>

        <div className="form-group">
          <label className="form-label">Rule ID</label>
          <input
            type="text"
            value={ruleData.ruleId}
            onChange={(e) => {
              updateRuleData('ruleId', e.target.value)
              updateRuleData('ruleIdManuallyEdited', true)
            }}
            placeholder="e.g., examplebank_year_statement"
            className="form-input"
          />
          <p className="text-xs text-gray-500 mt-1">Auto-generated from Rule Name, but you can edit it manually</p>
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            value={ruleData.description}
            onChange={(e) => updateRuleData('description', e.target.value)}
            placeholder="Describe what types of documents this rule identifies and any special characteristics..."
            className="form-textarea"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Confidence Threshold: {ruleData.threshold}%</label>
          <div className="mt-2">
            <input
              type="range"
              min="50"
              max="100"
              value={ruleData.threshold}
              onChange={(e) => updateRuleData('threshold', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #ef4444 0%, #f59e0b ${(ruleData.threshold - 50) * 2}%, #16a34a 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>50% (Permissive)</span>
              <span>75% (Recommended)</span>
              <span>100% (Very Strict)</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">Balanced threshold - good mix of accuracy and coverage</p>
          </div>
        </div>
      </div>
    </div>
  )

  const Step2CoreIdentifiers = () => (
    <div className="wizard-step">
      <div className="step-header">
        <div className="flex items-center gap-2">
          <h2 className="step-title">Step 2 of 7: Core Identifiers</h2>
          {!showInfoBoxes[2] && (
            <button 
              onClick={() => toggleInfoBox(2)}
              className="text-blue-500 hover:text-blue-700 text-sm"
              title="Show help information"
            >
              (?)
            </button>
          )}
        </div>
        <p className="step-subtitle">Define the essential patterns that must be found in documents for identification. These are the "must-have" elements that define your document type. Bonus identifiers can be added in Step 3.</p>
      </div>

      {showInfoBoxes[2] && (
        <div className="info-box info-box-blue">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">i</div>
              <h4 className="font-semibold text-sm">Core Identifiers</h4>
            </div>
            <button 
              onClick={() => toggleInfoBox(2)}
              className="text-gray-400 hover:text-gray-600 text-lg font-bold"
            >
              ×
            </button>
          </div>
          <div className="text-sm pl-7">
            <p className="mb-2">Core identifiers are the essential patterns that must be found for document identification. These are the "must-have" elements that define your document type.</p>
            <p><strong>Scoring:</strong> Should total 70-100 points for reliable identification<br/>
            <strong>Logic Groups:</strong> Each group can contain multiple conditions that work together</p>
          </div>
        </div>
      )}

      {ruleData.coreIdentifiers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎯</div>
          <h3 className="empty-state-title">No Core Identifiers Yet</h3>
          <p className="empty-state-subtitle">Add your first logic group to define essential document patterns</p>
          <button 
            onClick={addCoreLogicGroup}
            className="btn btn-primary"
          >
            + Add Logic Group
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {ruleData.coreIdentifiers.map((group, index) => (
            <LogicGroupEditor
              key={index}
              group={group}
              index={index}
              onUpdate={(updatedGroup) => updateCoreLogicGroup(index, updatedGroup)}
              onDelete={() => removeCoreLogicGroup(index)}
              type="core"
            />
          ))}
          <button 
            onClick={addCoreLogicGroup}
            className="btn btn-outline w-full"
          >
            + Add Logic Group
          </button>
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-semibold text-sm text-yellow-800">Score Summary</h4>
        <p className="text-sm text-yellow-700">
          Total Core Score: {calculateCoreScore()}/100 points
          {calculateCoreScore() < 70 && (
            <span className="block mt-1">⚠️ Consider adding more points - core identifiers should total 70-100 points</span>
          )}
        </p>
      </div>
    </div>
  )

  const Step3BonusIdentifiers = () => (
    <div className="wizard-step">
      <div className="step-header">
        <div className="flex items-center gap-2">
          <h2 className="step-title">Step 3 of 7: Bonus Identifiers</h2>
          {!showInfoBoxes[3] && (
            <button 
              onClick={() => toggleInfoBox(3)}
              className="text-blue-500 hover:text-blue-700 text-sm"
              title="Show help information"
            >
              (?)
            </button>
          )}
        </div>
        <p className="step-subtitle">Add additional patterns that provide extra confidence in document identification. These are optional "nice-to-have" patterns that help push the score over the threshold.</p>
      </div>

      {showInfoBoxes[3] && (
        <div className="info-box info-box-yellow">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center text-white text-xs font-bold">⭐</div>
              <h4 className="font-semibold text-sm">Bonus Identifiers</h4>
            </div>
            <button 
              onClick={() => toggleInfoBox(3)}
              className="text-gray-400 hover:text-gray-600 text-lg font-bold"
            >
              ×
            </button>
          </div>
          <div className="text-sm pl-7">
            <p className="mb-2">Bonus identifiers are optional patterns that increase the confidence score. They help confirm a document's identity when core identifiers are met.</p>
            <p>These are "nice-to-have" patterns that are not essential but provide extra points, helping to push the total score over the threshold.</p>
          </div>
        </div>
      )}

      {ruleData.bonusIdentifiers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⭐</div>
          <h3 className="empty-state-title">No Bonus Identifiers</h3>
          <p className="empty-state-subtitle">This step is optional. Add bonus identifiers to increase scoring accuracy.</p>
          <button 
            onClick={addBonusLogicGroup}
            className="btn btn-primary"
          >
            + Add Bonus Logic Group
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {ruleData.bonusIdentifiers.map((group, index) => (
            <LogicGroupEditor
              key={index}
              group={group}
              index={index}
              onUpdate={(updatedGroup) => updateBonusLogicGroup(index, updatedGroup)}
              onDelete={() => removeBonusLogicGroup(index)}
              type="bonus"
            />
          ))}
          <button 
            onClick={addBonusLogicGroup}
            className="btn btn-outline w-full"
          >
            + Add Bonus Logic Group
          </button>
        </div>
      )}
    </div>
  )

  const Step4StaticMetadata = () => (
    <div className="wizard-step">
      <div className="step-header">
        <div className="flex items-center gap-2">
          <h2 className="step-title">Step 4 of 7: Static Metadata</h2>
          {!showInfoBoxes[4] && (
            <button 
              onClick={() => toggleInfoBox(4)}
              className="text-blue-500 hover:text-blue-700 text-sm"
              title="Show help information"
            >
              (?)
            </button>
          )}
        </div>
        <p className="step-subtitle">Configure fixed information that applies to all documents matching this rule. This is constant data assigned once a document is recognized.</p>
      </div>

      {showInfoBoxes[4] && (
        <div className="info-box info-box-purple">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">📋</div>
              <h4 className="font-semibold text-sm">Static Metadata</h4>
            </div>
            <button 
              onClick={() => toggleInfoBox(4)}
              className="text-gray-400 hover:text-gray-600 text-lg font-bold"
            >
              ×
            </button>
          </div>
          <p className="text-sm pl-7">This is constant data you want to assign to a document once it's recognized. For example, every "ExampleBank Year Statement" will always have "ExampleBank" as the correspondent.</p>
        </div>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label">Correspondent</label>
            <input
              type="text"
              value={ruleData.staticMetadata.correspondent}
              onChange={(e) => updateRuleData('staticMetadata', { correspondent: e.target.value })}
              placeholder="e.g., ExampleBank"
              className="form-input"
            />
            <p className="text-xs text-gray-500 mt-1">Ideally, this would be a dropdown from your system.</p>
          </div>

          <div className="form-group">
            <label className="form-label">Document Type</label>
            <input
              type="text"
              value={ruleData.staticMetadata.documentType}
              onChange={(e) => updateRuleData('staticMetadata', { documentType: e.target.value })}
              placeholder="e.g., Year Statement"
              className="form-input"
            />
            <p className="text-xs text-gray-500 mt-1">Ideally, this would be a dropdown.</p>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Tags</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Add a tag and press Enter"
              className="form-input flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  e.preventDefault()
                  const newTags = [...ruleData.staticMetadata.tags, e.target.value.trim()]
                  updateRuleData('staticMetadata', { tags: newTags })
                  e.target.value = ''
                }
              }}
            />
            <button 
              onClick={(e) => {
                const input = e.target.parentElement.querySelector('input')
                if (input.value.trim()) {
                  const newTags = [...ruleData.staticMetadata.tags, input.value.trim()]
                  updateRuleData('staticMetadata', { tags: newTags })
                  input.value = ''
                }
              }}
              className="btn btn-secondary"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {ruleData.staticMetadata.tags.map((tag, index) => (
              <span key={index} className="tag-default flex items-center gap-2">
                {tag}
                <button 
                  onClick={() => {
                    const newTags = ruleData.staticMetadata.tags.filter((_, i) => i !== index)
                    updateRuleData('staticMetadata', { tags: newTags })
                  }}
                  className="text-xs"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="form-group">
          <div className="flex justify-between items-center mb-3">
            <label className="form-label">Custom Fields</label>
            <button 
              onClick={addCustomField}
              className="btn btn-secondary btn-sm"
            >
              + Add Custom Field
            </button>
          </div>
          {ruleData.staticMetadata.customFields.map((field, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                value={field.name}
                onChange={(e) => updateCustomField(index, 'name', e.target.value)}
                placeholder="Field name"
                className="form-input flex-1"
              />
              <input
                type="text"
                value={field.value}
                onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                placeholder="Field value"
                className="form-input flex-1"
              />
              <button 
                onClick={() => removeCustomField(index)}
                className="btn btn-ghost"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // Logic Group Editor Component
  const LogicGroupEditor = ({ group, index, onUpdate, onDelete, type }) => {
    const [isExpanded, setIsExpanded] = useState(true)

    return (
      <div className="card border-l-4" style={{borderLeftColor: type === 'core' ? '#2563eb' : '#f59e0b'}}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">
              {type === 'core' ? 'Logic Group' : 'Bonus Group'} {index + 1}
            </h4>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="btn btn-ghost btn-sm"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
          <button 
            onClick={onDelete}
            className="btn btn-ghost text-red-500"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {isExpanded && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Group Type</label>
                <select className="form-select">
                  <option value="match">Match (ALL conditions)</option>
                  <option value="or">OR (ANY condition)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Score Points</label>
                <input 
                  type="number" 
                  min="1" 
                  max="100" 
                  defaultValue={type === 'core' ? 20 : 10}
                  className="form-input"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Conditions</label>
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <input 
                      type="text" 
                      placeholder="e.g., ExampleBank, Invoice, NL[0-9]{2}?RABO"
                      className="form-input"
                    />
                  </div>
                  <div className="col-span-3">
                    <select className="form-select">
                      <option value="content">Document Content</option>
                      <option value="filename">Filename</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input 
                      type="text" 
                      placeholder="0-1600"
                      className="form-input"
                    />
                  </div>
                  <div className="col-span-2">
                    <input 
                      type="text" 
                      placeholder="e.g., Credit Card"
                      className="form-input"
                    />
                  </div>
                </div>
                <button className="btn btn-outline btn-sm">+ Add Condition</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Info Box Component
  const InfoBox = ({ type = 'info', title, children, onClose, stepNumber }) => {
    const isVisible = showInfoBoxes[stepNumber]
    
    if (!isVisible) return null
    
    return (
      <div className={`info-box mb-6 p-4 rounded-lg border ${
        type === 'info' 
          ? 'bg-yellow-50 border-yellow-200' 
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {type === 'info' ? (
              <Lightbulb className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <div className={`text-sm ${type === 'info' ? 'text-yellow-800' : 'text-red-800'}`}>
              {children}
            </div>
          </div>
          <button
            onClick={() => setShowInfoBoxes(prev => ({ ...prev, [stepNumber]: false }))}
            className={`text-xs ${type === 'info' ? 'text-yellow-600 hover:text-yellow-800' : 'text-red-600 hover:text-red-800'}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // YAML Preview Panel
  const YamlPreview = () => (
    <div className="yaml-preview">
      <div className="yaml-preview-header">
        <h3 className="yaml-preview-title">YAML Preview</h3>
        <div className="yaml-preview-actions">
          <button className="btn btn-ghost btn-sm">
            <Copy size={16} />
          </button>
          <button className="btn btn-ghost btn-sm">
            <Download size={16} />
          </button>
        </div>
      </div>
      <div className="yaml-preview-content">
        <pre>{generateYaml()}</pre>
      </div>
      <div className="p-3 text-xs text-gray-500 bg-gray-50">
        This YAML file will be generated based on your current configuration
      </div>
    </div>
  )

  // Helper functions for logic groups
  const addCoreLogicGroup = () => {
    const newGroup = {
      type: 'match',
      score: 20,
      conditions: [{ pattern: '', source: 'content', range: '0-1600', addTag: '' }]
    }
    updateRuleData('coreIdentifiers', [...ruleData.coreIdentifiers, newGroup])
  }

  const updateCoreLogicGroup = (index, updatedGroup) => {
    const newGroups = [...ruleData.coreIdentifiers]
    newGroups[index] = updatedGroup
    updateRuleData('coreIdentifiers', newGroups)
  }

  const removeCoreLogicGroup = (index) => {
    const newGroups = ruleData.coreIdentifiers.filter((_, i) => i !== index)
    updateRuleData('coreIdentifiers', newGroups)
  }

  const addBonusLogicGroup = () => {
    const newGroup = {
      type: 'match',
      score: 10,
      conditions: [{ pattern: '', source: 'content', range: '0-1600', addTag: '' }]
    }
    updateRuleData('bonusIdentifiers', [...ruleData.bonusIdentifiers, newGroup])
  }

  const updateBonusLogicGroup = (index, updatedGroup) => {
    const newGroups = [...ruleData.bonusIdentifiers]
    newGroups[index] = updatedGroup
    updateRuleData('bonusIdentifiers', newGroups)
  }

  const removeBonusLogicGroup = (index) => {
    const newGroups = ruleData.bonusIdentifiers.filter((_, i) => i !== index)
    updateRuleData('bonusIdentifiers', newGroups)
  }

  const calculateCoreScore = () => {
    return ruleData.coreIdentifiers.reduce((total, group) => total + (group.score || 0), 0)
  }

  // Custom field management
  const addCustomField = useCallback(() => {
    const newFields = [...ruleData.staticMetadata.customFields, { name: '', value: '' }]
    updateRuleData('staticMetadata', { customFields: newFields })
  }, [ruleData.staticMetadata.customFields, updateRuleData])

  const updateCustomField = useCallback((index, field, value) => {
    const newFields = [...ruleData.staticMetadata.customFields]
    newFields[index] = { ...newFields[index], [field]: value }
    updateRuleData('staticMetadata', { customFields: newFields })
  }, [ruleData.staticMetadata.customFields, updateRuleData])

  const removeCustomField = useCallback((index) => {
    const newFields = ruleData.staticMetadata.customFields.filter((_, i) => i !== index)
    updateRuleData('staticMetadata', { customFields: newFields })
  }, [ruleData.staticMetadata.customFields, updateRuleData])

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return <Step1BasicInfo />
      case 2: return <Step2CoreIdentifiers />
      case 3: return <Step3BonusIdentifiers />
      case 4: return <Step4StaticMetadata />
      case 5: return <Step5DynamicMetadata />
      case 6: return <Step6FilenamePatterns />
      case 7: return <Step7ReviewExport />
      default: return <Step1BasicInfo />
    }
  }

  return (
    <div className="h-full flex flex-col" style={{backgroundColor: 'var(--app-bg)'}}>
      {/* Header */}
      <div className="wizard-header" style={{backgroundColor: 'var(--app-surface)', borderBottom: '1px solid var(--app-border)', padding: '16px 24px'}}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="btn btn-ghost"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="wizard-title">Document Identification Rule Builder</h1>
              <p className="wizard-subtitle">Create sophisticated document identification and data extraction rules</p>
            </div>
          </div>
          <div className="wizard-actions">
            <button className="btn btn-secondary">
              <Eye size={16} />
              Preview
            </button>
            <button className="btn btn-primary">
              <Save size={16} />
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="wizard-container flex-1">
        <div className="wizard-content">
          {/* Step Content */}
          <div className="flex-1">
            <StepProgress />
            {renderCurrentStep()}
            
            {/* Navigation */}
            <div className="step-navigation">
              <button 
                onClick={prevStep}
                disabled={currentStep === 1}
                className="btn btn-secondary"
              >
                Previous
              </button>
              <button 
                onClick={nextStep}
                disabled={currentStep === 7}
                className="btn btn-primary"
              >
                Next
              </button>
            </div>
          </div>

          {/* YAML Preview */}
          {showYamlPreview && <YamlPreview />}
        </div>
      </div>
    </div>
  )
}

export default RuleEditor