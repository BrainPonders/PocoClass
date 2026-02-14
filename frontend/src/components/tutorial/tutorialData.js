export const EXAMPLE_OCR_TEXT = `Account Number: 1111111
Statement Sort Code: 16-10-00
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
        fieldName: 'account_number',
        anchor: 'Account Number:',
        extractionPattern: '\\d{7}',
        targetField: 'title'
      }
    ]
  },
  filenamePatterns: {
    patterns: ['bank.?statement', 'RBS.*statement'],
    dateFormats: ['yyyy-MM-dd']
  },
  verification: {
    requiredFields: [],
    validationRules: [],
    enabledFields: {}
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
    spotlightTarget: null,
    tooltipPosition: { top: '50%', left: '75%', transform: 'translate(-50%, -50%)' },
    tooltipBodyMinHeight: '160px',
    highlightFields: ['tutorial-field-rulename'],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 1, sub: 2, id: '1.2',
    title: 'POCO Score Threshold',
    text: 'The POCO Score threshold decides how confident the system must be before classifying a document. 80% is a good starting point — it means at least 80% of the patterns must match. Too low = false positives, too high = missed documents.',
    previewTab: 'pdf',
    spotlightTarget: null,
    tooltipPosition: { top: '50%', left: '75%', transform: 'translate(-50%, -50%)' },
    tooltipBodyMinHeight: '160px',
    highlightFields: ['tutorial-field-threshold'],
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
    tooltipPosition: { top: '50%', left: '35%', transform: 'translate(-50%, -50%)' },
    highlightFields: [],
    ocrHighlights: ['Account Number', 'Sort Code', 'Statement'],
    pdfHighlights: []
  },
  {
    step: 2, sub: 2, id: '2.2',
    title: 'Logic Group 1 — Bank Identification',
    textParts: [
      { text: 'Our first pattern looks for "Royal Bank of Scotland" as plain text — it appears at the bottom of every RBS statement. The search area is set to the last 10 lines, making the match faster and more precise. This group is optional — it boosts confidence but won\'t reject documents if missing.' },
      { text: '\n\n' },
      { text: 'With the help of the regex builder, this same pattern could be written as Royal\\s*Bank\\s*of\\s*Scotland — which would also match variations like "Royal  Bank  of  Scotland" with extra spaces. Simple text works for most cases; regex adds flexibility when needed.' }
    ],
    previewTab: 'ocr',
    spotlightTarget: null,
    tooltipPosition: { top: '50%', left: '75%', transform: 'translate(-50%, -50%)' },
    tooltipBodyMinHeight: '190px',
    highlightFields: ['tutorial-field-ocrgroup-0'],
    ocrHighlights: ['Royal Bank of Scotland'],
    pdfHighlights: []
  },
  {
    step: 2, sub: 3, id: '2.3',
    title: 'Logic Group 2 — Account Identification',
    textParts: [
      { text: 'This pattern searches for your full IBAN "GB11RBOS 1610 0011 1111 11" in the first 10 lines of the document — where bank statements typically show account details.' },
      { text: '\n\n' },
      { text: 'This group has been made mandatory' , bold: true },
      { text: ', meaning the rule will only pass if this pattern is found. This is important when you have multiple accounts with Royal Bank — it ensures you identify the correct account\'s statement, not just any RBS document.' }
    ],
    previewTab: 'ocr',
    spotlightTarget: null,
    tooltipPosition: { top: '50%', left: '75%', transform: 'translate(-50%, -50%)' },
    tooltipBodyMinHeight: '190px',
    highlightFields: ['tutorial-field-ocrgroup-1'],
    ocrHighlights: ['GB11RBOS'],
    pdfHighlights: []
  },
  {
    step: 2, sub: 4, id: '2.4',
    title: 'More Logic Groups',
    textParts: [
      { text: 'You can add more logic groups to improve accuracy. Each rule needs a minimum of 3 and can have up to 10 groups. Groups can use AND logic (all conditions must match) or OR logic (any condition can match).' },
      { text: '\n\n' },
      { text: 'The Pattern Helper button (look for the wand icon) helps you build regex patterns without needing to know regex syntax. For more details, see ' },
      { text: 'Regex Support in the Guide', action: 'openGuide' },
      { text: '.' }
    ],
    previewTab: 'ocr',
    spotlightTarget: null,
    tooltipPosition: { top: '50%', left: '75%', transform: 'translate(-50%, -50%)' },
    tooltipBodyMinHeight: '190px',
    highlightFields: ['tutorial-field-ocrgroup-0', 'tutorial-field-ocrgroup-1', 'tutorial-field-ocrgroup-2', 'tutorial-field-ocrgroup-3', 'tutorial-field-ocrgroup-4'],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 2, sub: 5, id: '2.5',
    title: 'OCR Threshold & Weight Multiplier',
    textParts: [
      { text: 'The OCR Threshold (75%) sets the minimum percentage of OCR patterns that must match before the document can be classified. This ensures a base level of text-based confidence.' },
      { text: '\n\n' },
      { text: 'The Weight Multiplier (x3) controls how much OCR patterns count toward the final POCO Score. A rule can use three sources to identify documents: OCR text patterns (the main source), filename patterns, and Paperless-ngx classifications. The multiplier lets you prioritize OCR over the other sources.' }
    ],
    previewTab: 'ocr',
    spotlightTarget: null,
    tooltipPosition: { top: '50%', left: '75%', transform: 'translate(-50%, -50%)' },
    tooltipBodyMinHeight: '190px',
    highlightFields: ['tutorial-field-ocrthreshold', 'tutorial-field-ocrmultiplier'],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 3, sub: 1, id: '3.1',
    title: 'Filename Patterns',
    text: 'Sometimes the filename itself is a clue. "bank.?statement" matches filenames like "bank_statement.pdf" or "bankstatement.pdf". This is optional but adds extra confidence when the filename is meaningful.',
    previewTab: 'pdf',
    spotlightTarget: null,
    highlightFields: ['tutorial-field-filename-0', 'tutorial-field-filename-1'],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 4, sub: 1, id: '4.1',
    title: 'Data Verification',
    text: 'This step lets you verify extracted data against existing Paperless-ngx metadata. For example, you could check if the extracted account number matches a stored value. This is an advanced feature — you can skip it when starting out.',
    previewTab: 'yaml',
    spotlightTarget: null,
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 5, sub: 1, id: '5.1',
    title: 'Assigning Metadata',
    text: 'When a document matches this rule, PocoClass can automatically assign metadata in Paperless-ngx. Here we set the document type to "Bank Statement" and the correspondent to "Royal Bank of Scotland".',
    previewTab: 'yaml',
    spotlightTarget: null,
    highlightFields: ['tutorial-field-doctype', 'tutorial-field-correspondent'],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 5, sub: 2, id: '5.2',
    title: 'Tags & Dynamic Data',
    text: 'Tags like "Financial" and "Bank" help organize documents. Dynamic extraction can pull specific values from the document — like the account number — and store them in Paperless-ngx fields.',
    previewTab: 'yaml',
    spotlightTarget: null,
    highlightFields: ['tutorial-field-tags', 'tutorial-field-dynamic'],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 6, sub: 1, id: '6.1',
    title: 'Review & Save',
    text: 'The final step shows your complete rule as YAML. Review everything — the patterns, thresholds, and metadata assignments. When you\'re happy, save the rule and PocoClass will start using it to classify documents automatically!',
    previewTab: 'yaml',
    spotlightTarget: null,
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 6, sub: 2, id: '6.2',
    title: 'That\'s It!',
    text: 'You\'ve just seen how a rule is built from start to finish. The key idea: find patterns that uniquely identify your document type, set sensible thresholds, and let PocoClass do the rest. Start simple with a few mandatory OCR patterns — you can always refine later.',
    previewTab: 'yaml',
    spotlightTarget: null,
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  }
];
