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
      mandatory: true,
      conditions: [{ pattern: 'Account\\s*Number', range: '0-500' }]
    },
    {
      type: 'match',
      mandatory: true,
      conditions: [{ pattern: 'Sort\\s*Code', range: '0-500' }]
    },
    {
      type: 'match',
      mandatory: false,
      conditions: [{ pattern: 'Statement', range: '0-200' }]
    },
    {
      type: 'match',
      mandatory: false,
      conditions: [{ pattern: 'Balance', range: '0-1600' }]
    },
    {
      type: 'match',
      mandatory: false,
      conditions: [{ pattern: 'Paid\\s*(In|Out)', range: '0-1600' }]
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
    step: 1, sub: 1, id: '1.1',
    title: 'Welcome to the Rule Builder',
    text: 'This is where you create classification rules. Each rule teaches PocoClass how to recognize a specific type of document. Let\'s walk through building a rule for bank statements.',
    previewTab: 'pdf',
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 1, sub: 2, id: '1.2',
    title: 'Rule Name & ID',
    text: 'Give your rule a clear name — like "Bank Statement". The Rule ID is generated automatically and is used internally. The description helps you remember what this rule does.',
    previewTab: 'pdf',
    highlightFields: ['tutorial-field-rulename', 'tutorial-field-ruleid', 'tutorial-field-description'],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 1, sub: 3, id: '1.3',
    title: 'POCO Score Threshold',
    text: 'The POCO Score threshold decides how confident the system must be before classifying a document. 80% is a good starting point — it means at least 80% of the patterns must match. Too low = false positives, too high = missed documents.',
    previewTab: 'pdf',
    highlightFields: ['tutorial-field-threshold'],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 2, sub: 1, id: '2.1',
    title: 'What PocoClass "Sees"',
    text: 'Before we define patterns, look at the difference between the PDF (how you see the document) and the OCR text (how PocoClass sees it). Switch between the PDF and OCR tabs on the right — notice how the text ordering is different! PocoClass works with the OCR text, not the visual layout.',
    previewTab: 'ocr',
    highlightFields: [],
    ocrHighlights: ['Account Number', 'Sort Code', 'Statement'],
    pdfHighlights: []
  },
  {
    step: 2, sub: 2, id: '2.2',
    title: 'OCR Patterns — Finding Text',
    text: 'OCR patterns tell PocoClass what text to look for in the document. Here we\'re searching for "Account Number" and "Sort Code" — text that appears on every bank statement. These are marked as mandatory because a bank statement always has them.',
    previewTab: 'ocr',
    highlightFields: ['tutorial-field-ocrgroup-0', 'tutorial-field-ocrgroup-1'],
    ocrHighlights: ['Account Number', 'Sort Code'],
    pdfHighlights: []
  },
  {
    step: 2, sub: 3, id: '2.3',
    title: 'Optional Patterns & Ranges',
    text: 'Not every pattern needs to be mandatory. "Statement", "Balance", and "Paid In/Out" are optional supporting evidence — they boost the score but won\'t reject the document if missing. The range (e.g., 0-500) limits where in the OCR text to search, making matching faster and more precise.',
    previewTab: 'ocr',
    highlightFields: ['tutorial-field-ocrgroup-2', 'tutorial-field-ocrgroup-3', 'tutorial-field-ocrgroup-4'],
    ocrHighlights: ['Statement', 'Balance', 'Paid In', 'Paid Out'],
    pdfHighlights: []
  },
  {
    step: 2, sub: 4, id: '2.4',
    title: 'OCR Threshold & Multiplier',
    text: 'The OCR Threshold (75%) is the minimum OCR confidence needed. The multiplier (×3) means OCR matches are worth 3× more than other sources in the final score — because OCR text content is usually the strongest signal.',
    previewTab: 'ocr',
    highlightFields: ['tutorial-field-ocrthreshold', 'tutorial-field-ocrmultiplier'],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 3, sub: 1, id: '3.1',
    title: 'Filename Patterns',
    text: 'Sometimes the filename itself is a clue. "bank.?statement" matches filenames like "bank_statement.pdf" or "bankstatement.pdf". This is optional but adds extra confidence when the filename is meaningful.',
    previewTab: 'pdf',
    highlightFields: ['tutorial-field-filename-0', 'tutorial-field-filename-1'],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 4, sub: 1, id: '4.1',
    title: 'Data Verification',
    text: 'This step lets you verify extracted data against existing Paperless-ngx metadata. For example, you could check if the extracted account number matches a stored value. This is an advanced feature — you can skip it when starting out.',
    previewTab: 'yaml',
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 5, sub: 1, id: '5.1',
    title: 'Assigning Metadata',
    text: 'When a document matches this rule, PocoClass can automatically assign metadata in Paperless-ngx. Here we set the document type to "Bank Statement" and the correspondent to "Royal Bank of Scotland".',
    previewTab: 'yaml',
    highlightFields: ['tutorial-field-doctype', 'tutorial-field-correspondent'],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 5, sub: 2, id: '5.2',
    title: 'Tags & Dynamic Data',
    text: 'Tags like "Financial" and "Bank" help organize documents. Dynamic extraction can pull specific values from the document — like the account number — and store them in Paperless-ngx fields.',
    previewTab: 'yaml',
    highlightFields: ['tutorial-field-tags', 'tutorial-field-dynamic'],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 6, sub: 1, id: '6.1',
    title: 'Review & Save',
    text: 'The final step shows your complete rule as YAML. Review everything — the patterns, thresholds, and metadata assignments. When you\'re happy, save the rule and PocoClass will start using it to classify documents automatically!',
    previewTab: 'yaml',
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 6, sub: 2, id: '6.2',
    title: 'That\'s It!',
    text: 'You\'ve just seen how a rule is built from start to finish. The key idea: find patterns that uniquely identify your document type, set sensible thresholds, and let PocoClass do the rest. Start simple with a few mandatory OCR patterns — you can always refine later.',
    previewTab: 'yaml',
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  }
];
