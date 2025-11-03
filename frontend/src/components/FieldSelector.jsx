
import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import API_BASE_URL from '@/config/api';

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
      // Fetch selected date formats from API
      try {
        const sessionToken = localStorage.getItem('pococlass_session');
        const response = await fetch(`${API_BASE_URL}/api/settings/date-formats/selected`, {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          // Handle both array response and object with formats property
          const formats = Array.isArray(data) ? data : (data.formats || []);
          
          // Validate we have an array with items
          if (Array.isArray(formats) && formats.length > 0) {
            // Map to objects with value and example
            const formattedOptions = formats.map(fmt => ({
              value: fmt.format_pattern,
              example: fmt.example
            }));
            setAvailableOptions(formattedOptions);
          } else {
            // Fallback to defaults if no formats returned
            console.warn('No date formats returned from API, using defaults');
            setAvailableOptions([
              { value: 'DD-MM-YYYY', example: '15-04-2024' },
              { value: 'DD-MMM-YYYY', example: '15-Apr-2024' },
              { value: 'MM/DD/YYYY', example: '04/15/2024' },
              { value: 'YYYY-MM-DD', example: '2024-04-15' }
            ]);
          }
        } else {
          // Fallback to defaults if API call fails
          console.error('Failed to fetch date formats, using defaults');
          setAvailableOptions([
            { value: 'DD-MM-YYYY', example: '15-04-2024' },
            { value: 'DD-MMM-YYYY', example: '15-Apr-2024' },
            { value: 'MM/DD/YYYY', example: '04/15/2024' },
            { value: 'YYYY-MM-DD', example: '2024-04-15' }
          ]);
        }
      } catch (e) {
        console.error('Error loading date formats from API:', e);
        // Fallback to defaults on error
        setAvailableOptions([
          { value: 'DD-MM-YYYY', example: '15-04-2024' },
          { value: 'DD-MMM-YYYY', example: '15-Apr-2024' },
          { value: 'MM/DD/YYYY', example: '04/15/2024' },
          { value: 'YYYY-MM-DD', example: '2024-04-15' }
        ]);
      }
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

    // Guard against empty options
    if (totalOptions === 0) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowDropdown(false);
        setHighlightedIndex(0);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault(); // Prevent form submission
      }
      return;
    }

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
