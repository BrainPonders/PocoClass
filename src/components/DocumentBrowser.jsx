import React, { useState } from 'react'
import { FileText, Plus, Edit3, Trash2, Settings, Filter, Search, Eye, ChevronDown, X } from 'lucide-react'

const DocumentBrowser = ({ onNewRule, onEditRule, onTestRules }) => {
  const [selectedDocuments, setSelectedDocuments] = useState([])
  const [showTagsFilter, setShowTagsFilter] = useState(false)
  const [showCorrespondentFilter, setShowCorrespondentFilter] = useState(false)
  const [showDocTypeFilter, setShowDocTypeFilter] = useState(false)
  const [selectedTags, setSelectedTags] = useState(['NEW'])
  const [selectedCorrespondent, setSelectedCorrespondent] = useState(null)
  const [selectedDocType, setSelectedDocType] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Mock data matching Paperless format
  const mockDocuments = [
    {
      id: '0198_25061913_3639_001',
      title: 'bank_statement_january_2024.pdf',
      correspondent: 'My Bank',
      documentType: 'Bank Statement',
      createdDate: '15 Jun 1990',
      tags: ['NEW'],
      owner: 'Robbert Jan'
    },
    {
      id: '0183_25061912_2905_001',
      title: 'invoice_supplier_abc_202401.pdf',
      correspondent: 'Supplier ABC',
      documentType: 'Invoice',
      createdDate: '1 Jun 1997',
      tags: ['NEW'],
      owner: 'Robbert Jan'
    },
    {
      id: '0185_25061912_3737_001',
      title: 'receipt_office_supplies.pdf',
      correspondent: 'Office Store',
      documentType: 'Receipt', 
      createdDate: '1 Jun 1997',
      tags: ['NEW'],
      owner: 'Robbert Jan'
    },
    {
      id: 'anwb_visa_0132_2503',
      title: 'utility_bill_electric_jan2024.pdf',
      correspondent: 'Electric Company',
      documentType: 'Bill',
      createdDate: '28 May 2000',
      tags: ['NEW', 'Credit Card'],
      owner: 'Robbert Jan'
    },
    {
      id: '2000-10-30-Rabobank_Credit Card',
      title: 'rabobank_credit_statement.pdf',
      correspondent: 'Rabobank',
      documentType: 'Credit Card Statement',
      createdDate: '30 Oct 2000',
      tags: ['NEW', 'Credit Card'],
      owner: 'Robbert Jan'
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

  const availableTags = ['NEW', 'POCO', 'PROCESSED', 'BANKING', 'Credit Card']
  const availableCorrespondents = ['My Bank', 'Supplier ABC', 'Office Store', 'Electric Company', 'Rabobank']
  const availableDocTypes = ['Bank Statement', 'Invoice', 'Receipt', 'Bill', 'Credit Card Statement']

  return (
    <div className="h-full flex flex-col" style={{backgroundColor: 'var(--paperless-bg)'}}>
      {/* Welcome Message */}
      <div className="px-6 py-4" style={{backgroundColor: 'var(--paperless-surface)', borderBottom: '1px solid var(--paperless-border)'}}>
        <p className="text-sm" style={{color: 'var(--paperless-text-secondary)'}}>Hello Robbert Jan, welcome to DocumentAI</p>
      </div>

      {/* Filter Section */}
      <div className="px-6 py-4" style={{backgroundColor: 'var(--paperless-surface)', borderBottom: '1px solid var(--paperless-border)'}}>
        {/* Paperless-style Filter Bar */}
        <div className="flex items-center mb-12">
          <div className="flex">
            {/* Tags Filter */}
            <div className="relative" style={{marginRight: '20px'}}>
              <button 
                className={`filter-pill ${selectedTags.length > 0 ? 'active' : ''}`}
                onClick={() => setShowTagsFilter(!showTagsFilter)}
              >
                Tags <ChevronDown size={14} />
              </button>
              {showTagsFilter && (
                <div className="absolute top-full left-0 mt-1 w-48 rounded shadow-lg border z-10" style={{backgroundColor: 'var(--paperless-surface)', border: '1px solid var(--paperless-border)'}}>
                  <div className="p-2">
                    {availableTags.map(tag => (
                      <label key={tag} className="flex items-center gap-2 p-1 text-sm cursor-pointer hover:bg-opacity-10">
                        <input 
                          type="checkbox" 
                          checked={selectedTags.includes(tag)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTags([...selectedTags, tag])
                            } else {
                              setSelectedTags(selectedTags.filter(t => t !== tag))
                            }
                          }}
                        />
                        <span style={{color: 'var(--paperless-text)'}}>{tag}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Correspondent Filter */}
            <div className="relative" style={{marginRight: '20px'}}>
              <button 
                className={`filter-pill ${selectedCorrespondent ? 'active' : ''}`}
                onClick={() => setShowCorrespondentFilter(!showCorrespondentFilter)}
              >
                Correspondents <ChevronDown size={14} />
              </button>
              {showCorrespondentFilter && (
                <div className="absolute top-full left-0 mt-1 w-48 rounded shadow-lg border z-10" style={{backgroundColor: 'var(--paperless-surface)', border: '1px solid var(--paperless-border)'}}>
                  <div className="p-2">
                    {availableCorrespondents.map(correspondent => (
                      <button 
                        key={correspondent} 
                        className="block w-full text-left p-2 text-sm hover:bg-opacity-10 rounded"
                        style={{color: 'var(--paperless-text)'}}
                        onClick={() => {
                          setSelectedCorrespondent(selectedCorrespondent === correspondent ? null : correspondent)
                          setShowCorrespondentFilter(false)
                        }}
                      >
                        {correspondent}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Document Type Filter */}
            <div className="relative">
              <button 
                className={`filter-pill ${selectedDocType ? 'active' : ''}`}
                onClick={() => setShowDocTypeFilter(!showDocTypeFilter)}
              >
                Document type <ChevronDown size={14} />
              </button>
              {showDocTypeFilter && (
                <div className="absolute top-full left-0 mt-1 w-48 rounded shadow-lg border z-10" style={{backgroundColor: 'var(--paperless-surface)', border: '1px solid var(--paperless-border)'}}>
                  <div className="p-2">
                    {availableDocTypes.map(docType => (
                      <button 
                        key={docType} 
                        className="block w-full text-left p-2 text-sm hover:bg-opacity-10 rounded"
                        style={{color: 'var(--paperless-text)'}}
                        onClick={() => {
                          setSelectedDocType(selectedDocType === docType ? null : docType)
                          setShowDocTypeFilter(false)
                        }}
                      >
                        {docType}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active Filters Display - Much More Spacious */}
        {(selectedCorrespondent || selectedDocType || selectedTags.length > 0) && (
          <div className="mt-8 mb-8 py-6 px-6 rounded-lg" style={{backgroundColor: 'var(--paperless-surface-light)', border: '1px solid var(--paperless-border)'}}>
            <div className="flex items-start gap-8 flex-wrap">
              <span className="text-sm font-semibold whitespace-nowrap pt-2" style={{color: 'var(--paperless-text)'}}>Active filters:</span>
              <div className="flex gap-4 flex-wrap">
                {selectedCorrespondent && (
                  <span className="text-sm px-4 py-2 rounded flex items-center gap-3 shadow-sm" style={{backgroundColor: 'var(--paperless-blue)', color: 'white'}}>
                    <strong>Correspondent:</strong> {selectedCorrespondent}
                    <X size={14} className="cursor-pointer hover:bg-white hover:bg-opacity-20 rounded p-1" onClick={() => setSelectedCorrespondent(null)} />
                  </span>
                )}
                {selectedDocType && (
                  <span className="text-sm px-4 py-2 rounded flex items-center gap-3 shadow-sm" style={{backgroundColor: 'var(--paperless-blue)', color: 'white'}}>
                    <strong>Type:</strong> {selectedDocType}
                    <X size={14} className="cursor-pointer hover:bg-white hover:bg-opacity-20 rounded p-1" onClick={() => setSelectedDocType(null)} />
                  </span>
                )}
                {selectedTags.map(tag => (
                  <span key={tag} className="text-sm px-4 py-2 rounded flex items-center gap-3 shadow-sm" style={{backgroundColor: 'var(--paperless-blue)', color: 'white'}}>
                    <strong>Tag:</strong> {tag}
                    <X size={14} className="cursor-pointer hover:bg-white hover:bg-opacity-20 rounded p-1" onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))} />
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Paperless-style Document Table */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto scrollbar-thin">
          <table className="w-full paperless-table">
            <thead>
              <tr>
                <th className="w-8"></th>
                <th>Title</th>
                <th className="w-24">ID</th>
                <th>Created</th>
                <th>Correspondent</th>
                <th>Document type</th>
                <th>Tags</th>
                <th>Owner</th>
                <th className="w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockDocuments.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedDocuments.includes(doc.id)}
                      onChange={(e) => handleDocumentSelect(doc.id, e.target.checked)}
                      className="w-4 h-4"
                    />
                  </td>
                  <td>
                    <div className="font-medium text-sm" style={{color: 'var(--paperless-text)'}}>{doc.title}</div>
                  </td>
                  <td>
                    <div className="text-sm" style={{color: 'var(--paperless-text-secondary)'}}>{doc.id}</div>
                  </td>
                  <td className="text-sm" style={{color: 'var(--paperless-text-secondary)'}}>{doc.createdDate}</td>
                  <td className="text-sm" style={{color: 'var(--paperless-text-secondary)'}}>{doc.correspondent || '-'}</td>
                  <td className="text-sm" style={{color: 'var(--paperless-text-secondary)'}}>{doc.documentType}</td>
                  <td>
                    <div className="flex gap-1 flex-wrap">
                      {doc.tags.map((tag) => {
                        let tagClass = 'tag-default'
                        if (tag === 'NEW') tagClass = 'tag-new'
                        else if (tag === 'POCO') tagClass = 'tag-poco'
                        
                        return (
                          <span
                            key={tag}
                            className={tagClass}
                          >
                            {tag}
                          </span>
                        )
                      })}
                    </div>
                  </td>
                  <td className="text-sm" style={{color: 'var(--paperless-text-secondary)'}}>{doc.owner}</td>
                  <td>
                    <button
                      onClick={() => onNewRule(doc)}
                      className="text-xs px-2 py-1 rounded font-medium"
                      style={{backgroundColor: 'var(--paperless-accent)', color: '#000'}}
                    >
                      + New Rule
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Action Bar */}
      {selectedDocuments.length > 0 && (
        <div className="p-4 flex items-center justify-between" style={{backgroundColor: 'var(--paperless-surface)', borderTop: '1px solid var(--paperless-border)'}}>
          <span className="text-sm" style={{color: 'var(--paperless-text)'}}>
            {selectedDocuments.length} documents selected
          </span>
          <button
            onClick={() => onTestRules(selectedDocuments.map(id => mockDocuments.find(doc => doc.id === id)))}
            className="px-4 py-2 rounded font-medium"
            style={{backgroundColor: 'var(--paperless-accent)', color: '#000'}}
          >
            Test Rules on Selected
          </button>
        </div>
      )}
    </div>
  )
}

export default DocumentBrowser