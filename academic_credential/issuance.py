from __future__ import annotations

import time
from typing import Any

from academic_credential.crypto.ecc import sign_credential
from academic_credential.crypto.hashing import (
    hash_course_leaf,
    hash_student_commitment,
    random_32_bytes_hex,
)
from academic_credential.merkle import MerkleTree


def issue_credential(input_data: dict[str, Any], issuer_private_key_pem: str, issuer_address: str | None = None) -> dict[str, Any]:
    required = ["studentId", "degree", "major", "graduationYear", "courses"]
    missing = [field for field in required if field not in input_data]
    if missing:
        raise ValueError(f"missing issuance fields: {', '.join(missing)}")

    credential_id = random_32_bytes_hex()
    student_salt = random_32_bytes_hex()
    student_commitment = hash_student_commitment(input_data["studentId"], student_salt)

    private_courses = []
    leaves = []
    for course in input_data["courses"]:
        course_salt = random_32_bytes_hex()
        private_course = {
            "courseCode": course["courseCode"],
            "courseName": course["courseName"],
            "grade": course["grade"],
            "semester": course["semester"],
            "courseSalt": course_salt,
        }
        private_courses.append(private_course)
        leaves.append(
            hash_course_leaf(
                credential_id,
                private_course["courseCode"],
                private_course["courseName"],
                private_course["grade"],
                private_course["semester"],
                course_salt,
            )
        )

    tree = MerkleTree(leaves)
    credential = {
        "credentialId": credential_id,
        "issuer": issuer_address or "0xUniversityAddress",
        "studentCommitment": student_commitment,
        "degree": input_data["degree"],
        "major": input_data["major"],
        "graduationYear": input_data["graduationYear"],
        "merkleRoot": tree.root,
        "issuedAt": int(input_data.get("issuedAt", time.time())),
    }

    return {
        "credential": credential,
        "signature": sign_credential(credential, issuer_private_key_pem),
        "studentSalt": student_salt,
        "courses": private_courses,
        "merkleProofs": {
            course["courseCode"]: tree.proof(index)
            for index, course in enumerate(private_courses)
        },
    }
