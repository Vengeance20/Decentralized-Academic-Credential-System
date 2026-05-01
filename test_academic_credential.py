import copy
import unittest

from academic_credential import (
    build_disclosure_package,
    generate_ecc_key_pair,
    issue_credential,
    verify_credential,
)


class AcademicCredentialTest(unittest.TestCase):
    def setUp(self) -> None:
        self.issuer_keys = generate_ecc_key_pair()
        self.transcript = {
            "studentId": "20230001",
            "degree": "Bachelor",
            "major": "Cybersecurity",
            "graduationYear": 2026,
            "issuedAt": 1710000000,
            "courses": [
                {
                    "courseCode": "CS401",
                    "courseName": "Cryptography",
                    "grade": "A",
                    "semester": "2025-1",
                },
                {
                    "courseCode": "BC301",
                    "courseName": "Blockchain Security",
                    "grade": "A",
                    "semester": "2025-1",
                },
                {
                    "courseCode": "NW210",
                    "courseName": "Network Security",
                    "grade": "B+",
                    "semester": "2024-2",
                },
            ],
        }
        self.credential_package = issue_credential(
            self.transcript,
            issuer_private_key_pem=self.issuer_keys["privateKeyPem"],
            issuer_address=self.issuer_keys["address"],
        )

    def test_valid_selective_disclosure_with_identity(self) -> None:
        disclosure = build_disclosure_package(self.credential_package, "CS401", student_id="20230001")
        result = verify_credential(
            disclosure,
            issuer_public_key_pem=self.issuer_keys["publicKeyPem"],
            authorized_issuers={self.issuer_keys["address"]},
            revoked_credentials=set(),
        )
        self.assertEqual(result["result"], "VALID")
        self.assertTrue(result["validSignature"])
        self.assertTrue(result["validMerkleProof"])
        self.assertTrue(result["validIdentity"])

    def test_valid_selective_disclosure_without_identity(self) -> None:
        disclosure = build_disclosure_package(self.credential_package, "BC301")
        result = verify_credential(
            disclosure,
            issuer_public_key_pem=self.issuer_keys["publicKeyPem"],
            authorized_issuers={self.issuer_keys["address"]},
            revoked_credentials=set(),
        )
        self.assertEqual(result["result"], "VALID")
        self.assertIsNone(result["validIdentity"])

    def test_tampered_grade_fails_merkle_proof(self) -> None:
        disclosure = build_disclosure_package(self.credential_package, "CS401")
        tampered = copy.deepcopy(disclosure)
        tampered["revealedData"]["grade"] = "C"
        result = verify_credential(tampered, issuer_public_key_pem=self.issuer_keys["publicKeyPem"])
        self.assertEqual(result["result"], "INVALID")
        self.assertFalse(result["validMerkleProof"])

    def test_tampered_credential_fails_signature(self) -> None:
        disclosure = build_disclosure_package(self.credential_package, "CS401")
        tampered = copy.deepcopy(disclosure)
        tampered["credential"]["major"] = "Software Engineering"
        result = verify_credential(tampered, issuer_public_key_pem=self.issuer_keys["publicKeyPem"])
        self.assertEqual(result["result"], "INVALID")
        self.assertFalse(result["validSignature"])

    def test_wrong_student_id_fails_identity(self) -> None:
        disclosure = build_disclosure_package(self.credential_package, "CS401", student_id="99999999")
        result = verify_credential(disclosure, issuer_public_key_pem=self.issuer_keys["publicKeyPem"])
        self.assertEqual(result["result"], "INVALID")
        self.assertFalse(result["validIdentity"])

    def test_unauthorized_issuer_fails(self) -> None:
        disclosure = build_disclosure_package(self.credential_package, "CS401")
        result = verify_credential(
            disclosure,
            issuer_public_key_pem=self.issuer_keys["publicKeyPem"],
            authorized_issuers={"0x0000000000000000000000000000000000000000"},
        )
        self.assertEqual(result["result"], "INVALID")
        self.assertFalse(result["validIssuer"])

    def test_revoked_credential_fails(self) -> None:
        disclosure = build_disclosure_package(self.credential_package, "CS401")
        credential_id = self.credential_package["credential"]["credentialId"]
        result = verify_credential(
            disclosure,
            issuer_public_key_pem=self.issuer_keys["publicKeyPem"],
            revoked_credentials={credential_id},
        )
        self.assertEqual(result["result"], "INVALID")
        self.assertFalse(result["notRevoked"])


if __name__ == "__main__":
    unittest.main()

