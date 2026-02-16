/**
 * @file YamlExportButton.jsx
 * @description Compact button group for exporting a rule's configuration as YAML.
 * Provides copy-to-clipboard (with brief checkmark feedback) and file download
 * actions. Generates the YAML string from the ruleData prop on demand.
 */
import React, { useState } from 'react';
import { Download, ClipboardCopy, Check } from 'lucide-react';

export default function YamlExportButton({ ruleData, buttonStyle = 'ghost' }) {
  const [copied, setCopied] = useState(false);

  const generateYaml = () => {
    return `# =================================================================================================
# Document Identification Rule - ${ruleData.ruleName}
# =================================================================================================
# Generated: ${new Date().toISOString().split('T')[0]}
# Rule ID: ${ruleData.ruleId}
# =================================================================================================

rule_name: "${ruleData.ruleName || ''}"
rule_id: "${ruleData.ruleId || ''}"
threshold: ${ruleData.threshold}  # Minimum confidence score (${ruleData.threshold}%)
description: "${ruleData.description || ''}"

# OCR Identifiers
ocr_identifiers:
  threshold: ${ruleData.ocrThreshold || 75}
  multiplier: ${ruleData.ocrMultiplier || 3}
  logic_groups:
${ruleData.ocrIdentifiers?.map(group => `    - type: "${group.type || 'match'}"
      score: ${group.score || 20}
      mandatory: ${group.mandatory || false}
      conditions:
${group.conditions?.map(condition => `        - pattern: '${(condition.pattern || '').replace(/'/g, "''")}'
          range: '${condition.range || '0-1600'}'`).join('\n') || ''}`).join('\n') || '    []'}

# Document Classifications
predefined_data:
  correspondent: "${ruleData.predefinedData?.correspondent || ''}"
  document_type: "${ruleData.predefinedData?.documentType || ''}"
  tags: [${ruleData.predefinedData?.tags?.map(tag => `"${tag}"`).join(', ') || ''}]

# Filename Patterns (multiplier: ${ruleData.filenameMultiplier || 1})
filename_patterns:
  patterns: [${ruleData.filenamePatterns?.patterns?.filter(p => p && p.trim()).map(p => `'${p.replace(/'/g, "''")}'`).join(', ') || ''}]
  date_formats: [${ruleData.filenamePatterns?.dateFormats?.map(f => `'${f.format}'`).join(', ') || ''}]

# Status
status: ${ruleData.status || 'draft'}`;
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