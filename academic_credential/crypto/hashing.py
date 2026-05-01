from __future__ import annotations

import hashlib
import secrets
from typing import Any

from academic_credential.crypto.encoding import canonical_json, to_hex


def sha256(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()


def random_32_bytes_hex() -> str:
    return to_hex(secrets.token_bytes(32))


def hash_fields(*fields: Any) -> str:
    """Hash typed fields with canonical JSON encoding to avoid string-boundary ambiguity."""
    return to_hex(sha256(canonical_json(list(fields))))


def hash_student_commitment(student_id: str, student_salt: str) -> str:
    return hash_fields("studentCommitment:v1", student_id, student_salt)


def hash_course_leaf(
    credential_id: str,
    course_code: str,
    course_name: str,
    grade: str,
    semester: str,
    course_salt: str,
) -> str:
    return hash_fields(
        "courseLeaf:v1",
        credential_id,
        course_code,
        course_name,
        grade,
        semester,
        course_salt,
    )


def hash_credential(credential: dict[str, Any]) -> bytes:
    return sha256(canonical_json(credential))
