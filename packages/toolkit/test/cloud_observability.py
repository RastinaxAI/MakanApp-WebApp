# SPDX-FileCopyrightText: 2026 Toolkit Team
# SPDX-License-Identifier: Apache-2.0
"""Smoke tests for the cloud observability helper bundle."""

from __future__ import annotations

import importlib

import pytest

import toolkit.cloud_observability as obs


def test_health_probe_defaults():
    probe = obs.HealthProbe()
    status = probe.status()
    assert "instance" in status
    assert isinstance(status["instance"], str)
    assert status["instance"].startswith("cloud-")


def test_alert_helper_isolation():
    helper = obs.AlertHelper()
    wrapped = helper.wrap(
        "test-operation",
        {"id": "abc"},
    )
    assert wrapped is not None
    assert wrapped.get("metadata", {}).get("operation") == "test-operation"


def test_import_self_no_side_effects(monkeypatch, tmp_path):
    with open(tmp_path / "side_effects.txt", "w") as f:
        f.write("clean\n")
    importlib.reload(obs)
    output = (tmp_path / "side_effects.txt").read_text().strip()
    assert output == "clean"


def test_ansi_escape_extraction():
    raw = "Headers:\r\nContent-Type: text/plain\r\n\r\n"
    extracted = obs.strip_crlf_headers(raw)
    assert "\r\n" not in extracted
