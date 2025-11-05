
import React, { useState, useEffect } from "react";
import { Rule, Document, Paperless } from "@/api/entities";
import { apiClient } from "@/api/apiClient";
import { FileText, Play, CheckSquare, Square, Info, Eye, X } from "lucide-react"; // Added Eye and X icons
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import PaperlessFilterBar from "@/components/PaperlessFilterBar";
import API_BASE_URL from '@/config/api';
import PageLayout from "@/components/PageLayout";

export default function RuleReviewer() {
  const [rules, setRules] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [selectedRule, setSelectedRule] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [allSelected, setAllSelected] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [showQuickGuide, setShowQuickGuide] = useState(false); // New state for quick guide
  const [testResults, setTestResults] = useState({}); // Store results by document ID
  const [isRunning, setIsRunning] = useState(false);
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [ocrContent, setOcrContent] = useState('');
  const [ocrDocumentTitle, setOcrDocumentTitle] = useState('');
  
  // Cache data for filters
  const [allTags, setAllTags] = useState([]);
  const [allCorrespondents, setAllCorrespondents] = useState([]);
  const [allDocTypes, setAllDocTypes] = useState([]);
  
  // Consolidated filter state (new Paperless style with tri-state tags)
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
  }, []);
  
  // Reload documents when filters change
  useEffect(() => {
    loadDocuments();
  }, [filters]);

  // Clear selection when documents change
  useEffect(() => {
    setSelectedDocuments([]);
    setAllSelected(false);
  }, [documents]);

  const loadRules = async () => {
    try {
      const fetchedRules = await Rule.list("-created_date");
      setRules(fetchedRules);
    } catch (error) {
      console.error("Error loading rules:", error);
    }
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
      // Backend returns flat array, not paginated response
      setDocuments(Array.isArray(data) ? data : []);
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
      setAllTags(tags.map(t => ({ name: t.name, color: t.color })).sort((a, b) => a.name.localeCompare(b.name)));
      setAllCorrespondents(correspondents.map(c => c.name).sort());
      setAllDocTypes(docTypes.map(dt => dt.name).sort());
    } catch (error) {
      console.error("Error loading cache data:", error);
    }
  };

  const toggleDocumentSelection = (docId) => {
    if (selectedDocuments.includes(docId)) {
      setSelectedDocuments(selectedDocuments.filter(id => id !== docId));
      setAllSelected(false);
    } else {
      const newSelected = [...selectedDocuments, docId];
      setSelectedDocuments(newSelected);
      setAllSelected(newSelected.length === documents.length);
    }
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedDocuments([]);
      setAllSelected(false);
    } else {
      setSelectedDocuments(documents.map(d => d.id));
      setAllSelected(true);
    }
  };

  const handleRun = async () => {
    if (!selectedRule || selectedDocuments.length === 0) {
      alert('Please select a rule and at least one document');
      return;
    }

    setIsRunning(true);
    setTestResults({});
    
    const results = {};
    
    // Run tests on all selected documents
    for (const docId of selectedDocuments) {
      try {
        const result = await Rule.executeOnDocument(selectedRule, docId, true);
        results[docId] = result;
      } catch (error) {
        console.error(`Error testing document ${docId}:`, error);
        results[docId] = {
          success: false,
          error: error.message || 'Unknown error occurred'
        };
      }
    }
    
    setTestResults(results);
    setHasRun(true);
    setIsRunning(false);
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

  // Get performance data from real test results
  const getPerformanceData = () => {
    return selectedDocuments.map(docId => {
      const doc = documents.find(d => d.id === docId);
      const testResult = testResults[docId];
      
      // If no test result yet or error, return placeholder
      if (!testResult || !testResult.success) {
        return {
          documentId: docId,
          documentTitle: doc?.title || `Document ${docId}`,
          error: testResult?.error || 'No test result',
          ocrGroupResults: [],
          ocrMatched: 0,
          ocrTotal: 0,
          ocrScore: 0,
          ocrPercentage: 0,
          ocrThreshold: 75,
          filenameResults: [],
          filenameMatched: 0,
          filenameTotal: 0,
          filenameScore: 0,
          filenamePercentage: 0,
          verificationResults: [],
          verificationMatched: 0,
          verificationTotal: 0,
          verificationPercentage: 0,
          dynamicDataResults: [],
          dynamicDataExtracted: 0,
          dynamicDataTotal: 0,
          dynamicDataPercentage: 0,
          pocoOcrScore: 0,
          pocoScore: 0,
          threshold: 75,
          result: 'Error'
        };
      }

      // Extract real data from test result
      const breakdown = testResult.breakdown || {};
      const scores = testResult.scores || {};
      
      // OCR breakdown
      const ocrBreakdown = breakdown.ocr || {};
      const ocrGroupResults = (ocrBreakdown.groups || []).map((group, idx) => ({
        name: group.name || `Logic Group ${idx + 1}`,
        matched: group.matched || false,
        score: group.score || 0,
        conditions: group.conditions || []
      }));
      
      // Filename breakdown
      const filenameBreakdown = breakdown.filename || {};
      const filenameResults = (filenameBreakdown.patterns || []).map((pattern, idx) => ({
        name: pattern.extracted_value || pattern.pattern || `Pattern ${idx + 1}`,
        matched: pattern.matched || false,
        score: pattern.score || 0
      }));
      
      // Verification breakdown
      const verificationBreakdown = breakdown.verification || {};
      const verificationResults = (verificationBreakdown.matches || []).map(match => ({
        name: match.field || 'Unknown',
        matched: match.match || false,
        extracted: match.extracted,
        paperless: match.paperless
      }));
      
      // Dynamic data (from extracted metadata)
      const extractedMetadata = testResult.extracted_metadata || {};
      const dynamicMeta = extractedMetadata.dynamic || {};
      const dynamicDataResults = Object.entries(dynamicMeta).map(([field, value]) => ({
        name: field,
        extracted: value !== null && value !== undefined,
        value: value
      }));

      const pocoOcrScore = Math.round(scores.poco_ocr_score || 0);
      const pocoScore = Math.round(scores.poco_score || 0);
      const threshold = testResult.threshold || 75;
      const result = testResult.classification_allowed ? 'Pass' : 'Fail';

      return {
        documentId: docId,
        documentTitle: doc?.title || `Document ${docId}`,
        ocrGroupResults,
        ocrMatched: ocrBreakdown.matched || 0,
        ocrTotal: ocrBreakdown.total || 0,
        ocrScore: scores.poco_ocr_score || 0,
        ocrPercentage: ocrBreakdown.matched && ocrBreakdown.total 
          ? Math.round((ocrBreakdown.matched / ocrBreakdown.total) * 100) 
          : 0,
        ocrThreshold: testResult.ocr_threshold || 75,
        filenameResults,
        filenameMatched: filenameBreakdown.matched || 0,
        filenameTotal: filenameBreakdown.total || 0,
        filenameScore: filenameBreakdown.score || 0,
        filenamePercentage: filenameBreakdown.matched && filenameBreakdown.total 
          ? Math.round((filenameBreakdown.matched / filenameBreakdown.total) * 100) 
          : 0,
        verificationResults,
        verificationMatched: verificationBreakdown.matched || 0,
        verificationTotal: verificationBreakdown.total || 0,
        verificationPercentage: verificationBreakdown.matched && verificationBreakdown.total 
          ? Math.round((verificationBreakdown.matched / verificationBreakdown.total) * 100) 
          : 0,
        dynamicDataResults,
        dynamicDataExtracted: dynamicDataResults.filter(d => d.extracted).length,
        dynamicDataTotal: dynamicDataResults.length,
        dynamicDataPercentage: dynamicDataResults.length > 0 
          ? Math.round((dynamicDataResults.filter(d => d.extracted).length / dynamicDataResults.length) * 100) 
          : 0,
        pocoOcrScore,
        pocoScore,
        threshold,
        result
      };
    });
  };

  const performanceData = hasRun ? getPerformanceData() : [];

  // Calculate summary statistics
  const totalTested = performanceData.length;
  const successCount = performanceData.filter(d => d.result === 'Pass').length;
  const failedCount = performanceData.filter(d => d.result === 'Fail').length;

  // Prepare chart data
  const chartData = performanceData.map((data, index) => ({
    name: `${index + 1}`,
    fullName: data.documentTitle,
    ocrScore: data.pocoOcrScore,
    pocoScore: data.pocoScore,
    passed: data.result === 'Pass'
  }));

  return (
    <PageLayout 
      title="Rule Evaluation"
      subtitle="Test and evaluate document classification rules"
    >

      {/* Guide Section for Beginners */}
      {!hasRun && (
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold text-blue-800 flex items-center gap-2">
              <Info className="w-5 h-5" /> Getting Started with Rule Evaluation
            </CardTitle>
            <button
              onClick={() => setShowQuickGuide(!showQuickGuide)}
              className="btn btn-sm btn-ghost text-blue-600 hover:text-blue-800"
            >
              {showQuickGuide ? 'Show Detailed Guide' : 'Show Quick Guide'}
            </button>
          </CardHeader>
          <CardContent>
            {showQuickGuide ? (
              <div className="text-sm text-gray-700">
                <p className="mb-2"><strong>Quick Steps:</strong></p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>1. Select a Rule from the dropdown.</li>
                  <li>2. Choose documents from the list below.</li>
                  <li>3. Click the '<Play className="inline-block w-3 h-3 relative -top-0.5" /> Run' button to see performance results.</li>
                </ol>
              </div>
            ) : (
              <div className="text-sm text-gray-700">
                <p className="mb-2">Welcome to the Rule Evaluation tool! This helps you test how effectively your classification rules work on a set of documents.</p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    <strong>1. Select a Rule:</strong> Use the "Select a rule..." dropdown in the "Test Documents" section below to choose the rule you want to evaluate. Ensure your rule has been properly configured with OCR Identifiers, Filename Patterns, Verification fields, and Dynamic Data Extraction rules.
                  </li>
                  <li>
                    <strong>2. Choose Documents:</strong> Select one or more documents from the list below. You can click on individual document rows to toggle selection or use the checkbox in the table header to "Select All". The selected documents will be used as the test set for your chosen rule.
                  </li>
                  <li>
                    <strong>3. Run the Evaluation:</strong> Once you've selected a rule and at least one document, click the '<Play className="inline-block w-3 h-3 relative -top-0.5" /> Run' button. The system will then process the selected documents against the chosen rule.
                  </li>
                  <li>
                    <strong>4. Review Results:</strong> After the evaluation, the "Rule Performance Results" section will appear, displaying a summary and detailed breakdown of how each document performed against the rule's criteria (OCR, Filename, Verification, Dynamic Data, and overall POCO Score).
                  </li>
                </ol>
                <p className="mt-4 text-xs italic text-gray-500">
                  Tip: The overall POCO Score indicates the confidence level of the rule's match. A higher score generally means a better match.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Document Browser */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Paperless-style Filter Bar */}
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Documents Available</h3>
              <p className="text-gray-500">No documents match the selected filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-1 text-left">
                      <button onClick={toggleSelectAll} className="hover:bg-gray-200 p-1 rounded">
                        {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>
                    </th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Added</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Correspondent</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Document Type</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">CF: Doc Category</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Tags</th>
                    <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase">POCO Score</th>
                    <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase">View</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className={`hover:bg-gray-50 cursor-pointer ${selectedDocuments.includes(doc.id) ? 'bg-blue-50' : ''}`}
                      onClick={() => toggleDocumentSelection(doc.id)}
                    >
                      <td className="px-2 py-1">
                        <button onClick={(e) => { e.stopPropagation(); toggleDocumentSelection(doc.id); }} className="hover:bg-gray-200 p-1 rounded">
                          {selectedDocuments.includes(doc.id) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-2 py-1 text-xs text-gray-900">{doc.title}</td>
                      <td className="px-2 py-1 text-xs text-gray-500">{doc.id}</td>
                      <td className="px-2 py-1 text-xs text-gray-500">{doc.added || doc.created}</td>
                      <td className="px-2 py-1 text-xs text-gray-500">{doc.correspondent || '-'}</td>
                      <td className="px-2 py-1 text-xs text-gray-500">{doc.documentType || '-'}</td>
                      <td className="px-2 py-1 text-xs text-gray-500">{doc.docCategory || '-'}</td>
                      <td className="px-2 py-1 whitespace-nowrap">
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
                                className="text-xs mr-1"
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
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-2 py-1 text-center">
                        {doc.pocoScore !== null && doc.pocoScore !== undefined ? (
                          <span className={`text-xs font-semibold ${
                            doc.pocoScore >= 80 ? 'text-green-600' : 
                            doc.pocoScore >= 1 ? 'text-amber-600' : 
                            'text-gray-400'
                          }`}>
                            {doc.pocoScore.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap">
                        <div className="flex gap-1 justify-center">
                          <button 
                            className="btn btn-ghost btn-sm p-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewPDF(doc);
                            }}
                            title="View PDF"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                          <button 
                            className="btn btn-ghost btn-sm p-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewOCR(doc);
                            }}
                            title="View OCR Content"
                          >
                            <FileText className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Rule Selector and Run Button at bottom */}
          <div className="flex justify-end items-center gap-3 mt-6">
            <select
              value={selectedRule}
              onChange={(e) => setSelectedRule(e.target.value)}
              className="form-select w-64 h-10"
            >
              <option value="">Select a rule...</option>
              {rules.map(rule => (
                <option key={rule.id} value={rule.id}>{rule.ruleName}</option>
              ))}
            </select>
            <button
              onClick={handleRun}
              disabled={!selectedRule || selectedDocuments.length === 0 || isRunning}
              className="btn btn-primary h-10"
            >
              {isRunning ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  RUN
                </>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Rule Performance Display */}
      {hasRun && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Rule Performance Results</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Rule: <span className="font-semibold">{rules.find(r => r.id === selectedRule)?.ruleName || 'Unknown'}</span>
                </p>
              </div>
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-gray-500">Total:</span>
                  <span className="font-semibold ml-1">{totalTested}</span>
                </div>
                <div>
                  <span className="text-gray-500">Success:</span>
                  <span className="font-semibold ml-1 text-green-600">{successCount}</span>
                </div>
                <div>
                  <span className="text-gray-500">Failed:</span>
                  <span className="font-semibold ml-1 text-red-600">{failedCount}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Performance Bar Chart */}
            <div className="mb-6" style={{ height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }}
                    domain={[0, 200]}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
                            <p className="font-semibold text-sm">{data.fullName}</p>
                            <p className="text-xs text-gray-600">OCR Score: {data.ocrScore}%</p>
                            <p className="text-xs text-gray-600">POCO Score: {data.pocoScore}%</p>
                            <p className={`text-xs font-semibold ${data.passed ? 'text-green-600' : 'text-red-600'}`}>
                              {data.passed ? 'PASSED' : 'FAILED'}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="ocrScore" stackId="a" name="OCR Score">
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-ocr-${index}`} fill={entry.passed ? '#86efac' : '#fca5a5'} />
                    ))}
                  </Bar>
                  <Bar dataKey="pocoScore" stackId="a" name="POCO Score">
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-poco-${index}`} fill={entry.passed ? '#16a34a' : '#dc2626'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed Results */}
            <div className="space-y-4">
              {performanceData.map((data, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold">{data.documentTitle}</h4>
                    <div className="flex gap-4 items-center">
                      <div className="text-right">
                        <div className="text-xs text-gray-500">POCO OCR</div>
                        <div className="text-sm font-semibold">{data.pocoOcrScore}%</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">POCO Score</div>
                        <div className="text-sm font-semibold">{data.pocoScore}%</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Threshold</div>
                        <div className="text-sm font-semibold">{data.threshold}%</div>
                      </div>
                      <Badge className={data.result === 'Pass' ? 'bg-green-600' : 'bg-red-600'}>
                        {data.result}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    {/* 1. OCR Pattern Matching */}
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-gray-700">
                          OCR Patterns <span className="text-gray-600 font-normal">(Threshold: {data.ocrThreshold}%)</span>
                        </span>
                        <span className="text-xs text-gray-600">
                          {data.ocrMatched}/{data.ocrTotal} ({data.ocrPercentage}%)
                        </span>
                      </div>
                      <div className="space-y-1">
                        {data.ocrGroupResults.map((group, idx) => (
                          <div key={idx}>
                            {group.conditions && group.conditions.length > 0 ? (
                              group.conditions.map((cond, condIdx) => (
                                <div key={condIdx} className="text-xs">
                                  <span className={cond.matched ? 'text-green-600' : 'text-red-600'}>
                                    {cond.matched ? '✓' : '✗'} {cond.pattern}
                                  </span>
                                  {cond.matched && cond.matched_text && (
                                    <span className="text-gray-500 text-[10px] ml-1">
                                      ("{cond.matched_text}")
                                    </span>
                                  )}
                                  {!cond.matched && (
                                    <span className="text-gray-500 text-[10px] ml-1">
                                      (Not matched)
                                    </span>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="text-xs">
                                <span className={group.matched ? 'text-green-600' : 'text-red-600'}>
                                  {group.matched ? '✓' : '✗'} {group.name}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 2. Filename Verification */}
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-gray-700">Filename</span>
                        <span className="text-xs text-gray-600">
                          {data.filenameMatched}/{data.filenameTotal} ({data.filenamePercentage}%)
                        </span>
                      </div>
                      <div className="space-y-1 mt-3">
                        {data.filenameResults.length > 0 ? (
                          data.filenameResults.map((pattern, idx) => (
                            <div key={idx} className="flex items-center text-xs">
                              <span className={pattern.matched ? 'text-green-600' : 'text-red-600'}>
                                {pattern.matched ? '✓' : '✗'} {pattern.name}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-gray-500 italic">No patterns defined</div>
                        )}
                      </div>
                    </div>

                    {/* 3. Paperless Verification */}
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-gray-700">Verification</span>
                        <span className="text-xs text-gray-600">
                          {data.verificationMatched}/{data.verificationTotal} ({data.verificationPercentage}%)
                        </span>
                      </div>
                      <div className="space-y-1 mt-3">
                        {data.verificationResults.length > 0 ? (
                          <>
                            {data.verificationResults.map((field, idx) => {
                              const extractedDisplay = Array.isArray(field.extracted) ? field.extracted.join(', ') : field.extracted;
                              const paperlessDisplay = Array.isArray(field.paperless) ? field.paperless.join(', ') : field.paperless;
                              return (
                                <div key={idx} className="text-xs">
                                  <span className={field.matched ? 'text-green-600' : 'text-red-600'}>
                                    {field.matched ? '✓' : '✗'} {field.name}
                                  </span>
                                  {field.extracted !== undefined && field.paperless !== undefined && (
                                    <span className="text-gray-500 text-[10px] ml-1">
                                      (Rule: {extractedDisplay} vs Doc: {paperlessDisplay})
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                            <div className="mt-2 pt-2 border-t border-gray-300 text-[10px] text-gray-500 italic">
                              Note: NEW tag is automatically ignored in tag comparisons
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-gray-500 italic">No fields enabled</div>
                        )}
                      </div>
                    </div>

                    {/* 4. Metadata Extraction */}
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-gray-700">Metadata</span>
                        <span className="text-xs text-gray-600">
                          {data.dynamicDataExtracted}/{data.dynamicDataTotal} ({data.dynamicDataPercentage}%)
                        </span>
                      </div>
                      <div className="space-y-1 mt-3">
                        {data.dynamicDataResults.length > 0 ? (
                          data.dynamicDataResults.map((field, idx) => (
                            <div key={idx} className="text-xs">
                              <span className={field.extracted ? 'text-green-600' : 'text-red-600'}>
                                {field.extracted ? '✓' : '✗'} {field.name}
                              </span>
                              {field.extracted && field.value && (
                                <div className="text-gray-600 ml-3 truncate">{field.value}</div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-gray-500 italic">No rules defined</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
    </PageLayout>
  );
}
