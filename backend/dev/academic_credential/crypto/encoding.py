from __future__ import annotations

import json
from typing import Any


HEX_PREFIX = "0x"


def canonical_json(data: Any) -> bytes:
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def to_hex(data: bytes) -> str:
    return HEX_PREFIX + data.hex()


def from_hex(value: str) -> bytes:
    if not isinstance(value, str) or not value.startswith(HEX_PREFIX):
        raise ValueError(f"expected 0x-prefixed hex string, got {value!r}")
    return bytes.fromhex(value[2:])
