"""
Practice registry: provides a unified interface for discovering
and loading practice configurations.

Each practice is defined in data/practices/ and registered here.
"""

from typing import Dict, List, Optional

# ---------------------------------------------------------------------------
# Internal registry – maps practice_id (int) to its configuration dict.
# Practices self-register by calling `register_practice()` at import time
# (see data/practices/__init__.py).
# ---------------------------------------------------------------------------
_PRACTICES: Dict[int, dict] = {}


def register_practice(practice: dict) -> None:
    """Register a practice configuration dict.

    The dict **must** contain at least ``id`` (int) and ``name`` (str).
    """
    pid = practice["id"]
    _PRACTICES[pid] = practice


def get_all_practices() -> List[dict]:
    """Return a list of summary dicts for every registered practice."""
    return list(_PRACTICES.values())


def get_practice(practice_id: int) -> Optional[dict]:
    """Return the full configuration dict for *practice_id*, or ``None``."""
    return _PRACTICES.get(practice_id)
