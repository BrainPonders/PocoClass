import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Calendar, AlertCircle } from 'lucide-react';

export default function LogFilterBar({ filters, onFilterChange }) {
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

    const baseClass = "px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1 ";
    if (hasValue) {
      return baseClass + "bg-blue-600 text-white hover:bg-blue-700";
    }
    return baseClass + "bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300";
  };

  const renderFilterDropdown = (filterName, content) => {
    if (openFilter !== filterName) return null;

    return (
      <div
        ref={el => dropdownRefs.current[filterName] = el}
        className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-300 z-50 min-w-[250px]"
      >
        {content}
      </div>
    );
  };

  return (
    <div className="mb-4">
      <div className="flex items-center gap-3 flex-wrap bg-white p-4 rounded-lg border border-gray-200">
        {/* Title/Search Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Search:</label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
              placeholder="Search logs..."
              className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400 w-48 focus:outline-none focus:border-blue-500"
            />
            {filters.search && (
              <button
                onClick={() => onFilterChange({ ...filters, search: '' })}
                className="absolute right-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Type Filter */}
        <div className="relative">
          <button
            onClick={() => setOpenFilter(openFilter === 'type' ? null : 'type')}
            className={getFilterButtonClass('type')}
          >
            Type
            {filters.type !== 'all' && ` (1)`}
            <ChevronDown className="w-3 h-3" />
          </button>
          {renderFilterDropdown('type', (
            <div className="py-2 min-w-[200px]">
              {[
                { value: 'all', label: 'All Types' },
                { value: 'rule_execution', label: 'Rule Execution' },
                { value: 'classification', label: 'Classification' },
                { value: 'system', label: 'System' },
                { value: 'error', label: 'Error' },
                { value: 'paperless_api', label: 'Paperless API' }
              ].map(option => (
                <div
                  key={option.value}
                  className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${filters.type === option.value ? 'bg-blue-50' : ''}`}
                  onClick={() => {
                    onFilterChange({ ...filters, type: option.value });
                    setOpenFilter(null);
                  }}
                >
                  <span className="text-sm text-gray-900">
                    {filters.type === option.value && '✓ '}
                    {option.label}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Level Filter */}
        <div className="relative">
          <button
            onClick={() => setOpenFilter(openFilter === 'level' ? null : 'level')}
            className={getFilterButtonClass('level')}
          >
            <AlertCircle className="w-4 h-4" />
            Level
            {filters.level !== 'all' && ` (1)`}
            <ChevronDown className="w-3 h-3" />
          </button>
          {renderFilterDropdown('level', (
            <div className="py-2 min-w-[180px]">
              {[
                { value: 'all', label: 'All Levels' },
                { value: 'info', label: 'Info' },
                { value: 'success', label: 'Success' },
                { value: 'warning', label: 'Warning' },
                { value: 'error', label: 'Error' }
              ].map(option => (
                <div
                  key={option.value}
                  className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${filters.level === option.value ? 'bg-blue-50' : ''}`}
                  onClick={() => {
                    onFilterChange({ ...filters, level: option.value });
                    setOpenFilter(null);
                  }}
                >
                  <span className="text-sm text-gray-900">
                    {filters.level === option.value && '✓ '}
                    {option.label}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Dates Filter */}
        <div className="relative">
          <button
            onClick={() => setOpenFilter(openFilter === 'dates' ? null : 'dates')}
            className={getFilterButtonClass('dates')}
          >
            <Calendar className="w-4 h-4" />
            Dates
            <ChevronDown className="w-3 h-3" />
          </button>
          {renderFilterDropdown('dates', (
            <div className="p-3 min-w-[300px]">
              <div className="mb-3">
                <label className="block text-xs text-gray-600 mb-1">Date Range</label>
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
            className="ml-auto text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Reset filters
          </button>
        )}
      </div>
    </div>
  );
}
