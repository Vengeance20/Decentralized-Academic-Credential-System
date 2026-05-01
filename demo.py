import json

from academic_credential import (
    build_disclosure_package,
    generate_ecc_key_pair,
    issue_credential,
    verify_credential,
)


def main() -> None:
    issuer_keys = generate_ecc_key_pair()
    transcript = {
        "studentId": "20230001",
        "degree": "Bachelor",
        "major": "Cybersecurity",
        "graduationYear": 2026,
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

    credential_package = issue_credential(
        transcript,
        issuer_private_key_pem=issuer_keys["privateKeyPem"],
        issuer_address=issuer_keys["address"],
    )
    disclosure = build_disclosure_package(credential_package, "CS401", student_id="20230001")
    result = verify_credential(
        disclosure,
        issuer_public_key_pem=issuer_keys["publicKeyPem"],
        authorized_issuers={issuer_keys["address"]},
        revoked_credentials=set(),
    )

    print("Credential:")
    print(json.dumps(credential_package["credential"], indent=2))
    print("\nSelective disclosure package:")
    print(json.dumps(disclosure, indent=2))
    print("\nVerification result:")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()

