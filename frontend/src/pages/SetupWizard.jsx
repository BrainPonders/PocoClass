import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Server, Check, AlertCircle, XCircle, Database } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import API_BASE_URL from '@/config/api';

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
  const [fixingMandatoryData, setFixingMandatoryData] = useState(false);

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
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/validation/mandatory-data`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setValidationData(data);
      }
    } catch (error) {
      console.error('Error loading validation data:', error);
    } finally {
      setLoadingValidation(false);
    }
  };

  const handleFixMandatoryData = async () => {
    try {
      setFixingMandatoryData(true);
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

  const handleContinueToDashboard = () => {
    navigate('/');
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--app-bg)' }}>
      <style>{`
        .setup-form-group {
          margin-bottom: 28px;
        }
        
        .setup-form-label {
          display: block;
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 14px;
          letter-spacing: -0.01em;
        }
        
        .setup-form-input {
          width: 100%;
          padding: 10px 12px;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          font-size: 1rem;
          background: #f9fafb;
          color: #1f2937;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        
        .setup-form-input:focus {
          outline: none;
          border-color: #3b82f6;
          background: white;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1), 0 1px 3px rgba(0, 0, 0, 0.1);
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

              <div style={{ borderTop: '1px solid #d1d5db', marginBottom: '32px' }}></div>

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
            <div>
              <div className="flex justify-center mb-6">
                <Server className="w-16 h-16 text-blue-600" />
              </div>

              <h2 className="text-3xl font-bold text-center mb-2" style={{ color: 'var(--app-text)' }}>
                Connect to Paperless-ngx
              </h2>
              
              <p className="text-center mb-8" style={{ color: 'var(--app-text-secondary)' }}>
                Enter your Paperless instance details and your admin credentials
              </p>

              <div className="space-y-6">
                <div className="setup-form-group">
                  <label className="setup-form-label">
                    Paperless-ngx URL
                  </label>
                  <input
                    type="url"
                    name="paperlessUrl"
                    value={formData.paperlessUrl}
                    onChange={handleInputChange}
                    placeholder="https://paperless.example.com"
                    className="setup-form-input"
                    required
                  />
                  <p className="text-xs mt-2" style={{ color: '#6b7280' }}>
                    The URL where your Paperless-ngx instance is hosted
                  </p>
                </div>

                <div className="info-box info-box-yellow">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold mb-1">Admin Account Required</p>
                      <p className="text-sm">
                        Please login with a Paperless admin account for initial setup. 
                        You'll be the first PocoClass administrator and can add other users later.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="setup-form-group">
                  <label className="setup-form-label">
                    Your Paperless Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="admin"
                    className="setup-form-input"
                    required
                  />
                </div>

                <div className="setup-form-group">
                  <label className="setup-form-label">
                    Your Paperless Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    className="setup-form-input"
                    required
                  />
                  <p className="text-xs mt-2" style={{ color: '#6b7280' }}>
                    Your credentials are only used to authenticate with Paperless
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={() => setStep(1)} 
                    className="btn btn-secondary"
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={handleSetup} 
                    className="btn btn-primary flex-1"
                    disabled={loading || !formData.paperlessUrl || !formData.username || !formData.password}
                  >
                    {loading ? 'Connecting...' : 'Connect & Complete Setup'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Validate System Requirements (Merged Information + Validation) */}
          {step === 3 && (
            <div>
              <div className="flex justify-center mb-6">
                <Database className="w-16 h-16 text-blue-600" />
              </div>

              <h2 className="text-3xl font-bold text-center mb-2" style={{ color: 'var(--app-text)' }}>
                System Requirements Check
              </h2>
              
              <p className="text-center mb-8" style={{ color: 'var(--app-text-secondary)' }}>
                Checking for required custom fields and tags in Paperless-ngx
              </p>

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
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-semibold text-green-900 mb-1">All Requirements Met</h3>
                      <p className="text-sm text-green-800">
                        All required custom fields and tags are properly configured.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="border-t pt-6 mb-6">
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

              <div className="border-t pt-6">
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

              <div className="flex gap-3 mt-8">
                {validationData && !validationData.valid ? (
                  <Button
                    onClick={handleFixMandatoryData}
                    disabled={fixingMandatoryData}
                    className="btn btn-primary flex-1"
                  >
                    {fixingMandatoryData ? 'Creating Missing Items...' : 'Create Missing Items'}
                  </Button>
                ) : (
                  <Button 
                    onClick={handleContinueToDashboard}
                    className="btn btn-primary flex-1"
                    disabled={!validationData?.valid}
                  >
                    Continue to Dashboard
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
