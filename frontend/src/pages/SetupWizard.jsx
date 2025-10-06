import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Server, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

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

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSetup = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:8000/api/auth/setup', {
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

      setStep(3);
      
      setTimeout(() => {
        navigate('/');
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Setup error:', error);
      toast({
        title: 'Setup Failed',
        description: error.message || 'Failed to connect to Paperless. Please check your credentials and URL.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--app-bg)' }}>
      <div className="w-full max-w-2xl">
        <div className="wizard-container">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <FileText className="w-10 h-10 text-white" />
                </div>
              </div>
              
              <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--app-text)' }}>
                Welcome to POCOclass
              </h1>
              
              <p className="text-lg mb-8" style={{ color: 'var(--app-text-secondary)' }}>
                Your intelligent document classification system for Paperless-ngx
              </p>

              <div className="info-box info-box-yellow mb-8">
                <h3 className="font-semibold mb-2">What is POCOclass?</h3>
                <p className="text-sm">
                  POCOclass automatically classifies and enriches your documents in Paperless-ngx using 
                  intelligent pattern matching. Create rules once, and let POCOclass handle the rest!
                </p>
              </div>

              <div className="space-y-4 text-left mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold" style={{ color: 'var(--app-text)' }}>Uses Your Paperless Account</h4>
                    <p className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>
                      Login with your existing Paperless-ngx credentials - no new passwords to remember
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold" style={{ color: 'var(--app-text)' }}>Secure by Design</h4>
                    <p className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>
                      Each user operates with their own Paperless permissions - no shared admin tokens
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold" style={{ color: 'var(--app-text)' }}>Easy to Use</h4>
                    <p className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>
                      Simple wizard-based interface for creating classification rules
                    </p>
                  </div>
                </div>
              </div>

              <Button onClick={() => setStep(2)} className="btn btn-primary btn-lg w-full">
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
                <div className="form-group">
                  <label className="form-label">
                    Paperless-ngx URL
                  </label>
                  <input
                    type="url"
                    name="paperlessUrl"
                    value={formData.paperlessUrl}
                    onChange={handleInputChange}
                    placeholder="https://paperless.example.com"
                    className="form-input"
                    required
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--app-text-muted)' }}>
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
                        You'll be the first POCOclass administrator and can add other users later.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Your Paperless Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="admin"
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Your Paperless Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    className="form-input"
                    required
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--app-text-muted)' }}>
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

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
              </div>

              <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--app-text)' }}>
                Setup Complete!
              </h2>

              <p className="text-lg mb-6" style={{ color: 'var(--app-text-secondary)' }}>
                Successfully connected to Paperless-ngx
              </p>

              <div className="info-box" style={{ 
                backgroundColor: 'rgba(34, 197, 94, 0.1)', 
                borderColor: '#22c55e',
                color: 'var(--app-text)'
              }}>
                <p className="font-semibold mb-2">You're all set!</p>
                <p className="text-sm">
                  Redirecting you to the dashboard...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
