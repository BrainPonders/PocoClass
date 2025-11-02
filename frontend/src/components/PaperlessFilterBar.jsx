import React, { useState, useRef, useEffect } from 'react';
import { Filter, X, ChevronDown, Calendar } from 'lucide-react';

export default function PaperlessFilterBar({
  filters,
  onFilterChange,
  onResetFilters,
  allTags = [],
  allCorrespondents = [],
  allDocTypes = [],
  allCustomFields = []
}) {
  const [openFilter, setOpenFilter] = useState(null);
  const dropdownRefs = useRef({});

  // Helper functions for default date range
  const getLast7DaysDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const isDefaultDateRange = () => {
    const defaultFrom = getLast7DaysDate();
    const defaultTo = getTodayDate();
    return filters.dateFrom === defaultFrom && filters.dateTo === defaultTo;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openFilter && dropdownRefs.current[openFilter]) {
        if (!dropdownRefs.current[openFilter].contains(event.target)) {
          setOpenFilter(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openFilter]);

  const toggleFilter = (filterName) => {
    setOpenFilter(openFilter === filterName ? null : filterName);
  };

  const hasActiveFilters = () => {
    // Check if date range is different from default (last 7 days)
    const hasCustomDateRange = !isDefaultDateRange() && (filters.dateFrom || filters.dateTo);
    
    return filters.title ||
           filters.tags.length > 0 ||
           filters.correspondents.length > 0 ||
           filters.docTypes.length > 0 ||
           (filters.excludeTags && filters.excludeTags.length > 0) ||
           (filters.limit && filters.limit > 0) ||
           hasCustomDateRange;
  };

  const getFilterButtonClass = (filterName) => {
    let hasValue = false;
    switch(filterName) {
      case 'title': hasValue = filters.title?.length > 0; break;
      case 'tags': hasValue = filters.tags.length > 0; break;
      case 'correspondent': hasValue = filters.correspondents.length > 0; break;
      case 'documentType': hasValue = filters.docTypes.length > 0; break;
      case 'dates': hasValue = filters.dateFrom || filters.dateTo; break;
      case 'excludeTags': hasValue = filters.excludeTags && filters.excludeTags.length > 0; break;
      default: hasValue = false;
    }

    const baseClass = "px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1 ";
    if (hasValue) {
      // Use red for exclude tags filter
      if (filterName === 'excludeTags') {
        return baseClass + "bg-red-600 text-white hover:bg-red-700";
      }
      return baseClass + "bg-blue-600 text-white hover:bg-blue-700";
    }
    return baseClass + "bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300";
  };

  const renderFilterDropdown = (filterName, content) => {
    if (openFilter !== filterName) return null;

    return (
      <div
        ref={el => dropdownRefs.current[filterName] = el}
        className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-300 z-50 min-w-[300px]"
      >
        {content}
      </div>
    );
  };

  return (
    <div className="mb-4">
      {/* Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {/* Title Filter - Inline */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Title:</label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={filters.title || ''}
              onChange={(e) => onFilterChange({ ...filters, title: e.target.value })}
              placeholder="Search..."
              className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400 w-48 focus:outline-none focus:border-blue-500"
            />
            {filters.title && (
              <button
                onClick={() => onFilterChange({ ...filters, title: '' })}
                className="absolute right-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tags Filter */}
        <div className="relative">
          <button
            onClick={() => toggleFilter('tags')}
            className={getFilterButtonClass('tags')}
          >
            <Filter className="w-4 h-4" />
            Tags
            {filters.tags.length > 0 && ` (${filters.tags.length})`}
            <ChevronDown className="w-3 h-3" />
          </button>
          {renderFilterDropdown('tags', (
            <div>
              <div className="p-3 border-b border-gray-200">
                <div className="flex gap-1 mb-3">
                  <button
                    className={`flex-1 px-3 py-1.5 text-sm rounded ${filters.tagsMode === 'include' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                    onClick={() => onFilterChange({ ...filters, tagsMode: 'include' })}
                  >
                    Include
                  </button>
                  <button
                    className={`flex-1 px-3 py-1.5 text-sm rounded ${filters.tagsMode === 'exclude' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                    onClick={() => onFilterChange({ ...filters, tagsMode: 'exclude' })}
                  >
                    Exclude
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Filter tags"
                  value={filters.tagsSearch || ''}
                  onChange={(e) => onFilterChange({ ...filters, tagsSearch: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400"
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {allTags
                  .filter(tag => !filters.tagsSearch || tag.toLowerCase().includes(filters.tagsSearch.toLowerCase()))
                  .map(tag => (
                    <div
                      key={tag}
                      className={`px-4 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center ${filters.tags.includes(tag) ? 'bg-blue-50' : ''}`}
                      onClick={() => {
                        const newTags = filters.tags.includes(tag)
                          ? filters.tags.filter(t => t !== tag)
                          : [...filters.tags, tag];
                        onFilterChange({ ...filters, tags: newTags });
                      }}
                    >
                      <span className="text-sm text-gray-900">{tag}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Correspondent Filter */}
        <div className="relative">
          <button
            onClick={() => toggleFilter('correspondent')}
            className={getFilterButtonClass('correspondent')}
          >
            <Filter className="w-4 h-4" />
            Correspondent
            {filters.correspondents.length > 0 && ` (${filters.correspondents.length})`}
            <ChevronDown className="w-3 h-3" />
          </button>
          {renderFilterDropdown('correspondent', (
            <div>
              <div className="p-3 border-b border-gray-200">
                <div className="flex gap-1 mb-3">
                  <button
                    className={`flex-1 px-3 py-1.5 text-sm rounded ${filters.correspondentsMode === 'include' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                    onClick={() => onFilterChange({ ...filters, correspondentsMode: 'include' })}
                  >
                    Include
                  </button>
                  <button
                    className={`flex-1 px-3 py-1.5 text-sm rounded ${filters.correspondentsMode === 'exclude' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                    onClick={() => onFilterChange({ ...filters, correspondentsMode: 'exclude' })}
                  >
                    Exclude
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Filter correspondents"
                  value={filters.correspondentsSearch || ''}
                  onChange={(e) => onFilterChange({ ...filters, correspondentsSearch: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400"
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                <div
                  className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${filters.correspondents.includes(null) ? 'bg-blue-50' : ''}`}
                  onClick={() => {
                    const newCorr = filters.correspondents.includes(null)
                      ? filters.correspondents.filter(c => c !== null)
                      : [...filters.correspondents, null];
                    onFilterChange({ ...filters, correspondents: newCorr });
                  }}
                >
                  <span className="text-sm italic text-gray-700">Not assigned</span>
                </div>
                {allCorrespondents
                  .filter(corr => !filters.correspondentsSearch || corr.toLowerCase().includes(filters.correspondentsSearch.toLowerCase()))
                  .map(corr => (
                    <div
                      key={corr}
                      className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${filters.correspondents.includes(corr) ? 'bg-blue-50' : ''}`}
                      onClick={() => {
                        const newCorr = filters.correspondents.includes(corr)
                          ? filters.correspondents.filter(c => c !== corr)
                          : [...filters.correspondents, corr];
                        onFilterChange({ ...filters, correspondents: newCorr });
                      }}
                    >
                      <span className="text-sm text-gray-900">{corr}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Document Type Filter */}
        <div className="relative">
          <button
            onClick={() => toggleFilter('documentType')}
            className={getFilterButtonClass('documentType')}
          >
            <Filter className="w-4 h-4" />
            Document type
            {filters.docTypes.length > 0 && ` (${filters.docTypes.length})`}
            <ChevronDown className="w-3 h-3" />
          </button>
          {renderFilterDropdown('documentType', (
            <div>
              <div className="p-3 border-b border-gray-200">
                <div className="flex gap-1 mb-3">
                  <button
                    className={`flex-1 px-3 py-1.5 text-sm rounded ${filters.docTypesMode === 'include' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                    onClick={() => onFilterChange({ ...filters, docTypesMode: 'include' })}
                  >
                    Include
                  </button>
                  <button
                    className={`flex-1 px-3 py-1.5 text-sm rounded ${filters.docTypesMode === 'exclude' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                    onClick={() => onFilterChange({ ...filters, docTypesMode: 'exclude' })}
                  >
                    Exclude
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Filter document types"
                  value={filters.docTypesSearch || ''}
                  onChange={(e) => onFilterChange({ ...filters, docTypesSearch: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400"
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                <div
                  className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${filters.docTypes.includes(null) ? 'bg-blue-50' : ''}`}
                  onClick={() => {
                    const newTypes = filters.docTypes.includes(null)
                      ? filters.docTypes.filter(t => t !== null)
                      : [...filters.docTypes, null];
                    onFilterChange({ ...filters, docTypes: newTypes });
                  }}
                >
                  <span className="text-sm italic text-gray-700">Not assigned</span>
                </div>
                {allDocTypes
                  .filter(type => !filters.docTypesSearch || type.toLowerCase().includes(filters.docTypesSearch.toLowerCase()))
                  .map(type => (
                    <div
                      key={type}
                      className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${filters.docTypes.includes(type) ? 'bg-blue-50' : ''}`}
                      onClick={() => {
                        const newTypes = filters.docTypes.includes(type)
                          ? filters.docTypes.filter(t => t !== type)
                          : [...filters.docTypes, type];
                        onFilterChange({ ...filters, docTypes: newTypes });
                      }}
                    >
                      <span className="text-sm text-gray-900">{type}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Dates Added Filter */}
        <div className="relative">
          <button
            onClick={() => toggleFilter('dates')}
            className={getFilterButtonClass('dates')}
          >
            <Calendar className="w-4 h-4" />
            Dates Added
            <ChevronDown className="w-3 h-3" />
          </button>
          {renderFilterDropdown('dates', (
            <div className="p-3 min-w-[300px]">
              <div className="mb-3">
                <label className="block text-xs text-gray-600 mb-1">Added</label>
                <div className="flex gap-2 items-center mb-2">
                  <input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value })}
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm text-gray-900"
                    placeholder="From"
                  />
                  <span className="text-gray-600">to</span>
                  <input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value })}
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm text-gray-900"
                    placeholder="To"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Date Range Display - Inline after Dates Added */}
        {(filters.dateFrom || filters.dateTo) && (
          <div className="flex items-center gap-2 text-xs text-gray-600 px-2 py-1">
            <span>
              {isDefaultDateRange() ? (
                <strong>Last 7 days</strong>
              ) : (
                <span>
                  {filters.dateFrom || '...'} to {filters.dateTo || '...'}
                </span>
              )}
            </span>
          </div>
        )}

        {/* Exclude Tags Filter */}
        <div className="relative">
          <button
            onClick={() => toggleFilter('excludeTags')}
            className={getFilterButtonClass('excludeTags')}
          >
            <Filter className="w-4 h-4" />
            Exclude Tags
            {filters.excludeTags?.length > 0 && ` (${filters.excludeTags.length})`}
            <ChevronDown className="w-3 h-3" />
          </button>
          {renderFilterDropdown('excludeTags', (
            <div>
              <div className="p-3 border-b border-gray-200">
                <input
                  type="text"
                  placeholder="Filter tags"
                  value={filters.excludeTagsSearch || ''}
                  onChange={(e) => onFilterChange({ ...filters, excludeTagsSearch: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400"
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {allTags
                  .filter(tag => !filters.excludeTagsSearch || tag.toLowerCase().includes(filters.excludeTagsSearch.toLowerCase()))
                  .map(tag => (
                    <div
                      key={tag}
                      className={`px-4 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center ${filters.excludeTags?.includes(tag) ? 'bg-red-50' : ''}`}
                      onClick={() => {
                        const newExcludeTags = filters.excludeTags?.includes(tag)
                          ? filters.excludeTags.filter(t => t !== tag)
                          : [...(filters.excludeTags || []), tag];
                        onFilterChange({ ...filters, excludeTags: newExcludeTags });
                      }}
                    >
                      <span className="text-sm text-gray-900">{tag}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Limit Filter - Inline Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Limit:</label>
          <select
            value={filters.limit || 10}
            onChange={(e) => onFilterChange({ ...filters, limit: parseInt(e.target.value) })}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-900 w-20 focus:outline-none focus:border-blue-500"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {/* Spacer to push Reset button to the right */}
        <div className="flex-grow"></div>

        {/* Reset Filters Button - Always visible */}
        <button
          onClick={onResetFilters}
          disabled={!hasActiveFilters()}
          className={`px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 ${
            hasActiveFilters() 
              ? 'bg-gray-600 text-gray-200 hover:bg-gray-500 cursor-pointer' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <X className="w-4 h-4" />
          Reset filters
        </button>
      </div>
    </div>
  );
}
