
import React, { useState, useEffect } from "react";
import { Rule, Document, Paperless } from "@/api/entities";
import { apiClient } from "@/api/apiClient";
import { FileText, Filter, Play, CheckSquare, Square, Info, Eye, X } from "lucide-react"; // Added Eye and X icons
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

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
    loadCacheData();
  }, []);

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
      const fetchedDocuments = await Document.list({ limit: 50 });
      setDocuments(fetchedDocuments);
    } catch (error) {
      console.error("Error loading documents:", error);
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

  const toggleDocumentSelection = (docId) => {
    setSelectedDocuments(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(filteredDocuments.map(d => d.id));
    }
    setAllSelected(!allSelected);
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
        score: group.score || 0
      }));
      
      // Filename breakdown
      const filenameBreakdown = breakdown.filename || {};
      const filenameResults = (filenameBreakdown.patterns || []).map((pattern, idx) => ({
        name: pattern.pattern || `Pattern ${idx + 1}`,
        matched: pattern.matched || false,
        score: pattern.score || 0
      }));
      
      // Verification breakdown
      const verificationBreakdown = breakdown.verification || {};
      const verificationResults = (verificationBreakdown.matches || []).map(match => ({
        name: match.field || 'Unknown',
        matched: match.match || false
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rule Evaluation</h1> {/* Renamed */}
          <p className="text-gray-500 mt-1">Test and evaluate document classification rules</p> {/* Renamed */}
        </div>
      </div>

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
          <div>
            <CardTitle className="mb-4">Test Documents</CardTitle>
            <div className="flex gap-2 items-center flex-wrap">
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
                className={`btn btn-outline btn-sm whitespace-nowrap ${selectedDocTypes.length > 0 ? 'bg-blue-100' : ''}`}
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
                    className={`flex-1 px-3 py-1.5 text-sm rounded ${tagFilterMode === 'include' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
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
                {allTags
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
                    className={`flex-1 px-3 py-1.5 text-sm rounded ${correspondentFilterMode === 'include' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
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
                {allCorrespondents
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
                    className={`flex-1 px-3 py-1.5 text-sm rounded ${docTypeFilterMode === 'include' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
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
                {allDocTypes
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Documents Available</h3>
              <p className="text-gray-500">
                {documents.length === 0 ? 'No documents found for testing rules.' : 'No documents match the selected filters.'}
              </p>
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
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Correspondent</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Tags</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDocuments.map((doc) => (
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
                      <td className="px-2 py-1 text-xs text-gray-500">{doc.created}</td>
                      <td className="px-2 py-1 text-xs text-gray-500">{doc.correspondent || '-'}</td>
                      <td className="px-2 py-1 text-xs text-gray-500">{doc.documentType || '-'}</td>
                      <td className="px-2 py-1 whitespace-nowrap">
                        {doc.tags && doc.tags.length > 0 ? (
                          doc.tags.map((tag, i) => (
                            <Badge key={i} className="bg-blue-500 text-white text-xs mr-1">{tag}</Badge>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap">
                        <div className="flex gap-1">
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
              className="form-select w-64"
            >
              <option value="">Select a rule...</option>
              {rules.map(rule => (
                <option key={rule.id} value={rule.id}>{rule.ruleName}</option>
              ))}
            </select>
            <button
              onClick={handleRun}
              disabled={!selectedRule || selectedDocuments.length === 0 || isRunning}
              className="btn btn-primary"
            >
              {isRunning ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Run Evaluation
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
                    {/* OCR Identifiers */}
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-gray-700">OCR Identifiers</span>
                        <span className="text-xs text-gray-600">
                          {data.ocrMatched}/{data.ocrTotal} ({data.ocrPercentage}%)
                        </span>
                      </div>
                      <div className="text-xs mb-2">
                        <span className="text-gray-600">Threshold: </span>
                        <span className="font-semibold">{data.ocrThreshold}%</span>
                      </div>
                      <div className="space-y-1">
                        {data.ocrGroupResults.map((group, idx) => (
                          <div key={idx} className="flex items-center text-xs">
                            <span className={group.matched ? 'text-green-600' : 'text-red-600'}>
                              {group.matched ? '✓' : '✗'} {group.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Dynamic Data Extraction */}
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-gray-700">Dynamic Data</span>
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

                    {/* Filename Patterns */}
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-gray-700">Filename Patterns</span>
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

                    {/* Verification */}
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-gray-700">Verification</span>
                        <span className="text-xs text-gray-600">
                          {data.verificationMatched}/{data.verificationTotal} ({data.verificationPercentage}%)
                        </span>
                      </div>
                      <div className="space-y-1 mt-3">
                        {data.verificationResults.length > 0 ? (
                          data.verificationResults.map((field, idx) => (
                            <div key={idx} className="flex items-center text-xs">
                              <span className={field.matched ? 'text-green-600' : 'text-red-600'}>
                                {field.matched ? '✓' : '✗'} {field.name}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-gray-500 italic">No fields enabled</div>
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
    </div>
  );
}
