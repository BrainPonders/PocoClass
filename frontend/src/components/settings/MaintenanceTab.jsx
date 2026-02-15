/**
 * @file MaintenanceTab.jsx
 * @description Settings tab for database maintenance operations including
 * cache clearing, log purging, and system reset with confirmation dialogs.
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function MaintenanceTab({
  isAdmin,
  isResetting,
  setResetStage
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--app-text)' }}>Maintenance</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--app-text-secondary)' }}>
          Administrative tools for maintaining your PocoClass installation.
        </p>
      </div>

      <div className="border rounded-lg p-6" style={{ borderColor: 'var(--app-border)', backgroundColor: 'var(--app-bg-secondary)' }}>
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-md font-semibold mb-2" style={{ color: 'var(--app-text)' }}>Application Reset</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--app-text-secondary)' }}>
              Reset the application to its initial installation state. This will permanently delete all rules, settings, and configurations, and return you to the setup wizard. Your Paperless-ngx URL will be preserved.
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--app-text-secondary)' }}>
              After reset, you will need to:
            </p>
            <ul className="text-sm mb-4 ml-4" style={{ color: 'var(--app-text-secondary)' }}>
              <li>• Reconfigure your Paperless-ngx connection</li>
              <li>• Recreate all rules and settings</li>
              <li>• This action cannot be undone</li>
            </ul>
          </div>
        </div>
        <Button
          onClick={() => setResetStage(1)}
          disabled={!isAdmin || isResetting}
          style={{
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            cursor: isAdmin ? 'pointer' : 'not-allowed',
            padding: '8px 16px'
          }}
        >
          {isResetting ? 'Resetting...' : 'Reset Application'}
        </Button>
        {!isAdmin && (
          <p className="mt-3 text-xs" style={{ color: 'var(--app-text-muted)' }}>
            Only administrators can reset the application
          </p>
        )}
      </div>
    </div>
  );
}
