import React, { useState, useEffect } from 'react';
import { FileText, Eye, X, CheckSquare, Square } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PaperlessFilterBar from "@/components/PaperlessFilterBar";
import { apiClient } from "@/api/apiClient";
import { Paperless } from "@/api/entities";
import API_BASE_URL from '@/config/api';
import { useLanguage } from '@/contexts/LanguageContext';

export default function DocumentListSection({
  documents,
  isLoading,
  filters,
  onFiltersChange,
  selectedDocuments = [],
  onSelectionChange,
  allSelected = false,
  onSelectAllChange,
  onViewOCR,
  onViewPDF,
  showSelectionCheckboxes = true,
  showOwnerColumn = false,
  title = null,
  cardClassName = '',
  allTags = [],
  allCorrespondents = [],
  allDocTypes = [],
  onCacheDataLoad,
  noDocumentsMessage = null,
  renderCustomActions = null,
  onRowClick = null
}) {
  const { t } = useLanguage();
  const [localAllTags, setLocalAllTags] = useState(allTags);
  const [localAllCorrespondents, setLocalAllCorrespondents] = useState(allCorrespondents);
  const [localAllDocTypes, setLocalAllDocTypes] = useState(allDocTypes);

  // Load cache data if not provided
  useEffect(() => {
    if (allTags.length === 0 || allCorrespondents.length === 0 || allDocTypes.length === 0) {
      loadCacheData();
    }
  }, [allTags.length, allCorrespondents.length, allDocTypes.length]);

  const loadCacheData = async () => {
    try {
      const [tags, correspondents, docTypes] = await Promise.all([
        Paperless.getTags(),
        Paperless.getCorrespondents(),
        Paperless.getDocumentTypes()
      ]);
      const tagsData = tags.map(t => ({ name: t.name, color: t.color })).sort((a, b) => a.name.localeCompare(b.name));
      const correspondentsData = correspondents.map(c => c.name).sort();
      const docTypesData = docTypes.map(dt => dt.name).sort();
      
      setLocalAllTags(tagsData);
      setLocalAllCorrespondents(correspondentsData);
      setLocalAllDocTypes(docTypesData);
      
      if (onCacheDataLoad) {
        onCacheDataLoad(tagsData, correspondentsData, docTypesData);
      }
    } catch (error) {
      console.error("Error loading cache data:", error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const handleResetFilters = () => {
    onFiltersChange({
      title: '',
      tagStates: {},
      tagsLogic: 'any',
      tagsSearch: '',
      correspondents: [],
      correspondentsMode: 'include',
      correspondentsSearch: '',
      docTypes: [],
      docTypesMode: 'include',
      docTypesSearch: '',
      dateFrom: '',
      dateTo: '',
      limit: filters.limit || 10
    });
  };

  const tagsToUse = allTags.length > 0 ? allTags : localAllTags;
  const correspondentsToUse = allCorrespondents.length > 0 ? allCorrespondents : localAllCorrespondents;
  const docTypesToUse = allDocTypes.length > 0 ? allDocTypes : localAllDocTypes;

  return (
    <Card className={cardClassName}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={title ? '' : 'pt-6'}>
        {/* Paperless-style Filter Bar */}
        <PaperlessFilterBar
          filters={filters}
          onFilterChange={onFiltersChange}
          onResetFilters={handleResetFilters}
          allTags={tagsToUse}
          allCorrespondents={correspondentsToUse}
          allDocTypes={docTypesToUse}
          allCustomFields={[]}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--app-primary)' }}></div>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--app-text-muted)' }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--app-text)' }}>
              {noDocumentsMessage || t('rules.noDocumentsFound')}
            </h3>
            <p style={{ color: 'var(--app-text-muted)' }}>
              {t('rules.noDocumentsDesc')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: 'var(--app-surface-light)' }}>
                <tr>
                  {showSelectionCheckboxes && (
                    <th className="px-2 py-1 text-left">
                      <button 
                        onClick={() => onSelectAllChange?.(!allSelected)} 
                        className="p-1 rounded"
                        style={{ 
                          backgroundColor: 'transparent',
                          color: 'var(--app-text)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        aria-label={allSelected ? 'Deselect all documents' : 'Select all documents'}
                      >
                        {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>
                    </th>
                  )}
                  <th className={`px-2 ${!showSelectionCheckboxes ? 'py-2' : 'py-1'} text-left text-xs font-medium uppercase`} style={{ color: 'var(--app-text-muted)' }} scope="col">{t('table.title')}</th>
                  <th className={`px-2 ${!showSelectionCheckboxes ? 'py-2' : 'py-1'} text-left text-xs font-medium uppercase`} style={{ color: 'var(--app-text-muted)' }} scope="col">{t('table.id')}</th>
                  <th className={`px-2 ${!showSelectionCheckboxes ? 'py-2' : 'py-1'} text-left text-xs font-medium uppercase`} style={{ color: 'var(--app-text-muted)' }} scope="col">{t('table.dateCreated')}</th>
                  <th className={`px-2 ${!showSelectionCheckboxes ? 'py-2' : 'py-1'} text-left text-xs font-medium uppercase`} style={{ color: 'var(--app-text-muted)' }} scope="col">{t('table.added')}</th>
                  <th className={`px-2 ${!showSelectionCheckboxes ? 'py-2' : 'py-1'} text-left text-xs font-medium uppercase`} style={{ color: 'var(--app-text-muted)' }} scope="col">{t('table.correspondent')}</th>
                  <th className={`px-2 ${!showSelectionCheckboxes ? 'py-2' : 'py-1'} text-left text-xs font-medium uppercase`} style={{ color: 'var(--app-text-muted)' }} scope="col">{t('table.documentTypeShort')}</th>
                  <th className={`px-2 ${!showSelectionCheckboxes ? 'py-2' : 'py-1'} text-left text-xs font-medium uppercase`} style={{ color: 'var(--app-text-muted)' }} scope="col">{t('table.cfDocCategory')}</th>
                  <th className={`px-2 ${!showSelectionCheckboxes ? 'py-2' : 'py-1'} text-left text-xs font-medium uppercase`} style={{ color: 'var(--app-text-muted)' }} scope="col">{t('table.tags')}</th>
                  <th className={`px-2 ${!showSelectionCheckboxes ? 'py-2' : 'py-1'} text-center text-xs font-medium uppercase`} style={{ color: 'var(--app-text-muted)' }} scope="col">{t('table.pocoScore')}</th>
                  {showOwnerColumn && (
                    <th className={`px-2 ${!showSelectionCheckboxes ? 'py-2' : 'py-1'} text-left text-xs font-medium uppercase`} style={{ color: 'var(--app-text-muted)' }} scope="col">{t('table.owner')}</th>
                  )}
                  <th className={`px-2 ${!showSelectionCheckboxes ? 'py-2' : 'py-1'} text-center text-xs font-medium uppercase`} style={{ color: 'var(--app-text-muted)' }} scope="col">{t('table.view')}</th>
                  {renderCustomActions && (
                    <th className={`px-2 ${!showSelectionCheckboxes ? 'py-2' : 'py-1'} text-center text-xs font-medium uppercase`} style={{ color: 'var(--app-text-muted)' }} scope="col">{t('table.actions')}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}>
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="cursor-pointer"
                    style={{
                      backgroundColor: selectedDocuments?.includes(doc.id) ? 'rgba(var(--app-primary-light-rgb), 0.3)' : 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (!selectedDocuments?.includes(doc.id)) {
                        e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selectedDocuments?.includes(doc.id)) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      } else {
                        e.currentTarget.style.backgroundColor = 'rgba(var(--app-primary-light-rgb), 0.3)';
                      }
                    }}
                    onClick={() => {
                      if (onRowClick) {
                        onRowClick(doc);
                      } else if (showSelectionCheckboxes) {
                        onSelectionChange?.(doc.id);
                      }
                    }}
                  >
                    {showSelectionCheckboxes && (
                      <td className="px-2 py-1">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            onSelectionChange?.(doc.id); 
                          }} 
                          className="p-1 rounded"
                          style={{ 
                            backgroundColor: 'transparent',
                            color: 'var(--app-text)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          aria-label={selectedDocuments?.includes(doc.id) ? 'Deselect document' : 'Select document'}
                        >
                          {selectedDocuments?.includes(doc.id) ? <CheckSquare className="w-4 h-4" style={{ color: 'var(--app-primary)' }} /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                    )}
                    <td className="px-2 py-1 text-xs" style={{ color: 'var(--app-text)' }}>{doc.title}</td>
                    <td className="px-2 py-1 text-xs" style={{ color: 'var(--app-text-muted)' }}>{doc.id}</td>
                    <td className="px-2 py-1 text-xs" style={{ color: 'var(--app-text-muted)' }}>{formatDate(doc.created)}</td>
                    <td className="px-2 py-1 text-xs" style={{ color: 'var(--app-text-muted)' }}>{formatDate(doc.added || doc.created)}</td>
                    <td className="px-2 py-1 text-xs" style={{ color: 'var(--app-text-muted)' }}>{doc.correspondent || '-'}</td>
                    <td className="px-2 py-1 text-xs" style={{ color: 'var(--app-text-muted)' }}>{doc.documentType || '-'}</td>
                    <td className="px-2 py-1 text-xs" style={{ color: 'var(--app-text-muted)' }}>{doc.docCategory || '-'}</td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      {doc.tags && doc.tags.length > 0 ? (
                        doc.tags.map((tag, i) => {
                          const tagObj = tagsToUse.find(t => t.name === tag);
                          const tagColor = tagObj?.color || '#1e40af';
                          
                          const getTextColor = (hexColor) => {
                            const r = parseInt(hexColor.slice(1, 3), 16);
                            const g = parseInt(hexColor.slice(3, 5), 16);
                            const b = parseInt(hexColor.slice(5, 7), 16);
                            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                            return luminance > 0.5 ? '#111827' : '#FFFFFF';
                          };
                          
                          return (
                            <Badge 
                              key={i} 
                              className="text-xs mr-1"
                              style={{ 
                                backgroundColor: tagColor,
                                color: getTextColor(tagColor)
                              }}
                            >
                              {tag}
                            </Badge>
                          );
                        })
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--app-text-muted)' }}>-</span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-center">
                      {doc.pocoScore !== null && doc.pocoScore !== undefined ? (
                        <span className={`text-xs font-semibold ${
                          doc.pocoScore >= 80 ? 'text-green-600' : 
                          doc.pocoScore >= 1 ? 'text-amber-600' : 
                          'text-gray-400'
                        }`}>
                          {doc.pocoScore.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    {showOwnerColumn && (
                      <td className="px-2 py-1 text-xs" style={{ color: 'var(--app-text-muted)' }}>{doc.owner || '-'}</td>
                    )}
                    <td className="px-2 py-1 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onViewOCR?.(doc); }}
                          className="btn btn-ghost btn-sm p-1"
                          aria-label="View OCR content"
                        >
                          <FileText className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onViewPDF?.(doc); }}
                          className="btn btn-ghost btn-sm p-1"
                          aria-label="View PDF"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    {renderCustomActions && (
                      <td className="px-2 py-1 text-center">
                        {renderCustomActions(doc)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
