
import React, { useState, useEffect } from "react";
import { Rule, Document, Paperless, User } from "@/api/entities";
import { apiClient } from "@/api/apiClient";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FileText, Plus, Settings, BarChart3, Eye, FileDown, X, Activity, CheckCircle, XCircle, Users, Tag, FileType, Database } from "lucide-react";
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
  
  // Status data
  const [currentUser, setCurrentUser] = useState(null);
  const [backgroundSettings, setBackgroundSettings] = useState(null);
  const [backgroundStatus, setBackgroundStatus] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  
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
    tagStates: {},
    tagsLogic: 'any',
    tagsSearch: '',
    correspondents: [],
    correspondentsMode: 'include',
    correspondentsSearch: '',
    docTypes: [],
    docTypesMode: 'include',
    docTypesSearch: '',
    dateFrom: '',
    dateTo: '',
    limit: 10
  });

  useEffect(() => {
    loadRules();
    loadDocuments();
    loadCacheData();
    loadStatusData();
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
      
      // Convert tri-state tagStates to backend format
      const includedTags = Object.entries(filters.tagStates || {})
        .filter(([_, state]) => state === 'include')
        .map(([tag, _]) => tag);
      const excludedTags = Object.entries(filters.tagStates || {})
        .filter(([_, state]) => state === 'exclude')
        .map(([tag, _]) => tag);
      
      if (includedTags.length > 0) params.append('tags', includedTags.join(','));
      if (filters.tagsLogic) params.append('tags_mode', filters.tagsLogic);
      if (excludedTags.length > 0) params.append('exclude_tags', excludedTags.join(','));
      
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

  const loadStatusData = async () => {
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      
      const [user, bgSettings, bgStatus, syncStat] = await Promise.all([
        User.me().catch(() => null),
        fetch(`${API_BASE_URL}/api/background/settings`, {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API_BASE_URL}/api/background/status`, {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API_BASE_URL}/api/sync/status`, {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        }).then(r => r.ok ? r.json() : null).catch(() => null)
      ]);
      
      setCurrentUser(user);
      setBackgroundSettings(bgSettings);
      setBackgroundStatus(bgStatus);
      setSyncStatus(syncStat);
    } catch (error) {
      console.error("Error loading status data:", error);
    }
  };

  const stats = {
    totalRules: rules.length,
    activeRules: rules.filter(r => r.status === 'active').length,
    deactivatedRules: rules.filter(r => r.status === 'inactive').length,
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
      tagStates: {},
      tagsLogic: 'any',
      tagsSearch: '',
      correspondents: [],
      correspondentsMode: 'include',
      correspondentsSearch: '',
      docTypes: [],
      docTypesMode: 'include',
      docTypesSearch: '',
      dateFrom: '',
      dateTo: '',
      limit: 10
    });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">PocoClass Dashboard</h1>
          <p className="text-gray-500 mt-1">View and manage documents</p>
        </div>
        <Link to={createPageUrl("RuleEditor")} className="btn btn-primary">
          <Plus className="w-5 h-5" />
          Create New Rule
        </Link>
      </div>

      {/* PocoClass Status Section */}
      {(backgroundSettings || backgroundStatus || syncStatus) && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Background Processing Status */}
              {backgroundSettings && (
                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <div className="flex-shrink-0">
                    {backgroundSettings.bg_enabled ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <XCircle className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Background Processing</div>
                    <div className={`text-xs ${backgroundSettings.bg_enabled ? 'text-green-600' : 'text-gray-500'}`}>
                      {backgroundSettings.bg_enabled ? 'Enabled' : 'Disabled'}
                    </div>
                    {backgroundStatus?.is_paused && (
                      <div className="mt-1 text-xs text-yellow-600 flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        Paused (Active session)
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Correspondents Count */}
              {syncStatus && (
                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <div className="flex-shrink-0">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Correspondents</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {syncStatus.correspondents?.count || 0}
                    </div>
                  </div>
                </div>
              )}

              {/* Tags Count */}
              {syncStatus && (
                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <div className="flex-shrink-0">
                    <Tag className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Tags</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {syncStatus.tags?.count || 0}
                    </div>
                  </div>
                </div>
              )}

              {/* Document Types Count */}
              {syncStatus && (
                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <div className="flex-shrink-0">
                    <FileType className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Document Types</div>
                    <div className="text-2xl font-bold text-orange-600">
                      {syncStatus.document_types?.count || 0}
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Fields Count */}
              {syncStatus && (
                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <div className="flex-shrink-0">
                    <Database className="h-6 w-6 text-teal-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Custom Fields</div>
                    <div className="text-2xl font-bold text-teal-600">
                      {syncStatus.custom_fields?.count || 0}
                    </div>
                  </div>
                </div>
              )}

              {/* Users Count (admin only) */}
              {syncStatus && currentUser?.role === 'admin' && (
                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <div className="flex-shrink-0">
                    <Users className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Users</div>
                    <div className="text-2xl font-bold text-indigo-600">
                      {syncStatus.users?.count || 0}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
            <CardTitle className="text-sm font-medium">Deactivated Rules</CardTitle>
            <Settings className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.deactivatedRules}</div>
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
                    <th className="py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">POCO Score</th>
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
                      <td className="py-2 text-center">
                        {doc.pocoScore !== null && doc.pocoScore !== undefined ? (
                          <span className={`text-sm font-semibold ${
                            doc.pocoScore >= 80 ? 'text-green-600' : 
                            doc.pocoScore >= 1 ? 'text-amber-600' : 
                            'text-gray-400'
                          }`}>
                            {doc.pocoScore.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
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
