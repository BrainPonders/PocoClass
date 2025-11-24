import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Server, Check, AlertCircle, XCircle, CheckCircle, Database, Info, Shield, Lightbulb } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import API_BASE_URL from '@/config/api';
import FormInput from '@/components/FormInput';
import logo from '@/assets/logo.png';

export default function SetupWizard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    paperlessUrl: '',
    username: '',
    password: ''
  });
  const [validationData, setValidationData] = useState(null);
  const [loadingValidation, setLoadingValidation] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [fixingMandatoryData, setFixingMandatoryData] = useState(false);
  const [showSkipWarning, setShowSkipWarning] = useState(false);
  const [skipWarningConfirmed, setSkipWarningConfirmed] = useState(false);
  const [showCreateConfirmation, setShowCreateConfirmation] = useState(false);
  const [showNewTagConfirmation, setShowNewTagConfirmation] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSetup = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Setup failed');
      }

      localStorage.setItem('pococlass_session', data.sessionToken);
      localStorage.setItem('pococlass_user', JSON.stringify(data.user));

      // Go to information step first
      setStep(3);

    } catch (error) {
      console.error('Setup error:', error);
      toast({
        title: 'Setup Failed',
        description: error.message || 'Failed to connect to Paperless. Please check your credentials and URL.',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Load validation data when reaching step 3
  useEffect(() => {
    if (step === 3) {
      loadValidationData();
    }
  }, [step]);

  const loadValidationData = async () => {
    try {
      setLoadingValidation(true);
      setValidationError(null);
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/validation/mandatory-data`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setValidationData(data);
        setValidationError(null);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load validation data (${response.status})`);
      }
    } catch (error) {
      console.error('Error loading validation data:', error);
      setValidationError(error.message || 'Failed to connect to Paperless-ngx. Please check your connection and try again.');
      setValidationData(null);
    } finally {
      setLoadingValidation(false);
    }
  };

  const handleFixMandatoryData = async () => {
    try {
      setFixingMandatoryData(true);
      setShowCreateConfirmation(false);
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/validation/fix-mandatory-data`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          const createdCount = data.created_fields.length + data.created_tags.length;
          toast({
            title: 'Missing Data Created',
            description: `Successfully created ${createdCount} missing ${createdCount === 1 ? 'item' : 'items'}`,
            duration: 3000,
          });
          
          // Reload validation data
          await loadValidationData();
        } else {
          toast({
            title: 'Fix Failed',
            description: data.errors.join(', '),
            variant: 'destructive',
            duration: 5000,
          });
        }
      }
    } catch (error) {
      toast({
        title: 'Fix Failed',
        description: error.message || 'Failed to fix missing data',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setFixingMandatoryData(false);
    }
  };

  const handleContinueToDashboard = async () => {
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/auth/complete-setup`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ skipMissingData: !validationData?.valid })
      });

      if (!response.ok) {
        throw new Error('Failed to complete setup');
      }

      // Show NEW tag confirmation dialog
      setShowNewTagConfirmation(true);
    } catch (error) {
      console.error('Error completing setup:', error);
      toast({
        title: 'Setup Error',
        description: 'Failed to complete setup. Please try again.',
        variant: 'destructive',
        duration: 5000,
      });
    }
  };

  const handleConfirmNewTagMessage = () => {
    setShowNewTagConfirmation(false);
    navigate('/');
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--app-bg)' }}>
      <style>{`
        .btn:hover {
          background-color: #356dff !important;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
          transition: all 0.2s ease;
        }
      `}</style>
      <div className="w-full max-w-xl">
        <div className="wizard-container">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="text-left" style={{ 
              background: 'linear-gradient(to bottom right, rgba(0, 0, 0, 0.03), rgba(0, 0, 0, 0))',
              borderRadius: '12px',
              paddingTop: '20px',
              paddingBottom: '20px',
              marginLeft: '-70px',
              marginRight: '-70px',
              paddingLeft: '70px',
              paddingRight: '70px'
            }}>
              <div className="flex" style={{ 
                marginBottom: '44px'
              }}>
                <div className="relative inline-block" style={{ marginLeft: '-50px' }}>
                  <img src="/logo.png" alt="PocoClass Logo" className="h-48 w-auto" />
                  <div className="absolute bottom-0 right-0 transform translate-x-[33px] -translate-y-[11px]">
                    <span className="text-sm font-semibold text-gray-500">v2.0</span>
                  </div>
                </div>
              </div>
              
              <h1 className="text-4xl font-bold mb-3 text-left" style={{ color: 'var(--app-text)' }}>
                Welcome to PocoClass
              </h1>
              
              <p className="text-lg mb-2 text-left" style={{ color: '#6b7280' }}>
                Your rule-driven document classification engine for Paperless-ngx
              </p>

              <div className="text-left mb-5" style={{ 
                backgroundColor: 'var(--app-bg-secondary)', 
                border: '2px solid var(--app-border)',
                borderRadius: '12px',
                padding: '24px 0'
              }}>
                <p className="text-sm" style={{ color: 'var(--app-text)', lineHeight: '1.55' }}>
                  PocoClass is triggered automatically after Paperless-ngx completes its post-consumption step. 
                  It analyzes new documents, identifies patterns based on your rules, and applies the classification 
                  you define. This makes it ideal for processing unknown documents during bulk imports, and equally 
                  reliable for daily single-document uploads where classification accuracy matters.
                </p>
              </div>

              <div style={{ borderTop: '1px solid #e5e7eb', marginBottom: '32px' }}></div>

              <div className="space-y-4 mb-8" style={{ maxWidth: '550px' }}>
                <div className="flex items-start gap-3 text-left">
                  <div style={{ 
                    width: '20px', 
                    height: '20px', 
                    border: '2px solid #16a34a', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    <Check className="w-3.5 h-3.5 text-green-600" strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1" style={{ color: 'var(--app-text)' }}>Uses Your Paperless Account</h4>
                    <p className="text-sm" style={{ color: '#6b7280' }}>
                      Log in with your existing Paperless-ngx credentials — no extra passwords or accounts required.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-left">
                  <div style={{ 
                    width: '20px', 
                    height: '20px', 
                    border: '2px solid #16a34a', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    <Check className="w-3.5 h-3.5 text-green-600" strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1" style={{ color: 'var(--app-text)' }}>Secure by Design</h4>
                    <p className="text-sm" style={{ color: '#6b7280' }}>
                      Each user operates strictly within their own Paperless permissions. No shared admin tokens or elevated access.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-left">
                  <div style={{ 
                    width: '20px', 
                    height: '20px', 
                    border: '2px solid #16a34a', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    <Check className="w-3.5 h-3.5 text-green-600" strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1" style={{ color: 'var(--app-text)' }}>Easy to Use</h4>
                    <p className="text-sm" style={{ color: '#6b7280' }}>
                      A clean, wizard-based interface guides you through building accurate classification rules in minutes.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-left">
                  <div style={{ 
                    width: '20px', 
                    height: '20px', 
                    border: '2px solid #16a34a', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    <Check className="w-3.5 h-3.5 text-green-600" strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1" style={{ color: 'var(--app-text)' }}>Fully Automated Processing</h4>
                    <p className="text-sm" style={{ color: '#6b7280' }}>
                      Once configured, PocoClass continuously processes new documents in the background — no manual triggers needed.
                    </p>
                  </div>
                </div>
              </div>

              <Button onClick={() => setStep(2)} className="btn btn-primary btn-lg w-full" style={{ backgroundColor: '#3b82f6', borderColor: '#3b82f6' }}>
                Let's Get Started
              </Button>
            </div>
          )}

          {/* Step 2: Connect to Paperless */}
          {step === 2 && (
            <div style={{ 
              background: 'linear-gradient(to bottom right, rgba(0, 0, 0, 0.03), rgba(0, 0, 0, 0))',
              borderRadius: '12px',
              paddingTop: '20px',
              paddingBottom: '20px',
              marginLeft: '-70px',
              marginRight: '-70px',
              paddingLeft: '70px',
              paddingRight: '70px'
            }}>
              <div style={{ 
                display: 'flex',
                alignItems: 'flex-start',
                gap: '24px'
              }}>
                <img src={logo} alt="PocoClass Logo" style={{ maxWidth: '120px', height: 'auto', flexShrink: 0, marginLeft: '-20px', opacity: 0.92 }} />
                
                <div style={{ flex: 1, marginTop: '28px' }}>
                  <h2 className="text-4xl font-bold text-left mb-3" style={{ color: 'var(--app-text)' }}>
                    Connect to Paperless-ngx
                  </h2>
                  
                  <p className="text-left" style={{ color: '#6b7280', fontSize: '0.95rem', marginLeft: '2px' }}>
                    Enter your Paperless instance details and your admin credentials
                  </p>
                </div>
              </div>

              <div className="space-y-6" style={{ marginTop: '32px' }}>
                <div className="setup-form-group">
                  <div className="flex items-center gap-2 mb-3.5">
                    <label className="setup-form-label" style={{ marginBottom: 0 }}>
                      Paperless-ngx URL
                    </label>
                    <div className="group relative">
                      <Info className="w-4 h-4 text-gray-400 cursor-help hover:text-gray-600" />
                      <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-normal z-10">
                        Enter the base URL of your Paperless instance without the /api/ path
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                  <FormInput
                    type="url"
                    name="paperlessUrl"
                    value={formData.paperlessUrl}
                    onChange={handleInputChange}
                    placeholder="https://paperless.example.com"
                    required
                  />
                  <div className="flex items-start gap-1.5 mt-2">
                    <Lightbulb className="w-3 h-3 flex-shrink-0" style={{ color: '#999', marginTop: '2px', marginRight: '3px' }} />
                    <p style={{ fontSize: '10.5px', color: '#999', lineHeight: '1.4' }}>
                      Examples: <span style={{ color: 'var(--app-text)', fontWeight: '500' }}>https://paperless.example.com</span> · <span style={{ color: 'var(--app-text)', fontWeight: '500' }}>http://localhost:8000</span>
                    </p>
                  </div>
                </div>

                <div className="info-box info-box-yellow" style={{ marginTop: '20px', borderLeft: '3px solid #e5e7eb', paddingLeft: '12px' }}>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <p className="font-semibold mb-1" style={{ marginBottom: '12px' }}>Admin Account Required</p>
                      <p className="text-sm">
                        Log in with your Paperless-ngx administrator account to complete the initial setup and synchronise required system data. This is required only once. After setup, PocoClass administrators can activate additional Paperless-ngx users without needing the Paperless admin credentials again.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="setup-form-group">
                  <label className="setup-form-label">
                    Paperless Admin Username
                  </label>
                  <FormInput
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Your admin username"
                    required
                  />
                </div>

                <div className="setup-form-group">
                  <label className="setup-form-label">
                    Paperless Admin Password
                  </label>
                  <FormInput
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    required
                  />
                  <div className="flex items-start gap-1.5 mt-2">
                    <Shield className="w-3 h-3 flex-shrink-0" style={{ color: '#999', marginTop: '2px', marginRight: '3px' }} />
                    <p style={{ fontSize: '10.5px', color: '#999', lineHeight: '1.4' }}>
                      Your credentials are never stored by PocoClass and are only used once to validate and fetch your Paperless metadata.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3" style={{ marginTop: '24px' }}>
                  <Button 
                    onClick={() => setStep(1)} 
                    disabled={loading}
                    style={{
                      border: '1px solid #d1d5db',
                      backgroundColor: 'transparent',
                      color: '#6b7280',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.backgroundColor = '#f3f4f6';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={handleSetup} 
                    className="btn btn-primary flex-1"
                    disabled={loading || !formData.paperlessUrl || !formData.username || !formData.password}
                    style={{
                      backgroundColor: loading || !formData.paperlessUrl || !formData.username || !formData.password ? '#d1d5db' : '#3b82f6',
                      borderColor: loading || !formData.paperlessUrl || !formData.username || !formData.password ? '#d1d5db' : '#3b82f6',
                      color: 'white',
                      border: 'none',
                      cursor: loading || !formData.paperlessUrl || !formData.username || !formData.password ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? 'Connecting...' : 'Connect & Complete Setup'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Validate System Requirements (Merged Information + Validation) */}
          {step === 3 && (
            <div style={{ 
              background: 'linear-gradient(to bottom right, rgba(0, 0, 0, 0.03), rgba(0, 0, 0, 0))',
              borderRadius: '12px',
              paddingTop: '20px',
              paddingBottom: '20px',
              marginLeft: '-70px',
              marginRight: '-70px',
              paddingLeft: '70px',
              paddingRight: '70px'
            }}>
              <div style={{ 
                display: 'flex',
                alignItems: 'flex-start',
                gap: '24px'
              }}>
                <img src={logo} alt="PocoClass Logo" style={{ maxWidth: '120px', height: 'auto', flexShrink: 0, marginLeft: '-20px', opacity: 0.92 }} />
                
                <div style={{ flex: 1, marginTop: '28px' }}>
                  <h2 className="text-4xl font-bold text-left mb-3" style={{ color: 'var(--app-text)' }}>
                    Data Setup Requirements
                  </h2>
                  
                  <p className="text-left" style={{ color: '#6b7280', fontSize: '0.95rem', marginLeft: '2px' }}>
                    Verifying required custom fields and tags in Paperless-ngx
                  </p>
                </div>
              </div>

              <div style={{ marginTop: '40px' }}>

              {loadingValidation ? (
                <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-3 mb-6">
                  <div className="flex items-center gap-3">
                    <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm text-blue-700 font-medium">Validating requirements...</span>
                  </div>
                </div>
              ) : validationError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-red-900 mb-1">Connection Error</h3>
                      <p className="text-sm text-red-800 mb-3">
                        {validationError}
                      </p>
                      <Button
                        onClick={loadValidationData}
                        size="sm"
                        style={{
                          backgroundColor: '#ef4444',
                          color: 'white',
                          fontSize: '0.875rem',
                          padding: '0.5rem 1rem'
                        }}
                      >
                        Retry Connection
                      </Button>
                    </div>
                  </div>
                </div>
              ) : validationData && !validationData.valid ? (
                <>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-orange-900 mb-1">Missing Required Items</h3>
                        <p className="text-sm text-orange-800">
                          Some custom fields or tags are missing. Review the items below and click "Create Missing Items" to set them up in Paperless-ngx.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : validationData && validationData.valid ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-green-900 mb-1">Everything is ready</h3>
                      <p className="text-sm text-green-800">
                        All required custom fields and tags are present. You can now start using PocoClass.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {!validationError && (
                <>
                  <div className="border-t mt-12 pt-8 mb-8">
                    <h3 className="text-md font-semibold text-gray-900 mb-4">Required Custom Fields</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        {validationData?.fields?.poco_score ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">POCO Score</div>
                          <div className="text-xs text-gray-500">Stores the overall classification score (0-100%)</div>
                        </div>
                        <div className={`text-xs font-medium px-3 py-1 rounded ${validationData?.fields?.poco_score ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {validationData?.fields?.poco_score ? 'Present' : 'Missing'}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        {validationData?.fields?.poco_ocr ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-400" />
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">POCO OCR</div>
                          <div className="text-xs text-gray-500">Stores the OCR transparency score. Can be changed later in Settings → Data Validation.</div>
                        </div>
                        <div className={`text-xs font-medium px-3 py-1 rounded ${validationData?.fields?.poco_ocr ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {validationData?.fields?.poco_ocr ? 'Present' : 'Optional'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t mt-12 pt-8">
                    <h3 className="text-md font-semibold text-gray-900 mb-4">Required Tags</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        {validationData?.tags?.poco_plus ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">POCO+</div>
                          <div className="text-xs text-gray-500">Automatically applied when documents successfully match a rule</div>
                        </div>
                        <div className={`text-xs font-medium px-3 py-1 rounded ${validationData?.tags?.poco_plus ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {validationData?.tags?.poco_plus ? 'Present' : 'Missing'}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        {validationData?.tags?.poco_minus ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">POCO-</div>
                          <div className="text-xs text-gray-500">Automatically applied to processed documents that don't match any rule</div>
                        </div>
                        <div className={`text-xs font-medium px-3 py-1 rounded ${validationData?.tags?.poco_minus ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {validationData?.tags?.poco_minus ? 'Present' : 'Missing'}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        {validationData?.tags?.new ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">NEW</div>
                          <div className="text-xs text-gray-500"><strong className="text-orange-700">Important:</strong> You must apply this tag to all newly imported documents</div>
                        </div>
                        <div className={`text-xs font-medium px-3 py-1 rounded ${validationData?.tags?.new ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {validationData?.tags?.new ? 'Present' : 'Missing'}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}


              <div style={{ marginTop: '32px' }} className="flex gap-3">
                <Button 
                  onClick={() => setStep(2)} 
                  style={{
                    border: '1px solid #d1d5db',
                    backgroundColor: 'transparent',
                    color: '#6b7280',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    flex: 0.15
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  Back
                </Button>
                {validationData && !validationData.valid ? (
                  <>
                    <Button
                      onClick={() => setShowCreateConfirmation(true)}
                      disabled={fixingMandatoryData}
                      className="btn btn-primary"
                      style={{ backgroundColor: '#3b82f6', borderColor: '#3b82f6', flex: 1 }}
                    >
                      {fixingMandatoryData ? 'Creating...' : 'Create Missing Items'}
                    </Button>
                    <Button
                      onClick={() => setShowSkipWarning(true)}
                      style={{
                        backgroundColor: 'transparent',
                        color: '#ef4444',
                        border: '1px solid #fca5a5',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        flex: 1
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#fee2e2';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      Continue Anyway
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={handleContinueToDashboard}
                    className="btn btn-primary"
                    disabled={!validationData?.valid}
                    style={{ 
                      backgroundColor: validationData?.valid ? '#3b82f6' : '#d1d5db',
                      borderColor: validationData?.valid ? '#3b82f6' : '#d1d5db',
                      cursor: validationData?.valid ? 'pointer' : 'not-allowed',
                      flex: 1
                    }}
                  >
                    Continue to Dashboard
                  </Button>
                )}
              </div>

              {showNewTagConfirmation && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000
                }}>
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '32px',
                    maxWidth: '600px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div className="flex items-start gap-3 mb-4">
                      {!validationData?.tags?.new ? (
                        <>
                          <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-3">Important Reminder: NEW Tag Missing</h3>
                            <p className="text-sm text-gray-700 mb-2">
                              The <strong>NEW</strong> tag is currently missing from your Paperless-ngx instance.
                            </p>
                            <p className="text-sm text-gray-700 mb-2">
                              Please make sure Paperless-ngx adds the <strong>NEW</strong> tag to all newly consumed documents.
                            </p>
                            <p className="text-sm text-gray-700 mb-3">
                              This tag tells PocoClass which documents still need to be processed.
                            </p>
                            <p className="text-xs text-gray-600 italic">
                              This is a manual requirement in your Paperless workflow. Use Paperless-ngx workflows to automatically apply the NEW tag to all newly consumed documents.
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-3">Important Reminder</h3>
                            <p className="text-sm text-gray-700 mb-2">
                              Please make sure Paperless-ngx adds the <strong>NEW</strong> tag to all newly consumed documents.
                            </p>
                            <p className="text-sm text-gray-700 mb-3">
                              This tag tells PocoClass which documents still need to be processed.
                            </p>
                            <p className="text-xs text-gray-600 italic">
                              This is a manual requirement in your Paperless workflow. Use Paperless-ngx workflows to automatically apply the NEW tag to all newly consumed documents.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    <Button
                      onClick={handleConfirmNewTagMessage}
                      style={{
                        width: '100%',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '10px 16px',
                        fontSize: '15px',
                        fontWeight: '500',
                        borderRadius: '6px'
                      }}
                    >
                      I Understand, Continue
                    </Button>
                  </div>
                </div>
              )}

              {showSkipWarning && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000
                }}>
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '32px',
                    maxWidth: '500px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div className="flex items-start gap-3 mb-4">
                      <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Continue Without Required Items?</h3>
                        <p className="text-sm text-gray-700 mb-3">
                          Some required fields and tags are missing. If you continue, PocoClass will not function.
                        </p>
                        <ul style={{ color: '#374151', marginLeft: '12px', lineHeight: '1.6', fontSize: '14px', marginBottom: '12px' }}>
                          {!validationData?.fields?.poco_score && (
                            <li className="mb-2"><strong>POCO Score</strong> — required to store the identification score</li>
                          )}
                          {!validationData?.tags?.new && (
                            <li className="mb-2"><strong>NEW</strong> — required to detect documents that need processing</li>
                          )}
                          {(!validationData?.tags?.poco_success || !validationData?.tags?.poco_failed) && (
                            <li className="mb-2"><strong>POCO+ / POCO-</strong> — required to mark successful or failed classification</li>
                          )}
                        </ul>
                        <p className="text-sm text-gray-700">
                          You will need to create these items manually in Paperless-ngx before PocoClass can operate correctly.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => setShowSkipWarning(false)}
                        style={{
                          flex: 1,
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          border: '1px solid #d1d5db',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          setShowSkipWarning(false);
                          handleContinueToDashboard();
                        }}
                        style={{
                          flex: 1,
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        I Understand, Continue
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {showCreateConfirmation && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000
                }}>
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '32px',
                    maxWidth: '500px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div className="flex items-start gap-3 mb-4">
                      <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Create Missing Items?</h3>
                        <p className="text-sm text-gray-700 mb-3">
                          PocoClass will create the following missing items in your Paperless-ngx instance:
                        </p>
                        <div className="mb-4">
                          {!validationData?.fields?.poco_score && (
                            <p className="text-sm text-gray-700 mb-2">Custom fields: <strong>POCO Score</strong></p>
                          )}
                          {((!validationData?.tags?.poco_plus || !validationData?.tags?.poco_minus || !validationData?.tags?.new) || 
                            (!validationData?.fields?.poco_score)) && (
                            <p className="text-sm text-gray-700">Tags: {' '}
                              {validationData?.tags?.poco_plus ? null : <><strong>POCO+</strong>{((!validationData?.tags?.poco_minus || !validationData?.tags?.new)) ? ', ' : ' and '}</>}
                              {validationData?.tags?.poco_minus ? null : <><strong>POCO-</strong>{(!validationData?.tags?.new) ? ' and ' : ''}</>}
                              {validationData?.tags?.new ? null : <strong>NEW</strong>}
                            </p>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-2">
                          These items are needed for PocoClass to classify documents correctly.
                        </p>
                        <p className="text-sm text-gray-700">
                          This action completes your setup automatically.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => setShowCreateConfirmation(false)}
                        style={{
                          flex: 1,
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          border: '1px solid #d1d5db',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleFixMandatoryData}
                        style={{
                          flex: 1,
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        Create Items
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
