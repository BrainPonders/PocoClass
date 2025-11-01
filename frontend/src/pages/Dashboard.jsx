
import React, { useState, useEffect } from "react";
import { Rule, Document, Paperless } from "@/api/entities";
import { apiClient } from "@/api/apiClient";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FileText, Plus, Settings, BarChart3, Eye, FileDown, X } from "lucide-react";
import API_BASE_URL from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PaperlessFilterBar from "@/components/PaperlessFilterBar";

export default function Dashboard() {
  const [rules, setRules] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [ocrContent, setOcrContent] = useState('');
  const [ocrDocumentTitle, setOcrDocumentTitle] = useState('');
  
  // Cache data for filters
  const [allTags, setAllTags] = useState([]);
  const [allCorrespondents, setAllCorrespondents] = useState([]);
  const [allDocTypes, setAllDocTypes] = useState([]);
  
  // Helper function to get last 7 days date
  const getLast7DaysDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };
  
  // Consolidated filter state (new Paperless style)
  const [filters, setFilters] = useState({
    title: '',
    tags: ['NEW'],
    tagsMode: 'include',
    tagsSearch: '',
    excludeTags: ['POCO'],
    excludeTagsSearch: '',
    correspondents: [],
    correspondentsMode: 'include',
    correspondentsSearch: '',
    docTypes: [],
    docTypesMode: 'include',
    docTypesSearch: '',
    dateFrom: getLast7DaysDate(),
    dateTo: getTodayDate(),
    limit: 10
  });

  useEffect(() => {
    loadRules();
    loadDocuments();
    loadCacheData();
  }, []);
  
  // Reload documents when filters change
  useEffect(() => {
    loadDocuments();
  }, [filters]);

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
      const params = new URLSearchParams();
      
      // Add filters to query
      if (filters.title) params.append('title', filters.title);
      if (filters.tags.length > 0) params.append('tags', filters.tags.join(','));
      if (filters.tagsMode) params.append('tags_mode', filters.tagsMode);
      if (filters.excludeTags && filters.excludeTags.length > 0) params.append('exclude_tags', filters.excludeTags.join(','));
      if (filters.correspondents.length > 0) params.append('correspondents', filters.correspondents.join(','));
      if (filters.correspondentsMode) params.append('correspondents_mode', filters.correspondentsMode);
      if (filters.docTypes.length > 0) params.append('doc_types', filters.docTypes.join(','));
      if (filters.docTypesMode) params.append('doc_types_mode', filters.docTypesMode);
      if (filters.dateFrom) params.append('date_from', filters.dateFrom);
      if (filters.dateTo) params.append('date_to', filters.dateTo);
      if (filters.limit) params.append('limit', filters.limit);
      
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/documents?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch documents');
      
      const data = await response.json();
      setDocuments(data.results || []);
    } catch (error) {
      console.error("Error loading documents:", error);
      setDocuments([]);
    }
    setIsLoadingDocuments(false);
  };

  const loadCacheData = async () => {
    try {
      const [tags, correspondents, docTypes] = await Promise.all([
        Paperless.getTags(),
        Paperless.getCorrespondents(),
        Paperless.getDocumentTypes()
      ]);
      setAllTags(tags.map(t => t.name).sort());
      setAllCorrespondents(correspondents.map(c => c.name).sort());
      setAllDocTypes(docTypes.map(dt => dt.name).sort());
    } catch (error) {
      console.error("Error loading cache data:", error);
    }
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

  // Documents are already filtered by backend

  const handleResetFilters = () => {
    setFilters({
      title: '',
      tags: ['NEW'],
      tagsMode: 'include',
      tagsSearch: '',
      excludeTags: ['POCO'],
      excludeTagsSearch: '',
      correspondents: [],
      correspondentsMode: 'include',
      correspondentsSearch: '',
      docTypes: [],
      docTypesMode: 'include',
      docTypesSearch: '',
      dateFrom: getLast7DaysDate(),
      dateTo: getTodayDate(),
      limit: 10
    });
  };

  return (
    <div className="p-6">
      {/* Loading Indicator */}
      {isLoadingDocuments && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-md px-4 py-3">
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm text-blue-700 font-medium">Loading documents from Paperless-ngx...</span>
          </div>
        </div>
      )}
      
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
          <CardTitle>Documents without Rules</CardTitle>
        </CardHeader>
        <CardContent>
          {/* New Paperless-style Filter Bar */}
          <PaperlessFilterBar
            filters={filters}
            onFilterChange={setFilters}
            onResetFilters={handleResetFilters}
            allTags={allTags}
            allCorrespondents={allCorrespondents}
            allDocTypes={allDocTypes}
            allCustomFields={[]}
          />
          
          {isLoadingDocuments ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Documents Found</h3>
              <p className="text-gray-500">No documents match the selected filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correspondent</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                    <th className="py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">View</th>
                    <th className="py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documents.map((doc) => (
                    <tr 
                      key={doc.id} 
                      className={`hover:bg-gray-50 cursor-pointer ${selectedDocument?.id === doc.id ? 'bg-blue-50' : ''}`}
                      onClick={() => setSelectedDocument(doc)}
                    >
                      <td className="px-4 py-2 text-sm text-gray-900">{doc.title}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{doc.id}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{formatDate(doc.added || doc.created)}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{doc.correspondent || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{doc.documentType || '-'}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
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
                      <td className="px-4 py-2 text-sm text-gray-500">{doc.owner || '-'}</td>
                      <td className="py-2 whitespace-nowrap">
                        <div className="flex gap-2 justify-center items-center">
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
                        </div>
                      </td>
                      <td className="py-2 whitespace-nowrap">
                        <div className="flex justify-center">
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
              <div className="bg-gray-50 p-4 rounded border flex">
                <div className="pr-4 border-r border-gray-300 text-right select-none">
                  <pre className="text-sm font-mono text-gray-500 leading-relaxed">
                    {ocrContent.split('\n').map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </pre>
                </div>
                <div className="flex-1 pl-4">
                  <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                    {ocrContent}
                  </pre>
                </div>
              </div>
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
