# Privacy-Preserving Academic Credential

Python implementation of a privacy-preserving academic credential module using:

- Merkle Tree for selective disclosure
- Salted hash commitments for student identity privacy
- ECC ECDSA signatures for issuer authenticity

Scope: cryptography logic only. There is no frontend and no smart contract code.

## Files

- `academic_credential/__init__.py`: public blackbox API exports
- `academic_credential/crypto/encoding.py`: canonical JSON and hex helpers
- `academic_credential/crypto/hashing.py`: SHA-256 commitments, leaves, credential hash
- `academic_credential/crypto/ecc.py`: ECC key generation, signing, signature verification
- `academic_credential/merkle.py`: Merkle tree, root, proof generation, proof verification
- `academic_credential/issuance.py`: credential issuance flow
- `academic_credential/disclosure.py`: selective disclosure package builder
- `academic_credential/verification.py`: verifier flow
- `demo.py`: end-to-end example
- `test_academic_credential.py`: unit tests
- `requirements.txt`: Python dependency list

## Cryptographic Choices

- Hash: SHA-256 over canonical JSON encoded fields
- ECC signature: ECDSA over curve P-256 / SECP256R1
- Signature encoding: base64 DER signature
- Random salts and credential IDs: 32 bytes, encoded as `0x...`

The Merkle proof format includes sibling direction:

```json
[
  {
    "position": "right",
    "hash": "0x..."
  }
]
```

This is slightly more explicit than a plain list of hashes. Without `left` or `right`, the verifier cannot safely recompute the root for every leaf position.

## Overview flow

[ Bảng điểm gốc (Transcript) ]
                │
                ▼
 ┌──────────────────────────────────────────┐
 │ GIAI ĐOẠN 1: ISSUANCE (Trường Đại học)   │
 └──────────────────────────────────────────┘
                │
                ├─► merkle.py: Băm (Hash) từng môn học thành Leaf Nodes.
                │              Xây dựng cây -> Trích xuất [Merkle Root].
                │
                └─► crypto/ecc.py & issuance.py:
                               Trường dùng Private Key (ECC) ký lên Credential (chứa [Merkle Root]).
                               Tạo ra [Chữ ký ECC] (Signature).
                │
                ▼
  [ Trả về cho Student: Credential đã ký + Toàn bộ Merkle Tree ]
                │
                ▼
 ┌──────────────────────────────────────────┐
 │ GIAI ĐOẠN 2: DISCLOSURE (Student)        │
 └──────────────────────────────────────────┘
                │
                └─► disclosure.py & merkle.py:
                               Student chọn môn cần chứng minh (VD: Cryptography: A).
                               Hệ thống sinh ra [Merkle Proof] tương ứng cho lá đó.
                │
                ▼
  [ Gửi cho Verifier: Môn học (Cryptography) + Merkle Proof + Credential đã ký ]
                │
                ▼
 ┌──────────────────────────────────────────┐
 │ GIAI ĐOẠN 3: VERIFICATION (Nhà tuyển dụng)│
 └──────────────────────────────────────────┘
                │
                ├─► crypto/ecc.py & verification.py: 
                │              Kiểm tra [Chữ ký ECC] trên Credential bằng Public Key của trường.
                │              (Nếu hợp lệ -> Đảm bảo Credential chưa bị sửa và lấy được [Merkle Root] gốc).
                │
                └─► merkle.py: 
                               Dùng [Merkle Proof] và dữ liệu môn học (Cryptography: A) để tính toán ngược lên.
                               So sánh kết quả với [Merkle Root] lấy từ Credential.
                │
                ▼
           [ KẾT QUẢ: VALID / INVALID ]

## Issuance Flow

University input:

```json
{
  "studentId": "20230001",
  "degree": "Bachelor",
  "major": "Cybersecurity",
  "graduationYear": 2026,
  "courses": [
    {
      "courseCode": "CS401",
      "courseName": "Cryptography",
      "grade": "A",
      "semester": "2025-1"
    }
  ]
}
```

Process:

1. Generate `credentialId = random 32 bytes`.
2. Generate `studentSalt = random 32 bytes`.
3. Compute `studentCommitment = hash(studentId, studentSalt)`.
4. For each course, generate `courseSalt`.
5. Compute each course leaf:

