/**
 * @file Login.jsx
 * @description Login page for authenticating with Paperless-ngx credentials.
 * Stores session token and user data in localStorage on successful login
 * and redirects to the main application.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, LogIn } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import API_BASE_URL from '@/config/api';
import FormInput from '@/components/FormInput';

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

  // Authenticate against the backend and persist session
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
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
      <div className="w-full max-w-md">
        <div className="wizard-container">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="relative inline-block" style={{ marginLeft: '-130px' }}>
                <img src="/logo.png" alt="PocoClass Logo" className="h-40 w-auto" />
                <div className="absolute bottom-0 right-0 transform translate-x-[30px] -translate-y-[1px]">
                  <span className="text-xs font-semibold text-gray-500">v2.0</span>
                </div>
              </div>
            </div>
            <p className="mt-2" style={{ color: 'var(--app-text-secondary)' }}>
              Document Classification System
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="login-form-group">
              <label className="login-form-label">
                Paperless Username
              </label>
              <FormInput
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Enter your username"
                required
                autoFocus
              />
            </div>

            <div className="login-form-group">
              <label className="login-form-label">
                Paperless Password
              </label>
              <FormInput
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
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
