import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Calendar, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LogFilterBar({ filters, onFilterChange }) {
  const { t } = useLanguage();
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

  const hasActiveFilters = () => {
    return filters.type !== 'all' ||
           filters.level !== 'all' ||
           filters.dateFrom ||
           filters.dateTo ||
           filters.search;
  };

  const getFilterButtonClass = (filterName) => {
    let hasValue = false;
    switch(filterName) {
      case 'type': hasValue = filters.type !== 'all'; break;
      case 'level': hasValue = filters.level !== 'all'; break;
      case 'dates': hasValue = filters.dateFrom || filters.dateTo; break;
      default: hasValue = false;
    }

    return {
      className: "px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1 border",
      style: hasValue ? { backgroundColor: 'var(--info-bg)', color: 'var(--info-text)', borderColor: 'var(--info-border)' } : {}
    };
  };

  const renderFilterDropdown = (filterName, content) => {
    if (openFilter !== filterName) return null;

    return (
      <div
        ref={el => dropdownRefs.current[filterName] = el}
        className="absolute top-full left-0 mt-1 rounded-lg shadow-xl z-50 min-w-[250px]"
        style={{ backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)' }}
      >
        {content}
      </div>
    );
  };

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-3 mb-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
        {/* Title/Search Filter */}
        <div className="flex items-center gap-2 px-3 py-2">
          <label className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--app-text-secondary)' }}>{t('common.search')}:</label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
              placeholder={t('filters.searchLogsPlaceholder')}
              className="px-3 py-2 rounded text-sm w-48 focus:outline-none"
              style={{ backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'var(--app-text)' }}
              onFocus={(e) => e.target.style.borderColor = 'var(--app-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--app-border)'}
            />
            {filters.search && (
              <button
                onClick={() => onFilterChange({ ...filters, search: '' })}
                className="absolute right-2"
                style={{ color: 'var(--app-text-muted)' }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Type Filter */}
        <div className="relative px-2">
          <button
            onClick={() => setOpenFilter(openFilter === 'type' ? null : 'type')}
            {...getFilterButtonClass('type')}
          >
            {t('filters.type')}
            {filters.type !== 'all' && ` (1)`}
            <ChevronDown className="w-3 h-3" />
          </button>
          {renderFilterDropdown('type', (
            <div className="py-2 min-w-[200px]">
              {[
                { value: 'all', label: t('filters.allTypes') },
                { value: 'rule_execution', label: t('filters.ruleExecution') },
                { value: 'classification', label: t('filters.classification') },
                { value: 'system', label: t('filters.system') },
                { value: 'error', label: t('filters.errorType') },
                { value: 'paperless_api', label: t('filters.paperlessApi') }
              ].map(option => (
                <div
                  key={option.value}
                  className="px-4 py-2 cursor-pointer"
                  style={filters.type === option.value ? { backgroundColor: 'var(--info-bg)' } : {}}
                  onMouseEnter={(e) => filters.type !== option.value && (e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)')}
                  onMouseLeave={(e) => filters.type !== option.value && (e.currentTarget.style.backgroundColor = filters.type === option.value ? 'var(--info-bg)' : '')}
                  onClick={() => {
                    onFilterChange({ ...filters, type: option.value });
                    setOpenFilter(null);
                  }}
                >
                  <span className="text-sm" style={{ color: 'var(--app-text)' }}>
                    {filters.type === option.value && '✓ '}
                    {option.label}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Level Filter */}
        <div className="relative px-2">
          <button
            onClick={() => setOpenFilter(openFilter === 'level' ? null : 'level')}
            {...getFilterButtonClass('level')}
          >
            <AlertCircle className="w-4 h-4" />
            {t('filters.level')}
            {filters.level !== 'all' && ` (1)`}
            <ChevronDown className="w-3 h-3" />
          </button>
          {renderFilterDropdown('level', (
            <div className="py-2 min-w-[180px]">
              {[
                { value: 'all', label: t('filters.allLevels') },
                { value: 'info', label: t('filters.info') },
                { value: 'success', label: t('filters.success') },
                { value: 'warning', label: t('filters.warning') },
                { value: 'error', label: t('filters.errorType') }
              ].map(option => (
                <div
                  key={option.value}
                  className="px-4 py-2 cursor-pointer"
                  style={filters.level === option.value ? { backgroundColor: 'var(--info-bg)' } : {}}
                  onMouseEnter={(e) => filters.level !== option.value && (e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)')}
                  onMouseLeave={(e) => filters.level !== option.value && (e.currentTarget.style.backgroundColor = filters.level === option.value ? 'var(--info-bg)' : '')}
                  onClick={() => {
                    onFilterChange({ ...filters, level: option.value });
                    setOpenFilter(null);
                  }}
                >
                  <span className="text-sm" style={{ color: 'var(--app-text)' }}>
                    {filters.level === option.value && '✓ '}
                    {option.label}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Dates Filter */}
        <div className="relative px-2">
          <button
            onClick={() => setOpenFilter(openFilter === 'dates' ? null : 'dates')}
            {...getFilterButtonClass('dates')}
          >
            <Calendar className="w-4 h-4" />
            {t('filters.dates')}
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

      </div>

      {/* Status Bar - Reset Button */}
      <div className="flex items-center justify-end gap-4 pt-2">
        {/* Reset Filters Button */}
        {hasActiveFilters() && (
          <button
            onClick={() => onFilterChange({
              type: 'all',
              level: 'all',
              dateFrom: '',
              dateTo: '',
              search: ''
            })}
            className="px-4 py-2 rounded text-sm font-medium flex items-center gap-2 transition-all cursor-pointer"
            style={{ backgroundColor: 'var(--error-bg)', color: 'var(--error-text)' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <X className="w-4 h-4" />
            {t('common.resetFilters')}
          </button>
        )}
      </div>
    </div>
  );
}
