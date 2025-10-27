
import React, { useState, useEffect } from "react";
import { Rule, Document } from "@/api/entities";
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
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [ocrContent, setOcrContent] = useState('');
  const [ocrDocumentTitle, setOcrDocumentTitle] = useState('');

  useEffect(() => {
    loadRules();
    loadDocuments();
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
      setSelectedDocuments(documents.map(d => d.id));
    }
    setAllSelected(!allSelected);
  };

  const handleRun = () => {
    if (!selectedRule || selectedDocuments.length === 0) {
      alert('Please select a rule and at least one document');
      return;
    }
    setHasRun(true);
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

  // Mock performance data
  const getPerformanceData = () => {
    const selectedRuleObj = rules.find(r => r.id === selectedRule);
    const ocrGroups = selectedRuleObj?.ocrIdentifiers || [];
    const filenamePatterns = selectedRuleObj?.filenamePatterns?.patterns || [];
    const verificationFields = Object.entries(selectedRuleObj?.verification?.enabledFields || {}).filter(([k, v]) => v);
    const dynamicExtractionRules = selectedRuleObj?.dynamicData?.extractionRules || [];
    const ocrThreshold = 75;

    return selectedDocuments.map(docId => {
      const doc = documents.find(d => d.id === docId);

      const ocrGroupResults = ocrGroups.map((group, idx) => ({
        name: `Logic Group ${idx + 1}`,
        matched: Math.random() > 0.3,
        score: group.score || 0
      }));

      const ocrMatched = ocrGroupResults.filter(g => g.matched).length;
      const ocrScore = ocrGroupResults.filter(g => g.matched).reduce((sum, g) => sum + g.score, 0);
      const ocrPercentage = ocrGroups.length > 0 ? Math.round((ocrScore / 100) * 100) : 0;

      const filenameResults = filenamePatterns.map((pattern, idx) => ({
        name: `Pattern ${idx + 1}`,
        matched: Math.random() > 0.5,
        score: pattern.score || 0
      }));

      const filenameMatched = filenameResults.filter(f => f.matched).length;
      const filenameScore = filenameResults.filter(f => f.matched).reduce((sum, f) => sum + f.score, 0);
      const filenamePercentage = filenamePatterns.length > 0 ? Math.round((filenameScore / filenamePatterns.reduce((sum, p) => sum + (p.score || 0), 0)) * 100) : 0;

      const verificationResults = verificationFields.map(([fieldName, _]) => ({
        name: fieldName,
        matched: Math.random() > 0.4
      }));

      const verificationMatched = verificationResults.filter(v => v.matched).length;
      const verificationPercentage = verificationFields.length > 0 ? Math.round((verificationMatched / verificationFields.length) * 100) : 0;

      const dynamicDataResults = dynamicExtractionRules.map((rule, idx) => ({
        name: rule.targetField || `Field ${idx + 1}`,
        extracted: Math.random() > 0.3,
        value: Math.random() > 0.3 ? '2024-01-15' : null
      }));

      const dynamicDataExtracted = dynamicDataResults.filter(d => d.extracted).length;
      const dynamicDataPercentage = dynamicExtractionRules.length > 0 ? Math.round((dynamicDataExtracted / dynamicExtractionRules.length) * 100) : 0;

      const pocoOcrScore = Math.floor(Math.random() * 100);
      const pocoScore = Math.floor(Math.random() * 100);
      const threshold = 75;
      const result = pocoScore >= threshold ? 'Pass' : 'Fail';

      return {
        documentId: docId,
        documentTitle: doc?.title,
        ocrGroupResults,
        ocrMatched,
        ocrTotal: ocrGroups.length,
        ocrScore,
        ocrPercentage,
        ocrThreshold,
        filenameResults,
        filenameMatched,
        filenameTotal: filenamePatterns.length,
        filenameScore,
        filenamePercentage,
        verificationResults,
        verificationMatched,
        verificationTotal: verificationFields.length,
        verificationPercentage,
        dynamicDataResults,
        dynamicDataExtracted,
        dynamicDataTotal: dynamicExtractionRules.length,
        dynamicDataPercentage,
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
              <button className="btn btn-outline btn-sm">
                <Filter className="w-4 h-4 mr-1" />
                Tags
              </button>
              <button className="btn btn-outline btn-sm">
                <Filter className="w-4 h-4 mr-1" />
                Correspondents
              </button>
              <button className="btn btn-outline btn-sm whitespace-nowrap">
                <Filter className="w-4 h-4 mr-1" />
                Document Type
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingDocuments ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Documents Available</h3>
              <p className="text-gray-500">No documents found for testing rules.</p>
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
              disabled={!selectedRule || selectedDocuments.length === 0}
              className="btn btn-primary"
            >
              <Play className="w-5 h-5 mr-2" />
              Run Evaluation
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
