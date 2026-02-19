/**
 * @file TagSelector.jsx
 * @description Multi-select (or single-select) tag picker that loads available tags
 * from the Paperless-ngx API. Supports keyboard navigation, custom tag creation,
 * and displays selected tags as removable pills.
 */
import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

export default function TagSelector({ selectedTags = [], onChange, placeholder = "Select tags...", singleSelect = false, allowCustom = true }) {
  const [availableTags, setAvailableTags] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const { Paperless } = await import('@/api/entities');
      const tags = await Paperless.getTags();
      // Extract tag names from the API response
      const tagNames = tags.map(tag => tag.name);
      setAvailableTags(tagNames);
    } catch (error) {
      console.error('Error loading tags from Paperless:', error);
      // Fallback to empty array on error
      setAvailableTags([]);
    }
  };

  const filteredTags = availableTags.filter(tag => 
    !selectedTags.includes(tag) && 
    tag.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // In single-select mode, replace the selection; in multi-select, append
  const addTag = (tag) => {
    if (singleSelect) {
      onChange([tag]);
    } else {
      if (!selectedTags.includes(tag)) {
        onChange([...selectedTags, tag]);
      }
    }
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

    const totalOptions = filteredTags.length + (allowCustom && searchTerm && !availableTags.includes(searchTerm) ? 1 : 0);

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
        if (allowCustom && searchTerm && !availableTags.includes(searchTerm)) {
          if (highlightedIndex === 0) {
            addCustomTag();
          } else {
            addTag(filteredTags[highlightedIndex - 1]);
          }
        } else {
          if (highlightedIndex < filteredTags.length) {
            addTag(filteredTags[highlightedIndex]);
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

  const removeTag = (tag) => {
    onChange(selectedTags.filter(t => t !== tag));
  };

  const addCustomTag = () => {
    if (searchTerm && !selectedTags.includes(searchTerm) && allowCustom) {
      if (singleSelect) {
        onChange([searchTerm]);
      } else {
        onChange([...selectedTags, searchTerm]);
      }
      setSearchTerm('');
      setShowDropdown(false);
    }
  };

  return (
    <div className="relative">
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedTags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
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
          className="pc-input"
        />

        {showDropdown && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-20">
              {allowCustom && searchTerm && !availableTags.includes(searchTerm) && (
                <button
                  onClick={addCustomTag}
                  className={`w-full text-left px-4 py-2 flex items-center gap-2 text-gray-600 ${highlightedIndex === 0 ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  onMouseEnter={() => setHighlightedIndex(0)}
                >
                  <Plus className="w-4 h-4" />
                  Add "{searchTerm}"
                </button>
              )}
              {filteredTags.map((tag, idx) => {
                const optionIndex = allowCustom && searchTerm && !availableTags.includes(searchTerm) ? idx + 1 : idx;
                const isHighlighted = highlightedIndex === optionIndex;
                
                return (
                  <button
                    key={tag}
                    onClick={() => addTag(tag)}
                    className={`w-full text-left px-4 py-2 text-gray-700 ${isHighlighted ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    onMouseEnter={() => setHighlightedIndex(optionIndex)}
                  >
                    {tag}
                  </button>
                );
              })}
              {filteredTags.length === 0 && !searchTerm && (
                <div className="px-4 py-2 text-gray-500 text-sm">No tags available</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}