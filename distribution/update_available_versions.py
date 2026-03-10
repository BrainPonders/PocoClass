#!/usr/bin/env python3
"""
Update the auto-generated "Available Versions" block in README.md.

This script reads git tags, determines the latest stable, RC, and dev release
tags, and replaces the marked block in README.md.
"""

from __future__ import annotations

import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
README = ROOT / "README.md"
ENV_EXAMPLE = ROOT / "docker" / "compose" / ".env.example"
VERSION_FILE = ROOT / "VERSION"
IMAGE_REPO = "ghcr.io/brainponders/pococlass"
BEGIN_MARKER = "<!-- BEGIN: AVAILABLE_VERSIONS -->"
END_MARKER = "<!-- END: AVAILABLE_VERSIONS -->"

TAG_RE = re.compile(
    r"^v(?P<major>\d+)\.(?P<minor>\d+)\.(?P<patch>\d+)"
    r"(?:-(?P<channel>dev|rc)\.(?P<num>\d+))?$"
)


def git_tags() -> list[str]:
    result = subprocess.run(
        ["git", "tag", "-l"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def parse_tag(tag: str):
    match = TAG_RE.match(tag)
    if not match:
        return None
    major = int(match.group("major"))
    minor = int(match.group("minor"))
    patch = int(match.group("patch"))
    channel = match.group("channel") or "stable"
    num = int(match.group("num") or 0)
    channel_order = {"dev": 0, "rc": 1, "stable": 2}[channel]
    return {
        "tag": tag,
        "channel": channel,
        "parsed": (major, minor, patch, channel_order, num),
    }


def select_latest(tags: list[dict], channel: str):
    candidates = [tag for tag in tags if tag["channel"] == channel]
    if not candidates:
        return None
    return max(candidates, key=lambda item: item["parsed"])


def row(label: str, tag_info):
    if not tag_info:
        return f"| {label} | - | - |"
    tag = tag_info["tag"]
    return f"| {label} | `{tag}` | `POCOCLASS_IMAGE={IMAGE_REPO}:{tag}` |"


def default_stable_example(tags: list[dict]) -> str:
    stable = select_latest(tags, "stable")
    if stable:
        return stable["tag"]
    return f"v{VERSION_FILE.read_text().strip()}"


def build_block(parsed: list[dict]) -> str:
    stable = select_latest(parsed, "stable")
    rc = select_latest(parsed, "rc")
    dev = select_latest(parsed, "dev")

    lines = [
        BEGIN_MARKER,
        "## Available Versions",
        "",
        "This section is updated automatically from published release tags.",
        "`latest` is intentionally not used.",
        "",
        "| Channel | Current tag | Deployment value |",
        "| --- | --- | --- |",
        row("Stable", stable),
        row("Release Candidate", rc),
        row("Development", dev),
        END_MARKER,
    ]
    return "\n".join(lines)


def update_readme(parsed: list[dict], stable_example_tag: str):
    content = README.read_text()
    if BEGIN_MARKER not in content or END_MARKER not in content:
        raise SystemExit("README markers for available versions were not found.")

    start = content.index(BEGIN_MARKER)
    end = content.index(END_MARKER) + len(END_MARKER)
    replacement = build_block(parsed)
    updated = content[:start] + replacement + content[end:]
    updated = re.sub(
        r"POCOCLASS_IMAGE=ghcr\.io/brainponders/pococlass:[^\s`]+",
        f"POCOCLASS_IMAGE={IMAGE_REPO}:{stable_example_tag}",
        updated,
        count=1,
    )
    README.write_text(updated)


def update_env_example(stable_example_tag: str):
    content = ENV_EXAMPLE.read_text()
    updated = re.sub(
        r"^POCOCLASS_IMAGE=.*$",
        f"POCOCLASS_IMAGE={IMAGE_REPO}:{stable_example_tag}",
        content,
        flags=re.MULTILINE,
    )
    ENV_EXAMPLE.write_text(updated)


if __name__ == "__main__":
    parsed_tags = [item for tag in git_tags() if (item := parse_tag(tag))]
    stable_example_tag = default_stable_example(parsed_tags)
    update_readme(parsed_tags, stable_example_tag)
    update_env_example(stable_example_tag)
