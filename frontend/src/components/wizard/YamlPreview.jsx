
import React from 'react';
import { Copy, Download } from 'lucide-react';
import { User } from '@/api/entities';

export default function YamlPreview({ ruleData }) {
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const generateYaml = () => {
    const creationDate = new Date().toISOString().split('T')[0];
    const userName = currentUser?.full_name || 'Unknown User';
    
    return `# =================================================================================================
# PocoClass Document Classification Rule
# =================================================================================================
# This YAML file was generated using the PocoClass Rule Builder wizard.
# Each section below corresponds to a step in the 6-step configuration process.
#
# Created: ${creationDate}
# Created by: ${userName}
# Rule Name: ${ruleData.ruleName || 'Unnamed Rule'}
# =================================================================================================

# =============================
# STEP 1: BASIC INFORMATION
# =============================
# General rule identification and threshold settings

rule_name: "${ruleData.ruleName || ''}"
rule_id: "${ruleData.ruleId || ''}"
description: "${ruleData.description || ''}"

# POCO Score Requirement: Minimum overall confidence score required for document classification
# This combines scores from OCR content, filename patterns, and Paperless Placeholder Verification
poco_score_requirement: ${ruleData.threshold}  # ${ruleData.threshold}% minimum confidence

${ruleData.ocrIdentifiers?.length > 0 ? `
# =============================
# STEP 2: OCR IDENTIFIERS
# =============================
# Text patterns found in document content that help identify the document type
# Each logic group can contain multiple patterns with different matching rules

ocr_identifiers:
  # OCR Score Requirement: Minimum percentage of OCR patterns that must match
  ocr_score_requirement: ${ruleData.ocrThreshold || 75}  # ${ruleData.ocrThreshold || 75}% minimum match rate
  
  # OCR Weight Multiplier: Controls importance of OCR content in final POCO score
  ocr_multiplier: ${ruleData.ocrMultiplier || 3}  # ${ruleData.ocrMultiplier || 3}× weight
  
  logic_groups:
${ruleData.ocrIdentifiers.map((group, idx) => `    # Logic Group ${idx + 1}
    - type: "${group.type || 'match'}"     # Match type: 'match' (OR) or 'match_all' (AND)
      mandatory: ${group.mandatory || false}  # Must match for rule to succeed
      conditions:
${group.conditions?.map(condition => `        - pattern: "${condition.pattern || ''}"    # Search pattern (text or regex)
          range: "${condition.range || '0-1600'}"        # Search area`).join('\n') || ''}`).join('\n')}
` : '# =============================\n# STEP 2: OCR IDENTIFIERS\n# =============================\n# No OCR identifiers configured\n'}

# =============================
# STEP 3: DOCUMENT CLASSIFICATIONS
# =============================
# Static metadata and dynamic data extraction rules

static_data:
  correspondent: "${ruleData.predefinedData?.correspondent || ''}"
  document_type: "${ruleData.predefinedData?.documentType || ''}"
  tags: [${ruleData.predefinedData?.tags?.map(tag => `"${tag}"`).join(', ') || ''}]

${ruleData.dynamicData?.extractionRules?.length > 0 ? `dynamic_data:
  extraction_rules:
${ruleData.dynamicData.extractionRules.map((rule, idx) => `    # Extraction Rule ${idx + 1}
    - target_field: "${rule.targetField || ''}"
      before_anchor: "${rule.beforeAnchor?.pattern || ''}"
      extraction_type: "${rule.extractionType || ''}"
      after_anchor: "${rule.afterAnchor?.pattern || ''}"`).join('\n')}
` : ''}
# =============================
# STEP 4: FILENAME IDENTIFICATION  
# =============================
# Patterns that identify documents by filename

filename_patterns:
  # Filename Weight Multiplier: Controls importance of filename matching in POCO score
  filename_multiplier: ${ruleData.filenameMultiplier || 1}  # ${ruleData.filenameMultiplier || 1}× weight
  
  patterns:
${ruleData.filenamePatterns?.patterns?.filter(p => p).map(pattern => `    - "${pattern}"`).join('\n') || '    # No filename patterns configured'}

# =============================
# STEP 5: PAPERLESS DATA VERIFICATION
# =============================
# Paperless placeholder fields to verify for additional confidence

verification:
  # Verification Weight Multiplier: Controls importance of placeholder verification
  verification_multiplier: ${ruleData.verificationMultiplier || 0.5}  # ${ruleData.verificationMultiplier || 0.5}× weight
  
  enabled_fields:
${Object.entries(ruleData.verification?.enabledFields || {}).filter(([k, v]) => v).map(([field]) => `    - "${field}"`).join('\n') || '    # No verification fields enabled'}`;
  };

  const generateColoredYaml = () => {
    const yaml = generateYaml();
    return yaml.split('\n').map((line, idx) => {
      let color = '#e2e8f0'; // default white-ish
      let fontWeight = 'normal';
      
      if (line.startsWith('#')) {
        if (line.includes('=====')) {
          color = '#94a3b8'; // gray for separator lines
          fontWeight = 'bold';
        } else if (line.includes('STEP')) {
          color = '#60a5fa'; // blue for step headers
          fontWeight = 'bold';
        } else {
          color = '#94a3b8'; // gray for regular comments
        }
      } else if (line.includes(':') && !line.trim().startsWith('-')) {
        const parts = line.split(':');
        return (
          <div key={idx}>
            <span style={{ color: '#a78bfa' }}>{parts[0]}</span>
            <span style={{ color: '#e2e8f0' }}>:</span>
            <span style={{ color: '#fbbf24' }}>{parts.slice(1).join(':')}</span>
          </div>
        );
      } else if (line.trim().startsWith('-')) {
        color = '#34d399'; // green for list items
      }
      
      return (
        <div key={idx} style={{ color, fontWeight }}>
          {line || '\u00A0'}
        </div>
      );
    });
  };

  const downloadYaml = () => {
    const yamlContent = generateYaml();
    const blob = new Blob([yamlContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${ruleData.ruleId || 'rule'}.yaml`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyYaml = async () => {
    try {
      await navigator.clipboard.writeText(generateYaml());
    } catch (err) {
      console.error('Failed to copy YAML:', err);
    }
  };

  return (
    <div style={{
      background: 'var(--app-surface)',
      borderRadius: '12px',
      border: '1px solid var(--app-border)',
      overflow: 'hidden',
      width: '100%',
      height: 'fit-content',
      position: 'sticky',
      top: '0'
    }}>
      <div style={{
        background: 'var(--app-surface-light)',
        padding: '16px',
        borderBottom: '1px solid var(--app-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{
          fontSize: '1rem',
          fontWeight: '600',
          color: 'var(--app-text)',
          margin: 0
        }}>
          YAML Preview
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={copyYaml} className="btn btn-ghost btn-sm">
            <Copy size={16} />
          </button>
          <button onClick={downloadYaml} className="btn btn-ghost btn-sm">
            <Download size={16} />
          </button>
        </div>
      </div>
      <div style={{ padding: '16px' }}>
        <div style={{
          background: '#1e293b',
          padding: '20px',
          fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
          fontSize: '0.7rem',
          lineHeight: '1.6',
          overflowX: 'auto',
          minHeight: '400px',
          maxHeight: '800px',
          overflowY: 'auto',
          borderRadius: '8px'
        }}>
          {generateColoredYaml()}
        </div>
      </div>
    </div>
  );
}
