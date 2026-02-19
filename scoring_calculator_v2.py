"""
PocoClass - POCO Scoring Calculator v2

Implements the dual-score evaluation system defined in the POCO Scoring
Mechanism v2 specification.  Two scores are produced for every document:

    1. POCO OCR Score  – A transparency score based solely on OCR pattern
       matches.  It tells users how well the document text matched the
       rule's identifiers.

    2. POCO Score      – The final actionable score that also incorporates
       filename matches and Paperless metadata verification.  This is the
       score compared against the classification threshold.

Key class:
    POCOScoringV2: Stateless calculator with methods for score computation
                   and threshold evaluation.
"""

import logging
from typing import Dict, List, Any, Optional, Tuple

class POCOScoringV2:
    """
    POCO Scoring System v2
    
    Implements the dual-score system:
    1. POCO OCR Score - Transparent pattern matching score
    2. POCO Score - Final actionable score with filename and Paperless adjustments
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def calculate_scores(self, 
                        ocr_matches: int,
                        ocr_total: int,
                        filename_matches: int,
                        filename_total: int,
                        paperless_matches: int,
                        paperless_total: int,
                        ocr_multiplier: float = 3.0,
                        filename_multiplier: float = 1.0,
                        paperless_multiplier: Optional[float] = None) -> Dict[str, Any]:
        """
        Calculate both POCO OCR and POCO scores.

        The scoring formula applies trust multipliers to each source so that
        OCR (the most reliable signal) contributes most to the final score.
        
        Args:
            ocr_matches: Number of OCR identifiers matched
            ocr_total: Total OCR identifiers defined
            filename_matches: Number of filename patterns matched
            filename_total: Total filename patterns defined
            paperless_matches: Number of Paperless metadata fields matched
            paperless_total: Total Paperless metadata fields evaluated
            ocr_multiplier: Trust multiplier for OCR (default: 3.0)
            filename_multiplier: Trust multiplier for filename (default: 1.0)
            paperless_multiplier: Trust multiplier for Paperless (default: 1/paperless_total)
        
        Returns:
            Dictionary with poco_ocr_score, poco_score, and per-source breakdowns
        """
        
        # Auto-calculate Paperless multiplier so that all Paperless fields
        # together contribute at most 1.0 weight (prevents field-count inflation)
        if paperless_multiplier is None:
            paperless_multiplier = (1.0 / paperless_total) if paperless_total > 0 else 0
        
        # --- 1. OCR Weighted Score ---
        # Formula simplifies to: matched × multiplier  (the ratio cancels out)
        ocr_weighted = ocr_matches * ocr_multiplier if ocr_total > 0 else 0
        ocr_max_weight = ocr_total * ocr_multiplier
        
        # --- 2. Filename Weighted Score ---
        filename_weighted = filename_matches * filename_multiplier if filename_total > 0 else 0
        filename_max_weight = filename_total * filename_multiplier
        
        # --- 3. Paperless Weighted Score ---
        # Neutralized: max possible weight is always 1.0 regardless of field count
        # When no verification fields exist (paperless_total == 0), exclude entirely
        paperless_weighted = paperless_matches * paperless_multiplier if paperless_total > 0 else 0
        paperless_max_weight = 1.0 if paperless_total > 0 else 0
        
        # --- 4. POCO OCR Score (transparency-only, 0-100%) ---
        poco_ocr_score = (ocr_weighted / ocr_max_weight * 100) if ocr_max_weight > 0 else 0
        
        # --- 5. Combined POCO Score (all three sources, 0-100%) ---
        total_weighted = ocr_weighted + filename_weighted + paperless_weighted
        total_max_weight = ocr_max_weight + filename_max_weight + paperless_max_weight
        
        poco_score = (total_weighted / total_max_weight * 100) if total_max_weight > 0 else 0
        
        return {
            'poco_ocr_score': round(poco_ocr_score, 2),
            'poco_score': round(poco_score, 2),
            'ocr': {
                'matched': ocr_matches,
                'total': ocr_total,
                'weighted': round(ocr_weighted, 2),
                'max_weight': round(ocr_max_weight, 2),
                'multiplier': ocr_multiplier,
                'percentage': round(poco_ocr_score, 2)
            },
            'filename': {
                'matched': filename_matches,
                'total': filename_total,
                'weighted': round(filename_weighted, 2),
                'max_weight': round(filename_max_weight, 2),
                'multiplier': filename_multiplier,
                'percentage': round((filename_matches / filename_total * 100) if filename_total > 0 else 0, 2)
            },
            'paperless': {
                'matched': paperless_matches,
                'total': paperless_total,
                'weighted': round(paperless_weighted, 2),
                'max_weight': paperless_max_weight,
                'multiplier': round(paperless_multiplier, 3),
                'percentage': round((paperless_matches / paperless_total * 100) if paperless_total > 0 else 0, 2)
            },
            'total_weighted': round(total_weighted, 2),
            'total_max_weight': round(total_max_weight, 2)
        }
    
    def evaluate_thresholds(self,
                           poco_ocr_score: float,
                           poco_score: float,
                           ocr_threshold: float = 75.0,
                           poco_threshold: float = 80.0) -> Dict[str, Any]:
        """
        Evaluate whether the calculated scores meet the required thresholds.

        Classification is only allowed when *both* the OCR score and the
        combined POCO score pass their respective thresholds.  The returned
        status string provides a human-readable confidence label.
        
        Args:
            poco_ocr_score: The OCR transparency score (0-100)
            poco_score: The final actionable score (0-100)
            ocr_threshold: Minimum OCR threshold (default: 75%)
            poco_threshold: Minimum POCO threshold (default: 80%)
        
        Returns:
            Dictionary with pass/fail flags, status label, and reason text
        """
        
        ocr_passes = poco_ocr_score >= ocr_threshold
        poco_passes = poco_score >= poco_threshold
        
        # Both thresholds must pass for classification to proceed
        classification_allowed = ocr_passes and poco_passes
        
        # Determine a human-readable status with escalating confidence levels
        if poco_score == 0:
            status = 'FAIL'
            reason = 'OCR failed mandatory identifiers'
        elif not ocr_passes:
            status = 'FAIL'
            reason = f'OCR score {poco_ocr_score}% below threshold {ocr_threshold}%'
        elif not poco_passes:
            status = 'BORDERLINE'
            reason = f'POCO score {poco_score}% below threshold {poco_threshold}%'
        else:
            # Both thresholds passed – assign a confidence tier
            if poco_score >= 90:
                status = 'EXCELLENT'
                reason = 'Very high confidence; all sources aligned'
            elif poco_score >= 80:
                status = 'CONFIDENT'
                reason = 'Confident classification'
            else:
                status = 'PASS'
                reason = 'Classification acceptable'
        
        return {
            'classification_allowed': classification_allowed,
            'ocr_passes': ocr_passes,
            'poco_passes': poco_passes,
            'status': status,
            'reason': reason,
            'poco_ocr_score': poco_ocr_score,
            'poco_score': poco_score,
            'ocr_threshold': ocr_threshold,
            'poco_threshold': poco_threshold
        }
    
    def calculate_full_evaluation(self,
                                  ocr_matches: int,
                                  ocr_total: int,
                                  filename_matches: int = 0,
                                  filename_total: int = 0,
                                  paperless_matches: int = 0,
                                  paperless_total: int = 0,
                                  ocr_multiplier: float = 3.0,
                                  filename_multiplier: float = 1.0,
                                  ocr_threshold: float = 75.0,
                                  poco_threshold: float = 80.0) -> Dict[str, Any]:
        """
        Convenience method: calculate scores then evaluate thresholds in one call.

        Args:
            ocr_matches: Number of OCR identifiers matched
            ocr_total: Total OCR identifiers defined in the rule
            filename_matches: Number of filename patterns matched
            filename_total: Total filename patterns defined
            paperless_matches: Number of Paperless metadata fields matched
            paperless_total: Total Paperless metadata fields evaluated
            ocr_multiplier: Trust multiplier for OCR (default: 3.0)
            filename_multiplier: Trust multiplier for filename (default: 1.0)
            ocr_threshold: Minimum OCR threshold percentage
            poco_threshold: Minimum combined POCO threshold percentage

        Returns:
            Combined dictionary with scores, evaluation results, and a summary
        """
        
        scores = self.calculate_scores(
            ocr_matches, ocr_total,
            filename_matches, filename_total,
            paperless_matches, paperless_total,
            ocr_multiplier, filename_multiplier
        )
        
        threshold_eval = self.evaluate_thresholds(
            scores['poco_ocr_score'],
            scores['poco_score'],
            ocr_threshold,
            poco_threshold
        )
        
        return {
            'scores': scores,
            'evaluation': threshold_eval,
            'summary': {
                'poco_ocr_score': scores['poco_ocr_score'],
                'poco_score': scores['poco_score'],
                'status': threshold_eval['status'],
                'classification_allowed': threshold_eval['classification_allowed']
            }
        }


# Example usage and verification
if __name__ == '__main__':
    scorer = POCOScoringV2()
    
    # Example from documentation:
    # OCR: 8/10 identifiers matched, Filename: 2/3, Paperless: 3/5
    result = scorer.calculate_full_evaluation(
        ocr_matches=8, ocr_total=10,
        filename_matches=2, filename_total=3,
        paperless_matches=3, paperless_total=5,
        ocr_multiplier=3.0,
        filename_multiplier=1.0,
        ocr_threshold=75.0,
        poco_threshold=80.0
    )
    
    print("Example Calculation:")
    print(f"POCO OCR Score: {result['summary']['poco_ocr_score']}%")
    print(f"POCO Score: {result['summary']['poco_score']}%")
    print(f"Status: {result['summary']['status']}")
    print(f"Classification Allowed: {result['summary']['classification_allowed']}")
    print("\nDetailed Breakdown:")
    print(f"OCR: {result['scores']['ocr']}")
    print(f"Filename: {result['scores']['filename']}")
    print(f"Paperless: {result['scores']['paperless']}")
