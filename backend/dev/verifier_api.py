from flask import Flask, request, jsonify
from flask_cors import CORS
from web3 import Web3

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com"
w3 = Web3(Web3.HTTPProvider(RPC_URL))
CONTRACT_ADDRESS = "0x45b0f6A20f44A0Aa3416C9b8338e38C83256724a"

# Chỉ giữ lại ABI cho hàm isRevoked (có 2 inputs: address và bytes32)
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

        # Lấy mảng các môn học đã chọn
        revealed_data_list = package.get('revealedData', [])
        # Lấy dictionary chứa proof của từng môn
        merkle_proofs_dict = package.get('merkleProof', {})
        merkle_root = package.get('merkle_root')
        
        # Lấy địa chỉ ví của Trường (Issuer) từ gói Proof để kiểm tra thu hồi
        issuer_address = package.get('credential', {}).get('issuer')

        if not revealed_data_list or not merkle_root or not issuer_address:
            return jsonify({"status": "error", "message": "Missing revealed data, merkle root, or issuer address"}), 400

        # --- KIỂM TRA BLOCKCHAIN REVOKED ---
        is_revoked = False
        try:
            # Chuyển hex string sang bytes32
            root_bytes = bytes.fromhex(merkle_root[2:]) if merkle_root.startswith('0x') else bytes.fromhex(merkle_root)
            
            # GỌI HÀM isRevoked(address, bytes32) - Phải có đủ 2 tham số này theo ABI contract
            is_revoked = contract.functions.isRevoked(issuer_address, root_bytes).call()
        except Exception as e:
            print(f"Blockchain read error: {e}")

        if is_revoked:
            return jsonify({"status": "revoked", "message": "Credential has been revoked by the School!"}), 200

        # --- VERIFY MERKLE PROOF CHO TỪNG MÔN HỌC ---
        verified_courses = []
        
        for course in revealed_data_list:
            course_code = course.get('courseCode', 'N/A')
            grade = course.get('grade', 'N/A')
            
            # Lấy proof của riêng môn này từ dict
            proof_steps = merkle_proofs_dict.get(course_code, [])

            # 1. Tính toán lại hash của môn học (Leaf)
            leaf_data = f"{course_code}-{grade}"
            current_hash = Web3.keccak(text=leaf_data).hex()

            # 2. Dùng Merkle Proof tính toán lại Root
            for step in proof_steps:
                sibling_hash = step.get("hash")
                side = step.get("side")
                if side == "left":
                    current_hash = hash_node(sibling_hash, current_hash)
                else:
                    current_hash = hash_node(current_hash, sibling_hash)

            # 3. So sánh Root tính toán với Root gốc
            if current_hash != merkle_root:
                return jsonify({
                    "status": "invalid", 
                    "message": f"Invalid Merkle Proof for course {course_code}! Data may be tampered."
                }), 200
            
            verified_courses.append({"courseCode": course_code, "grade": grade})

        # Nếu chạy đến đây nghĩa là tất cả các môn đều hợp lệ
        details_str = ", ".join([f"{c['courseCode']}: {c['grade']}" for c in verified_courses])
        
        return jsonify({
            "status": "success",
            "message": "Merkle Proof is cryptographically valid for all selected courses!",
            "merkle_root": merkle_root,
            "details": {
                "subjects": verified_courses,
                "result": f"Grades verified: {details_str}"
            }
        }), 200

    except Exception as e:
        print(f"Verifier Error: {e}")
        return jsonify({"status": "error", "message": f"System error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(port=5002, debug=True)