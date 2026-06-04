from __future__ import annotations

import base64

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec

from academic_credential.crypto.encoding import to_hex
from academic_credential.crypto.hashing import hash_credential, sha256


def generate_ecc_key_pair() -> dict[str, str]:
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return {
        "privateKeyPem": private_pem.decode("ascii"),
        "publicKeyPem": public_pem.decode("ascii"),
        "address": public_key_to_address(public_pem.decode("ascii")),
    }


def public_key_to_address(public_key_pem: str) -> str:
    public_key = serialization.load_pem_public_key(public_key_pem.encode("ascii"))
    public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )
    # Demo address: last 20 bytes of SHA-256(public key). A contract can map this address to an issuer.
    return to_hex(sha256(public_bytes)[-20:])


def sign_credential(credential: dict, private_key_pem: str) -> str:
    private_key = serialization.load_pem_private_key(private_key_pem.encode("ascii"), password=None)
    signature = private_key.sign(hash_credential(credential), ec.ECDSA(hashes.SHA256()))
    return base64.b64encode(signature).decode("ascii")


def verify_signature(credential: dict, signature: str, public_key_pem: str) -> bool:
    public_key = serialization.load_pem_public_key(public_key_pem.encode("ascii"))
    try:
        public_key.verify(base64.b64decode(signature), hash_credential(credential), ec.ECDSA(hashes.SHA256()))
        return True
    except (InvalidSignature, ValueError):
        return False
