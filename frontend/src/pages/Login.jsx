import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, LogIn } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('pococlass_session', data.sessionToken);
      localStorage.setItem('pococlass_user', JSON.stringify(data.user));

      toast({
        title: 'Welcome back!',
        description: `Logged in as ${data.user.username}`,
      });

      navigate('/');
      window.location.reload();

    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid username or password',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--app-bg)' }}>
      <style>{`
        .login-form-group {
          margin-bottom: 28px;
        }
        
        .login-form-label {
          display: block;
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 14px;
          letter-spacing: -0.01em;
        }
        
        .login-form-input {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          font-size: 1rem;
          background: #f9fafb;
          color: #1f2937;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        
        .login-form-input:focus {
          outline: none;
          border-color: #3b82f6;
          background: white;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1), 0 1px 3px rgba(0, 0, 0, 0.1);
        }
      `}</style>
      <div className="w-full max-w-md">
        <div className="wizard-container">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <FileText className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--app-text)' }}>
              POCOclass
            </h1>
            <p className="mt-2" style={{ color: 'var(--app-text-secondary)' }}>
              Document Classification System
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="login-form-group">
              <label className="login-form-label">
                Paperless Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Enter your username"
                className="login-form-input"
                required
                autoFocus
              />
            </div>

            <div className="login-form-group">
              <label className="login-form-label">
                Paperless Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                className="login-form-input"
                required
              />
            </div>

            <Button 
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading || !formData.username || !formData.password}
            >
              {loading ? (
                'Logging in...'
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Login with Paperless
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--app-surface-light)' }}>
            <p className="text-sm text-center" style={{ color: 'var(--app-text-secondary)' }}>
              Use your Paperless-ngx credentials to access POCOclass
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
