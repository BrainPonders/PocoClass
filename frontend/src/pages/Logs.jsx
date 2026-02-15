/**
 * @file Logs.jsx
 * @description Log viewer page displaying system, rule execution, classification,
 * and Paperless API logs with filtering by type, level, date range, and search text.
 * Supports CSV export of filtered results and manual refresh.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { FileStack, Download, RefreshCw } from 'lucide-react';
import { Log } from '@/api/entities';
import { useLanguage } from '@/contexts/LanguageContext';
import LogFilterBar from '@/components/LogFilterBar';
import PageLayout from '@/components/PageLayout';

export default function Logs() {
  const { t } = useLanguage();
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

  // Apply all active filters (type, level, date range, search) to the raw log data
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

  // Load logs on mount
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Re-apply filters whenever logs or filter criteria change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const getLevelBadgeStyle = (level) => {
    const styles = {
      info: { backgroundColor: 'var(--info-bg)', color: 'var(--info-text)' },
      success: { backgroundColor: '#dcfce7', color: '#166534' },
      warning: { backgroundColor: '#fef3c7', color: '#92400e' },
      error: { backgroundColor: '#fee2e2', color: '#991b1b' }
    };
    return styles[level] || styles.info;
  };

  const getTypeBadgeStyle = (type) => {
    const styles = {
      rule_execution: { backgroundColor: '#f3e8ff', color: '#6b21a8' },
      classification: { backgroundColor: 'var(--info-bg)', color: 'var(--info-text)' },
      system: { backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text)' },
      error: { backgroundColor: '#fee2e2', color: '#991b1b' },
      paperless_api: { backgroundColor: '#e0e7ff', color: '#3730a3' }
    };
    return styles[type] || styles.system;
  };

  // Export currently filtered logs as a CSV file download
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--info-text)' }}></div>
      </div>
    );
  }

  return (
    <PageLayout 
      title={t('logs.title')}
      subtitle={t('logs.description')}
      actions={
        <>
          <button onClick={loadLogs} className="btn btn-secondary">
            <RefreshCw className="w-4 h-4" />
            {t('logs.refresh')}
          </button>
          <button onClick={exportLogs} className="btn btn-primary">
            <Download className="w-4 h-4" />
            {t('logs.exportCSV')}
          </button>
        </>
      }
    >

      <LogFilterBar 
        filters={filters}
        onFilterChange={setFilters}
      />

      <div className="card">
        <div className="mb-4">
          <p className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>
            {t('logs.showing', { count: filteredLogs.length, total: logs.length })}
          </p>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <FileStack className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--app-text-secondary)' }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--app-text)' }}>{t('logs.noLogsFound')}</h3>
            <p style={{ color: 'var(--app-text-secondary)' }}>Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div 
                key={log.id}
                className="rounded-lg p-4 transition-colors"
                style={{ border: '1px solid var(--app-border)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--app-bg-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span 
                        className="px-2 py-1 rounded text-xs font-semibold"
                        style={getLevelBadgeStyle(log.level)}
                      >
                        {log.level.toUpperCase()}
                      </span>
                      <span 
                        className="px-2 py-1 rounded text-xs font-semibold"
                        style={getTypeBadgeStyle(log.type)}
                      >
                        {log.type.replace('_', ' ')}
                      </span>
                      {log.source === 'paperless_api' && (
                        <span 
                          className="px-2 py-1 rounded text-xs font-semibold"
                          style={{ backgroundColor: '#e0e7ff', color: '#3730a3' }}
                        >
                          Paperless API
                        </span>
                      )}
                      <span className="text-xs" style={{ color: 'var(--app-text-secondary)' }}>
                        {formatDate(log.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--app-text)' }}>{log.message}</p>
                    {(log.rule_name || log.document_name) && (
                      <div className="text-xs space-y-1" style={{ color: 'var(--app-text-secondary)' }}>
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
    </PageLayout>
  );
}