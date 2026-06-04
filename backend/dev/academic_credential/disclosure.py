from __future__ import annotations

from typing import Any


def build_disclosure_package(
    credential_package: dict[str, Any],
    course_code: str,
    student_id: str | None = None,
) -> dict[str, Any]:
    courses = credential_package["courses"]
    course = next((item for item in courses if item["courseCode"] == course_code), None)
    if course is None:
        raise ValueError(f"course not found: {course_code}")

    package = {
        "credential": credential_package["credential"],
        "signature": credential_package["signature"],
        "revealedData": course,
        "merkleProof": credential_package["merkleProofs"][course_code],
    }
    if student_id is not None:
        package["optionalIdentity"] = {
            "studentId": student_id,
            "studentSalt": credential_package["studentSalt"],
        }
    return package
