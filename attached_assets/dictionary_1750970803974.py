# dictionary.py - Reference structure for document_metadata
# Description: Defines the full structure of document metadata for POCO processing.
# Version: 2.0

# NOTES: Consider pandas table in python.

document_dict = {
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
        {
            "rule_id": None,
            "rule_name": None,
            "core_score": None,
            "bonus_score": None,
            "total_score": None,
            "threshold": None,
            "pass": None,
            "core_matches": [],   # list of matched core patterns
            "bonus_matches": [],  # list of matched bonus patterns
        },
        # ...repeat for each rule
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
        # Example for one field:
        "correspondent": {
            "content":    {"value": None, "score": None},
            "filename":   {"value": None, "score": None, "match": None},
            "paperless":  {"value": None, "score": None, "match": None},
            "total":      None,
            "match_reason": None,
        },
        # ...repeat for each metadata field...
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