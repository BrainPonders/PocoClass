
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import API_BASE_URL from '@/config/api';

export default function PatternHelperModal({ isOpen, onClose, onUsePattern, initialValue = '', restrictToDateOnly = false }) {
  const [patternType, setPatternType] = useState('string');
  const [stringPattern, setStringPattern] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [spaceFlexibility, setSpaceFlexibility] = useState('exact');
  const [datePattern, setDatePattern] = useState('DD-MM-YYYY');
  const [complexElements, setComplexElements] = useState([
    { type: 'string', value: '', caseSensitive: false, spaceFlexibility: 'exact' }
  ]);
  const [testString, setTestString] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [dateFormatExamples, setDateFormatExamples] = useState([
    { format: 'DD-MM-YYYY', example: '15-04-2024' },
    { format: 'DD/MM/YYYY', example: '15/04/2024' },
    { format: 'MM/DD/YYYY', example: '04/15/2024' },
    { format: 'YYYY-MM-DD', example: '2024-04-15' },
    { format: 'DD MMMM YYYY', example: '15 April 2024' },
    { format: 'MMMM DD, YYYY', example: 'April 15, 2024' }
  ]);

  useEffect(() => {
    if (isOpen) {
      loadDateFormats();
      if (initialValue) {
        setStringPattern(initialValue);
        if (restrictToDateOnly) {
          setPatternType('date');
          setDatePattern(initialValue);
        }
      }
    }
  }, [isOpen, initialValue, restrictToDateOnly]);

  const loadDateFormats = async () => {
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/settings/date-formats/selected`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const formats = Array.isArray(data) ? data : (data.formats || []);
        
        if (Array.isArray(formats) && formats.length > 0) {
          const formattedOptions = formats.map(fmt => ({
            format: fmt.format_pattern,
            example: fmt.example
          }));
          setDateFormatExamples(formattedOptions);
        }
      }
    } catch (e) {
      console.error('Error loading date formats from API:', e);
    }
  };

  const generateRegexPattern = () => {
    if (patternType === 'string') {
      let pattern = stringPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      if (spaceFlexibility === 'flexible') {
        // Make existing spaces optional (zero or more)
        pattern = pattern.replace(/ /g, '\\s*');
      } else if (spaceFlexibility === 'very-flexible') {
        // Allow spaces anywhere between any characters by removing spaces then re-adding flexible space regex
        pattern = pattern.replace(/ /g, '').split('').join('\\s*');
      }
      
      return pattern;
    } else if (patternType === 'date') {
      return convertDateFormatToRegex(datePattern);
    } else if (patternType === 'complex') {
      const parts = complexElements.map(el => {
        if (el.type === 'string') {
          let pattern = el.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          
          if (el.spaceFlexibility === 'flexible') {
            pattern = pattern.replace(/ /g, '\\s*');
          } else if (el.spaceFlexibility === 'very-flexible') {
            pattern = pattern.replace(/ /g, '').split('').join('\\s*');
          }
          
          return pattern;
        } else if (el.type === 'date') {
          return convertDateFormatToRegex(el.value);
        } else if (el.type === 'wildcard') {
          return el.value === 'any' ? '.*?' : '.+?'; // Made wildcards non-greedy by default
        }
        return el.value;
      });
      return parts.join('');
    }
    return '';
  };

  const getRegexFlags = () => {
    if (patternType === 'string') {
      return caseSensitive ? '' : 'i';
    } else if (patternType === 'complex') {
      const hasInsensitive = complexElements.some(el => el.type === 'string' && !el.caseSensitive);
      return hasInsensitive ? 'i' : '';
    }
    return '';
  };

  const convertDateFormatToRegex = (format) => {
    const mapping = {
      'DDDD': '(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)',
      'DDD': '(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)',
      'MMMM': '(?:January|February|March|April|May|June|July|August|September|October|November|December)',
      'MMM': '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)',
      'YYYY': '\\d{4}',
      'YY': '\\d{2}',
      'DD': '\\d{2}',
      'MM': '\\d{2}',
      'D': '\\d{1,2}',
      'M': '\\d{1,2}'
    };

    let regex = format;
    
    // Sort by length (longest first) to prevent partial replacements (e.g., YYYY before YY)
    Object.keys(mapping).sort((a, b) => b.length - a.length).forEach(key => {
      // Use split().join() for literal string replacement, which is safer than regex.replace for complex mappings
      regex = regex.split(key).join(mapping[key]);
    });

    // Escape any remaining special regex characters that weren't part of the date format tokens.
    // Ensure we don't double-escape already escaped characters (like \d)
    // Only escape /, -, comma, and space if they are literal characters in the format string.
    regex = regex.replace(/([/\-,\s])/g, '\\$1');

    return regex;
  };

  const generateDynamicExamples = () => {
    if (!stringPattern) return []; // Return empty array if no pattern

    const examples = [];
    const pattern = stringPattern;

    // Case sensitivity examples
    if (!caseSensitive) {
      // Filter out duplicates if original pattern is already one of these
      const variations = [
        pattern.toUpperCase(),
        pattern.toLowerCase(),
        pattern.charAt(0).toUpperCase() + pattern.slice(1).toLowerCase()
      ].filter(s => s !== pattern);

      if (variations.length > 0) {
        examples.push({
          label: 'Case variations',
          matches: [pattern, ...variations]
        });
      }
    } else {
      examples.push({
        label: 'Exact case only',
        matches: [pattern],
        nonMatches: [pattern.toUpperCase(), pattern.toLowerCase()].filter(s => s.toLowerCase() !== pattern.toLowerCase() || s !== pattern)
      });
    }

    // Space flexibility examples
    if (pattern.includes(' ')) {
      if (spaceFlexibility === 'exact') {
        examples.push({
          label: 'Space matching (exact)',
          matches: [pattern],
          nonMatches: [pattern.replace(/ /g, '  '), pattern.replace(/ /g, '')]
        });
      } else if (spaceFlexibility === 'flexible') {
        examples.push({
          label: 'Space matching (flexible)',
          matches: [
            pattern,
            pattern.replace(/ /g, ''), // remove spaces
            pattern.replace(/ /g, '  ') // multiple spaces
          ]
        });
      } else if (spaceFlexibility === 'very-flexible') {
        const noSpaces = pattern.replace(/ /g, '');
        examples.push({
          label: 'Space matching (very flexible)',
          matches: [
            pattern, // Original
            noSpaces, // No spaces
            noSpaces.split('').join(' '), // single spaces between chars
            pattern.split('').join('   ') // multiple spaces between chars
          ]
        });
      }
    } else if (spaceFlexibility === 'very-flexible' && pattern.length > 1) {
       // If no spaces in input, but very-flexible is chosen, show what it would allow
        const spaced = pattern.split('').join(' ');
        const multiSpaced = pattern.split('').join('   ');
        examples.push({
            label: 'Space matching (very flexible)',
            matches: [pattern, spaced, multiSpaced]
        });
    }


    // Context examples
    examples.push({
      label: 'In context',
      matches: [
        `Document contains: ${pattern}`,
        `${pattern} at the start`,
        `At the end: ${pattern}`
      ]
    });

    return examples;
  };

  const addComplexElement = () => {
    setComplexElements([...complexElements, { type: 'string', value: '', caseSensitive: false, spaceFlexibility: 'exact' }]);
  };

  const updateComplexElement = (index, field, value) => {
    const newElements = [...complexElements];
    newElements[index] = { ...newElements[index], [field]: value };
    setComplexElements(newElements);
  };

  const removeComplexElement = (index) => {
    if (complexElements.length > 1) {
      setComplexElements(complexElements.filter((_, i) => i !== index));
    }
  };

  const testPattern = () => {
    try {
      const pattern = generateRegexPattern();
      const flags = getRegexFlags();
      const regex = new RegExp(pattern, flags);
      const matches = regex.test(testString);
      const matchResult = testString.match(regex);
      
      setTestResult({
        success: matches,
        matched: matchResult ? matchResult[0] : null,
        pattern: pattern,
        flags: flags // Store flags in test result
      });
    } catch (error) {
      setTestResult({
        success: false,
        error: error.message
      });
    }
  };

  const handleUsePattern = () => {
    const pattern = generateRegexPattern();
    const flags = getRegexFlags(); // Get flags to pass them along or format the final regex with them
    // Depending on how onUsePattern is used, you might want to pass the flags separately
    // or include them in the regex string like /pattern/flags
    onUsePattern(`/${pattern}/${flags}`);
  };

  if (!isOpen) return null;

  const currentRegex = generateRegexPattern();
  const regexFlags = getRegexFlags();
  const dynamicExamples = patternType === 'string' ? generateDynamicExamples() : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <style>{`
        .regex-builder-modal {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .regex-content-card {
          background: white;
          border-radius: 12px;
        }
        .regex-tab-button {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 2px solid transparent;
          transition: all 0.2s;
        }
        .regex-tab-button:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        .regex-tab-button.active {
          background: white;
          color: #764ba2;
          border-color: white;
        }
        .regex-display {
          background: #f3e8ff;
          border: 2px solid #a855f7;
          color: #7c3aed;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          padding: 12px;
          border-radius: 8px;
          word-break: break-all;
          font-size: 14px;
        }
        .match-example {
          background: #dcfce7;
          border: 1px solid #86efac;
          color: #166534;
          padding: 4px 8px;
          border-radius: 4px;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 13px;
        }
        .non-match-example {
          background: #fee2e2;
          border: 1px solid #fca5a5;
          color: #991b1b;
          padding: 4px 8px;
          border-radius: 4px;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 13px;
          text-decoration: line-through;
        }
      `}</style>
      
      <div 
        className="modal-content max-w-4xl max-h-[90vh] overflow-y-auto regex-builder-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-white/20">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold text-white">Regex Builder</h2>
              <p className="text-purple-100 mt-1">Build powerful patterns to match and extract text from documents</p>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Pattern Type Selection */}
          {!restrictToDateOnly && (
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setPatternType('string')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  patternType === 'string'
                    ? 'bg-white text-purple-700'
                    : 'bg-purple-700 bg-opacity-50 text-white hover:bg-opacity-70'
                }`}
              >
                String Pattern
              </button>
              <button
                onClick={() => setPatternType('date')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  patternType === 'date'
                    ? 'bg-white text-purple-700'
                    : 'bg-purple-700 bg-opacity-50 text-white hover:bg-opacity-70'
                }`}
              >
                Date Pattern
              </button>
              <button
                onClick={() => setPatternType('complex')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  patternType === 'complex'
                    ? 'bg-white text-purple-700'
                    : 'bg-purple-700 bg-opacity-50 text-white hover:bg-opacity-70'
                }`}
              >
                Complex Pattern
              </button>
            </div>
          )}

          {/* String Pattern */}
          {patternType === 'string' && (
            <div className="regex-content-card p-6 space-y-6">
              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label">String Pattern</label>
                  <input
                    type="text"
                    value={stringPattern}
                    onChange={(e) => setStringPattern(e.target.value)}
                    placeholder="Enter text to match (e.g., 'Invoice', 'Bank Statement', 'INV-2024-001')"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Case Sensitivity</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="caseSensitive"
                        checked={!caseSensitive}
                        onChange={() => setCaseSensitive(false)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Case Insensitive (matches "Invoice", "INVOICE", "invoice")</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="caseSensitive"
                        checked={caseSensitive}
                        onChange={() => setCaseSensitive(true)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Case Sensitive (only matches exact case)</span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Space Matching</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="spaceFlexibility"
                        value="exact"
                        checked={spaceFlexibility === 'exact'}
                        onChange={(e) => setSpaceFlexibility(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Exact Spaces ("Bank Statement" matches only single spaces)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="spaceFlexibility"
                        value="flexible"
                        checked={spaceFlexibility === 'flexible'}
                        onChange={(e) => setSpaceFlexibility(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Flexible Spaces ("BankStatement", "Bank Statement" or "Bank  Statement")</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="spaceFlexibility"
                        value="very-flexible"
                        checked={spaceFlexibility === 'very-flexible'}
                        onChange={(e) => setSpaceFlexibility(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Very Flexible (e.g., "BankStatement" or "B a n k S t a t e m e n t")</span>
                    </label>
                  </div>
                </div>

                {dynamicExamples && stringPattern && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h4 className="font-semibold text-sm text-purple-900 mb-3">Examples based on your pattern "{stringPattern}":</h4>
                    <div className="space-y-3">
                      {dynamicExamples.map((example, idx) => (
                        <div key={idx}>
                          <div className="font-semibold text-xs text-purple-700 mb-1">{example.label}:</div>
                          <div className="flex flex-wrap gap-2">
                            {example.matches?.map((match, mIdx) => (
                              <span key={`match-${mIdx}`} className="match-example">
                                ✓ {match}
                              </span>
                            ))}
                            {example.nonMatches?.map((nonMatch, nmIdx) => (
                              <span key={`non-match-${nmIdx}`} className="non-match-example">
                                ✗ {nonMatch}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Date Pattern */}
          {patternType === 'date' && (
            <div className="regex-content-card p-6 space-y-6">
              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label">Date Format</label>
                  <input
                    type="text"
                    value={datePattern}
                    onChange={(e) => setDatePattern(e.target.value)}
                    placeholder="e.g., DD-MM-YYYY"
                    className="form-input"
                  />
                </div>

                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="font-semibold text-sm text-purple-900 mb-3">Common Date Formats:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {dateFormatExamples.map((ex, idx) => (
                      <button
                        key={idx}
                        onClick={() => setDatePattern(ex.format)}
                        className="text-left px-3 py-2 bg-purple-100 hover:bg-purple-200 rounded transition-colors"
                      >
                        <div className="font-semibold font-mono text-purple-900 text-sm">{ex.format}</div>
                        <div className="text-purple-700 text-xs">Example: {ex.example}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Complex Pattern */}
          {patternType === 'complex' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4">
                <h3 className="font-semibold text-purple-900 mb-4">Build Complex Pattern</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Combine multiple elements to create sophisticated patterns
                </p>

                {complexElements.map((element, index) => (
                  <div key={index} className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Element {index + 1}</h4>
                      {complexElements.length > 1 && (
                        <button
                          onClick={() => removeComplexElement(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Element Type
                        </label>
                        <select
                          value={element.type}
                          onChange={(e) => updateComplexElement(index, 'type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="string">String</option>
                          <option value="date">Date</option>
                          <option value="wildcard">Wildcard</option>
                        </select>
                      </div>

                      {element.type === 'string' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              String Value
                            </label>
                            <input
                              type="text"
                              value={element.value}
                              onChange={(e) => updateComplexElement(index, 'value', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              placeholder="Enter string..."
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Case Sensitivity
                            </label>
                            <div className="space-y-2">
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  checked={!element.caseSensitive}
                                  onChange={() => updateComplexElement(index, 'caseSensitive', false)}
                                  className="mr-2"
                                />
                                <span className="text-sm">Case Insensitive <span className="text-gray-500">(matches: ABC, abc, Abc)</span></span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  checked={element.caseSensitive}
                                  onChange={() => updateComplexElement(index, 'caseSensitive', true)}
                                  className="mr-2"
                                />
                                <span className="text-sm">Case Sensitive <span className="text-gray-500">(matches only exact case)</span></span>
                              </label>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Space Matching
                            </label>
                            <div className="space-y-2">
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  checked={element.spaceFlexibility === 'exact'}
                                  onChange={() => updateComplexElement(index, 'spaceFlexibility', 'exact')}
                                  className="mr-2"
                                />
                                <span className="text-sm">Exact Spaces <span className="text-gray-500">(spaces must match exactly)</span></span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  checked={element.spaceFlexibility === 'flexible'}
                                  onChange={() => updateComplexElement(index, 'spaceFlexibility', 'flexible')}
                                  className="mr-2"
                                />
                                <span className="text-sm">Flexible Spaces <span className="text-gray-500">(existing spaces are optional: "ABC 123" matches "ABC123", "ABC 123")</span></span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  checked={element.spaceFlexibility === 'very-flexible'}
                                  onChange={() => updateComplexElement(index, 'spaceFlexibility', 'very-flexible')}
                                  className="mr-2"
                                />
                                <span className="text-sm">Very Flexible <span className="text-gray-500">(spaces allowed anywhere: "ABC" matches "A B C", "A B C")</span></span>
                              </label>
                            </div>
                          </div>
                        </>
                      )}

                      {element.type === 'date' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Date Format
                          </label>
                          <select
                            value={element.value}
                            onChange={(e) => updateComplexElement(index, 'value', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          >
                            {dateFormatExamples.map((fmt, i) => (
                              <option key={i} value={fmt.format}>
                                {fmt.format} (e.g., {fmt.example})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {element.type === 'wildcard' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Wildcard Type
                          </label>
                          <div className="space-y-2">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                checked={element.value === 'any'}
                                onChange={() => updateComplexElement(index, 'value', 'any')}
                                className="mr-2"
                              />
                              <span className="text-sm">Any characters (zero or more) <span className="text-gray-500">(.*)</span></span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                checked={element.value === 'some'}
                                onChange={() => updateComplexElement(index, 'value', 'some')}
                                className="mr-2"
                              />
                              <span className="text-sm">Some characters (one or more) <span className="text-gray-500">(.+)</span></span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <button
                  onClick={addComplexElement}
                  className="w-full py-2 border-2 border-dashed border-purple-300 rounded-lg text-purple-700 hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Element
                </button>
              </div>
            </div>
          )}

          {/* Regex Display and Test Pattern */}
          <div className="regex-content-card p-6 space-y-6">
            {/* Regex Display */}
            <div>
              <label className="form-label">Generated Regex Expression</label>
              <div className="regex-display">
                {currentRegex || '(empty pattern)'}
                {regexFlags && <span className="ml-2 text-purple-600">/{regexFlags}</span>}
              </div>
            </div>

            {/* Test Pattern */}
            <div className="border-t pt-6 space-y-4">
              <h3 className="font-semibold text-lg">Test the Regex Expression</h3>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testString}
                  onChange={(e) => setTestString(e.target.value)}
                  placeholder="Enter text to test..."
                  className="form-input flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && testPattern()}
                />
                <button onClick={testPattern} className="btn btn-primary whitespace-nowrap">
                  Test
                </button>
                {testResult && (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold ${
                    testResult.success 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {testResult.success ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Match
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5" />
                        Failed
                      </>
                    )}
                  </div>
                )}
              </div>

              {testResult && testResult.matched && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    Matched text: <span className="font-mono font-semibold bg-green-100 px-2 py-1 rounded">{testResult.matched}</span>
                  </p>
                </div>
              )}

              {testResult && testResult.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    <strong>Error:</strong> {testResult.error}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 flex justify-end gap-3 border-t border-white/20">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleUsePattern} className="btn btn-primary">
            Use This Pattern
          </button>
        </div>
      </div>
    </div>
  );
}
