import React, { useState } from 'react'
import { FileText, Edit3, Play, Settings, Filter, Plus, Trash2, Eye, Save, ScrollText, HelpCircle, Cog } from 'lucide-react'
import DocumentBrowser from './components/DocumentBrowser'
import RuleEditor from './components/RuleEditor'
import DryRunResults from './components/DryRunResults'

function App() {
  const [activeTab, setActiveTab] = useState('documents')
  const [selectedRule, setSelectedRule] = useState(null)
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [selectedDocuments, setSelectedDocuments] = useState([])

  const handleNewRule = (document) => {
    setSelectedDocument(document)
    setSelectedRule(null)
    setActiveTab('rule-editor')
  }

  const handleEditRule = (rule) => {
    setSelectedRule(rule)
    setActiveTab('rule-editor')
  }

  const handleTestRules = (documents) => {
    setSelectedDocuments(documents)
    setActiveTab('dry-run')
  }

  const handleBackToDocuments = () => {
    setActiveTab('documents')
    setSelectedDocument(null)
    setSelectedRule(null)
  }

  // Mock rules data
  const mockRules = [
    {
      id: 'bank_statements',
      name: 'Bank Statements',
      description: 'Processes monthly bank statements',
      lastModified: '2024-01-15',
      status: 'active',
      enabled: true,
      poco_score: 85
    },
    {
      id: 'invoices',
      name: 'Supplier Invoices', 
      description: 'Handles supplier invoices and bills',
      lastModified: '2024-01-10',
      status: 'active',
      enabled: true,
      poco_score: 92
    },
    {
      id: 'receipts',
      name: 'Expense Receipts',
      description: 'Processes expense receipts',
      lastModified: '2024-01-08',
      status: 'draft',
      enabled: false,
      poco_score: 73
    }
  ]

  return (
    <div className="h-screen flex flex-col" style={{backgroundColor: 'var(--paperless-bg)'}}>
      {/* Top Header - Paperless Style */}
      <div className="flex items-center justify-between px-4 py-3" style={{backgroundColor: 'var(--paperless-surface)', borderBottom: '1px solid var(--paperless-border)', height: '60px'}}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded" style={{backgroundColor: 'var(--paperless-accent)'}}></div>
          <span className="font-semibold text-base" style={{color: 'var(--paperless-text)'}}>DocumentAI</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm" style={{color: 'var(--paperless-text-secondary)'}}>Robbert Jan</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Paperless Style */}
        <div className="sidebar">

          {/* Navigation Tabs */}
          <div className="flex flex-col" style={{paddingTop: '8px'}}>
            <button
              onClick={() => setActiveTab('documents')}
              className={`sidebar-tab ${activeTab === 'documents' ? 'active' : ''}`}
            >
              <FileText size={16} />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('rule-editor')}
              disabled={!selectedDocument && !selectedRule}
              className={`sidebar-tab ${activeTab === 'rule-editor' ? 'active' : ''} ${(!selectedDocument && !selectedRule) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Edit3 size={16} />
              Rule Editor
            </button>
            <button
              onClick={() => setActiveTab('dry-run')}
              disabled={selectedDocuments.length === 0}
              className={`sidebar-tab ${activeTab === 'dry-run' ? 'active' : ''} ${selectedDocuments.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Play size={16} />
              Test Results
            </button>
          </div>

          {/* Divider */}
          <div style={{borderTop: '1px solid var(--paperless-border)', margin: '8px 0'}}></div>

          {/* Rules Section Header */}
          <div className="px-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium" style={{color: 'var(--paperless-text-muted)', textTransform: 'uppercase'}}>
                AVAILABLE RULES
              </span>
              <Plus size={12} className="cursor-pointer" style={{color: 'var(--paperless-text-secondary)'}} />
            </div>
          </div>

          {/* Rules List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="px-2">
              {mockRules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-2 mx-2 mb-1 rounded cursor-pointer transition-colors ${
                    selectedRule?.id === rule.id
                      ? 'text-white'
                      : 'hover:bg-opacity-10'
                  }`}
                  style={{
                    backgroundColor: selectedRule?.id === rule.id ? 'var(--paperless-surface-light)' : 'transparent',
                    color: selectedRule?.id === rule.id ? 'var(--paperless-text)' : 'var(--paperless-text-secondary)'
                  }}
                  onClick={() => setSelectedRule(rule)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate">{rule.name}</span>
                    {rule.enabled && (
                      <span className="text-xs" style={{color: 'var(--paperless-accent)'}}>✓</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Section */}
          <div style={{borderTop: '1px solid var(--paperless-border)'}}>
            <button className="sidebar-tab">
              <ScrollText size={16} />
              Logs
            </button>
            <button className="sidebar-tab">
              <HelpCircle size={16} />
              POCO Score Help
            </button>
            <button className="sidebar-tab">
              <Cog size={16} />
              Settings
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Content Header */}
          <div className="px-4 py-3 flex items-center justify-between" style={{backgroundColor: 'var(--paperless-surface)', borderBottom: '1px solid var(--paperless-border)'}}>
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold" style={{color: 'var(--paperless-text)'}}>
                {activeTab === 'documents' && 'Dashboard'}
                {activeTab === 'rule-editor' && 'Rule Editor'}
                {activeTab === 'dry-run' && 'Test Results'}
              </h1>
              {(selectedDocument || selectedRule) && activeTab === 'rule-editor' && (
                <span className="text-xs px-2 py-1 rounded" style={{backgroundColor: 'var(--paperless-blue)', color: 'white'}}>
                  {selectedRule ? selectedRule.name : 'New Rule'}
                </span>
              )}
              {selectedDocuments.length > 0 && activeTab === 'dry-run' && (
                <span className="text-xs px-2 py-1 rounded" style={{backgroundColor: 'var(--paperless-accent)', color: '#000'}}>
                  {selectedDocuments.length} documents
                </span>
              )}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'documents' && (
              <DocumentBrowser
                onNewRule={handleNewRule}
                onEditRule={handleEditRule}
                onTestRules={handleTestRules}
              />
            )}
            {activeTab === 'rule-editor' && (
              <RuleEditor
                document={selectedDocument}
                rule={selectedRule}
                onBack={handleBackToDocuments}
              />
            )}
            {activeTab === 'dry-run' && (
              <DryRunResults
                documents={selectedDocuments}
                onBack={handleBackToDocuments}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App