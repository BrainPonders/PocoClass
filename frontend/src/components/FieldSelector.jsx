
import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

export default function FieldSelector({ type, value, onChange, placeholder = "Select...", allowCustom = true }) {
  const [availableOptions, setAvailableOptions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    loadOptions();
  }, [type]);

  const loadOptions = async () => {
    if (type === 'correspondent') {
      try {
        const { Paperless } = await import('@/api/entities');
        const correspondents = await Paperless.getCorrespondents();
        setAvailableOptions(correspondents.map(c => c.name).sort());
      } catch (e) {
        console.error('Error loading correspondents:', e);
        setAvailableOptions([]);
      }
    } else if (type === 'documentType') {
      try {
        const { Paperless } = await import('@/api/entities');
        const docTypes = await Paperless.getDocumentTypes();
        setAvailableOptions(docTypes.map(dt => dt.name).sort());
      } catch (e) {
        console.error('Error loading document types:', e);
        setAvailableOptions([]);
      }
    } else if (type === 'dateFormat') {
      // Define a default set of common date formats
      const defaultCommonFormats = [
        'DD-MM-YYYY', 'DD-MMM-YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD',
        'DD.MM.YYYY', 'DDDD DD MMMM YYYY', 'DD MMMM YYYY', 'MMMM DD, YYYY'
      ];
      let commonFormats = defaultCommonFormats; // Initialize with defaults

      // Load from settings
      try {
        const settings = localStorage.getItem('pococlass_settings');
        if (settings) {
          const parsed = JSON.parse(settings);
          // If commonDateFormats exist in settings and is an array, use it
          if (parsed.commonDateFormats && Array.isArray(parsed.commonDateFormats)) {
            commonFormats = parsed.commonDateFormats;
          }
        }
      } catch (e) {
        console.error('Error loading date formats from localStorage:', e);
        // If an error occurs during parsing or loading, commonFormats will remain the defaultCommonFormats
      }
          
      // Map to objects with examples
      const formatExamples = {
        'DD-MM-YYYY': '15-04-2024',
        'DD-MMM-YYYY': '15-Apr-2024',
        'DD/MM/YYYY': '15/04/2024',
        'MM/DD/YYYY': '04/15/2024',
        'YYYY-MM-DD': '2024-04-15',
        'YYYY/MM/DD': '2024/04/15',
        'DD.MM.YYYY': '15.04.2024',
        'MM.DD.YYYY': '04.15.2024',
        'DDDD DD MMMM YYYY': 'Monday 15 April 2024',
        'DD MMMM YYYY': '15 April 2024',
        'MMMM DD, YYYY': 'April 15, 2024',
        'MMM DD, YYYY': 'Apr 15, 2024',
        'DD MMM YYYY': '15 Apr 2024',
        'YYYY MMM DD': '2024 Apr 15',
        'DD-MM-YY': '15-04-24',
        'MM-DD-YY': '04-15-24',
        'YY-MM-DD': '24-04-15',
        'D/M/YYYY': '5/4/2024',
        'M/D/YYYY': '4/5/2024',
        'YYYYMMDD': '20240415'
      };
      
      const formattedOptions = commonFormats.map(format => ({
        value: format,
        example: formatExamples[format] || format // Fallback to format itself if example not found
      }));
      
      setAvailableOptions(formattedOptions);
    }
  };

  const filteredOptions = type === 'dateFormat' 
    ? availableOptions.filter(option => 
        option.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
        option.example.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : availableOptions.filter(option => 
        option.toLowerCase().includes(searchTerm.toLowerCase())
      );

  const selectOption = (option) => {
    const optionValue = typeof option === 'object' ? option.value : option;
    onChange(optionValue);
    setSearchTerm('');
    setShowDropdown(false);
    setHighlightedIndex(0);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setShowDropdown(true);
        setHighlightedIndex(0);
      }
      return;
    }

    const totalOptions = filteredOptions.length + (allowCustom && searchTerm && !availableOptions.some(opt => 
      typeof opt === 'object' ? opt.value === searchTerm : opt === searchTerm
    ) ? 1 : 0);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % totalOptions);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + totalOptions) % totalOptions);
        break;
      case 'Home':
        e.preventDefault();
        setHighlightedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setHighlightedIndex(totalOptions - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (allowCustom && searchTerm && !availableOptions.some(opt => 
          typeof opt === 'object' ? opt.value === searchTerm : opt === searchTerm
        )) {
          if (highlightedIndex === 0) {
            addCustomOption();
          } else {
            selectOption(filteredOptions[highlightedIndex - 1]);
          }
        } else {
          if (highlightedIndex < filteredOptions.length) {
            selectOption(filteredOptions[highlightedIndex]);
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        setHighlightedIndex(0);
        break;
    }
  };

  const addCustomOption = () => {
    if (searchTerm && allowCustom) {
      onChange(searchTerm);
      setSearchTerm('');
      setShowDropdown(false);
    }
  };

  const clearSelection = () => {
    onChange('');
  };

  return (
    <div className="relative flex-1">
      {value ? (
        <div className="form-input flex items-center justify-between">
          <span>{value}</span>
          <button
            onClick={clearSelection}
            className="text-gray-400 hover:text-gray-600"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(true);
              setHighlightedIndex(0);
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="form-input"
          />

          {showDropdown && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-20">
                {allowCustom && searchTerm && !availableOptions.some(opt => 
                  typeof opt === 'object' ? opt.value === searchTerm : opt === searchTerm
                ) && (
                  <button
                    onClick={addCustomOption}
                    className={`w-full text-left px-4 py-2 flex items-center gap-2 text-blue-600 ${highlightedIndex === 0 ? 'bg-blue-50' : 'hover:bg-blue-50'}`}
                    type="button"
                    onMouseEnter={() => setHighlightedIndex(0)}
                  >
                    <Plus className="w-4 h-4" />
                    Add "{searchTerm}"
                  </button>
                )}
                {filteredOptions.map((option, idx) => {
                  const optionIndex = allowCustom && searchTerm && !availableOptions.some(opt => 
                    typeof opt === 'object' ? opt.value === searchTerm : opt === searchTerm
                  ) ? idx + 1 : idx;
                  const isHighlighted = highlightedIndex === optionIndex;
                  
                  if (typeof option === 'object') {
                    return (
                      <button
                        key={idx}
                        onClick={() => selectOption(option)}
                        className={`w-full text-left px-4 py-2 text-gray-700 ${isHighlighted ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                        type="button"
                        onMouseEnter={() => setHighlightedIndex(optionIndex)}
                      >
                        <div className="font-medium">{option.value}</div>
                        <div className="text-xs text-gray-500">Example: {option.example}</div>
                      </button>
                    );
                  } else {
                    return (
                      <button
                        key={idx}
                        onClick={() => selectOption(option)}
                        className={`w-full text-left px-4 py-2 text-gray-700 ${isHighlighted ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                        type="button"
                        onMouseEnter={() => setHighlightedIndex(optionIndex)}
                      >
                        {option}
                      </button>
                    );
                  }
                })}
                {filteredOptions.length === 0 && !searchTerm && (
                  <div className="px-4 py-2 text-gray-500 text-sm">No options available</div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
