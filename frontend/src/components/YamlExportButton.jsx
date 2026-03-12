/**
 * @file YamlExportButton.jsx
 * @description Compact button group for exporting a rule's configuration as YAML.
 * Provides copy-to-clipboard (with brief checkmark feedback) and file download
 * actions. Generates the YAML string from the ruleData prop on demand.
 */
import React, { useState } from 'react';
import { Download, ClipboardCopy, Check } from 'lucide-react';
import { normalizeLogicGroupScores } from '@/components/utils/logicGroupScores';

export default function YamlExportButton({ ruleData, buttonStyle = 'ghost' }) {
  const [copied, setCopied] = useState(false);

  const escapeSingle = (str) => (str || '').replace(/'/g, "''");

  const generateYaml = () => {
    const normalizedOcrGroups = normalizeLogicGroupScores(ruleData.ocrIdentifiers || []);

    let yaml = `# =================================================================================================
# PocoClass Document Classification Rule
# =================================================================================================
# Generated: ${new Date().toISOString().split('T')[0]}
# Rule ID: ${ruleData.ruleId}
# =================================================================================================

rule_name: "${ruleData.ruleName || ''}"
rule_id: "${ruleData.ruleId || ''}"
description: "${ruleData.description || ''}"
threshold: ${ruleData.threshold}  # ${ruleData.threshold}% minimum confidence
source_document_id: ${ruleData.sourceDocumentId || ''}

ocr_threshold: ${ruleData.ocrThreshold || 75}  # ${ruleData.ocrThreshold || 75}% minimum match rate
ocr_multiplier: ${ruleData.ocrMultiplier || 3}  # ${ruleData.ocrMultiplier || 3}× weight

core_identifiers:
  logic_groups:
`;

    if (normalizedOcrGroups.length > 0) {
      normalizedOcrGroups.forEach((group, idx) => {
        yaml += `    - type: ${group.type || 'match'}
      score: ${group.score}
      mandatory: ${group.mandatory || false}
      conditions:
`;
        (group.conditions || []).forEach(condition => {
          yaml += `        - pattern: '${escapeSingle(condition.pattern)}'
          source: content
          range: '${condition.range || '0-1600'}'
`;
        });
      });
    } else {
      yaml += `    []\n`;
    }

    yaml += `
static_metadata:
  correspondent: "${ruleData.predefinedData?.correspondent || ''}"
  document_type: "${ruleData.predefinedData?.documentType || ''}"
`;

    const tags = ruleData.predefinedData?.tags || [];
    if (tags.length > 0) {
      yaml += `  tags: [${tags.map(tag => `'${escapeSingle(tag)}'`).join(', ')}]\n`;
    }

    const customFields = ruleData.predefinedData?.customFields || {};
    const activeFields = Object.entries(customFields).filter(([, v]) => v);
    if (activeFields.length > 0) {
      yaml += `  custom_fields:\n`;
      activeFields.forEach(([field, value]) => {
        yaml += `    ${field}: '${escapeSingle(String(value))}'\n`;
      });
    }

    const extractionRules = ruleData.dynamicData?.extractionRules || [];
    if (extractionRules.length > 0) {
      yaml += `\ndynamic_metadata:\n`;
      extractionRules.forEach(rule => {
        const target = rule.targetField === 'dateCreated' ? 'date_created' : rule.targetField;
        if (target === 'tags' && rule.extractionType === 'text') return;
        yaml += `  ${target}:\n`;
        yaml += `    pattern_before: '${escapeSingle(rule.beforeAnchor?.pattern || '')}'\n`;
        yaml += `    pattern_after: '${escapeSingle(rule.afterAnchor?.pattern || '')}'\n`;
        if (rule.extractionType === 'date' && rule.dateFormat) {
          yaml += `    format: ${rule.dateFormat}\n`;
        }
      });
      const tagRules = extractionRules.filter(r => r.targetField === 'tags' && r.extractionType === 'text');
      if (tagRules.length > 0) {
        yaml += `  extracted_tags:\n`;
        tagRules.forEach(rule => {
          yaml += `    - pattern: '${escapeSingle(rule.regexPattern || '')}'\n`;
          yaml += `      value: '${escapeSingle(rule.tagValue || '')}'\n`;
          if (rule.prefix) {
            yaml += `      prefix: '${escapeSingle(rule.prefix)}'\n`;
          }
        });
      }
    } else {
      yaml += `\ndynamic_metadata: {}\n`;
    }

    yaml += `
filename_multiplier: ${ruleData.filenameMultiplier || 1}  # ${ruleData.filenameMultiplier || 1}× weight

filename_patterns:
`;

    const patterns = ruleData.filenamePatterns?.patterns?.filter(p => p && p.trim()) || [];
    if (patterns.length > 0) {
      patterns.forEach(p => {
        yaml += `  - '${escapeSingle(p)}'\n`;
      });
    } else {
      yaml += `  # No filename patterns configured\n`;
    }

    const verMultConfig = ruleData.verificationMultiplierConfig || {};
    const verMode = verMultConfig.mode || 'auto';
    const verValue = verMultConfig.value ?? ruleData.verificationMultiplier ?? 0.5;

    yaml += `
verification_multiplier_mode: "${verMode}"
verification_multiplier: ${verValue}

verification_fields:
`;

    const enabledFields = ruleData.verification?.enabledFields || {};
    const enabledList = Object.entries(enabledFields).filter(([, v]) => v).map(([k]) => k);
    if (enabledList.length > 0) {
      enabledList.forEach(f => {
        yaml += `  - ${f}\n`;
      });
    } else {
      yaml += `  # No verification fields enabled\n`;
    }

    yaml += `\nstatus: ${ruleData.status || 'draft'}\n`;

    return yaml;
  };

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(generateYaml());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    const yamlContent = generateYaml();
    const blob = new Blob([yamlContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${ruleData.ruleId || 'rule'}.yaml`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={handleCopy}
        className={`btn btn-${buttonStyle} btn-sm`}
        title="Copy YAML"
        aria-label="Copy rule configuration as YAML"
      >
        {copied ? <Check className="w-4 h-4 text-green-600" /> : <ClipboardCopy className="w-4 h-4" />}
      </button>
      <button
        onClick={handleDownload}
        className={`btn btn-${buttonStyle} btn-sm`}
        title="Download YAML"
        aria-label="Download rule configuration as YAML file"
      >
        <Download className="w-4 h-4" />
      </button>
    </div>
  );
}
