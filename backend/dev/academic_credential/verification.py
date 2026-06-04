from __future__ import annotations

from typing import Any

from academic_credential.crypto.ecc import verify_signature
from academic_credential.crypto.hashing import hash_course_leaf, hash_student_commitment
from academic_credential.merkle import MerkleTree


def verify_credential(
    proof_package: dict[str, Any],
    issuer_public_key_pem: str,
    authorized_issuers: set[str] | None = None,
    revoked_credentials: set[str] | None = None,
) -> dict[str, Any]:
    credential = proof_package["credential"]
    revealed = proof_package["revealedData"]

    valid_signature = verify_signature(credential, proof_package["signature"], issuer_public_key_pem)
    leaf = hash_course_leaf(
        credential["credentialId"],
        revealed["courseCode"],
        revealed["courseName"],
        revealed["grade"],
        revealed["semester"],
        revealed["courseSalt"],
    )
    valid_merkle_proof = MerkleTree.verify(leaf, proof_package["merkleProof"], credential["merkleRoot"])
    valid_issuer = True if authorized_issuers is None else credential["issuer"] in authorized_issuers
    not_revoked = True if revoked_credentials is None else credential["credentialId"] not in revoked_credentials

    optional_identity = proof_package.get("optionalIdentity")
    if optional_identity is None:
        valid_identity = None
    else:
        valid_identity = (
            hash_student_commitment(optional_identity["studentId"], optional_identity["studentSalt"])
            == credential["studentCommitment"]
        )

    checks = [valid_signature, valid_merkle_proof, valid_issuer, not_revoked]
    if valid_identity is not None:
        checks.append(valid_identity)

    return {
        "validSignature": valid_signature,
        "validMerkleProof": valid_merkle_proof,
        "validIssuer": valid_issuer,
        "notRevoked": not_revoked,
        "validIdentity": valid_identity,
        "result": "VALID" if all(checks) else "INVALID",
    }
