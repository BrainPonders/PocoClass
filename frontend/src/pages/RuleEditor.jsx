
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Rule } from "@/api/entities";
import { apiClient } from "@/api/apiClient";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Eye, FileText, X } from 'lucide-react';
import { useTranslation } from '@/components/translations';
import { useToast } from '@/components/ToastContainer';
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext';
import ConfirmDialog from '@/components/ConfirmDialog';
import PdfViewerModal from '@/components/PdfViewerModal';
import LoadingButton from '@/components/LoadingButton';

import StepProgress from '../components/wizard/StepProgress';
import YamlPreview from '../components/wizard/YamlPreview';
import BasicInfoStep from '../components/wizard/steps/BasicInfoStep';
import OcrIdentifiersStep from '../components/wizard/steps/OcrIdentifiersStep';
import DocumentClassificationsStep from '../components/wizard/steps/DocumentClassificationsStep';
import FilenameIdentificationStep from '../components/wizard/steps/FilenameIdentificationStep';
import DataVerificationStep from '../components/wizard/steps/DataVerificationStep';
import SummaryStep from '../components/wizard/steps/SummaryStep';

// Helper hook for debouncing values
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function RuleEditor() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { hasUnsavedChanges, setHasUnsavedChanges } = useUnsavedChanges();
  const ruleId = searchParams.get('id');
  const selectedFile = searchParams.get('selectedFile');
  const selectedDocumentId = searchParams.get('docId');
  
  const [currentStep, setCurrentStep] = useState(1);
  const [showYamlPreview, setShowYamlPreview] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [stepEdited, setStepEdited] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [ocrContent, setOcrContent] = useState('');
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [selectedDocId, setSelectedDocId] = useState(null);
  
  const [ruleData, setRuleData] = useState({
    ruleName: '',
    ruleId: '',
    ruleIdManuallyEdited: false,
    description: '',
    threshold: 75,
    ocrThreshold: 75,
    ocrIdentifiers: [],
    ocrMultiplier: 3,
    filenameMultiplier: 1,
    verificationMultiplier: 0.5,
    sourceDocumentId: selectedDocumentId || null,  // Save original document ID for OCR/PDF preview
    predefinedData: {
      title: '',
      archiveSerialNumber: '',
      dateCreated: '',
      correspondent: '',
      documentType: '',
      storagePath: '',
      tags: [],
      customFields: {}
    },
    dynamicData: {
      extractionRules: []
    },
    filenamePatterns: {
      patterns: [],
      dateFormats: []
    },
    verification: {
      requiredFields: [],
      validationRules: [],
      enabledFields: {}
    },
    status: 'new',
    originalStatus: null  // Track original status for edit detection
  });

  const [stepStatus, setStepStatus] = useState({
    1: 'untouched',
    2: 'untouched',
    3: 'untouched', 
    4: 'untouched',
    5: 'untouched',
    6: 'untouched'
  });

  const [showInfoBoxes, setShowInfoBoxes] = useState({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    6: true
  });

  // Warn before leaving if unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Load rule only once on mount if ruleId exists
  useEffect(() => {
    if (!ruleId) return;
    
    let isMounted = true;
    
    const loadRule = async () => {
      setIsLoading(true);
      try {
        const rule = await Rule.get(ruleId);
        if (isMounted) {
          setRuleData({
            ...rule,
            ocrIdentifiers: rule.ocrIdentifiers || [],
            ocrThreshold: rule.ocrThreshold || 75,
            ocrMultiplier: rule.ocrMultiplier || 3,
            filenameMultiplier: rule.filenameMultiplier || 1,
            verificationMultiplier: rule.verificationMultiplier || 0.5,
            sourceDocumentId: rule.sourceDocumentId || null,  // Preserve original document ID for OCR/PDF preview
            predefinedData: {
              ...(rule.predefinedData || {}),
              tags: rule.predefinedData?.tags || [],
            },
            dynamicData: {
              extractionRules: rule.dynamicData?.extractionRules || []
            },
            filenamePatterns: {
              patterns: rule.filenamePatterns?.patterns || [],
              dateFormats: rule.filenamePatterns?.dateFormats || []
            },
            verification: {
              requiredFields: rule.verification?.requiredFields || [],
              validationRules: rule.verification?.validationRules || [],
              enabledFields: rule.verification?.enabledFields || {}
            },
            ruleIdManuallyEdited: true,
            originalStatus: rule.status  // Store original status for edit detection
          });
          setHasUnsavedChanges(false);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error loading rule:', error);
          showToast(t('editor_save_error'), 'error');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadRule();
    
    return () => {
      isMounted = false;
    };
  }, [ruleId]); // Only depend on ruleId to prevent infinite loops

  const updateRuleData = useCallback((section, data, isUserChange = true) => {
    setRuleData(prev => {
        const newData = section === '' 
          ? { ...prev, ...data }
          : {
              ...prev,
              [section]: typeof data === 'object' && data !== null && !Array.isArray(data)
                  ? { ...(prev[section] || {}), ...data }
                  : data
          };
        
        // If user is changing status, update originalStatus to track this as the new baseline
        if (isUserChange && section === 'status') {
          newData.originalStatus = data;
        }
        // If editing an active/inactive rule (not changing status field), revert to "new"
        else if (isUserChange && section !== 'status' && prev.originalStatus && (prev.originalStatus === 'active' || prev.originalStatus === 'inactive')) {
          newData.status = 'new';
        }
        // Also check current status if originalStatus wasn't set (new rule that was just activated)
        else if (isUserChange && section !== 'status' && !prev.originalStatus && (prev.status === 'active' || prev.status === 'inactive')) {
          newData.status = 'new';
        }
        
        return newData;
    });
    
    // Only mark as edited if this is a user change (not initialization)
    if (isUserChange) {
      setStepEdited(true);
      setHasUnsavedChanges(true);
      setStepStatus(prev => ({
        ...prev,
        [currentStep]: prev[currentStep] === 'completed' ? 'completed' : 'edited'
      }));
    }
  }, [currentStep]);

  const hasStepData = useCallback((step) => {
    switch(step) {
      case 1:
        return !!(ruleData.ruleName || ruleData.description);
      case 2:
        const hasOcrData = ruleData.ocrIdentifiers?.some(group => 
          group.conditions?.some(c => c.pattern && c.pattern.trim() !== '')
        );
        return hasOcrData || false;
      case 3:
        return !!(
          ruleData.predefinedData?.correspondent || 
          ruleData.predefinedData?.documentType ||
          (ruleData.predefinedData?.tags?.length || 0) > 0 ||
          (ruleData.dynamicData?.extractionRules?.length || 0) > 0
        );
      case 4:
        const hasPatterns = (ruleData.filenamePatterns?.patterns?.length || 0) > 0;
        const hasFormats = (ruleData.filenamePatterns?.dateFormats?.length || 0) > 0;
        return hasPatterns || hasFormats;
      case 5:
        const enabledFields = ruleData.verification?.enabledFields || {};
        return Object.values(enabledFields).some(Boolean);
      case 6:
        return true;
      default:
        return false;
    }
  }, [ruleData]);

  const validateStep = useCallback((step) => {
    switch(step) {
      case 1:
        return !!(ruleData.ruleName && ruleData.description);
      case 2:
        const filledGroups = ruleData.ocrIdentifiers?.filter(group => 
          group.conditions?.some(c => c.pattern && c.pattern.trim() !== '')
        ).length || 0;
        return filledGroups >= 3;
      case 3:
        return !!(ruleData.predefinedData?.correspondent || ruleData.predefinedData?.documentType);
      case 4:
        return true; // Filename step is optional
      case 5:
        return true; // Verification step is optional
      case 6:
        return true;
      default:
        return false;
    }
  }, [ruleData]);

  const canFinish = () => {
    return validateStep(1) && validateStep(2) && validateStep(3);
  };

  const handleSave = async () => {
    if (!canFinish()) {
      showToast(t('editor_validation_error'), 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const dataToSave = { ...ruleData };
      delete dataToSave.ruleIdManuallyEdited;
      delete dataToSave.originalStatus;  // Don't save internal tracking field
      
      if (ruleId) {
        await Rule.update(ruleId, dataToSave);
      } else {
        await Rule.create(dataToSave);
      }
      
      setStepStatus({
        1: 'completed',
        2: 'completed',
        3: 'completed',
        4: 'completed', 
        5: 'completed', 
        6: 'completed'
      });
      
      setHasUnsavedChanges(false);
      showToast(t('editor_save_success'), 'success');
      
      setTimeout(() => {
        navigate(createPageUrl('Rules'));
      }, 1000);
    } catch (error) {
      console.error('Error saving rule:', error);
      showToast(t('editor_save_error'), 'error');
    }
    setIsSaving(false);
  };

  const handleViewOcr = async () => {
    // Use saved sourceDocumentId if available (when editing rule), otherwise use URL param
    const docId = ruleData.sourceDocumentId || selectedDocumentId;
    if (!docId) return;
    
    try {
      const response = await apiClient.get(`/documents/${docId}/content`);
      setOcrContent(response.content || 'No OCR content available');
      setShowOcrModal(true);
    } catch (error) {
      showToast('Failed to load OCR content', 'error');
      console.error('Error loading OCR content:', error);
    }
  };

  const handleNavigation = (destination) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(destination);
      setShowUnsavedWarning(true);
    } else {
      if (typeof destination === 'function') {
        destination();
      } else {
        navigate(destination);
      }
    }
  };

  const confirmNavigation = () => {
    setHasUnsavedChanges(false);
    setShowUnsavedWarning(false);
    if (pendingNavigation) {
      if (typeof pendingNavigation === 'function') {
        pendingNavigation();
      } else {
        navigate(pendingNavigation);
      }
      setPendingNavigation(null); // Clear after executing
    }
  };

  const cancelNavigation = () => {
    setShowUnsavedWarning(false);
    setPendingNavigation(null); // Clear the pending navigation
  };

  const goToStep = useCallback((step) => {
    const prevStep = currentStep;
    
    if (stepEdited) {
      const isValid = validateStep(prevStep);
      const hasData = hasStepData(prevStep);
      
      if (hasData) {
        setStepStatus(prev => ({
          ...prev,
          [prevStep]: isValid ? 'completed' : 'edited'
        }));
      } else {
        setStepStatus(prev => ({
          ...prev,
          [prevStep]: 'untouched'
        }));
      }
      
      // Reset stepEdited for the new step
      setStepEdited(false);
    } else {
      const hasData = hasStepData(prevStep);
      if (!hasData && (stepStatus[prevStep] === 'edited' || stepStatus[prevStep] === 'completed')) {
        setStepStatus(prev => ({
          ...prev,
          [prevStep]: 'untouched'
        }));
      }
    }
    
    setCurrentStep(step);
  }, [currentStep, stepEdited, validateStep, hasStepData, stepStatus]);

  const nextStep = useCallback(() => {
    if (currentStep < 6) {
      const isValid = validateStep(currentStep);
      // Removed specific step 4 and 5 validation bypass here, as validateStep handles it now
      if (!isValid) {
        showToast(t('editor_validation_error'), 'warning');
        return;
      }
      
      const hasData = hasStepData(currentStep);
      setStepStatus(prev => ({
        ...prev,
        [currentStep]: hasData ? (isValid ? 'completed' : 'edited') : (prev[currentStep] === 'skipped' ? 'skipped' : 'untouched')
      }));
      setStepEdited(false);
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, validateStep, hasStepData, t, showToast]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      if (stepEdited) {
        const isValid = validateStep(currentStep);
        const hasData = hasStepData(currentStep);
        setStepStatus(prev => ({
          ...prev,
          [currentStep]: hasData ? (isValid ? 'completed' : 'edited') : (prev[currentStep] === 'skipped' ? 'skipped' : 'untouched')
        }));
      } else {
        const hasData = hasStepData(currentStep);
        if (!hasData && stepStatus[currentStep] === 'edited') {
          setStepStatus(prev => ({
            ...prev,
            [currentStep]: 'untouched'
          }));
        }
      }
      
      setStepEdited(false);
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep, stepEdited, validateStep, hasStepData, stepStatus]);

  useEffect(() => {
    if (ruleId && ruleData.ruleName) {
      const newStatus = {};
      for (let i = 1; i <= 6; i++) {
        const isValid = validateStep(i);
        const hasData = hasStepData(i);
        newStatus[i] = isValid ? 'completed' : (hasData ? 'edited' : 'untouched');
      }
      setStepStatus(newStatus);
    }
  }, [ruleId, ruleData.ruleName, validateStep, hasStepData]); // Re-added validateStep and hasStepData for correctness

  const renderCurrentStep = () => {
    const stepProps = {
      ruleData,
      updateRuleData,
      showInfoBoxes,
      setShowInfoBoxes,
      currentStep,
      selectedDocumentId: ruleData.sourceDocumentId || selectedDocumentId,  // Use saved or URL param
      selectedDocumentName: selectedFile,
      onViewOcr: handleViewOcr,
      onViewPdf: () => setShowPdfViewer(true)
    };

    switch (currentStep) {
      case 1: return <BasicInfoStep {...stepProps} />;
      case 2: return <OcrIdentifiersStep {...stepProps} />;
      case 3: return <DocumentClassificationsStep {...stepProps} />;
      case 4: return <FilenameIdentificationStep {...stepProps} />;
      case 5: return <DataVerificationStep {...stepProps} />;
      case 6: return <SummaryStep {...stepProps} />;
      default: return <BasicInfoStep {...stepProps} />;
    }
  };

  // Debounce ruleData for YamlPreview to prevent excessive re-renders if ruleData changes rapidly
  const debouncedRuleData = useDebounce(ruleData, 500); // Debounce for 500ms

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{backgroundColor: 'var(--app-bg)'}}>
      <div style={{
        backgroundColor: 'var(--app-surface)',
        borderBottom: '1px solid var(--app-border)',
        padding: '16px 24px'
      }}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => handleNavigation(createPageUrl('Rules'))}
              className="btn btn-ghost"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-2xl font-bold">
                {ruleId && ruleData.ruleName ? ruleData.ruleName : t(ruleId ? 'editor_edit_title' : 'editor_create_title')}
              </h1>
              {ruleData.sourceDocumentId && (
                <div className="mt-2">
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 border border-blue-300 rounded-lg text-sm">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-900 font-medium">Based on Paperless Document ID:</span>
                    <code className="font-mono text-blue-800 font-semibold">{ruleData.sourceDocumentId}</code>
                  </span>
                </div>
              )}
              {selectedFile && (
                <p className="text-sm text-gray-600 mt-1">
                  {t('editor_selected_file')} <span className="font-medium">{selectedFile}</span>
                </p>
              )}
              {hasUnsavedChanges && (
                <p className="text-sm text-yellow-600 mt-1">
                  ● Unsaved changes
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            {(ruleData.sourceDocumentId || selectedDocumentId) && (
              <>
                <button 
                  className="btn btn-secondary"
                  onClick={handleViewOcr}
                  disabled={!ruleData.sourceDocumentId && !selectedDocumentId}
                >
                  <FileText size={16} />
                  {t('editor_view_ocr')}
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowPdfViewer(true)}
                  disabled={!ruleData.sourceDocumentId && !selectedDocumentId}
                >
                  <Eye size={16} />
                  {t('editor_view_pdf')}
                </button>
              </>
            )}
            <LoadingButton 
              onClick={handleSave}
              loading={isSaving}
              disabled={!canFinish()}
              className={`btn btn-primary ${!canFinish() ? 'opacity-50 cursor-not-allowed' : ''}`}
              loadingText={t('common_saving')}
            >
              {t('common_save')}
            </LoadingButton>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-[1800px] mx-auto" style={{paddingLeft: '24px', paddingRight: '24px'}}>
          <div style={{marginLeft: '30px'}}>
            <StepProgress 
              currentStep={currentStep}
              stepStatus={stepStatus}
              onStepClick={goToStep}
            />
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2.35fr)_minmax(0,2.65fr)] gap-6" style={{paddingBottom: '100px', marginTop: '24px'}}>
            <div>
              {renderCurrentStep()}
              
              <div className="flex justify-between mt-8">
                <button 
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="btn btn-secondary"
                >
                  {t('common_previous')}
                </button>
                <div className="flex gap-3">
                  {currentStep === 6 ? (
                    <LoadingButton 
                      onClick={handleSave}
                      loading={isSaving}
                      disabled={!canFinish()}
                      className={`btn btn-primary ${!canFinish() ? 'opacity-50 cursor-not-allowed' : ''}`}
                      loadingText={t('common_finish')}
                    >
                      {t('common_finish')}
                    </LoadingButton>
                  ) : (
                    <button 
                      onClick={nextStep}
                      disabled={!validateStep(currentStep)} // Simplified this condition
                      className={`btn btn-primary ${!validateStep(currentStep) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {t('common_next')}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {showYamlPreview && (
              <div style={{marginTop: '24px'}}>
                {/* Use the debounced ruleData for YamlPreview */}
                <YamlPreview ruleData={debouncedRuleData} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PDF Viewer Modal */}
      <PdfViewerModal
        isOpen={showPdfViewer}
        onClose={() => setShowPdfViewer(false)}
        documentUrl={(ruleData.sourceDocumentId || selectedDocumentId) ? `/api/documents/${ruleData.sourceDocumentId || selectedDocumentId}/preview?token=${encodeURIComponent(localStorage.getItem('pococlass_session'))}` : ''}
        documentName={selectedFile}
      />

      {/* OCR Content Modal */}
      {showOcrModal && (
        <div className="modal-overlay" onClick={() => setShowOcrModal(false)}>
          <div 
            className="modal-content max-w-4xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 className="text-xl font-bold text-gray-900">OCR Content</h2>
                <p className="text-sm text-gray-500">{selectedFile || 'Document'}</p>
              </div>
              <button 
                onClick={() => setShowOcrModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              <div className="bg-gray-50 p-4 rounded flex">
                <div className="pr-4 border-r border-gray-300 text-right select-none">
                  <pre className="text-sm font-mono text-gray-500 leading-relaxed">
                    {ocrContent.split('\n').map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </pre>
                </div>
                <div className="flex-1 pl-4">
                  <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                    {ocrContent}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Warning */}
      <ConfirmDialog
        isOpen={showUnsavedWarning}
        onClose={cancelNavigation}
        onConfirm={confirmNavigation}
        title={t('editor_unsaved_warning')}
        message="All unsaved changes will be lost."
        confirmText="Leave anyway"
        cancelText={t('common_cancel')}
        variant="warning"
      />
    </div>
  );
}