```text
leaf = hash(credentialId, courseCode, courseName, grade, semester, courseSalt)
```

6. Build Merkle tree from all leaves.
7. Create credential object.
8. Sign credential with university ECC private key.

Output to student:

```json
{
  "credential": {
    "credentialId": "0x...",
    "issuer": "0x...",
    "studentCommitment": "0x...",
    "degree": "Bachelor",
    "major": "Cybersecurity",
    "graduationYear": 2026,
    "merkleRoot": "0x...",
    "issuedAt": 1710000000
  },
  "signature": "...",
  "studentSalt": "0x...",
  "courses": [
    {
      "courseCode": "CS401",
      "courseName": "Cryptography",
      "grade": "A",
      "semester": "2025-1",
      "courseSalt": "0x..."
    }
  ],
  "merkleProofs": {
    "CS401": [
      {
        "position": "right",
        "hash": "0x..."
      }
    ]
  }
}
```

## Verification Flow

Student sends only the selected course:

```json
{
  "credential": {},
  "signature": "...",
  "revealedData": {
    "courseCode": "CS401",
    "courseName": "Cryptography",
    "grade": "A",
    "semester": "2025-1",
    "courseSalt": "0x..."
  },
  "merkleProof": [
    {
      "position": "right",
      "hash": "0x..."
    }
  ],
  "optionalIdentity": {
    "studentId": "20230001",
    "studentSalt": "0x..."
  }
}
```

Verifier checks:

1. University ECC signature is valid.
2. Revealed course data recomputes a leaf that belongs to `credential.merkleRoot`.
3. Issuer is authorized.
4. `credentialId` is not revoked.
5. Optional identity matches `studentCommitment`.

Verification output:

```json
{
  "validSignature": true,
  "validMerkleProof": true,
  "validIssuer": true,
  "notRevoked": true,
  "validIdentity": true,
  "result": "VALID"
}
```

If identity is not disclosed, `validIdentity` is `null`.

## Blackbox API

### Generate Issuer ECC Keys

```python
from academic_credential import generate_ecc_key_pair

keys = generate_ecc_key_pair()
private_key = keys["privateKeyPem"]
public_key = keys["publicKeyPem"]
issuer_address = keys["address"]
```

### Issue Credential

```python
from academic_credential import issue_credential

credential_package = issue_credential(
    transcript,
    issuer_private_key_pem=private_key,
    issuer_address=issuer_address,
)
```

### Build Selective Disclosure

```python
from academic_credential import build_disclosure_package

proof_package = build_disclosure_package(
    credential_package,
    course_code="CS401",
    student_id="20230001",
)
```

Pass `student_id=None` or omit it if the student does not want to reveal identity.

### Verify Credential

```python
from academic_credential import verify_credential

result = verify_credential(
    proof_package,
    issuer_public_key_pem=public_key,
    authorized_issuers={issuer_address},
    revoked_credentials=set(),
)
```

`authorized_issuers` and `revoked_credentials` simulate smart contract checks. In a full blockchain app, these values should come from the issuer registry and revocation registry contract.

## Setup

Create and activate a virtual environment if you want isolated dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

The current workspace already has `cryptography` installed, so the code can run directly here.

## How To Test Each Part

Run all tests:

```bash
python3 -m unittest -v
```

Test valid issuance and selective disclosure:

```bash
python3 -m unittest -v test_academic_credential.AcademicCredentialTest.test_valid_selective_disclosure_with_identity
```

Test selective disclosure without revealing student identity:

```bash
python3 -m unittest -v test_academic_credential.AcademicCredentialTest.test_valid_selective_disclosure_without_identity
```

Test Merkle proof tamper detection:

```bash
python3 -m unittest -v test_academic_credential.AcademicCredentialTest.test_tampered_grade_fails_merkle_proof
```

Test ECC signature tamper detection:

```bash
python3 -m unittest -v test_academic_credential.AcademicCredentialTest.test_tampered_credential_fails_signature
```

Test wrong student identity:

```bash
python3 -m unittest -v test_academic_credential.AcademicCredentialTest.test_wrong_student_id_fails_identity
```

Test unauthorized issuer:

```bash
python3 -m unittest -v test_academic_credential.AcademicCredentialTest.test_unauthorized_issuer_fails
```

