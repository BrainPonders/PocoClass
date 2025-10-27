"""
PocoClass - Document Dictionary Structure
Defines the complete data structure for document processing workflow
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
import copy

def create_document_dict() -> Dict[str, Any]:
    """Create a new document dictionary with default structure"""
    return {
        # Basic document info
        "id": None,                # int: Paperless document ID
        "title": None,             # str: Document title
        "filename": None,          # str: Original filename
        "raw_api_doc": {},         # dict: Full API response for raw reference

        # Content (full OCR/text) for later analysis
        "content": None,           # str

        # Paperless metadata as received from the API
        "paperless_metadata": {
            "date_created": {"raw": None, "parsed": None},    # raw vs parsed date
            "correspondent": {"id": None, "name": None},      # ID and human-readable name
            "document_type": {"id": None, "name": None},
            "tags": [                                         # list of tag objects
                # {"id": None, "name": None}
            ],
            "custom_fields": [                                # list of custom field objects
                # {"id": None, "name": None, "value": None}
            ],
        },

        # Rule evaluations for reasoning/debug (one entry per rule tested)
        "rule_evaluations": [
            # {
            #     "rule_id": None,
            #     "rule_name": None,
            #     "core_score": None,
            #     "bonus_score": None,
            #     "total_score": None,
            #     "threshold": None,
            #     "pass": None,
            #     "core_matches": [],   # list of matched core patterns
            #     "bonus_matches": [],  # list of matched bonus patterns
            # },
        ],

        # Winning rule selection
        "selected_rule": {
            "rule_id": None,
            "rule_name": None,
            "core_score": None,
            "bonus_score": None,
            "total_score": None,
            "threshold": None,
            "pass": None,
            "core_matches": [],
            "bonus_matches": [],
        },

        # Metadata extracted from content (static from winner rule + dynamic from OCR)
        "content_metadata": {
            "correspondent":    {"value": None, "score": None},
            "document_type":    {"value": None, "score": None},
            "tags":             {"value": None, "score": None},
            "custom_fields":    {"value": None, "score": None},
            "date_created":     {"value": None, "score": None},
        },

        # Metadata extracted from filename (from winner rule)
        "filename_metadata": {
            "correspondent":    {"value": None, "score": None},
            "document_type":    {"value": None, "score": None},
            "tags":             {"value": None, "score": None},
            "custom_fields":    {"value": None, "score": None},
            "date_created":     {"value": None, "score": None},
        },

        # Weights from filename and paperless for each field (from winner rule)
        "filename_scores": {
            "correspondent": None,
            "document_type": None,
            "tags": None,
            "custom_fields": None,
            "date_created": None,
        },
        "paperless_scores": {
            "correspondent": None,
            "document_type": None,
            "tags": None,
            "custom_fields": None,
            "date_created": None,
        },

        # Detailed per-field POCO scoring breakdown
        "poco_score_details": {
            "correspondent": {
                "content":    {"value": None, "score": None},
                "filename":   {"value": None, "score": None, "match": None},
                "paperless":  {"value": None, "score": None, "match": None},
                "total":      None,
                "match_reason": None,
            },
            "document_type": {
                "content":    {"value": None, "score": None},
                "filename":   {"value": None, "score": None, "match": None},
                "paperless":  {"value": None, "score": None, "match": None},
                "total":      None,
                "match_reason": None,
            },
            "tags": {
                "content":    {"value": None, "score": None},
                "filename":   {"value": None, "score": None, "match": None},
                "paperless":  {"value": None, "score": None, "match": None},
                "total":      None,
                "match_reason": None,
            },
            "custom_fields": {
                "content":    {"value": None, "score": None},
                "filename":   {"value": None, "score": None, "match": None},
                "paperless":  {"value": None, "score": None, "match": None},
                "total":      None,
                "match_reason": None,
            },
            "date_created": {
                "content":    {"value": None, "score": None},
                "filename":   {"value": None, "score": None, "match": None},
                "paperless":  {"value": None, "score": None, "match": None},
                "total":      None,
                "match_reason": None,
            },
        },

        # Summary of overall scores
        "scores": {
            "content": None,     # selected_rule.total_score
            "filename": None,    # filename weight
            "paperless": None,   # paperless weight
        },

        # Processing metadata (timestamps, notes, etc.)
        "processing_info": {
            "fetched_at": None,   # str: when data was fetched
            "phase": None,        # str: current processing phase
            "notes": None,        # str: any debug/info notes
        },

        # Boolean flags for data availability and matching status
        "flags": {
            "is_content_match": None,
            "is_filename_match": None,
            "is_paperless_data_available": None,
        },

        # Summary POCO result
        "poco_summary": {
            "final_score": None,      # int
            "pass": None,             # bool
            "winner_rule_id": None,
            "winner_rule_name": None,
        }
    }

def copy_document_dict(doc_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Create a deep copy of a document dictionary"""
    return copy.deepcopy(doc_dict)

def validate_document_dict(doc_dict: Dict[str, Any]) -> bool:
    """Validate that a document dictionary has the required structure"""
    required_keys = [
        'id', 'title', 'filename', 'content', 'paperless_metadata',
        'rule_evaluations', 'selected_rule', 'content_metadata',
        'filename_metadata', 'poco_score_details', 'processing_info',
        'flags', 'poco_summary'
    ]
    
    for key in required_keys:
        if key not in doc_dict:
            return False
    
    return True
