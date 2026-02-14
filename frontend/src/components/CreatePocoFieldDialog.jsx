/**
 * @file CreatePocoFieldDialog.jsx
 * @description Confirmation dialog for creating required POCO custom fields
 * (POCO Score, POCO OCR) in the user's Paperless-ngx instance. Displays field
 * purpose, type information, and a note about why the field is required.
 */
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function CreatePocoFieldDialog({ isOpen, onClose, fieldName, fieldType, onConfirm, isCreating }) {
  if (!isOpen) return null;

  const fieldDescriptions = {
    'POCO Score': {
      description: 'The POCO Score is the final actionable score used for classification decisions. It combines OCR content, filename patterns, and Paperless metadata with configurable weights to determine if a document matches a rule.',
      type: 'Integer (0-100)',
      required: true
    },
    'POCO OCR': {
      description: 'The POCO OCR Score represents the transparency score showing how well the document content matches the rule patterns. This score is based purely on OCR text analysis and serves as the source of truth for pattern matching.',
      type: 'Integer (0-100)',
      required: true
    }
  };

  const fieldInfo = fieldDescriptions[fieldName] || {};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Create {fieldName}
              </h2>
              <p className="text-sm text-gray-500">
                Custom field creation in Paperless-ngx
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isCreating}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">What is this field?</h3>
            <p className="text-sm text-gray-600">
              {fieldInfo.description}
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-blue-900">Field Name:</span>
                <span className="text-blue-700">{fieldName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-blue-900">Field Type:</span>
                <span className="text-blue-700">{fieldInfo.type}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-blue-900">Required:</span>
                <span className="text-blue-700">{fieldInfo.required ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              <strong>Note:</strong> This field will be created in your Paperless-ngx instance as a custom field.
              It's required for PocoClass document classification to work correctly.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isCreating}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isCreating ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Creating...
              </>
            ) : (
              'Create Field'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