Test revoked credential:

```bash
python3 -m unittest -v test_academic_credential.AcademicCredentialTest.test_revoked_credential_fails
```

## Run Whole Demo

```bash
python3 demo.py
```

The demo prints:

1. The signed credential.
2. A selective disclosure package for one course.
3. The verification result.

## Security Notes

- `studentSalt` prevents simple offline guessing of `studentId`.
- `courseSalt` prevents brute-force guessing of hidden courses and grades.
- Salt values are not rotated. Changing a salt changes the Merkle root and breaks the signature.
- This module supports selective disclosure but not unlinkability.
- Reusing the same credential and same revealed course proof across verifiers can be linkable.
- Future improvement: use zero-knowledge proofs or anonymous credential schemes for unlinkable disclosure.



# 🔒 Limitation: Linkability due to Static MSSV & Salt

## 1. Overview

Trong hệ thống hiện tại, mỗi credential được xây dựng dựa trên:

- `studentCommitment = hash(studentId, studentSalt)`
- Các Merkle leaf:

leaf = hash(credentialId, course, grade, courseSalt)


Trong đó:
- `studentId` (MSSV) là cố định
- `studentSalt` là cố định
- `courseSalt` cho mỗi môn cũng cố định sau khi issuance

👉 Các giá trị này **không thay đổi giữa các lần chứng minh (verification)**.

---

## 2. Problem: Linkability Across Multiple Verifications

Khi một sinh viên thực hiện nhiều lần chứng minh với các verifier khác nhau:

### Ví dụ:

**Lần 1:**

course = Cryptography
grade = A
courseSalt = xyz
merkleProof = [...]


**Lần 2:**

course = Cryptography
grade = A
courseSalt = xyz
merkleProof = [...]


👉 Vì tất cả input đều giống nhau:


leaf = hash(credentialId, course, grade, courseSalt)


👉 Nên:
- `leaf` giống nhau
- `merkleProof` giống nhau
- toàn bộ proof package giống nhau

---

## 3. Consequence

Verifier (hoặc nhiều verifier collude) có thể:


so sánh 2 lần chứng minh
→ thấy identical data
→ kết luận cùng một người (same credential holder)


🔴 Điều này dẫn đến:

- **Linkability**: có thể track cùng một sinh viên qua nhiều lần verify
- **Cross-verifier correlation**: nhiều bên có thể phối hợp để theo dõi hành vi

---

## 4. Student Identity Case (MSSV)

Nếu hệ thống có sử dụng:


studentCommitment = hash(studentId, studentSalt)


Và sinh viên **reveal**:


studentId + studentSalt


👉 Khi đó:


hash(studentId, studentSalt) → cố định


→ verifier có thể:
- nhận diện cùng một sinh viên giữa nhiều lần verify
- không có khả năng unlink

---

## 5. Why Not Rotate Salt?

Một cách naive là:


đổi courseSalt hoặc studentSalt sau mỗi lần verify


❌ Tuy nhiên điều này **không khả thi**, vì:

- Thay đổi salt ⇒ thay đổi leaf
- Leaf thay đổi ⇒ Merkle Root thay đổi
- Root thay đổi ⇒ chữ ký của University INVALID

👉 => Phải:
- build lại Merkle Tree
- ký lại credential

→ không thực tế trong hệ thống thật

---

## 6. Summary

Hệ thống hiện tại:

✔ Đảm bảo:
- Integrity (tính toàn vẹn dữ liệu)
- Selective disclosure (chỉ lộ phần cần thiết)

❌ Không đảm bảo:
- Unlinkability giữa các lần chứng minh
- Privacy hoàn toàn sau khi dữ liệu đã được reveal

---

## 7. Future Work

Để giải quyết vấn đề này, hệ thống có thể mở rộng bằng:

- **Zero-Knowledge Proofs (zk-SNARKs)**

Thay vì reveal:

course, grade, salt, merkleProof


Prover chỉ cần chứng minh:

“Tồn tại một leaf hợp lệ trong Merkle Tree thỏa điều kiện”


👉 Ưu điểm:
- Không lộ dữ liệu
- Mỗi proof khác nhau
- Không thể link giữa các lần verify

---