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
    titleKey: 'tutorial.steps.0_1.title',
    textKey: 'tutorial.steps.0_1.text',
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
    titleKey: 'tutorial.steps.0_2.title',
    textKey: 'tutorial.steps.0_2.text',
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
    titleKey: 'tutorial.steps.0_3.title',
    textKey: 'tutorial.steps.0_3.text',
    previewTab: 'pdf',
    spotlightTarget: '[data-tutorial-area="input-area"]',
    tooltipPosition: { top: '50%', left: '75%', transform: 'translate(-50%, -50%)' },
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 0, sub: 4, id: '0.4',
    titleKey: 'tutorial.steps.0_4.title',
    textKey: 'tutorial.steps.0_4.text',
    previewTab: 'pdf',
    spotlightTarget: '[data-tutorial-area="input-area"]',
    tooltipPosition: { top: '50%', left: '75%', transform: 'translate(-50%, -50%)' },
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 0, sub: 5, id: '0.5',
    titleKey: 'tutorial.steps.0_5.title',
    textKey: 'tutorial.steps.0_5.text',
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
    titleKey: 'tutorial.steps.0_6.title',
    textPartsKey: 'tutorial.steps.0_6.textParts',
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
    titleKey: 'tutorial.steps.0_7.title',
    textKey: 'tutorial.steps.0_7.text',
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
    titleKey: 'tutorial.steps.1_0.title',
    textKey: 'tutorial.steps.1_0.text',
    previewTab: 'pdf',
    spotlightTarget: null,
    tooltipPosition: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 1, sub: 1, id: '1.1',
    titleKey: 'tutorial.steps.1_1.title',
    textKey: 'tutorial.steps.1_1.text',
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
    titleKey: 'tutorial.steps.1_2.title',
    textKey: 'tutorial.steps.1_2.text',
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
    titleKey: 'tutorial.steps.2_0.title',
    textPartsKey: 'tutorial.steps.2_0.textParts',
    previewTab: 'pdf',
    spotlightTarget: null,
    tooltipPosition: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 2, sub: 1, id: '2.1',
    titleKey: 'tutorial.steps.2_1.title',
    textPartsKey: 'tutorial.steps.2_1.textParts',
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
    titleKey: 'tutorial.steps.2_2.title',
    textPartsKey: 'tutorial.steps.2_2.textParts',
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
    titleKey: 'tutorial.steps.2_3.title',
    textPartsKey: 'tutorial.steps.2_3.textParts',
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
    titleKey: 'tutorial.steps.2_4.title',
    textPartsKey: 'tutorial.steps.2_4.textParts',
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
    titleKey: 'tutorial.steps.2_5.title',
    textPartsKey: 'tutorial.steps.2_5.textParts',
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
    titleKey: 'tutorial.steps.3_0.title',
    textKey: 'tutorial.steps.3_0.text',
    previewTab: 'pdf',
    spotlightTarget: null,
    tooltipPosition: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 3, sub: 1, id: '3.1',
    titleKey: 'tutorial.steps.3_1.title',
    textPartsKey: 'tutorial.steps.3_1.textParts',
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
    titleKey: 'tutorial.steps.3_2.title',
    textPartsKey: 'tutorial.steps.3_2.textParts',
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
    titleKey: 'tutorial.steps.4_0.title',
    textKey: 'tutorial.steps.4_0.text',
    previewTab: 'pdf',
    spotlightTarget: null,
    tooltipPosition: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 4, sub: 1, id: '4.1',
    titleKey: 'tutorial.steps.4_1.title',
    textKey: 'tutorial.steps.4_1.text',
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
    titleKey: 'tutorial.steps.4_2.title',
    textPartsKey: 'tutorial.steps.4_2.textParts',
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
    titleKey: 'tutorial.steps.5_0.title',
    textKey: 'tutorial.steps.5_0.text',
    previewTab: 'pdf',
    spotlightTarget: null,
    tooltipPosition: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    highlightFields: [],
    ocrHighlights: [],
    pdfHighlights: []
  },
  {
    step: 5, sub: 1, id: '5.1',
    titleKey: 'tutorial.steps.5_1.title',
    textPartsKey: 'tutorial.steps.5_1.textParts',
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
    titleKey: 'tutorial.steps.5_2.title',
    textPartsKey: 'tutorial.steps.5_2.textParts',
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
    titleKey: 'tutorial.steps.5_3.title',
    textPartsKey: 'tutorial.steps.5_3.textParts',
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
    titleKey: 'tutorial.steps.5_4.title',
    textPartsKey: 'tutorial.steps.5_4.textParts',
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
    titleKey: 'tutorial.steps.5_5.title',
    textPartsKey: 'tutorial.steps.5_5.textParts',
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
    titleKey: 'tutorial.steps.6_0.title',
    textKey: 'tutorial.steps.6_0.text',
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
    titleKey: 'tutorial.steps.6_1.title',
    textKey: 'tutorial.steps.6_1.text',
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
    titleKey: 'tutorial.steps.6_2.title',
    textKey: 'tutorial.steps.6_2.text',
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
    titleKey: 'tutorial.steps.6_3.title',
    textKey: 'tutorial.steps.6_3.text',
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
