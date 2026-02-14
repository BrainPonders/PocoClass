/**
 * @file tutorialData.js
 * @description Tutorial step definitions and example data for the interactive walkthrough.
 * Contains the example bank statement OCR text, pre-built rule data for the tutorial,
 * and the ordered list of tutorial steps with spotlight targets, tooltip positions,
 * and rich text content.
 */

export const EXAMPLE_OCR_TEXT = `Account Number: 1111111
Sort Code: 16-10-00
Statement
BIC: RBOSGB2L
SELECT ACCOUNT IBAN: GB11RBOS 1610 0011 1111 11

MR TEST TESTER
CURRENT ACCOUNT

Branch Details Your Details Period 22 Oct 2014 to 21 Dec 2014
ANY BRACH MR T TESTER Previous Balance £1803.90
ANY STREET 1 TEST STREET
ANY TOWN TEST TOWN Paid Out £2,684.10
AN1 TWN TE5 7ER Paid In £2,180.40

New Balance £300.20

Date Type Description Paid In Paid Out Balance
BRIGHT FORWARD 1803.90
22 Oct 2014 AUTOMATED PAY IN 650274051211-CHB 190.40 1803.9
CALL REF. NO. 3442, FROM
22 Oct 2014 DIGITAL BANKING 140.00 1613.5
A/C 22222222
24 Oct 2014 Faster Payment Amazon 132.30 1473.5

24 Oct 2014 BACS Tebay Trading Co. 515.22 1341.2

25 Oct 2014 Faster Payment Morrisons Petrol 80.00 825.98

25 Oct 2014 BACS Business Loan 20,000.00 745.98

26 Oct 2014 BACS James White Media 2,461.55 20745.98

27 Oct 2014 Faster Payment ATM High Street 100.00 18284.43

01 Nov 2014 BACS Acorn Advertising Studies 150.00 18184.43

01 Nov 2014 BACS Marriott Hotel 177.00 18034.43

01 Nov 2014 Faster Payment Abellio Scotrail Ltd 122.22 17857.43

01 Nov 2014 CHQ Cheque 0000234 1,200.00 17735.21

01 Dec 2014 Int. Bank Interest Paid 9.33 16535.21

01 Dec 2014 DD OVO Energy 2470.00 16544.54

21 Dec 2014 BACS Various Payment 10,526.40 14074.54

21 Dec 2014 BACS HMRC 1,000.00 3548.14

21 Dec 2014 DD DVLA 280.00 2548.14

Balance Received Forward


Royal Bank of Scotland Plc. Registered Office, The Mound, Edinburgh EH1 1YZ. Registered in Scotland number SC327000
Authorized by the Prudential Regulation Authority and regulated by the Financial Conduct and the Prudential Regulation authority.`;

export const EXAMPLE_RULE_DATA = {
  ruleName: 'Bank Statement',
  ruleId: 'bank_statement',
  ruleIdManuallyEdited: false,
  description: 'Classifies bank statements from Royal Bank of Scotland. Extracts account details and statement period.',
  threshold: 80,
  ocrThreshold: 75,
  ocrIdentifiers: [
    {
      type: 'match',
      mandatory: false,
      conditions: [{ pattern: 'Royal Bank of Scotland', range: 'last-10' }]
    },
    {
      type: 'match',
      mandatory: true,
      conditions: [{ pattern: 'GB11RBOS 1610 0011 1111 11', range: 'first-10' }]
    },
    {
      type: 'match',
      mandatory: true,
      conditions: [{ pattern: 'Account Number', range: 'first-10' }]
    },
    {
      type: 'match',
      mandatory: false,
      conditions: [{ pattern: 'Statement', range: 'first-10' }]
    },
    {
      type: 'match',
      mandatory: false,
      conditions: [{ pattern: 'Balance', range: '0-1628' }]
    }
  ],
  ocrMultiplier: 3,
  filenameMultiplier: 1,
  verificationMultiplier: 0.5,
  predefinedData: {
    title: '',
    archiveSerialNumber: '',
    dateCreated: '',
    correspondent: 'Royal Bank of Scotland',
    documentType: 'Bank Statement',
    storagePath: '',
    tags: ['Financial', 'Bank'],
    customFields: {}
  },
  dynamicData: {
    extractionRules: [
      {
        fieldName: 'statement_date',
        beforeAnchor: { pattern: '\\d{1,2} \\w{3} \\d{4} to' },
        afterAnchor: { pattern: '' },
        extractionType: 'dateFormat',
        dateFormat: 'DD MMM YYYY',
        regexPattern: '',
        targetField: 'dateCreated'
      }
    ]
  },
  filenamePatterns: {
    patterns: ['RBS.*statement', '\\d{4}-\\d{2}-\\d{2}'],
    dateFormats: ['yyyy-MM-dd']
  },
  verification: {
    requiredFields: [],
    validationRules: [],
    enabledFields: {
      correspondent: true,
      documentType: true
    }
  },
  status: 'active'
};

