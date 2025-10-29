import React, { useState, useEffect, useCallback } from 'react';
import { FileStack, Download, RefreshCw } from 'lucide-react';
import { Log } from '@/api/entities';
import { useTranslation } from '@/components/translations';
import LogFilterBar from '@/components/LogFilterBar';

export default function Logs() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: 'all',
    level: 'all',
    dateFrom: '',
    dateTo: '',
    search: ''
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    return date.toLocaleDateString('en-US', options);
  };

  const formatDateForCSV = (dateString) => {
    const date = new Date(dateString);
    return date.toISOString().replace('T', ' ').substring(0, 19);
  };

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedLogs = await Log.list({ order: '-timestamp', limit: 500 });
      setLogs(fetchedLogs);
    } catch (error) {
      console.error('Error loading logs:', error);
    }
    setLoading(false);
  }, []);

  const applyFilters = useCallback(() => {
    let filtered = [...logs];

    if (filters.type !== 'all') {
      filtered = filtered.filter(log => log.type === filters.type);
    }

    if (filters.level !== 'all') {
      filtered = filtered.filter(log => log.level === filters.level);
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(log => 
        new Date(log.timestamp) >= fromDate
      );
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(log => 
        new Date(log.timestamp) <= toDate
      );
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(log => 
        log.message?.toLowerCase().includes(searchLower) ||
        log.rule_name?.toLowerCase().includes(searchLower) ||
        log.document_name?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredLogs(filtered);
  }, [logs, filters]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const getLevelBadgeClass = (level) => {
    const classes = {
      info: 'bg-blue-100 text-blue-800',
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800'
    };
    return classes[level] || classes.info;
  };

  const getTypeBadgeClass = (type) => {
    const classes = {
      rule_execution: 'bg-purple-100 text-purple-800',
      classification: 'bg-blue-100 text-blue-800',
      system: 'bg-gray-100 text-gray-800',
      error: 'bg-red-100 text-red-800',
      paperless_api: 'bg-indigo-100 text-indigo-800'
    };
    return classes[type] || classes.system;
  };

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Type', 'Level', 'Rule', 'Document', 'POCO Score', 'Message'],
      ...filteredLogs.map(log => [
        formatDateForCSV(log.timestamp),
        log.type,
        log.level,
        log.rule_name || '',
        log.document_name || '',
        log.poco_score || '',
        log.message
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const today = new Date().toISOString().split('T')[0];
    link.download = `pococlass_logs_${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setFilters({
      type: 'all',
      level: 'all',
      dateFrom: '',
      dateTo: '',
      search: ''
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileStack className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('logs_title')}</h1>
              <p className="text-gray-500">{t('logs_subtitle')}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={loadLogs} className="btn btn-secondary">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button onClick={exportLogs} className="btn btn-primary">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <LogFilterBar 
        filters={filters}
        onFilterChange={setFilters}
      />

      <div className="card">
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Showing {filteredLogs.length} of {logs.length} logs
          </p>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <FileStack className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">{t('logs_no_logs')}</h3>
            <p className="text-gray-500">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div 
                key={log.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getLevelBadgeClass(log.level)}`}>
                        {t(`logs_level_${log.level}`)}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getTypeBadgeClass(log.type)}`}>
                        {log.type.replace('_', ' ')}
                      </span>
                      {log.source === 'paperless_api' && (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-indigo-100 text-indigo-800">
                          Paperless API
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatDate(log.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">{log.message}</p>
                    {(log.rule_name || log.document_name) && (
                      <div className="text-xs text-gray-600 space-y-1">
                        {log.rule_name && <div>Rule: {log.rule_name}</div>}
                        {log.document_name && <div>Document: {log.document_name}</div>}
                        {log.poco_score !== null && log.poco_score !== undefined && (
                          <div>POCO Score: {log.poco_score}%</div>
                        )}
                        {log.poco_ocr !== null && log.poco_ocr !== undefined && (
                          <div>POCO OCR: {log.poco_ocr}%</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}