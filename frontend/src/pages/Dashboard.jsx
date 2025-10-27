
import React, { useState, useEffect } from "react";
import { Rule, Document } from "@/api/entities";
import { apiClient } from "@/api/apiClient";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FileText, Plus, Settings, BarChart3, Filter, Eye, FileDown, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const [rules, setRules] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [ocrContent, setOcrContent] = useState('');
  const [ocrDocumentTitle, setOcrDocumentTitle] = useState('');
  
  // Filter states
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedCorrespondents, setSelectedCorrespondents] = useState([]);
  const [selectedDocTypes, setSelectedDocTypes] = useState([]);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [showCorrespondentFilter, setShowCorrespondentFilter] = useState(false);
  const [showDocTypeFilter, setShowDocTypeFilter] = useState(false);
  
  // Filter mode states (include/exclude)
  const [tagFilterMode, setTagFilterMode] = useState('include');
  const [correspondentFilterMode, setCorrespondentFilterMode] = useState('include');
  const [docTypeFilterMode, setDocTypeFilterMode] = useState('include');
  
  // Search states for filters
  const [tagSearch, setTagSearch] = useState('');
  const [correspondentSearch, setCorrespondentSearch] = useState('');
  const [docTypeSearch, setDocTypeSearch] = useState('');

  useEffect(() => {
    loadRules();
    loadDocuments();
  }, []);

  const loadRules = async () => {
    setIsLoading(true);
    try {
      const fetchedRules = await Rule.list("-created_date");
      setRules(fetchedRules);
    } catch (error) {
      console.error("Error loading rules:", error);
    }
    setIsLoading(false);
  };

  const loadDocuments = async () => {
    setIsLoadingDocuments(true);
    try {
      const fetchedDocuments = await Document.list({ limit: 10 });
      setDocuments(fetchedDocuments);
    } catch (error) {
      console.error("Error loading documents:", error);
    }
    setIsLoadingDocuments(false);
  };

  const stats = {
    totalRules: rules.length,
    activeRules: rules.filter(r => r.status === 'active').length,
    draftRules: rules.filter(r => r.status === 'draft').length,
  };

  const handleCreateRuleForDocument = (doc) => {
    // Navigate to RuleEditor with document ID and filename for preview buttons
    const fileName = encodeURIComponent(doc.title || doc.originalFileName || 'Document');
    window.location.href = createPageUrl('RuleEditor') + `?docId=${doc.id}&selectedFile=${fileName}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const handleViewOCR = async (doc) => {
    try {
      const response = await apiClient.get(`/documents/${doc.id}/content`);
      setOcrDocumentTitle(doc.title);
      setOcrContent(response.content || 'No OCR content available');
      setOcrModalOpen(true);
    } catch (error) {
      console.error('Error loading OCR:', error);
      setOcrDocumentTitle(doc.title);
      setOcrContent(doc.content || 'No OCR content available');
      setOcrModalOpen(true);
    }
  };

  const handleViewPDF = (doc) => {
    // Get session token and pass it as query parameter for new tab
    const sessionToken = localStorage.getItem('pococlass_session');
    const url = `/api/documents/${doc.id}/preview?token=${encodeURIComponent(sessionToken)}`;
    window.open(url, '_blank');
  };

  // Filter documents based on selected filters with include/exclude support
  const filteredDocuments = documents.filter(doc => {
    // Tags filter
    if (selectedTags.length > 0) {
      const hasTag = selectedTags.some(tag => doc.tags?.includes(tag));
      if (tagFilterMode === 'include' && !hasTag) return false;
      if (tagFilterMode === 'exclude' && hasTag) return false;
    }
    
    // Correspondents filter
    if (selectedCorrespondents.length > 0) {
      const hasCorrespondent = selectedCorrespondents.includes(doc.correspondent);
      if (correspondentFilterMode === 'include' && !hasCorrespondent) return false;
      if (correspondentFilterMode === 'exclude' && hasCorrespondent) return false;
    }
    
    // Document Types filter
    if (selectedDocTypes.length > 0) {
      const hasDocType = selectedDocTypes.includes(doc.documentType);
      if (docTypeFilterMode === 'include' && !hasDocType) return false;
      if (docTypeFilterMode === 'exclude' && hasDocType) return false;
    }
    
    return true;
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">PocoClass Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage your document classification rules</p>
        </div>
        <Link to={createPageUrl("RuleEditor")} className="btn btn-primary">
          <Plus className="w-5 h-5" />
          Create New Rule
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRules}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeRules}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft Rules</CardTitle>
            <Settings className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.draftRules}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Rules */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Recent Rules</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Rules Yet</h3>
              <p className="text-gray-500 mb-4">Create your first document classification rule to get started</p>
              <Link to={createPageUrl("RuleEditor")} className="btn btn-primary">
                <Plus className="w-4 h-4" />
                Create First Rule
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.slice(0, 5).map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div>
                    <h4 className="font-medium">{rule.ruleName}</h4>
                    <p className="text-sm text-gray-500">Threshold: {rule.threshold}% • {rule.ocrIdentifiers?.length || 0} OCR identifiers</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      rule.status === 'active' ? 'bg-green-100 text-green-800' : 
                      rule.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {rule.status}
                    </span>
                    <Link 
                      to={createPageUrl(`RuleEditor?id=${rule.id}`)} 
                      className="btn btn-outline btn-sm"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents without Rules */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Documents without Rules</CardTitle>
            <div className="flex gap-2">
              <button 
                className={`btn btn-outline btn-sm ${selectedTags.length > 0 ? 'bg-blue-100' : ''}`}
                onClick={() => setShowTagFilter(!showTagFilter)}
              >
                <Filter className="w-4 h-4 mr-1" />
                Tags {selectedTags.length > 0 && `(${selectedTags.length})`}
              </button>
              <button 
                className={`btn btn-outline btn-sm ${selectedCorrespondents.length > 0 ? 'bg-blue-100' : ''}`}
                onClick={() => setShowCorrespondentFilter(!showCorrespondentFilter)}
              >
                <Filter className="w-4 h-4 mr-1" />
                Correspondents {selectedCorrespondents.length > 0 && `(${selectedCorrespondents.length})`}
              </button>
              <button 
                className={`btn btn-outline btn-sm ${selectedDocTypes.length > 0 ? 'bg-blue-100' : ''}`}
                onClick={() => setShowDocTypeFilter(!showDocTypeFilter)}
              >
                <Filter className="w-4 h-4 mr-1" />
                Document Type {selectedDocTypes.length > 0 && `(${selectedDocTypes.length})`}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Paperless-style Filter Dropdowns */}
          {showTagFilter && (
            <div className="mb-4 bg-gray-800 rounded-lg shadow-lg border border-gray-700 text-white" style={{width: '300px'}}>
              <div className="p-3 border-b border-gray-700">
                <div className="flex gap-1 mb-3">
                  <button 
                    className={`flex-1 px-3 py-1.5 text-sm rounded ${tagFilterMode === 'include' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                    onClick={() => setTagFilterMode('include')}
                  >
                    Include
                  </button>
                  <button 
                    className={`flex-1 px-3 py-1.5 text-sm rounded ${tagFilterMode === 'exclude' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                    onClick={() => setTagFilterMode('exclude')}
                  >
                    Exclude
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Filter tags"
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400"
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {Array.from(new Set(documents.flatMap(d => d.tags || [])))
                  .sort()
                  .filter(tag => tag.toLowerCase().includes(tagSearch.toLowerCase()))
                  .map(tag => {
                    const count = documents.filter(d => d.tags?.includes(tag)).length;
                    return (
                      <div
                        key={tag}
                        className={`px-4 py-2 hover:bg-gray-700 cursor-pointer flex justify-between items-center ${selectedTags.includes(tag) ? 'bg-gray-700' : ''}`}
                        onClick={() => setSelectedTags(prev => 
                          prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                        )}
                      >
                        <span className="text-sm">{tag}</span>
                        <span className="text-xs text-gray-400">{count}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
          
          {showCorrespondentFilter && (
            <div className="mb-4 bg-gray-800 rounded-lg shadow-lg border border-gray-700 text-white" style={{width: '300px'}}>
              <div className="p-3 border-b border-gray-700">
                <div className="flex gap-1 mb-3">
                  <button 
                    className={`flex-1 px-3 py-1.5 text-sm rounded ${correspondentFilterMode === 'include' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                    onClick={() => setCorrespondentFilterMode('include')}
                  >
                    Include
                  </button>
                  <button 
                    className={`flex-1 px-3 py-1.5 text-sm rounded ${correspondentFilterMode === 'exclude' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                    onClick={() => setCorrespondentFilterMode('exclude')}
                  >
                    Exclude
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Filter correspondents"
                  value={correspondentSearch}
                  onChange={(e) => setCorrespondentSearch(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400"
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                <div
                  className={`px-4 py-2 hover:bg-gray-700 cursor-pointer ${selectedCorrespondents.includes(null) ? 'bg-gray-700' : ''}`}
                  onClick={() => setSelectedCorrespondents(prev => 
                    prev.includes(null) ? prev.filter(c => c !== null) : [...prev, null]
                  )}
                >
                  <span className="text-sm italic">Not assigned</span>
                </div>
                {Array.from(new Set(documents.map(d => d.correspondent).filter(Boolean)))
                  .sort()
                  .filter(corr => corr.toLowerCase().includes(correspondentSearch.toLowerCase()))
                  .map(corr => {
                    const count = documents.filter(d => d.correspondent === corr).length;
                    return (
                      <div
                        key={corr}
                        className={`px-4 py-2 hover:bg-gray-700 cursor-pointer flex justify-between items-center ${selectedCorrespondents.includes(corr) ? 'bg-gray-700' : ''}`}
                        onClick={() => setSelectedCorrespondents(prev => 
                          prev.includes(corr) ? prev.filter(c => c !== corr) : [...prev, corr]
                        )}
                      >
                        <span className="text-sm">{corr}</span>
                        <span className="text-xs text-gray-400">{count}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
          
          {showDocTypeFilter && (
            <div className="mb-4 bg-gray-800 rounded-lg shadow-lg border border-gray-700 text-white" style={{width: '300px'}}>
              <div className="p-3 border-b border-gray-700">
                <div className="flex gap-1 mb-3">
                  <button 
                    className={`flex-1 px-3 py-1.5 text-sm rounded ${docTypeFilterMode === 'include' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                    onClick={() => setDocTypeFilterMode('include')}
                  >
                    Include
                  </button>
                  <button 
                    className={`flex-1 px-3 py-1.5 text-sm rounded ${docTypeFilterMode === 'exclude' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                    onClick={() => setDocTypeFilterMode('exclude')}
                  >
                    Exclude
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Filter document types"
                  value={docTypeSearch}
                  onChange={(e) => setDocTypeSearch(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400"
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {Array.from(new Set(documents.map(d => d.documentType).filter(Boolean)))
                  .sort()
                  .filter(type => type.toLowerCase().includes(docTypeSearch.toLowerCase()))
                  .map(type => {
                    const count = documents.filter(d => d.documentType === type).length;
                    return (
                      <div
                        key={type}
                        className={`px-4 py-2 hover:bg-gray-700 cursor-pointer flex justify-between items-center ${selectedDocTypes.includes(type) ? 'bg-gray-700' : ''}`}
                        onClick={() => setSelectedDocTypes(prev => 
                          prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
                        )}
                      >
                        <span className="text-sm">{type}</span>
                        <span className="text-xs text-gray-400">{count}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
          {isLoadingDocuments ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Documents Found</h3>
              <p className="text-gray-500">
                {documents.length === 0 ? 'No documents available for classification at the moment.' : 'No documents match the selected filters.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correspondent</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDocuments.map((doc) => (
                    <tr 
                      key={doc.id} 
                      className={`hover:bg-gray-50 cursor-pointer ${selectedDocument?.id === doc.id ? 'bg-blue-50' : ''}`}
                      onClick={() => setSelectedDocument(doc)}
                    >
                      <td className="px-4 py-4 text-sm text-gray-900">{doc.title}</td>
                      <td className="px-4 py-4 text-sm text-gray-500">{doc.id}</td>
                      <td className="px-4 py-4 text-sm text-gray-500">{formatDate(doc.created)}</td>
                      <td className="px-4 py-4 text-sm text-gray-500">{doc.correspondent || '-'}</td>
                      <td className="px-4 py-4 text-sm text-gray-500">{doc.documentType || '-'}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex gap-1 flex-wrap">
                          {doc.tags && doc.tags.length > 0 ? (
                            doc.tags.map((tag, i) => (
                              <Badge key={i} className="bg-blue-500 text-white">{tag}</Badge>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs">No tags</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">{doc.owner || '-'}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button 
                            className="btn btn-ghost btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewPDF(doc);
                            }}
                            title="View PDF"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            className="btn btn-ghost btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewOCR(doc);
                            }}
                            title="View OCR Content"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCreateRuleForDocument(doc);
                            }}
                          >
                            + New Rule
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* OCR Content Modal */}
      {ocrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">OCR Content: {ocrDocumentTitle}</h2>
              <button onClick={() => setOcrModalOpen(false)} className="btn btn-ghost">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 p-4 rounded border">
                {ocrContent}
              </pre>
            </div>
            <div className="flex justify-end gap-2 p-6 border-t">
              <button onClick={() => setOcrModalOpen(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
