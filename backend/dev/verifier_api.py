from flask import Flask, request, jsonify
from flask_cors import CORS
from web3 import Web3
from eth_account.messages import encode_defunct

app = Flask(__name__)
# Cho phép kết nối từ giao diện React/Next.js chạy ở port 3000
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com"
w3 = Web3(Web3.HTTPProvider(RPC_URL))
CONTRACT_ADDRESS = "0x45b0f6A20f44A0Aa3416C9b8338e38C83256724a"

# ABI cho hàm isRevoked kiểm tra trạng thái trên Smart Contract
CONTRACT_ABI = [
    {"inputs": [
        {"internalType": "address", "name": "", "type": "address"},
        {"internalType": "bytes32", "name": "", "type": "bytes32"}
    ], "name": "isRevoked", "outputs": [
        {"internalType": "bool", "name": "", "type": "bool"}
    ], "stateMutability": "view", "type": "function"}
]

contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)

# --- HÀM BỔ TRỢ MERKLE TREE ---
def hash_node(left: str, right: str) -> str:
    left_bytes = bytes.fromhex(left[2:]) if left.startswith('0x') else bytes.fromhex(left)
    right_bytes = bytes.fromhex(right[2:]) if right.startswith('0x') else bytes.fromhex(right)
    return Web3.keccak(left_bytes + right_bytes).hex()
# ---------------------------------

@app.route('/api/verify', methods=['POST'])
def api_verify():
    try:
        data = request.json
        package = data.get('disclosure_package')
        
        if not package:
            return jsonify({"status": "error", "message": "Merkle proof package not found"}), 400

        # Trích xuất dữ liệu học bạ rút gọn
        revealed_data_list = package.get('revealedData', [])
        merkle_proofs_dict = package.get('merkleProof', {})
        merkle_root = package.get('merkle_root')
        issuer_address = package.get('credential', {}).get('issuer')
        
        # ĐỒNG BỘ ĐÚNG DỮ LIỆU: Trích xuất cụm proof và chữ ký thật từ file ví chuyển sang
        proof_obj = package.get('proof', {})
        # Phụ thuộc vào key bạn lưu chữ ký thật lúc cấp bằng (thường là proofValue hoặc signatureValue)
        signature = proof_obj.get('proofValue') or proof_obj.get('signatureValue') or package.get('signature')

        # Kiểm tra tính toàn vẹn của dữ liệu đầu vào
        if not revealed_data_list or not merkle_root or not issuer_address or not signature:
            return jsonify({"status": "error", "message": "Missing revealed data, merkle root, issuer address, or cryptographic signature"}), 400

        # --- LỚP BẢO MẬT 1: XÁC THỰC CHỮ KÝ SỐ CRYPTOGRAPHIC (ECDSA) ---
        try:
            # Mã hóa lại thông điệp Merkle Root để kiểm tra xem có đúng chữ ký này ký cho Root này không
            message_hash = encode_defunct(hexstr=merkle_root)
            # Dùng Web3 khôi phục địa chỉ ví công khai từ chữ ký nhận được
            recovered_address = w3.eth.account.recover_message(message_hash, signature=signature)
            
            # So sánh ví khôi phục được với địa chỉ ví của Trường (Issuer) trong văn bằng
            if recovered_address.lower() != issuer_address.lower():
                return jsonify({
                    "status": "invalid_signature",
                    "message": "Cryptographic signature validation failed! The credential was not signed by the claimed Issuer."
                }), 200
        except Exception as sig_err:
            print(f"Signature recovery error: {sig_err}")
            return jsonify({"status": "invalid_signature", "message": "Invalid signature format or corrupted proof value."}), 200

        # --- LỚP BẢO MẬT 2: KIỂM TRA BLOCKCHAIN REVOKED (TRẠNG THÁI THU HỒI) ---
        is_revoked = False
        try:
            root_bytes = bytes.fromhex(merkle_root[2:]) if merkle_root.startswith('0x') else bytes.fromhex(merkle_root)
            is_revoked = contract.functions.isRevoked(issuer_address, root_bytes).call()
        except Exception as e:
            print(f"Blockchain read error: {e}")

        if is_revoked:
            return jsonify({"status": "revoked", "message": "Credential has been revoked by the School!"}), 200

        verified_courses = []
        
        for course in revealed_data_list:
            course_code = course.get('courseCode', 'N/A')
            grade = course.get('grade', 'N/A')
            
            proof_steps = merkle_proofs_dict.get(course_code, [])

            leaf_data = f"{course_code}-{grade}"
            current_hash = Web3.keccak(text=leaf_data).hex()

            for step in proof_steps:
                sibling_hash = step.get("hash")
                side = step.get("side")
                if side == "left":
                    current_hash = hash_node(sibling_hash, current_hash)
                else:
                    current_hash = hash_node(current_hash, sibling_hash)

            if current_hash != merkle_root:
                return jsonify({
                    "status": "invalid", 
                    "message": f"Invalid Merkle Proof for course {course_code}! Data has been tampered or modified."
                }), 200
            
            verified_courses.append({"courseCode": course_code, "grade": grade})

        details_str = ", ".join([f"{c['courseCode']}: {c['grade']}" for c in verified_courses])
        
        return jsonify({
            "status": "success",
            "message": "Cryptographic signature and Merkle Proof are valid for all selected courses!",
            "merkle_root": merkle_root,
            "details": {
                "subjects": verified_courses,
                "result": f"Grades verified successfully: {details_str}"
            }
        }), 200

    except Exception as e:
        print(f"Verifier Error: {e}")
        return jsonify({"status": "error", "message": f"System error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(port=5002, debug=True)