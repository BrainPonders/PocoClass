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
    return filters.title ||
           filters.tags.length > 0 ||
           filters.correspondents.length > 0 ||
           filters.docTypes.length > 0 ||
           filters.customFields.length > 0 ||
           filters.dateFrom ||
           filters.dateTo ||
           filters.permissions !== 'all';
  };

  const getFilterButtonClass = (filterName) => {
    let hasValue = false;
    switch(filterName) {
      case 'title': hasValue = filters.title?.length > 0; break;
      case 'tags': hasValue = filters.tags.length > 0; break;
      case 'correspondent': hasValue = filters.correspondents.length > 0; break;
      case 'documentType': hasValue = filters.docTypes.length > 0; break;
      case 'customFields': hasValue = filters.customFields.length > 0; break;
      case 'dates': hasValue = filters.dateFrom || filters.dateTo; break;
      case 'permissions': hasValue = filters.permissions !== 'all'; break;
      default: hasValue = false;
    }

    const baseClass = "px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1 ";
    if (hasValue) {
      return baseClass + "bg-blue-600 text-white hover:bg-blue-700";
    }
    return baseClass + "bg-gray-700 text-gray-200 hover:bg-gray-600";
  };

  const renderFilterDropdown = (filterName, content) => {
    if (openFilter !== filterName) return null;

    return (
      <div
        ref={el => dropdownRefs.current[filterName] = el}
        className="absolute top-full left-0 mt-1 bg-gray-800 rounded-lg shadow-xl border border-gray-700 text-white z-50 min-w-[300px]"
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
              className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400 w-48 focus:outline-none focus:border-blue-500"
            />
            {filters.title && (
              <button
                onClick={() => onFilterChange({ ...filters, title: '' })}
                className="absolute right-2 text-gray-400 hover:text-white"
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
              <div className="p-3 border-b border-gray-700">
                <div className="flex gap-1 mb-3">
                  <button
                    className={`flex-1 px-3 py-1.5 text-sm rounded ${filters.tagsMode === 'include' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                    onClick={() => onFilterChange({ ...filters, tagsMode: 'include' })}
                  >
                    Include
                  </button>
                  <button
                    className={`flex-1 px-3 py-1.5 text-sm rounded ${filters.tagsMode === 'exclude' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
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
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400"
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {allTags
                  .filter(tag => !filters.tagsSearch || tag.toLowerCase().includes(filters.tagsSearch.toLowerCase()))
                  .map(tag => (
                    <div
                      key={tag}
                      className={`px-4 py-2 hover:bg-gray-700 cursor-pointer flex justify-between items-center ${filters.tags.includes(tag) ? 'bg-gray-700' : ''}`}
                      onClick={() => {
                        const newTags = filters.tags.includes(tag)
                          ? filters.tags.filter(t => t !== tag)
                          : [...filters.tags, tag];
                        onFilterChange({ ...filters, tags: newTags });
                      }}
                    >
                      <span className="text-sm">{tag}</span>
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
              <div className="p-3 border-b border-gray-700">
                <div className="flex gap-1 mb-3">
                  <button
                    className={`flex-1 px-3 py-1.5 text-sm rounded ${filters.correspondentsMode === 'include' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                    onClick={() => onFilterChange({ ...filters, correspondentsMode: 'include' })}
                  >
                    Include
                  </button>
                  <button
                    className={`flex-1 px-3 py-1.5 text-sm rounded ${filters.correspondentsMode === 'exclude' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
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
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400"
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                <div
                  className={`px-4 py-2 hover:bg-gray-700 cursor-pointer ${filters.correspondents.includes(null) ? 'bg-gray-700' : ''}`}
                  onClick={() => {
                    const newCorr = filters.correspondents.includes(null)
                      ? filters.correspondents.filter(c => c !== null)
                      : [...filters.correspondents, null];
                    onFilterChange({ ...filters, correspondents: newCorr });
                  }}
                >
                  <span className="text-sm italic">Not assigned</span>
                </div>
                {allCorrespondents
                  .filter(corr => !filters.correspondentsSearch || corr.toLowerCase().includes(filters.correspondentsSearch.toLowerCase()))
                  .map(corr => (
                    <div
                      key={corr}
                      className={`px-4 py-2 hover:bg-gray-700 cursor-pointer ${filters.correspondents.includes(corr) ? 'bg-gray-700' : ''}`}
                      onClick={() => {
                        const newCorr = filters.correspondents.includes(corr)
                          ? filters.correspondents.filter(c => c !== corr)
                          : [...filters.correspondents, corr];
                        onFilterChange({ ...filters, correspondents: newCorr });
                      }}
                    >
                      <span className="text-sm">{corr}</span>
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
              <div className="p-3 border-b border-gray-700">
                <div className="flex gap-1 mb-3">
                  <button
                    className={`flex-1 px-3 py-1.5 text-sm rounded ${filters.docTypesMode === 'include' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                    onClick={() => onFilterChange({ ...filters, docTypesMode: 'include' })}
                  >
                    Include
                  </button>
                  <button
                    className={`flex-1 px-3 py-1.5 text-sm rounded ${filters.docTypesMode === 'exclude' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
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
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400"
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                <div
                  className={`px-4 py-2 hover:bg-gray-700 cursor-pointer ${filters.docTypes.includes(null) ? 'bg-gray-700' : ''}`}
                  onClick={() => {
                    const newTypes = filters.docTypes.includes(null)
                      ? filters.docTypes.filter(t => t !== null)
                      : [...filters.docTypes, null];
                    onFilterChange({ ...filters, docTypes: newTypes });
                  }}
                >
                  <span className="text-sm italic">Not assigned</span>
                </div>
                {allDocTypes
                  .filter(type => !filters.docTypesSearch || type.toLowerCase().includes(filters.docTypesSearch.toLowerCase()))
                  .map(type => (
                    <div
                      key={type}
                      className={`px-4 py-2 hover:bg-gray-700 cursor-pointer ${filters.docTypes.includes(type) ? 'bg-gray-700' : ''}`}
                      onClick={() => {
                        const newTypes = filters.docTypes.includes(type)
                          ? filters.docTypes.filter(t => t !== type)
                          : [...filters.docTypes, type];
                        onFilterChange({ ...filters, docTypes: newTypes });
                      }}
                    >
                      <span className="text-sm">{type}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Storage Path Filter (Disabled) */}
        <div className="relative">
          <button
            disabled
            className="px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 bg-gray-600 text-gray-400 cursor-not-allowed opacity-50"
          >
            <Filter className="w-4 h-4" />
            Storage path
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {/* Custom Fields Filter - Disabled pending full implementation */}
        <div className="relative">
          <button
            disabled
            className="px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 bg-gray-600 text-gray-400 cursor-not-allowed opacity-50"
            title="Custom fields filtering requires backend support for field definitions and select options"
          >
            <Filter className="w-4 h-4" />
            Custom fields
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {/* Dates Filter */}
        <div className="relative">
          <button
            onClick={() => toggleFilter('dates')}
            className={getFilterButtonClass('dates')}
          >
            <Calendar className="w-4 h-4" />
            Dates
            <ChevronDown className="w-3 h-3" />
          </button>
          {renderFilterDropdown('dates', (
            <div className="p-3 min-w-[300px]">
              <div className="mb-3">
                <label className="block text-xs text-gray-400 mb-1">Added</label>
                <div className="flex gap-2 items-center mb-2">
                  <input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value })}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                    placeholder="From"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value })}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                    placeholder="To"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Permissions Filter */}
        <div className="relative">
          <button
            onClick={() => toggleFilter('permissions')}
            className={getFilterButtonClass('permissions')}
          >
            <Filter className="w-4 h-4" />
            Permissions
            <ChevronDown className="w-3 h-3" />
          </button>
          {renderFilterDropdown('permissions', (
            <div>
              <div className="px-4 py-2 text-xs text-yellow-400 bg-yellow-900 bg-opacity-20 border-b border-yellow-700">
                ⚠️ Permissions filtering requires backend support
              </div>
              <div className="py-2 min-w-[200px]">
              {['all', 'my_documents', 'shared_with_me', 'shared_by_me', 'unowned'].map(perm => (
                <div
                  key={perm}
                  className={`px-4 py-2 hover:bg-gray-700 cursor-pointer ${filters.permissions === perm ? 'bg-gray-700' : ''}`}
                  onClick={() => {
                    onFilterChange({ ...filters, permissions: perm });
                    setOpenFilter(null);
                  }}
                >
                  <span className="text-sm">
                    {filters.permissions === perm && '✓ '}
                    {perm === 'all' && 'All'}
                    {perm === 'my_documents' && 'My documents'}
                    {perm === 'shared_with_me' && 'Shared with me'}
                    {perm === 'shared_by_me' && 'Shared by me'}
                    {perm === 'unowned' && 'Unowned'}
                  </span>
                </div>
              ))}
              </div>
            </div>
          ))}
        </div>

        {/* Reset Filters Button */}
        {hasActiveFilters() && (
          <button
            onClick={onResetFilters}
            className="px-3 py-1.5 rounded text-sm font-medium bg-gray-600 text-gray-200 hover:bg-gray-500 flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Reset filters
          </button>
        )}
      </div>
    </div>
  );
}
