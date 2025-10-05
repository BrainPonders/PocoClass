
import React, { useState, useEffect } from "react";
import { Rule } from "@/api/entities";
import { FileText, Filter, Play, CheckSquare, Square, Info } from "lucide-react"; // Added Info icon
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export default function RuleReviewer() {
  const [rules, setRules] = useState([]);
  const [selectedRule, setSelectedRule] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [allSelected, setAllSelected] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [showQuickGuide, setShowQuickGuide] = useState(false); // New state for quick guide

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const fetchedRules = await Rule.list("-created_date");
      setRules(fetchedRules);
    } catch (error) {
      console.error("Error loading rules:", error);
    }
  };

  // Mock documents data - 25 files
  const documents = [
    { id: '0198_25061913_3639_001', title: 'bank_statement_january_2024.pdf', created: '15 Jun 1999', correspondent: 'My Bank', documentType: 'Bank Statement', tags: ['NEW'] },
    { id: '0183_25061912_2905_001', title: 'invoice_supplier_abc_202401.pdf', created: '1 Jun 1997', correspondent: 'Supplier ABC', documentType: 'Invoice', tags: ['NEW'] },
    { id: '0185_25061912_3737_001', title: 'receipt_office_supplies.pdf', created: '1 Jun 1997', correspondent: 'Office Store', documentType: 'Receipt', tags: ['NEW'] },
    { id: 'anwb_visa_0132_2503', title: 'utility_bill_electric_jan2024.pdf', created: '28 May 2000', correspondent: 'Electric Company', documentType: 'Bill', tags: ['NEW'] },
    { id: '2000-10-30-Rabobank_Credit', title: 'rabobank_credit_statement.pdf', created: '30 Oct 2000', correspondent: 'Rabobank', documentType: 'Statement', tags: ['NEW'] },
    { id: '0199_25061913_4521_001', title: 'contract_service_agreement.pdf', created: '20 Jun 1999', correspondent: 'Service Co', documentType: 'Contract', tags: ['NEW'] },
    { id: '0184_25061912_3120_001', title: 'invoice_utilities_feb2024.pdf', created: '5 Jun 1997', correspondent: 'Utilities Inc', documentType: 'Invoice', tags: ['NEW'] },
    { id: '0186_25061912_4832_001', title: 'receipt_restaurant_dinner.pdf', created: '10 Jun 1997', correspondent: 'Restaurant', documentType: 'Receipt', tags: ['NEW'] },
    { id: 'ins_policy_0145_2504', title: 'insurance_policy_renewal.pdf', created: '15 Apr 2000', correspondent: 'Insurance Co', documentType: 'Policy', tags: ['NEW'] },
    { id: '2001-03-15-Bank_Statement', title: 'monthly_bank_statement_march.pdf', created: '15 Mar 2001', correspondent: 'My Bank', documentType: 'Bank Statement', tags: ['NEW'] },
    { id: '0200_25061913_5634_001', title: 'tax_return_2023.pdf', created: '25 Jun 1999', correspondent: 'Tax Office', documentType: 'Tax Document', tags: ['NEW'] },
    { id: '0187_25061912_6745_001', title: 'invoice_internet_service.pdf', created: '15 Jun 1997', correspondent: 'ISP Provider', documentType: 'Invoice', tags: ['NEW'] },
    { id: '0188_25061912_7856_001', title: 'receipt_gas_station.pdf', created: '20 Jun 1997', correspondent: 'Gas Station', documentType: 'Receipt', tags: ['NEW'] },
    { id: 'med_bill_0156_2505', title: 'medical_bill_consultation.pdf', created: '20 May 2000', correspondent: 'Hospital', documentType: 'Medical Bill', tags: ['NEW'] },
    { id: '2001-04-20-Credit_Card', title: 'credit_card_statement_april.pdf', created: '20 Apr 2001', correspondent: 'Credit Card Co', documentType: 'Statement', tags: ['NEW'] },
    { id: '0201_25061913_8967_001', title: 'lease_agreement_apartment.pdf', created: '30 Jun 1999', correspondent: 'Landlord', documentType: 'Lease', tags: ['NEW'] },
    { id: '0189_25061912_9078_001', title: 'invoice_mobile_phone.pdf', created: '25 Jun 1997', correspondent: 'Telecom', documentType: 'Invoice', tags: ['NEW'] },
    { id: '0190_25061912_0189_001', title: 'receipt_supermarket.pdf', created: '28 Jun 1997', correspondent: 'Supermarket', documentType: 'Receipt', tags: ['NEW'] },
    { id: 'loan_doc_0167_2506', title: 'loan_agreement_personal.pdf', created: '25 Jun 2000', correspondent: 'Bank', documentType: 'Loan', tags: ['NEW'] },
    { id: '2001-05-25-Utility_Bill', title: 'water_bill_may_2001.pdf', created: '25 May 2001', correspondent: 'Water Company', documentType: 'Bill', tags: ['NEW'] },
    { id: '0202_25061913_1290_001', title: 'payslip_june_2024.pdf', created: '5 Jul 1999', correspondent: 'Employer', documentType: 'Payslip', tags: ['NEW'] },
    { id: '0191_25061912_2301_001', title: 'invoice_parking_ticket.pdf', created: '2 Jul 1997', correspondent: 'City Council', documentType: 'Invoice', tags: ['NEW'] },
    { id: '0192_25061912_3412_001', title: 'receipt_pharmacy.pdf', created: '8 Jul 1997', correspondent: 'Pharmacy', documentType: 'Receipt', tags: ['NEW'] },
    { id: 'sub_doc_0178_2507', title: 'subscription_renewal_magazine.pdf', created: '30 Jul 2000', correspondent: 'Publisher', documentType: 'Subscription', tags: ['NEW'] },
    { id: '2001-06-30-Bank_Transfer', title: 'bank_transfer_confirmation.pdf', created: '30 Jun 2001', correspondent: 'My Bank', documentType: 'Confirmation', tags: ['NEW'] }
  ];

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
    <div className="p-6 max-w-[90vw] mx-auto"> {/* Changed max-w here */}
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
          <div className="flex justify-between items-center">
            <CardTitle>Test Documents</CardTitle>
            <div className="flex gap-2 items-center flex-wrap">
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
                Doc type
              </button>
              <button
                onClick={handleRun}
                disabled={!selectedRule || selectedDocuments.length === 0}
                className="btn btn-primary"
              >
                <Play className="w-4 h-4 mr-1" />
                Run
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                    <td className="px-2 py-1 text-xs text-gray-500">{doc.correspondent}</td>
                    <td className="px-2 py-1 text-xs text-gray-500">{doc.documentType}</td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      {doc.tags.map((tag, i) => (
                        <Badge key={i} className="bg-red-500 text-white text-xs mr-1">{tag}</Badge>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    </div>
  );
}
