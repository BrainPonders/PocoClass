/**
 * @file YamlPreview.jsx
 * @description Live YAML preview panel for the rule builder wizard. Generates a complete
 * YAML rule file from the current ruleData state and renders it with syntax-highlighted
 * coloring. Exposes a generator function via onGeneratorReady for export functionality.
 */

import React from 'react';
import { User } from '@/api/entities';

export default function YamlPreview({ ruleData, onGeneratorReady }) {
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    loadUser();
  }, []);

  React.useEffect(() => {
    if (onGeneratorReady) {
      onGeneratorReady(() => generateYaml);
    }
  }, [onGeneratorReady, ruleData]);

  const loadUser = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  // Helper function to escape double quotes in YAML strings
  const escapeYaml = (str) => {
    if (!str) return '';
    return str.replace(/"/g, '\\"');
  };

  const escapeSingleQuote = (str) => {
    if (!str) return '';
    return str.replace(/'/g, "''");
  };

  const generateYaml = () => {
    const creationDate = new Date().toISOString().split('T')[0];
    const userName = currentUser?.full_name ?? 'Unknown User';
    
    // Apply default values matching the backend - use ?? to preserve explicit 0 values
    const ruleName = ruleData.ruleName ?? 'Unnamed Rule';
    const ruleId = ruleData.ruleId ?? '';
    const description = ruleData.description ?? '';
    const threshold = ruleData.threshold ?? 75;
    const ocrThreshold = ruleData.ocrThreshold ?? 75;
    const ocrMultiplier = ruleData.ocrMultiplier ?? 3;
    const filenameMultiplier = ruleData.filenameMultiplier ?? 1;
    
    // Handle verification multiplier config (new format) or legacy single value
    const verificationMultiplierConfig = ruleData.verificationMultiplierConfig || {
      mode: 'auto',
      value: ruleData.verificationMultiplier ?? 0.5
    };
    
    return `# =================================================================================================
# PocoClass Document Classification Rule
# =================================================================================================
# This YAML file was generated using the PocoClass Rule Builder wizard.
# Each section below corresponds to a step in the 6-step configuration process.
#
# Created: ${creationDate}
# Created by: ${userName}
# Rule Name: ${ruleName}
# =================================================================================================

# =============================
# STEP 1: BASIC INFORMATION
# =============================
# General rule identification and threshold settings

rule_name: "${escapeYaml(ruleName)}"
rule_id: "${escapeYaml(ruleId)}"
description: "${escapeYaml(description)}"

# POCO Score Requirement: Minimum overall confidence score required for document classification
# This combines scores from OCR content, filename patterns, and Paperless Placeholder Verification
threshold: ${threshold}  # ${threshold}% minimum confidence

# Source Document ID: Original Paperless document used to create this rule (for OCR/PDF preview)
source_document_id: ${ruleData.sourceDocumentId || ''}

${ruleData.ocrIdentifiers?.length > 0 ? `
# =============================
# STEP 2: OCR IDENTIFIERS
# =============================
# Text patterns found in document content that help identify the document type
# Each logic group can contain multiple patterns with different matching rules

# OCR Score Requirement: Minimum percentage of OCR patterns that must match
ocr_threshold: ${ocrThreshold}  # ${ocrThreshold}% minimum match rate

# OCR Weight Multiplier: Controls importance of OCR content in final POCO score
ocr_multiplier: ${ocrMultiplier}  # ${ocrMultiplier}× weight

core_identifiers:
  logic_groups:
${ruleData.ocrIdentifiers.map((group, idx) => {
  const numGroups = ruleData.ocrIdentifiers.length;
  const scorePerGroup = Math.round(100 / numGroups);
  const groupType = group.type ?? 'match';
  const mandatory = group.mandatory ?? false;
  return `    # Logic Group ${idx + 1}
    - type: ${groupType}     # Match type: 'match' (OR) or 'match_all' (AND)
      score: ${scorePerGroup}
      mandatory: ${mandatory}  # Must match for rule to succeed
      conditions:
${group.conditions?.map(condition => `        - pattern: '${escapeSingleQuote(condition.pattern ?? '')}'    # Search pattern (text or regex)
          source: content
          range: '${condition.range ?? '0-1600'}'        # Search area`).join('\n') ?? ''}`;
}).join('\n')}
` : '# =============================\n# STEP 2: OCR IDENTIFIERS\n# =============================\n# No OCR identifiers configured\n'}

# =============================
# STEP 3: DOCUMENT CLASSIFICATIONS
# =============================
# Static metadata and dynamic data extraction rules

static_metadata:
  correspondent: "${escapeYaml(ruleData.predefinedData?.correspondent ?? '')}"
  document_type: "${escapeYaml(ruleData.predefinedData?.documentType ?? '')}"${ruleData.predefinedData?.tags?.length > 0 ? `
  tags: [${ruleData.predefinedData.tags.map(tag => `"${escapeYaml(tag)}"`).join(', ')}]` : ''}${ruleData.predefinedData?.customFields && Object.keys(ruleData.predefinedData.customFields).some(k => ruleData.predefinedData.customFields[k]) ? `
  custom_fields:
${Object.entries(ruleData.predefinedData.customFields).filter(([k, v]) => v).map(([field, value]) => `    ${field}: "${escapeYaml(value)}"`).join('\n')}` : ''}

${ruleData.dynamicData?.extractionRules?.length > 0 ? `dynamic_metadata:
${ruleData.dynamicData.extractionRules.filter(rule => rule.extractionType !== 'text' || rule.targetField !== 'tags').map((rule, idx) => {
  const targetField = rule.targetField ?? '';
  const beforeAnchor = escapeYaml(rule.beforeAnchor?.pattern ?? '');
  const afterAnchor = escapeYaml(rule.afterAnchor?.pattern ?? '');
  const extractionType = rule.extractionType ?? '';
  const dateFormat = rule.dateFormat ?? 'DD-MM-YYYY';
  
  // Map targetField to backend YAML format
  let backendField = targetField;
  if (targetField === 'dateCreated') {
    backendField = 'date_created';
  }
  // Custom fields use their actual name directly (e.g., "Total Price")
  
  return `  ${backendField}:
    pattern_before: '${escapeSingleQuote(rule.beforeAnchor?.pattern ?? '')}'
    pattern_after: '${escapeSingleQuote(rule.afterAnchor?.pattern ?? '')}'${extractionType === 'date' ? `
    format: ${dateFormat}` : ''}`;
}).join('\n')}${ruleData.dynamicData.extractionRules.filter(rule => rule.extractionType === 'text' && rule.targetField === 'tags').length > 0 ? `
  extracted_tags:
${ruleData.dynamicData.extractionRules.filter(rule => rule.extractionType === 'text' && rule.targetField === 'tags').map(rule => `    - pattern: '${escapeSingleQuote(rule.regexPattern ?? '')}'
      value: "${escapeYaml(rule.tagValue ?? '')}"${rule.prefix ? `
      prefix: "${escapeYaml(rule.prefix)}"` : ''}`).join('\n')}` : ''}
` : ''}
# =============================
# STEP 4: FILENAME IDENTIFICATION  
# =============================
# Patterns that identify documents by filename

# Filename Weight Multiplier: Controls importance of filename matching in POCO score
filename_multiplier: ${filenameMultiplier}  # ${filenameMultiplier}× weight

filename_patterns:
${ruleData.filenamePatterns?.patterns?.filter(p => p).map(pattern => `  - '${escapeSingleQuote(pattern)}'`).join('\n') || '  # No filename patterns configured'}

# =============================
# STEP 5: PAPERLESS DATA VERIFICATION
# =============================
# Paperless placeholder fields to verify for additional confidence

# Verification Weight Multiplier: Controls importance of placeholder verification
# Mode: 'auto' = dynamic neutraliser (1 / number_of_enabled_fields), 'manual' = fixed multiplier
verification_multiplier_mode: "${verificationMultiplierConfig.mode}"  # auto or manual
verification_multiplier: ${verificationMultiplierConfig.value}  # ${verificationMultiplierConfig.mode === 'auto' ? 'Auto-adjusted (neutraliser)' : verificationMultiplierConfig.value + '× weight'}

verification_fields:
${Object.entries(ruleData.verification?.enabledFields || {}).filter(([k, v]) => v).map(([field]) => `  - ${field}`).join('\n') || '  # No verification fields enabled'}

status: ${ruleData.status ?? 'draft'}`;
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

  return (
    <div style={{ padding: '16px', height: '100%' }}>
      <div style={{
        background: '#1e293b',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '20px',
          fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
          fontSize: '0.7rem',
          lineHeight: '1.6',
          overflowX: 'auto',
          minHeight: '400px',
          maxHeight: '800px',
          overflowY: 'auto'
        }}>
          {generateColoredYaml()}
        </div>
      </div>
    </div>
  );
}
