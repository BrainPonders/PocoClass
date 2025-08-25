import React, { useState } from 'react'
import { FileText, Edit3, Play, Settings, Filter, Plus, Trash2, Eye, Save } from 'lucide-react'
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

  return (
    <div className="h-screen flex flex-col" style={{backgroundColor: 'var(--paperless-bg)'}}>
      {/* Header */}
      <div className="px-6 py-4" style={{backgroundColor: 'var(--paperless-surface)', borderBottom: '1px solid var(--paperless-border)'}}>
        <h1 className="text-2xl font-bold" style={{color: 'var(--paperless-text)'}}>
          DocumentAI v2.0 - Intelligent Classifier Builder
        </h1>
        <p className="text-sm mt-1" style={{color: 'var(--paperless-text-secondary)'}}>
          Visual rule creation for Paperless-ngx document classification
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{backgroundColor: 'var(--paperless-surface)', borderBottom: '1px solid var(--paperless-border)'}}>
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'documents'
                ? 'text-white'
                : 'hover:text-white'
            }`}
            style={{
              borderBottomColor: activeTab === 'documents' ? 'var(--paperless-accent)' : 'transparent',
              color: activeTab === 'documents' ? 'var(--paperless-text)' : 'var(--paperless-text-secondary)'
            }}
          >
            <FileText size={16} />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('rule-editor')}
            disabled={!selectedDocument && !selectedRule}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              selectedDocument || selectedRule ? 'hover:text-white' : 'cursor-not-allowed'
            }`}
            style={{
              borderBottomColor: activeTab === 'rule-editor' ? 'var(--paperless-accent)' : 'transparent',
              color: activeTab === 'rule-editor' ? 'var(--paperless-text)' : 
                     selectedDocument || selectedRule ? 'var(--paperless-text-secondary)' : 'var(--paperless-text-muted)'
            }}
          >
            <Edit3 size={16} />
            Rule Editor
            {(selectedDocument || selectedRule) && (
              <span className="tag-blue">
                {selectedRule ? selectedRule.name : 'New Rule'}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('dry-run')}
            disabled={selectedDocuments.length === 0}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              selectedDocuments.length > 0 ? 'hover:text-white' : 'cursor-not-allowed'
            }`}
            style={{
              borderBottomColor: activeTab === 'dry-run' ? 'var(--paperless-accent)' : 'transparent',
              color: activeTab === 'dry-run' ? 'var(--paperless-text)' : 
                     selectedDocuments.length > 0 ? 'var(--paperless-text-secondary)' : 'var(--paperless-text-muted)'
            }}
          >
            <Play size={16} />
            Test Results
            {selectedDocuments.length > 0 && (
              <span style={{backgroundColor: 'var(--paperless-accent)', color: '#000'}} className="text-xs px-2 py-1 rounded-full font-medium">
                {selectedDocuments.length} docs
              </span>
            )}
          </button>
        </nav>
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
  )
}

export default App