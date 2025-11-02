import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Play, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle, Eye, FileText, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { User, Paperless } from '@/api/entities';
import { apiClient } from "@/api/apiClient";
import API_BASE_URL from '@/config/api';
import PaperlessFilterBar from "@/components/PaperlessFilterBar";

export default function BackgroundProcess() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [processingHistory, setProcessingHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit] = useState(20);
  const [matchingDocuments, setMatchingDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [currentDryRun, setCurrentDryRun] = useState(null);
  
  const [allTags, setAllTags] = useState([]);
  const [allCorrespondents, setAllCorrespondents] = useState([]);
  const [allDocTypes, setAllDocTypes] = useState([]);
  
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [ocrContent, setOcrContent] = useState('');
  const [ocrDocumentTitle, setOcrDocumentTitle] = useState('');
  
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
    limit: 100
  });

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role !== 'admin') {
        toast({
          title: 'Access Denied',
          description: 'Only administrators can access Background Processing',
          variant: 'destructive',
          duration: 3000,
        });
        navigate('/Dashboard');
      } else {
        // Only load data if user is admin
        loadStatus();
        loadHistory();
        loadCacheData();
      }
    }
  }, [currentUser, navigate, toast]);

  const loadUser = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadStatus = async () => {
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/background/status`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProcessingStatus(data);
      }
    } catch (error) {
      console.error('Error loading status:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/background/history?limit=${historyLimit}&offset=${(historyPage - 1) * historyLimit}`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProcessingHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const loadCacheData = async () => {
    try {
      const [tags, correspondents, docTypes] = await Promise.all([
        Paperless.getTags(),
        Paperless.getCorrespondents(),
        Paperless.getDocumentTypes()
      ]);
      setAllTags(tags.map(t => ({ name: t.name, color: t.color })).sort((a, b) => a.name.localeCompare(b.name)));
      setAllCorrespondents(correspondents.map(c => c.name).sort());
      setAllDocTypes(docTypes.map(dt => dt.name).sort());
    } catch (error) {
      console.error('Error loading cache data:', error);
    }
  };

  const loadMatchingDocuments = async () => {
    setLoadingDocuments(true);
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      const params = new URLSearchParams();
      
      // Build query params from filters
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
      
      const response = await fetch(`${API_BASE_URL}/api/documents?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch documents');

      const data = await response.json();
      setMatchingDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading matching documents:', error);
      setMatchingDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  // Load matching documents when filters change
  useEffect(() => {
    if (currentUser && currentUser.role === 'admin') {
      loadMatchingDocuments();
    }
  }, [filters, currentUser]);

  const handleTrigger = async () => {
    if (currentUser?.role !== 'admin') {
      toast({
        title: 'Permission Denied',
        description: 'Only administrators can trigger background processing',
        variant: 'destructive',
        duration: 3000,
      });
      return;
    }

    setLoading(true);
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/background/trigger`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });

      if (!response.ok) throw new Error('Trigger failed');

      const data = await response.json();
      toast({
        title: 'Processing Triggered',
        description: data.message || 'Background processing has been triggered',
        duration: 3000,
      });

      await loadStatus();
      await loadHistory();
    } catch (error) {
      toast({
        title: 'Trigger Failed',
        description: error.message,
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualProcess = async (dryRunMode) => {
    if (currentUser?.role !== 'admin') {
      toast({
        title: 'Permission Denied',
        description: 'Only administrators can manually process documents',
        variant: 'destructive',
        duration: 3000,
      });
      return;
    }

    setLoading(true);
    setCurrentDryRun(dryRunMode);
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      
      // Convert tri-state tagStates to backend format
      const includedTags = Object.entries(filters.tagStates || {})
        .filter(([_, state]) => state === 'include')
        .map(([tag, _]) => tag);
      const excludedTags = Object.entries(filters.tagStates || {})
        .filter(([_, state]) => state === 'exclude')
        .map(([tag, _]) => tag);
      
      const response = await fetch(`${API_BASE_URL}/api/background/process-manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          filters: {
            title: filters.title || null,
            tags: includedTags.length > 0 ? includedTags : null,
            tags_mode: filters.tagsLogic,
            exclude_tags: excludedTags.length > 0 ? excludedTags : null,
            correspondents: filters.correspondents.length > 0 ? filters.correspondents : null,
            correspondents_mode: filters.correspondentsMode,
            doc_types: filters.docTypes.length > 0 ? filters.docTypes : null,
            doc_types_mode: filters.docTypesMode,
            date_from: filters.dateFrom || null,
            date_to: filters.dateTo || null,
          },
          dry_run: dryRunMode
        })
      });

      if (!response.ok) throw new Error('Manual processing failed');

      const data = await response.json();
      toast({
        title: dryRunMode ? 'Dry Run Complete' : 'Processing Complete',
        description: `${data.documents_found || 0} documents found, ${data.classified || 0} classified, ${data.rules_applied || 0} rules applied`,
        duration: 5000,
      });

      if (!dryRunMode) {
        await loadHistory();
      }
    } catch (error) {
      toast({
        title: 'Processing Failed',
        description: error.message,
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setLoading(false);
      setCurrentDryRun(null);
    }
  };

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
      limit: 100
    });
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

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
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
    const sessionToken = localStorage.getItem('pococlass_session');
    const url = `/api/documents/${doc.id}/preview?token=${encodeURIComponent(sessionToken)}`;
    window.open(url, '_blank');
  };

  const isAdmin = currentUser?.role === 'admin';

  // Don't render until we know the user role
  if (!currentUser) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-96">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  // This should never render for non-admins due to redirect, but extra safety
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-8 h-8" />
            Background Processing
          </h1>
          <p className="text-gray-500 mt-1">Monitor and manage automatic document classification</p>
        </div>
        <div className="flex flex-col items-end">
          <Button
            onClick={handleTrigger}
            disabled={loading || processingStatus?.is_processing}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <RefreshCw className="w-4 h-4" />
            {loading ? 'Triggering...' : 'Trigger Now'}
          </Button>
          <p className="text-xs text-gray-500 mt-1">Auto-discover & process documents tagged "NEW"</p>
        </div>
      </div>

      {/* Info banner about Trigger Now */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Trigger Now:</strong> This button triggers automatic background processing to discover and classify documents tagged with "NEW". It's separate from manual testing below and operates independently of filter settings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Processing Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {processingStatus ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    processingStatus.enabled 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {processingStatus.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Processing:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    processingStatus.is_processing 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {processingStatus.is_processing ? 'Active' : 'Idle'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Last Run:</span>
                  <span className="text-sm text-gray-900">
                    {processingStatus.last_run ? formatDate(processingStatus.last_run) : 'Never'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Documents Processed:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {processingStatus.documents_processed || 0}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                Loading status...
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Runs:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {processingHistory.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Successful:</span>
                <span className="text-sm font-semibold text-green-600">
                  {processingHistory.filter(h => h.status === 'success').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Failed:</span>
                <span className="text-sm font-semibold text-red-600">
                  {processingHistory.filter(h => h.status === 'error').length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Manual Processing</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Test rules against filtered documents. Select documents below using the filter bar, then choose your testing mode.
          </p>
          
          <PaperlessFilterBar
            filters={filters}
            onFilterChange={setFilters}
            onResetFilters={handleResetFilters}
            allTags={allTags}
            allCorrespondents={allCorrespondents}
            allDocTypes={allDocTypes}
            allCustomFields={[]}
          />

          {/* Action Buttons */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Processing Actions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Dry Run Button */}
              <div className="flex flex-col">
                <Button
                  onClick={() => handleManualProcess(true)}
                  disabled={loading || matchingDocuments.length === 0}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Play className="w-4 h-4" />
                  {loading && currentDryRun === true ? 'Testing...' : 'Dry Run'}
                </Button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Test all rules without changing Paperless
                </p>
              </div>

              {/* Run Button */}
              <div className="flex flex-col">
                <Button
                  onClick={() => {
                    if (window.confirm('⚠️ WARNING: This will apply active rules to your Paperless documents and make real changes. Are you sure you want to proceed?')) {
                      handleManualProcess(false);
                    }
                  }}
                  disabled={loading || matchingDocuments.length === 0}
                  className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700"
                >
                  <Play className="w-4 h-4" />
                  {loading && currentDryRun === false ? 'Running...' : 'Run'}
                </Button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  ⚠️ Apply active rules to Paperless
                </p>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
              <strong>Note:</strong> Only rules with status "active" are applied during Run. Dry Run tests all rules regardless of status.
            </div>
          </div>

          {/* Matching Documents List */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Matching Documents ({matchingDocuments.length})
            </h3>
            {loadingDocuments ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : matchingDocuments.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No documents match the current filter criteria</p>
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
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {matchingDocuments.map((doc) => (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">{doc.title}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{doc.id}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{formatDate(doc.added || doc.created)}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{doc.correspondent || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{doc.documentType || '-'}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="flex gap-1 flex-wrap">
                            {doc.tags && doc.tags.length > 0 ? (
                              doc.tags.map((tag, i) => {
                                const tagObj = allTags.find(t => t.name === tag);
                                const tagColor = tagObj?.color || '#3B82F6';
                                
                                const getTextColor = (hexColor) => {
                                  const r = parseInt(hexColor.slice(1, 3), 16);
                                  const g = parseInt(hexColor.slice(3, 5), 16);
                                  const b = parseInt(hexColor.slice(5, 7), 16);
                                  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                                  return luminance > 0.5 ? '#111827' : '#FFFFFF';
                                };
                                
                                return (
                                  <Badge 
                                    key={i} 
                                    style={{ 
                                      backgroundColor: tagColor,
                                      color: getTextColor(tagColor)
                                    }}
                                  >
                                    {tag}
                                  </Badge>
                                );
                              })
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Processing History</CardTitle>
        </CardHeader>
        <CardContent>
          {processingHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Processing History</h3>
              <p className="text-gray-500">Background processing runs will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Started</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documents Found</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Classified</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rules Applied</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {processingHistory.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(entry.started_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(entry.completed_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDuration(entry.duration_seconds)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {entry.documents_found || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {entry.documents_classified || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {entry.rules_applied || 0}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          {entry.status === 'success' ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : entry.status === 'error' ? (
                            <XCircle className="w-4 h-4 text-red-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-yellow-600" />
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            entry.status === 'success' 
                              ? 'bg-green-100 text-green-800'
                              : entry.status === 'error'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {entry.status}
                          </span>
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