export const TUTORIAL_STEPS = [
  {
    step: 0, sub: 1, id: '0.1',
    title: 'Welcome to the Rule Builder Tutorial!',
    text: 'This is where you create classification rules. Each rule teaches PocoClass how to recognize a specific type of document. Let\'s walk through building a rule for bank statements.',
    previewTab: 'pdf',
    spotlightTarget: null,
    tooltipPosition: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    tooltipBodyMinHeight: '140px',
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 0, sub: 2, id: '0.2',
    title: '6 Steps to Build a Rule',
    text: 'Every classification rule is built in 6 steps, shown in this progress bar. Each step focuses on a different aspect — from naming your rule, to defining patterns, to assigning metadata. You\'ll complete them left to right.',
    previewTab: 'pdf',
    spotlightTarget: '[data-tutorial-area="step-progress"]',
    tooltipPosition: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    tooltipBodyMinHeight: '140px',
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 0, sub: 3, id: '0.3',
    title: 'The Input Area',
    text: 'This is where you\'ll fill in your rule data. Each step shows different input fields on this side. The fields change as you move through the 6 steps.',
    previewTab: 'pdf',
    spotlightTarget: '[data-tutorial-area="input-area"]',
    tooltipPosition: { top: '50%', left: '75%', transform: 'translate(-50%, -50%)' },
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 0, sub: 4, id: '0.4',
    title: 'Configuration Summary',
    text: 'At the bottom of each step, you\'ll find a configuration summary. This shows an overview of your current settings and highlights anything that might need attention with warnings.',
    previewTab: 'pdf',
    spotlightTarget: '[data-tutorial-area="input-area"]',
    tooltipPosition: { top: '50%', left: '75%', transform: 'translate(-50%, -50%)' },
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 0, sub: 5, id: '0.5',
    title: 'PDF Preview',
    text: 'This panel shows a preview of the document you\'re building a rule for. Use it to identify text patterns and visual elements that are unique to this type of document.',
    previewTab: 'pdf',
    spotlightTarget: '[data-tutorial-area="preview-panel"]',
    tooltipPosition: { top: '50%', left: '35%', transform: 'translate(-50%, -50%)' },
    tooltipBodyMinHeight: '160px',
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 0, sub: 6, id: '0.6',
    title: 'OCR Content',
    textParts: [
      { text: 'This tab shows the raw text that PocoClass extracts from the document using OCR (Optical Character Recognition). This is what PocoClass actually \'reads\' — ' },
      { text: 'notice how the text order may differ from the visual PDF layout.', bold: true },
      { text: ' Your patterns need to match this text, not the PDF layout.' }
    ],
    previewTab: 'ocr',
    spotlightTarget: '[data-tutorial-area="preview-panel"]',
    tooltipPosition: { top: '50%', left: '35%', transform: 'translate(-50%, -50%)' },
    tooltipBodyMinHeight: '160px',
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 0, sub: 7, id: '0.7',
    title: 'YAML Preview',
    text: 'The YAML tab shows your rule as structured data — this is what gets saved. Most users won\'t need to edit YAML directly, but it\'s useful for power users who want to fine-tune or copy rules.',
    previewTab: 'yaml',
    spotlightTarget: '[data-tutorial-area="preview-panel"]',
    tooltipPosition: { top: '50%', left: '35%', transform: 'translate(-50%, -50%)' },
    tooltipBodyMinHeight: '160px',
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 1, sub: 0, id: '1.0',
    title: 'Step 1: Basic Information',
    text: 'Let\'s start with the basics. In this first step, you give your rule a name, an ID, and a description. You also set the POCO Score threshold — the minimum confidence level needed to classify a document.',
    previewTab: 'pdf',
    spotlightTarget: null,
    tooltipPosition: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 1, sub: 1, id: '1.1',
    title: 'Rule Name & ID',
    text: 'Give your rule a clear name — like "Bank Statement". The Rule ID is generated automatically and is used internally. The description helps you remember what this rule does.',
    previewTab: 'pdf',
    spotlightTarget: '[data-tutorial-field="tutorial-field-rulename"]',
    tooltipPosition: { top: '50%', left: '75%', transform: 'translate(-50%, -50%)' },
    tooltipBodyMinHeight: '160px',
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 1, sub: 2, id: '1.2',
    title: 'POCO Score Threshold',
    text: 'The POCO Score threshold decides how confident the system must be before classifying a document. The default is 75% — it means at least 75% of the weighted patterns must match. Too low = false positives, too high = missed documents.',
    previewTab: 'pdf',
    spotlightTarget: '[data-tutorial-field="tutorial-field-threshold"]',
    tooltipPosition: { top: '50%', left: '75%', transform: 'translate(-50%, -50%)' },
    tooltipBodyMinHeight: '160px',
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 2, sub: 0, id: '2.0',
    title: 'Step 2: OCR Identifying Patterns',
    textParts: [
      { text: 'This is the most important step. Here you define text patterns that uniquely identify your document type. A text pattern can be as simple as a word or phrase — like "Royal Bank of Scotland" or "Invoice Number".' },
      { text: '\n\n' },
      { text: 'For more flexibility, you can use regular expressions (regex) — a way to describe text patterns that handles variations like extra spaces or different formatting. The Pattern Helper button makes building regex easy, even without experience. For more details, see ' },
      { text: 'Regex Support in the Guide', action: 'openGuide' },
      { text: '.' }
    ],
    previewTab: 'pdf',
    spotlightTarget: null,
    tooltipPosition: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 2, sub: 1, id: '2.1',
    title: 'PDF vs OCR — What PocoClass Sees',
    textParts: [
      { text: 'Before we define patterns, look at the difference between the PDF (how you see the document) and the OCR text (how PocoClass sees it). ' },
      { text: 'Switch', action: 'togglePreview' },
      { text: ' between the PDF and OCR tabs on the right — notice how the text ordering is different! PocoClass works with the OCR text, not the visual layout.' }
    ],
    previewTab: 'pdf',
    spotlightTarget: '[data-tutorial-area="preview-panel"]',
    scrollBehavior: 'start',
    tooltipPosition: { top: '50%', left: '35%', transform: 'translate(-50%, -50%)' },
    highlightFields: [],
    ocrHighlights: ['Account Number', 'Sort Code', 'Statement'],
    pdfHighlights: []
  },
  {
    step: 2, sub: 2, id: '2.2',
    title: 'Logic Group 1 — Bank Identification',
    textParts: [
      { text: 'Our first pattern looks for ' },
      { text: '"Royal Bank of Scotland"', bold: true },
      { text: ' as plain text — it appears at the bottom of every RBS statement. The search area is set to the last 10 lines, making the match faster and more precise. This group is optional — it boosts confidence but won\'t reject documents if missing.' },
      { text: '\n\n' },
      { text: 'With the help of the regex builder, this same pattern could be written as ' },
      { text: 'Royal\\s*Bank\\s*of\\s*Scotland', bold: true },
      { text: ' — which would also match variations like "RoyalBank of Scotland" or "Royal\u00a0\u00a0\u00a0Bank of Scotland" with unusual spacing. Simple text works for most cases; regex adds flexibility when needed.' }
    ],
    previewTab: 'ocr',
    spotlightTarget: '[data-tutorial-field="tutorial-field-ocrgroup-0"]',
    tooltipPosition: { top: '50%', left: '75%', transform: 'translate(-50%, -50%)' },
    tooltipBodyMinHeight: '190px',
    highlightFields: [],
    ocrHighlights: ['Royal Bank of Scotland'],
    pdfHighlights: []
  },
  {
    step: 2, sub: 3, id: '2.3',
    title: 'Logic Group 2 — Account Identification',
    textParts: [
      { text: 'This pattern searches for your full IBAN ' },
      { text: '"GB11RBOS 1610 0011 1111 11"', bold: true },
      { text: ' in the first 10 lines of the document — where bank statements typically show account details.' },
      { text: '\n\n' },
      { text: 'This group has been made mandatory' , bold: true },
      { text: ', meaning the rule will only pass if this pattern is found. This is important when you have multiple accounts with Royal Bank — it ensures you identify the correct account\'s statement, not just any RBS document.' }
    ],
    previewTab: 'ocr',
    spotlightTarget: '[data-tutorial-field="tutorial-field-ocrgroup-1"]',
    tooltipPosition: { top: '50%', left: '75%', transform: 'translate(-50%, -50%)' },
    tooltipBodyMinHeight: '190px',
    highlightFields: [],
    ocrHighlights: ['GB11RBOS'],
    pdfHighlights: []
  },
  {
    step: 2, sub: 4, id: '2.4',
    title: 'More Logic Groups',
    textParts: [
      { text: 'You can add more logic groups to improve accuracy. Each rule needs a minimum of 3 and can have up to 10 groups. Groups can use AND logic (all conditions must match) or OR logic (any condition can match). In our example, groups 3-5 look for ' },
      { text: '"Account Number"', bold: true },
      { text: ', ' },
      { text: '"Statement"', bold: true },
      { text: ', and ' },
      { text: '"Balance"', bold: true },
      { text: '.' },
      { text: '\n\n' },
      { text: 'The Pattern Helper button (look for the wand icon) helps you build regex patterns without needing to know regex syntax. For more details, see ' },
      { text: 'Regex Support in the Guide', action: 'openGuide' },
      { text: '.' }
    ],
    previewTab: 'ocr',
    spotlightTarget: '[data-tutorial-field="tutorial-field-ocrgroups-remaining"]',
    tooltipPosition: { top: '50%', left: '75%', transform: 'translate(-50%, -50%)' },
    tooltipBodyMinHeight: '190px',
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 2, sub: 5, id: '2.5',
    title: 'OCR Threshold & Weight Multiplier',
    textParts: [
      { text: 'The OCR Threshold (75%) sets the minimum percentage of OCR patterns that must match before the document can be classified. This ensures a base level of text-based confidence.' },
      { text: '\n\n' },
      { text: 'The Weight Multiplier (x3) controls how much OCR patterns count toward the final POCO Score. A rule can use three sources to identify documents: OCR text patterns (the main source), filename patterns, and Paperless-ngx classifications. The multiplier lets you prioritize OCR over the other sources. For more details, see ' },
      { text: 'Scoring System in the Guide', action: 'openGuideScoring' },
      { text: '.' }
    ],
    previewTab: 'ocr',
    spotlightTarget: '[data-tutorial-field="tutorial-field-ocr-settings"]',
    tooltipPosition: { top: '50%', left: '75%', transform: 'translate(-50%, -50%)' },
    tooltipBodyMinHeight: '190px',
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 3, sub: 0, id: '3.0',
    title: 'Step 3: Filename Patterns',
    text: 'Besides OCR text, the filename itself can help identify documents. For example, your bank might provide automated digital statements with consistent filenames like "RBS_Statement_2014-12-21.pdf". Filename patterns let you leverage this.',
    previewTab: 'pdf',
    spotlightTarget: null,
    tooltipPosition: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 3, sub: 1, id: '3.1',
    title: 'Filename Patterns',
    textParts: [
      { text: 'Pattern 1: ' },
      { text: '"RBS.*statement"', bold: true },
      { text: ' matches any filename containing "RBS" followed by any characters and then "statement". The .* means any number of characters can appear between them — matching "RBS_Statement_2014-12-21.pdf" or "RBS-Monthly-Statement.pdf".' },
      { text: '\n\n' },
      { text: 'Pattern 2: ' },
      { text: '"\\d{4}-\\d{2}-\\d{2}"', bold: true },
      { text: ' looks for a full date pattern in the filename — four digits, a dash, two digits, a dash, and two digits. This matches the "2014-12-21" part in "RBS_Statement_2014-12-21.pdf", helping identify documents by their date stamp.' }
    ],
    previewTab: 'pdf',
    spotlightTarget: '[data-tutorial-field="tutorial-field-filename-patterns"]',
    tooltipPosition: { top: '50%', left: '75%', transform: 'translate(-50%, -50%)' },
    tooltipBodyMinHeight: '190px',
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 3, sub: 2, id: '3.2',
    title: 'Filename Weight Multiplier',
    textParts: [
      { text: 'The Filename Weight Multiplier (x1) controls how much filename matches contribute to the final POCO Score — similar to the OCR multiplier you saw earlier. The default of x1 means filename patterns count less than OCR patterns (which use x3).' },
      { text: '\n\n' },
      { text: 'This makes sense because filenames are less reliable than document content — they can be renamed or inconsistent. For more details about how all multipliers work together, see ' },
      { text: 'Scoring System in the Guide', action: 'openGuideScoring' },
      { text: '.' }
    ],
    previewTab: 'pdf',
    spotlightTarget: '[data-tutorial-field="tutorial-field-filename-multiplier"]',
    tooltipPosition: { top: '50%', left: '75%', transform: 'translate(-50%, -50%)' },
    tooltipBodyMinHeight: '190px',
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 4, sub: 0, id: '4.0',
    title: 'Step 4: Data Verification',
    text: 'Data verification adds an extra layer of confidence by cross-referencing extracted data with existing Paperless-ngx metadata. This step is optional and mainly useful for advanced setups where you want to validate document data against known values.',
    previewTab: 'pdf',
    spotlightTarget: null,
    tooltipPosition: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 4, sub: 1, id: '4.1',
    title: 'Verification Placeholders',
    text: 'Here you select which Paperless-ngx fields to use for verification. When enabled, PocoClass checks if the value assigned in Step 5 matches what\'s already in Paperless-ngx — adding a trust multiplier to the final score. In our example, Correspondent and Document Type are enabled for verification.',
    previewTab: 'pdf',
    spotlightTarget: '[data-tutorial-field="tutorial-field-verification-placeholders"]',
    tooltipPosition: { top: '50%', left: '75%', transform: 'translate(-50%, -50%)' },
    tooltipBodyMinHeight: '160px',
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 4, sub: 2, id: '4.2',
    title: 'Verification Multiplier',
    textParts: [
      { text: 'The verification multiplier controls how much weight Paperless-ngx field matches add to the final POCO Score. By default, the mode is set to "Auto" which neutralises the weight of this source — keeping verification as a gentle confidence boost rather than a dominant factor.' },
      { text: '\n\n' },
      { text: 'Without Auto mode, the scoring calculation could give Paperless classifications a very high weight (up to x5), potentially overshadowing your OCR patterns. Auto mode prevents this by dynamically adjusting the multiplier. For more details, see ' },
      { text: 'Scoring System in the Guide', action: 'openGuideScoring' },
      { text: '.' }
    ],
    previewTab: 'pdf',
    spotlightTarget: '[data-tutorial-field="tutorial-field-verification-multiplier"]',
    tooltipPosition: { top: '50%', left: '75%', transform: 'translate(-50%, -50%)' },
    tooltipBodyMinHeight: '190px',
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 5, sub: 0, id: '5.0',
    title: 'Step 5: Document Classifications',
    text: 'Now that PocoClass knows how to identify your documents, it\'s time to tell it what to do when a match is found. In this step, you define which classification data to assign — the correspondent, document type, and tags for organization. You can also configure dynamic data extraction, which pulls specific values directly from the document text — like account numbers, invoice totals, or dates — and stores them in Paperless-ngx fields automatically.',
    previewTab: 'pdf',
    spotlightTarget: null,
    tooltipPosition: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 5, sub: 1, id: '5.1',
    title: 'Predefined Paperless Fields',
    textParts: [
      { text: 'These fields come directly from your Paperless-ngx instance — Correspondent, Document Type, and Tags are dropdown selections from values that already exist in Paperless-ngx. Date Created is different — it\'s a free date input that lets you set a specific date. In our example, we assign ' },
      { text: '"Royal Bank of Scotland"', bold: true },
      { text: ' as correspondent, ' },
      { text: '"Bank Statement"', bold: true },
      { text: ' as document type, and add the tags ' },
      { text: '"Financial"', bold: true },
      { text: ' and ' },
      { text: '"Bank"', bold: true },
      { text: '.' },
      { text: '\n\n' },
      { text: 'Notice that Date Created has been left empty here on purpose. Setting a fixed date here would apply the same date to every document this rule matches — which rarely makes sense. This is where dynamic extraction really shines. Paperless-ngx has its own built-in date detection, but you have no control over which date it picks. In our bank statement, Paperless might choose 22 October 2014 instead of the correct statement end date of 21 December 2014. With dynamic extraction, you tell PocoClass exactly where to find the right date.' }
    ],
    previewTab: 'pdf',
    spotlightTarget: '[data-tutorial-field="tutorial-field-predefined-paperless"]',
    tooltipPosition: { top: '50%', left: '75%', transform: 'translate(-50%, -50%)' },
    tooltipBodyMinHeight: '190px',
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 5, sub: 2, id: '5.2',
    title: 'Custom Fields',
    textParts: [
      { text: 'Custom fields let you store additional data specific to your workflow. The fields shown here depend on your Field Visibility Settings — you may see more or fewer fields depending on your configuration.' },
      { text: '\n\n' },
      { text: 'Each custom field can be set to a fixed value here in the predefined section, or extracted dynamically from the document text (configured in the next section). For more details about field configuration, see ' },
      { text: 'Metadata in the Guide', action: 'openGuideMetadata' },
      { text: '.' }
    ],
    previewTab: 'pdf',
    spotlightTarget: '[data-tutorial-field="tutorial-field-predefined-custom"]',
    tooltipPosition: { top: '50%', left: '75%', transform: 'translate(-50%, -50%)' },
    tooltipBodyMinHeight: '190px',
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 5, sub: 3, id: '5.3',
    title: 'Dynamic Data Extraction',
    textParts: [
      { text: 'Dynamic extraction uses anchor patterns to locate and pull specific values from the document text. Each extraction rule defines a "before anchor" (text that appears just before the value you want) and optionally an "after anchor" (text that appears just after it). The extracted text between these anchors is then stored in a Paperless-ngx field.' },
      { text: '\n\n' },
      { text: 'This is one of PocoClass\'s most powerful features. Combined with custom fields, you can extract virtually any information from your documents — an account number from a bank statement, the total amount from an invoice, consumed kWh from an electricity bill, or a policy number from an insurance document. Each target field can only be used once — either as a predefined value or as a dynamic extraction, never both.' }
    ],
    previewTab: 'pdf',
    spotlightTarget: '[data-tutorial-field="tutorial-field-dynamic-extraction"]',
    tooltipPosition: { top: '50%', left: '75%', transform: 'translate(-50%, -50%)' },
    tooltipBodyMinHeight: '190px',
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 5, sub: 4, id: '5.4',
    title: 'Finding the Date in the OCR Text',
    textParts: [
      { text: 'Let\'s see how dynamic extraction solves the date problem from Step 5.1. Look at the OCR text — find the highlighted line ' },
      { text: '"Period 22 Oct 2014 to 21 Dec 2014"', bold: true },
      { text: '. We want to extract the end date ' },
      { text: '"21 Dec 2014"', bold: true },
      { text: ' — the actual statement date.' },
      { text: '\n\n' },
      { text: 'To build the before anchor, start with the human-readable text you can see: ' },
      { text: '"22 Oct 2014 to"', bold: true },
      { text: '. This translates into the regex pattern ' },
      { text: '"\\d{1,2} \\w{3} \\d{4} to"', bold: true },
      { text: ' — which matches any date followed by "to". The Regex Helper (wand icon) is really useful here to build these patterns step by step without needing to know regex syntax.' }
    ],
    previewTab: 'ocr',
    spotlightTarget: '[data-tutorial-area="preview-panel"]',
    scrollBehavior: 'start',
    tooltipPosition: { top: '50%', left: '25%', transform: 'translate(-50%, -50%)' },
    tooltipBodyMinHeight: '190px',
    highlightFields: [],
    ocrHighlights: ['22 Oct 2014 to 21 Dec 2014'],
    pdfHighlights: []
  },
  {
    step: 5, sub: 5, id: '5.5',
    title: 'Configuring the Extraction Rule',
    textParts: [
      { text: 'From the previous step, we identified the before anchor ' },
      { text: '"\\d{1,2} \\w{3} \\d{4} to"', bold: true },
      { text: ' and the date format ' },
      { text: '"DD MMM YYYY"', bold: true },
      { text: ' to extract the statement end date. You can see these values filled in on the left — the target field is set to ' },
      { text: '"Date Created"', bold: true },
      { text: ', so "21 Dec 2014" will be written directly to the document\'s Date Created field in Paperless-ngx.' },
      { text: '\n\n' },
      { text: 'The after anchor is optional but recommended', bold: true },
      { text: ' — it limits the search area so PocoClass stops looking once it reaches that boundary. This helps prevent false matches when a document contains many similar values, and catches mistakes early. In this example, an after anchor is not strictly needed because the before anchor is precise enough, but for more complex documents it\'s good practice to constrain the search.' }
    ],
    previewTab: 'ocr',
    spotlightTarget: '[data-tutorial-field="tutorial-field-dynamic-extraction"]',
    tooltipPosition: { top: '50%', left: '75%', transform: 'translate(-50%, -50%)' },
    tooltipBodyMinHeight: '190px',
    highlightFields: [],
    ocrHighlights: ['Period 22 Oct 2014 to 21 Dec 2014'],
    pdfHighlights: []
  },
  {
    step: 6, sub: 0, id: '6.0',
    title: 'Step 6: Review & Summary',
    text: 'The final step brings everything together. Here you can review your complete rule configuration, see how the POCO scoring calculation works with your settings, and preview the generated YAML that defines your rule.',
    previewTab: 'yaml',
    spotlightTarget: null,
    scrollBehavior: 'start',
    tooltipPosition: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 6, sub: 1, id: '6.1',
    title: 'Rule Configuration Review',
    text: 'This overview shows all your rule settings at a glance — basic information, OCR patterns and thresholds, filename patterns, verification fields, and document classifications. Use it to double-check everything before saving.',
    previewTab: 'yaml',
    spotlightTarget: '[data-tutorial-field="tutorial-field-summary-review"]',
    tooltipPosition: { top: '50%', left: '75%', transform: 'translate(-50%, -50%)' },
    tooltipBodyMinHeight: '160px',
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 6, sub: 2, id: '6.2',
    title: 'POCO Score Calculation',
    text: 'This section shows exactly how the POCO Score is calculated for your rule. It breaks down the maximum possible weights from each source (OCR, filename, verification), shows an example calculation at 80% match rate, and displays both score thresholds that must be met for classification.',
    previewTab: 'yaml',
    spotlightTarget: '[data-tutorial-field="tutorial-field-summary-score"]',
    tooltipPosition: { top: '50%', left: '75%', transform: 'translate(-50%, -50%)' },
    tooltipBodyMinHeight: '160px',
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 6, sub: 3, id: '6.3',
    title: 'That\'s It!',
    text: 'On the right you can see the generated YAML — the actual rule file that PocoClass uses. You\'ve just seen how a rule is built from start to finish. The key idea: find patterns that uniquely identify your document type, set sensible thresholds, and let PocoClass do the rest. Start simple with a few mandatory OCR patterns — you can always refine later.',
    previewTab: 'yaml',
    spotlightTarget: '[data-tutorial-area="preview-panel"]',
    scrollBehavior: 'start',
    tooltipPosition: { top: '50%', left: '25%', transform: 'translate(-50%, -50%)' },
    tooltipBodyMinHeight: '160px',
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  }
];
