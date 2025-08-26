import React, { useState, useRef, useEffect } from 'react'
import { FileText, Edit3, Play, Settings, Filter, Plus, Trash2, Eye, Save, ScrollText, HelpCircle, Cog, ChevronDown, User, LogOut, FileQuestion } from 'lucide-react'
import DocumentBrowser from './components/DocumentBrowser'
import RuleEditor from './components/RuleEditor'
import DryRunResults from './components/DryRunResults'

function App() {
  const [activeTab, setActiveTab] = useState('documents')
  const [selectedRule, setSelectedRule] = useState(null)
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [selectedDocuments, setSelectedDocuments] = useState([])
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef(null)
  
  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

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
      {/* Top Header - Custom Blue Theme */}
      <div className="flex items-center justify-between px-3 py-2" style={{backgroundColor: '#2563eb', borderBottom: '1px solid var(--paperless-border)', height: '48px'}}>
        <div className="flex items-center gap-1" style={{marginLeft: '20px'}}>
          <div className="w-5 h-5 rounded" style={{backgroundColor: '#3b82f6'}}></div>
          <span className="font-semibold text-sm text-white">POCOclass</span>
        </div>
        <div className="flex items-center" style={{marginRight: '16px'}}>
          <div className="relative" ref={userMenuRef}>
            <button 
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-600 transition-colors"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <User size={13} className="text-white" />
              <span className="text-xs text-white">Robbert Jan</span>
              <ChevronDown size={11} className="text-white" />
            </button>
            {showUserMenu && (
              <div className="absolute right-0 rounded shadow-lg border z-50" style={{backgroundColor: 'var(--paperless-surface)', border: '0.5px solid var(--paperless-border)', width: '180px', top: 'calc(100% + 10px)'}}>
                <button className="flex items-center gap-2 w-full text-xs text-left transition-colors" style={{color: 'var(--paperless-text)', padding: '10px 13px', borderBottom: '0.5px solid rgba(255,255,255,0.08)', border: 'none', boxShadow: 'none', outline: 'none', backgroundColor: 'transparent'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <User size={13} />
                  My Profile
                </button>
                <button className="flex items-center gap-2 w-full text-xs text-left transition-colors" style={{color: 'var(--paperless-text)', padding: '10px 13px', borderBottom: '0.5px solid rgba(255,255,255,0.08)', border: 'none', boxShadow: 'none', outline: 'none', backgroundColor: 'transparent'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <Cog size={13} />
                  Settings
                </button>
                <button className="flex items-center gap-2 w-full text-xs text-left transition-colors" style={{color: 'var(--paperless-text)', padding: '10px 13px', borderBottom: '0.5px solid rgba(255,255,255,0.08)', border: 'none', boxShadow: 'none', outline: 'none', backgroundColor: 'transparent'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <FileQuestion size={13} />
                  Documentation
                </button>
                <button className="flex items-center gap-2 w-full text-xs text-left transition-colors" style={{color: 'var(--paperless-text)', padding: '10px 13px', border: 'none', boxShadow: 'none', outline: 'none', backgroundColor: 'transparent'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <LogOut size={13} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Paperless Style */}
        <div className="sidebar">

          {/* Navigation Tabs */}
          <div className="flex flex-col" style={{paddingTop: '6px'}}>
            <button
              onClick={() => setActiveTab('documents')}
              className={`sidebar-tab ${activeTab === 'documents' ? 'active' : ''}`}
            >
              <FileText size={13} />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('rule-editor')}
              disabled={!selectedDocument && !selectedRule}
              className={`sidebar-tab ${activeTab === 'rule-editor' ? 'active' : ''} ${(!selectedDocument && !selectedRule) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Edit3 size={13} />
              Rule Editor
            </button>
            <button
              onClick={() => setActiveTab('dry-run')}
              disabled={selectedDocuments.length === 0}
              className={`sidebar-tab ${activeTab === 'dry-run' ? 'active' : ''} ${selectedDocuments.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Play size={13} />
              Test Results
            </button>
          </div>

          {/* Divider */}
          <div style={{borderTop: '1px solid var(--paperless-border)', margin: '6px 0'}}></div>

          {/* Rules Section Header */}
          <div className="px-3 py-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold" style={{color: 'var(--paperless-text-muted)', textTransform: 'uppercase'}}>
                AVAILABLE RULES
              </span>
              <Plus size={10} className="cursor-pointer" style={{color: 'var(--paperless-text-secondary)'}} />
            </div>
          </div>

          {/* Rules List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="px-1">
              {mockRules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-1.5 mx-1.5 rounded cursor-pointer transition-colors ${
                    selectedRule?.id === rule.id
                      ? 'text-white'
                      : 'hover:bg-opacity-10'
                  }`}
                  style={{
                    marginBottom: '5px',
                    backgroundColor: selectedRule?.id === rule.id ? 'var(--paperless-surface-light)' : 'transparent',
                    color: selectedRule?.id === rule.id ? 'var(--paperless-text)' : 'var(--paperless-text-secondary)'
                  }}
                  onClick={() => setSelectedRule(rule)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate" style={{fontSize: '12px'}}>{rule.name}</span>
                    {rule.enabled && (
                      <span className="text-xs" style={{color: 'var(--paperless-accent)', fontSize: '11px'}}>✓</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Section */}
          <div style={{borderTop: '1px solid var(--paperless-border)'}}>
            <button className="sidebar-tab">
              <ScrollText size={13} />
              Logs
            </button>
            <button className="sidebar-tab">
              <HelpCircle size={13} />
              POCO Score Help
            </button>
            <button className="sidebar-tab">
              <Cog size={13} />
              Settings
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">

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