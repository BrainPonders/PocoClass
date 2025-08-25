import React, { useState } from 'react'
import { FileText, Plus, Edit3, Trash2, Settings, Filter, Search, Eye } from 'lucide-react'

const DocumentBrowser = ({ onNewRule, onEditRule, onTestRules }) => {
  const [selectedRule, setSelectedRule] = useState(null)
  const [selectedDocuments, setSelectedDocuments] = useState([])
  const [filterTag, setFilterTag] = useState('NEW')
  const [maxResults, setMaxResults] = useState(100)

  // Mock data for demonstration
  const mockRules = [
    {
      id: 'bank_statements',
      name: 'Bank Statements',
      documentId: 1234,
      description: 'Processes monthly bank statements',
      lastModified: '2024-01-15',
      status: 'active'
    },
    {
      id: 'invoices',
      name: 'Supplier Invoices', 
      documentId: 5678,
      description: 'Handles supplier invoices and bills',
      lastModified: '2024-01-10',
      status: 'active'
    },
    {
      id: 'receipts',
      name: 'Expense Receipts',
      documentId: 9012,
      description: 'Processes expense receipts',
      lastModified: '2024-01-08',
      status: 'draft'
    }
  ]

  const mockDocuments = [
    {
      id: 1001,
      title: 'bank_statement_january_2024.pdf',
      correspondent: 'My Bank',
      documentType: 'Unknown',
      createdDate: '2024-01-20',
      tags: ['NEW'],
      hasContent: true
    },
    {
      id: 1002,
      title: 'invoice_supplier_abc_202401.pdf',
      correspondent: null,
      documentType: 'Unknown',
      createdDate: '2024-01-19',
      tags: ['NEW'],
      hasContent: true
    },
    {
      id: 1003,
      title: 'receipt_office_supplies.pdf',
      correspondent: null,
      documentType: 'Unknown', 
      createdDate: '2024-01-18',
      tags: ['NEW'],
      hasContent: true
    },
    {
      id: 1004,
      title: 'utility_bill_electric_jan2024.pdf',
      correspondent: null,
      documentType: 'Unknown',
      createdDate: '2024-01-17',
      tags: ['NEW'],
      hasContent: true
    }
  ]

  const handleDocumentSelect = (docId, selected) => {
    if (selected) {
      setSelectedDocuments([...selectedDocuments, docId])
    } else {
      setSelectedDocuments(selectedDocuments.filter(id => id !== docId))
    }
  }

  const handleSelectAll = () => {
    if (selectedDocuments.length === mockDocuments.length) {
      setSelectedDocuments([])
    } else {
      setSelectedDocuments(mockDocuments.map(doc => doc.id))
    }
  }

  return (
    <div className="flex h-full">
      {/* Left Panel - Rules Management */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Existing Rules</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
            {mockRules.map((rule) => (
              <div
                key={rule.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedRule?.id === rule.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedRule(rule)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">{rule.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    rule.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {rule.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                <p className="text-xs text-gray-500 mt-2">Doc ID: {rule.documentId}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Rule Actions */}
        <div className="p-4 space-y-2">
          <div className="text-sm text-gray-600 mb-2">
            Selected Rule: <span className="font-medium">{selectedRule?.name || 'None'}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => selectedRule && onEditRule(selectedRule)}
              disabled={!selectedRule}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700"
            >
              <Edit3 size={14} />
              Edit
            </button>
            <button
              disabled={!selectedRule}
              className="px-3 py-2 border border-red-300 text-red-600 rounded-md text-sm font-medium disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-red-50"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <button
            onClick={() => selectedRule && onTestRules(selectedDocuments.map(id => mockDocuments.find(doc => doc.id === id)))}
            disabled={!selectedRule || selectedDocuments.length === 0}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-green-700"
          >
            <Eye size={14} />
            Test Selected ({selectedDocuments.length})
          </button>
        </div>
      </div>

      {/* Right Panel - Document Browser */}
      <div className="flex-1 flex flex-col">
        {/* Filters */}
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Tags:</label>
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="NEW">NEW</option>
                <option value="ALL">All</option>
                <option value="POCO">POCO</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Max Results:</label>
              <input
                type="number"
                value={maxResults}
                onChange={(e) => setMaxResults(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm w-20"
                min="1"
                max="1000"
              />
            </div>
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1 p-4 overflow-y-auto scrollbar-thin">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Documents ({mockDocuments.length})
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
              >
                {selectedDocuments.length === mockDocuments.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={() => onTestRules(selectedDocuments.map(id => mockDocuments.find(doc => doc.id === id)))}
                disabled={selectedDocuments.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700"
              >
                Test Rules ({selectedDocuments.length})
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            {mockDocuments.map((doc) => (
              <div
                key={doc.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedDocuments.includes(doc.id)}
                    onChange={(e) => handleDocumentSelect(doc.id, e.target.checked)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <FileText size={20} className="text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{doc.title}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <span>ID: {doc.id}</span>
                      <span>Date: {doc.createdDate}</span>
                      <span>Type: {doc.documentType}</span>
                      {doc.correspondent && <span>From: {doc.correspondent}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {doc.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => onNewRule(doc)}
                    className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                  >
                    <Plus size={14} />
                    New Rule
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DocumentBrowser