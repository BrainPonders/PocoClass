import React, { useState } from 'react';
import { FileText, Eye, FileImage, Copy, Download } from 'lucide-react';
import YamlPreview from './wizard/YamlPreview';

export default function TabbedPreviewPanel({ 
  ruleData,
  ocrContent, 
  documentId,
  onTabChange 
}) {
  const [activeTab, setActiveTab] = useState('yaml');
  const [yamlGenerator, setYamlGenerator] = useState(null);

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const getTabClass = (tab) => {
    const baseClass = 'px-4 py-2 border-b-2 font-medium cursor-pointer transition-colors';
    if (activeTab === tab) {
      return baseClass + ' border-transparent';
    }
    return baseClass + ' border-transparent';
  };

  const getTabStyle = (tab) => {
    if (activeTab === tab) {
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
            disabled={!documentId}
          >
            <div className="flex items-center gap-2">
              <FileImage className="w-4 h-4" />
              <span>PDF Preview</span>
            </div>
          </button>
        </div>

        {/* Action Buttons */}
        {activeTab !== 'pdf' && (
          <div className="flex items-center gap-2 px-4">
            <button 
              onClick={activeTab === 'yaml' ? handleCopyYaml : handleCopyOcr}
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
              onClick={activeTab === 'yaml' ? handleDownloadYaml : handleDownloadOcr}
              className="p-2 rounded transition-colors"
              style={{ 
                backgroundColor: 'transparent',
                color: 'var(--app-text-muted)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title={activeTab === 'yaml' ? 'Download YAML' : 'Download OCR'}
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'yaml' && (
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

        {activeTab === 'ocr' && (
          <div className="h-full p-4">
            {ocrContent ? (
              <div 
                className="p-4 rounded flex h-full"
                style={{ backgroundColor: 'var(--app-bg-secondary)' }}
              >
                <div 
                  className="pr-4 text-right select-none"
                  style={{ borderRight: '1px solid var(--app-border)' }}
                >
                  <pre 
                    className="text-sm font-mono leading-relaxed"
                    style={{ color: 'var(--app-text-muted)' }}
                  >
                    {ocrContent.split('\n').map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </pre>
                </div>
                <div className="flex-1 pl-4 overflow-auto">
                  <pre 
                    className="text-sm font-mono whitespace-pre-wrap break-words leading-relaxed"
                    style={{ color: 'var(--app-text)' }}
                  >
                    {ocrContent}
                  </pre>
                </div>
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

        {activeTab === 'pdf' && (
          <div className="h-full">
            {documentId ? (
              <iframe
                src={`/api/documents/${documentId}/preview?token=${encodeURIComponent(localStorage.getItem('pococlass_session'))}`}
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
