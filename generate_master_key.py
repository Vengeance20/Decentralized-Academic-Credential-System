from academic_credential.crypto.ecc import generate_key_pair

print("--- DỨT ĐIỂM QUẢ KHÓA NÀY ---")
try:
    priv, pub = generate_key_pair()
    with open("issuer_private_key.pem", "w") as f: f.write(priv)
    with open("issuer_public_key.pem", "w") as f: f.write(pub)
    print("XONG! 2 file .pem đã nằm ngay cạnh file này rồi nhé.")
except Exception as e:
    print(f"Lỗi: {e}")