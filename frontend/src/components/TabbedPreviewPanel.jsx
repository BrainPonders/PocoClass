/**
 * @file TabbedPreviewPanel.jsx
 * @description Tabbed preview panel used in the rule editor to display three views:
 * - YAML Preview: live-rendered YAML output of the current rule configuration
 * - OCR Content: raw OCR text with line numbers and optional highlight matching
 * - PDF Preview: embedded PDF viewer via iframe or custom content
 * Supports copy-to-clipboard and file download for YAML and OCR tabs.
 */
import React, { useState, useEffect } from 'react';
import { FileText, Eye, FileImage, Copy, Download } from 'lucide-react';
import YamlPreview from './wizard/YamlPreview';

export default function TabbedPreviewPanel({ 
  ruleData,
  ocrContent, 
  documentId,
  onTabChange,
  pdfContent,
  externalActiveTab,
  ocrHighlights = []
}) {
  const [activeTab, setActiveTab] = useState('yaml');
  
  // Allow parent to control active tab externally or fall back to local state
  const displayedActiveTab = externalActiveTab !== undefined ? externalActiveTab : activeTab;
  const [yamlGenerator, setYamlGenerator] = useState(null);

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const getTabClass = (tab) => {
    const baseClass = 'px-4 py-2 border-b-2 font-medium cursor-pointer transition-colors';
    if (displayedActiveTab === tab) {
      return baseClass + ' border-transparent';
    }
    return baseClass + ' border-transparent';
  };

  const getTabStyle = (tab) => {
    if (displayedActiveTab === tab) {
      return {
        borderBottomColor: 'var(--app-primary)',
        color: 'var(--info-text)'
      };
    }
    return {
      color: 'var(--app-text-muted)'
    };
  };

  const handleCopyYaml = async () => {
    if (yamlGenerator) {
      try {
        await navigator.clipboard.writeText(yamlGenerator());
      } catch (err) {
        console.error('Failed to copy YAML:', err);
      }
    }
  };

  const handleDownloadYaml = () => {
    if (yamlGenerator) {
      const yamlContent = yamlGenerator();
      const blob = new Blob([yamlContent], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${ruleData.ruleId || 'rule'}.yaml`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleCopyOcr = async () => {
    if (ocrContent) {
      try {
        await navigator.clipboard.writeText(ocrContent);
      } catch (err) {
        console.error('Failed to copy OCR content:', err);
      }
    }
  };

  const handleDownloadOcr = () => {
    if (ocrContent) {
      const blob = new Blob([ocrContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ocr-content-${documentId || 'document'}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div 
      className="flex flex-col h-full rounded-lg"
      style={{ 
        backgroundColor: 'var(--app-surface)', 
        border: '1px solid var(--app-border)' 
      }}
    >
      {/* Tab Headers */}
      <div 
        className="flex justify-between items-center"
        style={{ 
          borderBottom: '1px solid var(--app-border)', 
          backgroundColor: 'var(--app-surface-light)' 
        }}
      >
        <div className="flex">
          <button
            onClick={() => handleTabClick('yaml')}
            className={getTabClass('yaml')}
            style={getTabStyle('yaml')}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>YAML Preview</span>
            </div>
          </button>
          <button
            onClick={() => handleTabClick('ocr')}
            className={getTabClass('ocr')}
            style={getTabStyle('ocr')}
            disabled={!ocrContent}
            title={ocrContent ? 'View OCR content' : 'OCR content not available'}
          >
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span>OCR Content</span>
            </div>
          </button>
          <button
            onClick={() => handleTabClick('pdf')}
            className={getTabClass('pdf')}
            style={getTabStyle('pdf')}
            disabled={!documentId && !pdfContent}
            title={documentId || pdfContent ? 'View PDF preview' : 'PDF preview not available'}
          >
            <div className="flex items-center gap-2">
              <FileImage className="w-4 h-4" />
              <span>PDF Preview</span>
            </div>
          </button>
        </div>

        {/* Action Buttons */}
        {displayedActiveTab !== 'pdf' && (
          <div className="flex items-center gap-2 px-4">
            <button 
              onClick={displayedActiveTab === 'yaml' ? handleCopyYaml : handleCopyOcr}
              className="p-2 rounded transition-colors"
              style={{ 
                backgroundColor: 'transparent',
                color: 'var(--app-text-muted)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title="Copy to clipboard"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button 
              onClick={displayedActiveTab === 'yaml' ? handleDownloadYaml : handleDownloadOcr}
              className="p-2 rounded transition-colors"
              style={{ 
                backgroundColor: 'transparent',
                color: 'var(--app-text-muted)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title={displayedActiveTab === 'yaml' ? 'Download YAML' : 'Download OCR'}
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {displayedActiveTab === 'yaml' && (
          <div className="h-full">
            {ruleData ? (
              <YamlPreview ruleData={ruleData} onGeneratorReady={setYamlGenerator} />
            ) : (
              <div 
                className="flex items-center justify-center h-full p-4"
                style={{ color: 'var(--app-text-muted)' }}
              >
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--app-text-muted)', opacity: 0.5 }} />
                  <p>No YAML content available</p>
                </div>
              </div>
            )}
          </div>
        )}

        {displayedActiveTab === 'ocr' && (
          <div className="h-full p-4">
            {ocrContent ? (
              <div className="p-4 rounded h-full overflow-auto" style={{ backgroundColor: 'var(--app-bg-secondary)' }}>
                <pre className="text-sm font-mono leading-relaxed" style={{ color: 'var(--app-text)' }}>
                  {ocrContent.split('\n').map((line, i) => (
                    <div key={i} className="flex">
                      <span className="select-none text-right pr-4 shrink-0" style={{ color: 'var(--app-text-muted)', minWidth: '3ch', borderRight: '1px solid var(--app-border)', marginRight: '16px' }}>
                        {i + 1}
                      </span>
                      {/* Highlight OCR lines containing any of the highlight strings */}
                      <span
                        className="whitespace-pre-wrap break-words"
                        style={ocrHighlights.length > 0 && ocrHighlights.some(h => line.includes(h)) ? {
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          border: '2px solid #ef4444',
                          borderRadius: '4px',
                          padding: '2px 4px',
                          display: 'inline-block'
                        } : undefined}
                      >{line || '\u00A0'}</span>
                    </div>
                  ))}
                </pre>
              </div>
            ) : (
              <div 
                className="flex items-center justify-center h-full"
                style={{ color: 'var(--app-text-muted)' }}
              >
                <div className="text-center">
                  <Eye className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--app-text-muted)', opacity: 0.5 }} />
                  <p>No OCR content available</p>
                  <p className="text-sm mt-2">Select a document to view its OCR content</p>
                </div>
              </div>
            )}
          </div>
        )}

        {displayedActiveTab === 'pdf' && (
          <div className="h-full">
            {pdfContent ? (
              pdfContent
            ) : documentId ? (
              <iframe
                src={`/api/documents/${documentId}/preview`}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            ) : (
              <div 
                className="flex items-center justify-center h-full"
                style={{ color: 'var(--app-text-muted)' }}
              >
                <div className="text-center">
                  <FileImage className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--app-text-muted)', opacity: 0.5 }} />
                  <p>No PDF preview available</p>
                  <p className="text-sm mt-2">Select a document to view its PDF</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
