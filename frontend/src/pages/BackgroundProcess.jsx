import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Play, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { User, Paperless } from '@/api/entities';
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
  const [dryRun, setDryRun] = useState(false);
  
  const [allTags, setAllTags] = useState([]);
  const [allCorrespondents, setAllCorrespondents] = useState([]);
  const [allDocTypes, setAllDocTypes] = useState([]);
  
  const [filters, setFilters] = useState({
    title: '',
    tags: [],
    tagsMode: 'include',
    tagsSearch: '',
    correspondents: [],
    correspondentsMode: 'include',
    correspondentsSearch: '',
    docTypes: [],
    docTypesMode: 'include',
    docTypesSearch: '',
    customFields: [],
    customFieldName: '',
    customFieldValue: '',
    dateFrom: '',
    dateTo: '',
    permissions: 'all'
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
        setProcessingHistory(data);
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
      setAllTags(tags.map(t => t.name).sort());
      setAllCorrespondents(correspondents.map(c => c.name).sort());
      setAllDocTypes(docTypes.map(dt => dt.name).sort());
    } catch (error) {
      console.error('Error loading cache data:', error);
    }
  };

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

  const handleManualProcess = async () => {
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
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/background/process-manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          filters: {
            title: filters.title || null,
            tags: filters.tags.length > 0 ? filters.tags : null,
            tags_mode: filters.tagsMode,
            correspondents: filters.correspondents.length > 0 ? filters.correspondents : null,
            correspondents_mode: filters.correspondentsMode,
            doc_types: filters.docTypes.length > 0 ? filters.docTypes : null,
            doc_types_mode: filters.docTypesMode,
            date_from: filters.dateFrom || null,
            date_to: filters.dateTo || null,
          },
          dry_run: dryRun
        })
      });

      if (!response.ok) throw new Error('Manual processing failed');

      const data = await response.json();
      toast({
        title: dryRun ? 'Dry Run Complete' : 'Processing Complete',
        description: `${data.documents_found || 0} documents found, ${data.classified || 0} classified, ${data.rules_applied || 0} rules applied`,
        duration: 5000,
      });

      if (!dryRun) {
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
    }
  };

  const handleResetFilters = () => {
    setFilters({
      title: '',
      tags: [],
      tagsMode: 'include',
      tagsSearch: '',
      correspondents: [],
      correspondentsMode: 'include',
      correspondentsSearch: '',
      docTypes: [],
      docTypesMode: 'include',
      docTypesSearch: '',
      customFields: [],
      customFieldName: '',
      customFieldValue: '',
      dateFrom: '',
      dateTo: '',
      permissions: 'all'
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-GB', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-8 h-8" />
            Background Processing
          </h1>
          <p className="text-gray-500 mt-1">Monitor and manage automatic document classification</p>
        </div>
        <Button
          onClick={handleTrigger}
          disabled={loading || processingStatus?.is_processing}
          className="flex items-center gap-2"
        >
          <Play className="w-4 h-4" />
          {loading ? 'Triggering...' : 'Trigger Now'}
        </Button>
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
            Process specific documents based on filters. Use dry run mode to preview results without applying changes.
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

          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Switch
                id="dry-run"
                checked={dryRun}
                onCheckedChange={setDryRun}
              />
              <label htmlFor="dry-run" className="text-sm font-medium text-gray-700">
                Dry Run (preview only)
              </label>
            </div>
            <Button
              onClick={handleManualProcess}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              {loading ? 'Processing...' : 'Process Documents'}
            </Button>
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
    </div>
  );
}
