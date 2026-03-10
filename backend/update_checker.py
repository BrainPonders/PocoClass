"""
PocoClass update checker.

Checks GitHub releases with a small in-memory cache so the UI can notify users
when a newer stable or release-candidate build is available.
"""

from __future__ import annotations

import logging
import os
import re
import threading
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple


logger = logging.getLogger(__name__)

_VERSION_PATTERN = re.compile(
    r"^v?"
    r"(?P<major>\d+)\.(?P<minor>\d+)"
    r"(?:\.(?P<patch>\d+))?"
    r"(?:-(?P<channel>develop|dev|rc)"
    r"(?:(?:[.-]?(?P<channel_num>\d+))|(?:\.b(?P<build_num>\d+)))?"
    r")?"
    r"(?:\+.*)?$"
)

_CHANNEL_ORDER = {
    "develop": 0,
    "dev": 0,
    "rc": 1,
    None: 2,
}


def _utc_now_iso() -> str:
    """Return a compact UTC ISO timestamp for API responses."""
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def normalize_version(version: Optional[str]) -> Optional[str]:
    """Normalize tags into the version format used for comparisons and display."""
    if not version:
        return None

    cleaned = version.strip()
    if cleaned.endswith("-amd64"):
        cleaned = cleaned[: -len("-amd64")]
    if cleaned.startswith("v"):
        cleaned = cleaned[1:]
    return cleaned


def parse_version(version: Optional[str]) -> Optional[Tuple[int, int, int, int, int]]:
    """Normalize supported PocoClass version tags into a sortable tuple."""
    cleaned = normalize_version(version)
    if not cleaned:
        return None

    match = _VERSION_PATTERN.match(cleaned)
    if not match:
        return None

    major = int(match.group("major"))
    minor = int(match.group("minor"))
    patch = int(match.group("patch") or 0)
    channel = match.group("channel")
    channel_num = int(match.group("channel_num") or match.group("build_num") or 0)

    return (
        major,
        minor,
        patch,
        _CHANNEL_ORDER[channel],
        channel_num,
    )


def version_channel(version: Optional[str]) -> Optional[str]:
    """Return stable, rc, or develop for a normalized version string."""
    cleaned = normalize_version(version)
    if not cleaned:
        return None

    match = _VERSION_PATTERN.match(cleaned)
    if not match:
        return None

    channel = match.group("channel")
    if channel in {"develop", "dev"}:
        return "develop"
    if channel == "rc":
        return "rc"
    return "stable"


def version_line(version: Optional[str]) -> Optional[Tuple[int, int, int]]:
    """Return the major/minor/patch line for version matching."""
    parsed = parse_version(version)
    if not parsed:
        return None
    return parsed[:3]


class UpdateChecker:
    """Fetch and cache latest PocoClass release metadata."""

    def __init__(self):
        self._lock = threading.Lock()
        self._cached_releases: Optional[List[Dict[str, object]]] = None
        self._checked_at: float = 0.0

    def _is_enabled(self) -> bool:
        return os.getenv("POCOCLASS_UPDATE_CHECK_ENABLED", "true").strip().lower() not in {
            "0",
            "false",
            "no",
            "off",
        }

    def _cache_ttl_seconds(self) -> int:
        raw = os.getenv("POCOCLASS_UPDATE_CHECK_CACHE_SECONDS", "21600")
        try:
            return max(int(raw), 60)
        except ValueError:
            return 21600

    def _releases_api_url(self) -> str:
        explicit = os.getenv("POCOCLASS_UPDATE_RELEASES_API_URL", "").strip()
        if explicit:
            return explicit

        repo = os.getenv("POCOCLASS_UPDATE_CHECK_REPO", "BrainPonders/PocoClass").strip()
        return f"https://api.github.com/repos/{repo}/releases"

    def _fetch_releases(self, current_version: str) -> List[Dict[str, object]]:
        import requests

        response = requests.get(
            self._releases_api_url(),
            headers={
                "Accept": "application/vnd.github+json",
                "User-Agent": f"PocoClass/{current_version}",
            },
            timeout=5,
        )
        response.raise_for_status()
        payload = response.json()

        releases: List[Dict[str, object]] = []
        for item in payload:
            raw_tag = item.get("tag_name") or item.get("name") or ""
            normalized = normalize_version(raw_tag)
            parsed = parse_version(normalized)
            if not normalized or not parsed:
                continue

            channel = version_channel(normalized)
            if channel not in {"stable", "rc"}:
                continue

            releases.append(
                {
                    "version": normalized,
                    "parsed": parsed,
                    "channel": channel,
                    "release_url": item.get("html_url") or "",
                    "published_at": item.get("published_at"),
                }
            )

        releases.sort(key=lambda item: item["parsed"], reverse=True)
        return releases

    def _select_candidate(
        self,
        current_version: str,
        releases: List[Dict[str, object]],
    ) -> Optional[Dict[str, object]]:
        current_parsed = parse_version(current_version)
        current_channel = version_channel(current_version)
        current_line = version_line(current_version)

        if not current_parsed or current_channel not in {"stable", "rc"}:
            return None

        if current_channel == "stable":
            for release in releases:
                if release["channel"] == "stable" and release["parsed"] > current_parsed:
                    return release
            return None

        # RC builds: prefer newer RCs in the same release line. If none exist,
        # fall back to the final stable release for the same line.
        for release in releases:
            if (
                release["channel"] == "rc"
                and version_line(release["version"]) == current_line
                and release["parsed"] > current_parsed
            ):
                return release

        for release in releases:
            if (
                release["channel"] == "stable"
                and version_line(release["version"]) == current_line
                and release["parsed"] > current_parsed
            ):
                return release

        return None

    def get_status(self, current_version: str) -> Dict[str, object]:
        """Return cached release status, refreshing it when needed."""
        base_status = {
            "enabled": self._is_enabled(),
            "current_version": normalize_version(current_version) or current_version,
            "latest_version": None,
            "release_url": None,
            "published_at": None,
            "checked_at": None,
            "update_available": False,
            "error": None,
        }

        if not base_status["enabled"]:
            return base_status

        if version_channel(current_version) not in {"stable", "rc"}:
            base_status["checked_at"] = _utc_now_iso()
            return base_status

        now = time.time()
        ttl = self._cache_ttl_seconds()

        with self._lock:
            releases = self._cached_releases
            if not releases or (now - self._checked_at) >= ttl:
                try:
                    releases = self._fetch_releases(current_version)
                    self._cached_releases = releases
                    self._checked_at = now
                except Exception as exc:
                    logger.warning("Update check failed: %s", exc)
                    releases = self._cached_releases
                    if not releases:
                        base_status["checked_at"] = _utc_now_iso()
                        base_status["error"] = str(exc)
                        return base_status
                    base_status["error"] = str(exc)

            candidate = self._select_candidate(current_version, releases)
            base_status["checked_at"] = _utc_now_iso()
            if candidate:
                base_status["latest_version"] = candidate["version"]
                base_status["release_url"] = candidate["release_url"]
                base_status["published_at"] = candidate["published_at"]
                base_status["update_available"] = True

            return base_status
