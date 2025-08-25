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
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">
          DocumentAI v2.0 - Intelligent Classifier Builder
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Visual rule creation for Paperless-ngx document classification
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'documents'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText size={16} />
            Documents & Rules
          </button>
          <button
            onClick={() => setActiveTab('rule-editor')}
            disabled={!selectedDocument && !selectedRule}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'rule-editor'
                ? 'border-blue-500 text-blue-600'
                : selectedDocument || selectedRule
                ? 'border-transparent text-gray-500 hover:text-gray-700'
                : 'border-transparent text-gray-300 cursor-not-allowed'
            }`}
          >
            <Edit3 size={16} />
            Rule Editor
            {(selectedDocument || selectedRule) && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                {selectedRule ? selectedRule.name : 'New Rule'}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('dry-run')}
            disabled={selectedDocuments.length === 0}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'dry-run'
                ? 'border-blue-500 text-blue-600'
                : selectedDocuments.length > 0
                ? 'border-transparent text-gray-500 hover:text-gray-700'
                : 'border-transparent text-gray-300 cursor-not-allowed'
            }`}
          >
            <Play size={16} />
            Test Results
            {selectedDocuments.length > 0 && (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
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