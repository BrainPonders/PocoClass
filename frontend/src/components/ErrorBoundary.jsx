/**
 * @file ErrorBoundary.jsx
 * @description React class-based error boundary that catches unhandled rendering
 * errors in child components. Displays a user-friendly error page with options
 * to reload or navigate to the dashboard, plus expandable technical details.
 */
import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { createPageUrl } from '@/utils';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = createPageUrl('Dashboard');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Something went wrong
                  </h1>
                  <p className="text-gray-600 mb-4">
                    We're sorry, but something unexpected happened. The error has been logged and will be reviewed.
                  </p>
                  
                  {this.state.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <h3 className="font-semibold text-red-900 text-sm mb-2">Error Details:</h3>
                      <p className="text-sm text-red-800 font-mono">
                        {this.state.error.toString()}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <button
                      onClick={this.handleReset}
                      className="btn btn-primary"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reload Page
                    </button>
                    <button
                      onClick={this.handleGoHome}
                      className="btn btn-secondary"
                    >
                      <Home className="w-4 h-4" />
                      Go to Dashboard
                    </button>
                  </div>
                </div>
              </div>
              
              {this.state.errorInfo && (
                <details className="mt-6 bg-gray-100 rounded-lg p-4">
                  <summary className="cursor-pointer font-semibold text-sm text-gray-700">
                    Technical Details
                  </summary>
                  <pre className="mt-3 text-xs text-gray-600 overflow-auto">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;