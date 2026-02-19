/**
 * @file PdfViewerModal.jsx
 * @description Full-screen modal for viewing PDF documents with zoom controls
 * (50%–200%), reset-to-fit, and download functionality. Renders the PDF in an
 * iframe for native browser PDF rendering.
 */
import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, Download, Maximize2 } from 'lucide-react';

export default function PdfViewerModal({ isOpen, onClose, documentUrl, documentName }) {
  const [zoom, setZoom] = useState(100);

  if (!isOpen) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = documentUrl;
    link.download = documentName || 'document.pdf';
    link.click();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content max-w-6xl h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{documentName || 'Document Preview'}</h2>
            <p className="text-sm text-gray-500">PDF Document</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
              <button 
                onClick={() => setZoom(z => Math.max(50, z - 10))}
                className="btn btn-ghost btn-sm p-1"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium min-w-[4rem] text-center">{zoom}%</span>
              <button 
                onClick={() => setZoom(z => Math.min(200, z + 10))}
                className="btn btn-ghost btn-sm p-1"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setZoom(100)}
                className="btn btn-ghost btn-sm p-1"
                title="Reset zoom"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
            <button 
              onClick={handleDownload}
              className="btn btn-secondary btn-sm"
            >
              <Download className="w-4 h-4" />
            </button>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          <div 
            className="bg-white shadow-lg mx-auto"
            style={{ 
              width: `${zoom}%`,
              minWidth: '400px'
            }}
          >
            <iframe
              src={documentUrl}
              className="w-full h-full min-h-[800px]"
              title={documentName}
            />
          </div>
        </div>
      </div>
    </div>
  );
}