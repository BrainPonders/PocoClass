import React, { useState, useRef, useEffect } from 'react';
import { Tag, User, FileText, X, ChevronDown, Calendar } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PaperlessFilterBar({
  filters,
  onFilterChange,
  onResetFilters,
  allTags = [],
  allCorrespondents = [],
  allDocTypes = [],
  allCustomFields = []
}) {
  const { t } = useLanguage();
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
    
    // Only consider limit as active if it's different from default (10)
    const hasCustomLimit = filters.limit && filters.limit !== 10;
    
    return filters.title ||
           (filters.tagStates && Object.keys(filters.tagStates).length > 0) ||
           filters.correspondents.length > 0 ||
           filters.docTypes.length > 0 ||
           hasCustomLimit ||
           hasCustomDateRange;
  };

  const getFilterButtonClass = (filterName) => {
    let hasValue = false;
    let hasMixedStates = false;
    
    switch(filterName) {
      case 'title': hasValue = filters.title?.length > 0; break;
      case 'tags': 
        hasValue = filters.tagStates && Object.keys(filters.tagStates).length > 0;
        if (hasValue) {
          const states = Object.values(filters.tagStates);
          const hasInclude = states.includes('include');
          const hasExclude = states.includes('exclude');
          hasMixedStates = hasInclude && hasExclude;
        }
        break;
      case 'correspondent': hasValue = filters.correspondents.length > 0; break;
      case 'documentType': hasValue = filters.docTypes.length > 0; break;
      case 'dates': hasValue = filters.dateFrom || filters.dateTo; break;
      default: hasValue = false;
    }

    if (hasValue) {
      if (filterName === 'tags' && hasMixedStates) {
        return {
          className: "px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2",
          style: { backgroundColor: 'var(--warning-bg)', color: 'white', border: '1px solid var(--warning-border)' },
          onMouseEnter: (e) => e.currentTarget.style.opacity = '0.85',
          onMouseLeave: (e) => e.currentTarget.style.opacity = '1'
        };
      }
      return {
        className: "px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2",
        style: { backgroundColor: 'var(--info-bg)', color: 'var(--info-text)', border: '1px solid var(--info-border)' },
        onMouseEnter: (e) => e.currentTarget.style.opacity = '0.85',
        onMouseLeave: (e) => e.currentTarget.style.opacity = '1'
      };
    }
    return { 
      className: "px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2",
      style: { backgroundColor: 'transparent', color: 'var(--app-text-secondary)', border: '1px solid var(--app-border)' },
      onMouseEnter: (e) => e.currentTarget.style.backgroundColor = 'var(--app-bg-secondary)',
      onMouseLeave: (e) => e.currentTarget.style.backgroundColor = 'transparent'
    };
  };

  const renderFilterDropdown = (filterName, content) => {
    if (openFilter !== filterName) return null;

    return (
      <div
        ref={el => dropdownRefs.current[filterName] = el}
        className="absolute top-full left-0 mt-1 rounded-lg shadow-xl z-50 min-w-[300px]"
        style={{ backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)' }}
      >
        {content}
      </div>
    );
  };

  return (
    <div className="mb-6">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
        {/* Title Filter - Inline Pill */}
        <div className="relative flex items-center px-3 py-1.5 rounded-full" style={{ 
          backgroundColor: filters.title ? 'var(--info-bg)' : 'transparent',
          border: '1px solid ' + (filters.title ? 'var(--info-border)' : 'var(--app-border)'),
          color: filters.title ? 'var(--info-text)' : 'var(--app-text-secondary)'
        }}>
          <label className="text-sm font-medium whitespace-nowrap flex items-center gap-2 cursor-pointer">
            {t('filters.title')}
          </label>
          <input
            type="text"
            value={filters.title || ''}
            onChange={(e) => onFilterChange({ ...filters, title: e.target.value })}
            placeholder={t('filters.searchPlaceholder')}
            className="px-2 py-1 rounded text-sm focus:outline-none"
            style={{ backgroundColor: 'transparent', border: 'none', color: 'inherit', width: '250px' }}
            onFocus={(e) => e.target.style.backgroundColor = 'rgba(0,0,0,0.1)'}
            onBlur={(e) => e.target.style.backgroundColor = 'transparent'}
          />
          {filters.title && (
            <button
              onClick={() => onFilterChange({ ...filters, title: '' })}
              className="ml-1"
              style={{ color: 'inherit' }}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Tags Filter - Tri-state */}
        <div className="relative">
          <button
            onClick={() => toggleFilter('tags')}
            {...getFilterButtonClass('tags')}
          >
            <Tag className="w-4 h-4" />
            {t('filters.tags')}
            {filters.tagStates && Object.keys(filters.tagStates).length > 0 && ` (${Object.keys(filters.tagStates).length})`}
            <ChevronDown className="w-3 h-3" />
          </button>
          {renderFilterDropdown('tags', (
            <div>
              <div className="p-3" style={{ borderBottom: '1px solid var(--app-border)' }}>
                <div className="flex gap-1 mb-3">
                  <button
                    className="flex-1 px-3 py-1.5 text-sm rounded"
                    style={ filters.tagsLogic === 'any' ? { backgroundColor: 'var(--app-primary)', color: 'white' } : { backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text-secondary)' } }
                    onClick={() => onFilterChange({ ...filters, tagsLogic: 'any' })}
                  >
                    {t('filters.any')}
                  </button>
                  <button
                    className="flex-1 px-3 py-1.5 text-sm rounded"
                    style={ filters.tagsLogic === 'all' ? { backgroundColor: 'var(--app-primary)', color: 'white' } : { backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text-secondary)' } }
                    onClick={() => onFilterChange({ ...filters, tagsLogic: 'all' })}
                  >
                    {t('filters.all')}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder={t('filters.filterTags')}
                  value={filters.tagsSearch || ''}
                  onChange={(e) => onFilterChange({ ...filters, tagsSearch: e.target.value })}
                  className="w-full px-3 py-2 rounded text-sm"
                  style={{ backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'var(--app-text)' }}
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {allTags
                  .filter(tag => {
                    const tagName = typeof tag === 'string' ? tag : tag.name;
                    return !filters.tagsSearch || tagName.toLowerCase().includes(filters.tagsSearch.toLowerCase());
                  })
                  .map(tag => {
                    const tagName = typeof tag === 'string' ? tag : tag.name;
                    const tagColor = typeof tag === 'string' ? null : tag.color;
                    const tagState = filters.tagStates?.[tagName];
                    
                    const getTextColor = (hexColor) => {
                      if (!hexColor) return null;
                      const r = parseInt(hexColor.slice(1, 3), 16);
                      const g = parseInt(hexColor.slice(3, 5), 16);
                      const b = parseInt(hexColor.slice(5, 7), 16);
                      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                      return luminance > 0.5 ? 'var(--app-text)' : '#ffffff';
                    };
                    
                    return (
                      <div
                        key={tagName}
                        className="px-4 py-2 cursor-pointer flex items-center gap-2"
                        style={
                          tagState === 'include' 
                            ? { backgroundColor: 'var(--info-bg)', borderLeft: '4px solid var(--app-primary)' }
                            : tagState === 'exclude' 
                            ? { backgroundColor: 'var(--error-bg)', borderLeft: '4px solid var(--error-border)' }
                            : {}
                        }
                        onMouseEnter={(e) => !tagState && (e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)')}
                        onMouseLeave={(e) => !tagState && (e.currentTarget.style.backgroundColor = '')}
                        onClick={() => {
                          const newTagStates = { ...(filters.tagStates || {}) };
                          if (!tagState) {
                            newTagStates[tagName] = 'include';
                          } else if (tagState === 'include') {
                            newTagStates[tagName] = 'exclude';
                          } else {
                            delete newTagStates[tagName];
                          }
                          onFilterChange({ ...filters, tagStates: newTagStates });
                        }}
                      >
                        {tagColor && (
                          <div 
                            className="w-1 h-6 rounded"
                            style={{ backgroundColor: tagColor }}
                          />
                        )}
                        <span className="text-sm flex-grow" style={{ color: 'var(--app-text)' }}>{tagName}</span>
                        {tagState && (
                          <span 
                            className="text-xs px-2 py-0.5 rounded"
                            style={tagState === 'include' 
                              ? { backgroundColor: 'var(--app-primary)', color: 'white' }
                              : { backgroundColor: 'var(--error-border)', color: 'white' }
                            }
                          >
                            {tagState === 'include' ? t('filters.include') : t('filters.exclude')}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>

        {/* Correspondent Filter */}
        <div className="relative">
          <button
            onClick={() => toggleFilter('correspondent')}
            {...getFilterButtonClass('correspondent')}
          >
            <User className="w-4 h-4" />
            {t('filters.correspondent')}
            {filters.correspondents.length > 0 && ` (${filters.correspondents.length})`}
            <ChevronDown className="w-3 h-3" />
          </button>
          {renderFilterDropdown('correspondent', (
            <div>
              <div className="p-3" style={{ borderBottom: '1px solid var(--app-border)' }}>
                <div className="flex gap-1 mb-3">
                  <button
                    className="flex-1 px-3 py-1.5 text-sm rounded"
                    style={ filters.correspondentsMode === 'include' ? { backgroundColor: 'var(--app-primary)', color: 'white' } : { backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text-secondary)' } }
                    onClick={() => onFilterChange({ ...filters, correspondentsMode: 'include' })}
                  >
                    {t('filters.include')}
                  </button>
                  <button
                    className="flex-1 px-3 py-1.5 text-sm rounded"
                    style={ filters.correspondentsMode === 'exclude' ? { backgroundColor: 'var(--error-border)', color: 'white' } : { backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text-secondary)' } }
                    onClick={() => onFilterChange({ ...filters, correspondentsMode: 'exclude' })}
                  >
                    {t('filters.exclude')}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder={t('filters.filterCorrespondents')}
                  value={filters.correspondentsSearch || ''}
                  onChange={(e) => onFilterChange({ ...filters, correspondentsSearch: e.target.value })}
                  className="w-full px-3 py-2 rounded text-sm"
                  style={{ backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'var(--app-text)' }}
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                <div
                  className="px-4 py-2 cursor-pointer"
                  style={filters.correspondents.includes(null) ? { backgroundColor: 'var(--info-bg)' } : {}}
                  onMouseEnter={(e) => !filters.correspondents.includes(null) && (e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)')}
                  onMouseLeave={(e) => !filters.correspondents.includes(null) && (e.currentTarget.style.backgroundColor = '')}
                  onClick={() => {
                    const newCorr = filters.correspondents.includes(null)
                      ? filters.correspondents.filter(c => c !== null)
                      : [...filters.correspondents, null];
                    onFilterChange({ ...filters, correspondents: newCorr });
                  }}
                >
                  <span className="text-sm italic" style={{ color: 'var(--app-text-secondary)' }}>{t('filters.notAssigned')}</span>
                </div>
                {allCorrespondents
                  .filter(corr => !filters.correspondentsSearch || corr.toLowerCase().includes(filters.correspondentsSearch.toLowerCase()))
                  .map(corr => (
                    <div
                      key={corr}
                      className="px-4 py-2 cursor-pointer"
                      style={filters.correspondents.includes(corr) ? { backgroundColor: 'var(--info-bg)' } : {}}
                      onMouseEnter={(e) => !filters.correspondents.includes(corr) && (e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)')}
                      onMouseLeave={(e) => !filters.correspondents.includes(corr) && (e.currentTarget.style.backgroundColor = '')}
                      onClick={() => {
                        const newCorr = filters.correspondents.includes(corr)
                          ? filters.correspondents.filter(c => c !== corr)
                          : [...filters.correspondents, corr];
                        onFilterChange({ ...filters, correspondents: newCorr });
                      }}
                    >
                      <span className="text-sm" style={{ color: 'var(--app-text)' }}>{corr}</span>
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
            {...getFilterButtonClass('documentType')}
          >
            <FileText className="w-4 h-4" />
            {t('filters.documentType')}
            {filters.docTypes.length > 0 && ` (${filters.docTypes.length})`}
            <ChevronDown className="w-3 h-3" />
          </button>
          {renderFilterDropdown('documentType', (
            <div>
              <div className="p-3" style={{ borderBottom: '1px solid var(--app-border)' }}>
                <div className="flex gap-1 mb-3">
                  <button
                    className="flex-1 px-3 py-1.5 text-sm rounded"
                    style={ filters.docTypesMode === 'include' ? { backgroundColor: 'var(--app-primary)', color: 'white' } : { backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text-secondary)' } }
                    onClick={() => onFilterChange({ ...filters, docTypesMode: 'include' })}
                  >
                    {t('filters.include')}
                  </button>
                  <button
                    className="flex-1 px-3 py-1.5 text-sm rounded"
                    style={ filters.docTypesMode === 'exclude' ? { backgroundColor: 'var(--error-border)', color: 'white' } : { backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text-secondary)' } }
                    onClick={() => onFilterChange({ ...filters, docTypesMode: 'exclude' })}
                  >
                    {t('filters.exclude')}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder={t('filters.filterDocumentTypes')}
                  value={filters.docTypesSearch || ''}
                  onChange={(e) => onFilterChange({ ...filters, docTypesSearch: e.target.value })}
                  className="w-full px-3 py-2 rounded text-sm"
                  style={{ backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'var(--app-text)' }}
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                <div
                  className="px-4 py-2 cursor-pointer"
                  style={filters.docTypes.includes(null) ? { backgroundColor: 'var(--info-bg)' } : {}}
                  onMouseEnter={(e) => !filters.docTypes.includes(null) && (e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)')}
                  onMouseLeave={(e) => !filters.docTypes.includes(null) && (e.currentTarget.style.backgroundColor = '')}
                  onClick={() => {
                    const newTypes = filters.docTypes.includes(null)
                      ? filters.docTypes.filter(t => t !== null)
                      : [...filters.docTypes, null];
                    onFilterChange({ ...filters, docTypes: newTypes });
                  }}
                >
                  <span className="text-sm italic" style={{ color: 'var(--app-text-secondary)' }}>{t('filters.notAssigned')}</span>
                </div>
                {allDocTypes
                  .filter(type => !filters.docTypesSearch || type.toLowerCase().includes(filters.docTypesSearch.toLowerCase()))
                  .map(type => (
                    <div
                      key={type}
                      className="px-4 py-2 cursor-pointer"
                      style={filters.docTypes.includes(type) ? { backgroundColor: 'var(--info-bg)' } : {}}
                      onMouseEnter={(e) => !filters.docTypes.includes(type) && (e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)')}
                      onMouseLeave={(e) => !filters.docTypes.includes(type) && (e.currentTarget.style.backgroundColor = '')}
                      onClick={() => {
                        const newTypes = filters.docTypes.includes(type)
                          ? filters.docTypes.filter(t => t !== type)
                          : [...filters.docTypes, type];
                        onFilterChange({ ...filters, docTypes: newTypes });
                      }}
                    >
                      <span className="text-sm" style={{ color: 'var(--app-text)' }}>{type}</span>
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
            {...getFilterButtonClass('dates')}
          >
            <Calendar className="w-4 h-4" />
            {t('filters.datesAdded')}
            <ChevronDown className="w-3 h-3" />
          </button>
          {renderFilterDropdown('dates', (
            <div className="p-3 min-w-[300px]">
              <div className="mb-3">
                <label className="block text-xs mb-1" style={{ color: 'var(--app-text-secondary)' }}>{t('filters.dateRange')}</label>
                <div className="flex gap-2 items-center mb-2">
                  <input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value })}
                    className="flex-1 px-3 py-2 rounded text-sm"
                    style={{ backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'var(--app-text)' }}
                    placeholder={t('filters.from')}
                  />
                  <span style={{ color: 'var(--app-text-secondary)' }}>{t('filters.to')}</span>
                  <input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value })}
                    className="flex-1 px-3 py-2 rounded text-sm"
                    style={{ backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'var(--app-text)' }}
                    placeholder={t('filters.to')}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Limit Filter - Pill style */}
        <select
          value={filters.limit || 10}
          onChange={(e) => onFilterChange({ ...filters, limit: parseInt(e.target.value) })}
          className="px-3 py-1.5 rounded-full text-sm focus:outline-none"
          style={{ backgroundColor: 'transparent', border: '1px solid var(--app-border)', color: 'var(--app-text-secondary)' }}
          onFocus={(e) => e.target.style.borderColor = 'var(--app-primary)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--app-border)'}
          onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--app-bg-secondary)'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>

        {/* Spacer */}
        <div className="flex-grow"></div>

        {/* Reset Filters Button - Pill style */}
        {hasActiveFilters() && (
          <button
            onClick={onResetFilters}
            className="px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all cursor-pointer border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <X className="w-4 h-4" />
            {t('common.resetFilters')}
          </button>
        )}
      </div>
    </div>
  );
}
