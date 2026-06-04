from flask import Flask, request, jsonify
from flask_cors import CORS
import datetime
import uuid
from web3 import Web3

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

# --- KẾT NỐI WEB3 VÀ SMART CONTRACT ---
RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com"
w3 = Web3(Web3.HTTPProvider(RPC_URL))
CONTRACT_ADDRESS = "0x45b0f6A20f44A0Aa3416C9b8338e38C83256724a"

# Chỉ trích xuất ABI cần thiết cho hàm isAuthorizedIssuer để code gọn gàng
CONTRACT_ABI = [
    {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"isAuthorizedIssuer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}
]

contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)
# --------------------------------------

def hash_leaf(data: str) -> str:
    return Web3.keccak(text=data).hex()

def hash_node(left: str, right: str) -> str:
    left_bytes = bytes.fromhex(left[2:]) if left.startswith('0x') else bytes.fromhex(left)
    right_bytes = bytes.fromhex(right[2:]) if right.startswith('0x') else bytes.fromhex(right)
    return Web3.keccak(left_bytes + right_bytes).hex()

def build_merkle_tree(leaves: list[str]) -> list[list[str]]:
    if not leaves: return [["0x0000000000000000000000000000000000000000000000000000000000000000"]]
    current_level = leaves[:]
    tree = [current_level]
    while len(current_level) > 1:
        next_level = []
        for i in range(0, len(current_level), 2):
            left = current_level[i]
            right = current_level[i+1] if i+1 < len(current_level) else left
            next_level.append(hash_node(left, right))
        current_level = next_level
        tree.append(current_level)
    return tree

def get_merkle_proofs(tree: list[list[str]]) -> dict:
    proofs = {}
    num_leaves = len(tree[0])
    for i in range(num_leaves):
        proof = []
        index = i
        for level in tree[:-1]:
            if index % 2 == 0:
                sibling_index = index + 1
                if sibling_index < len(level):
                    proof.append({"side": "right", "hash": level[sibling_index]})
                else:
                    proof.append({"side": "right", "hash": level[index]})
            else:
                sibling_index = index - 1
                proof.append({"side": "left", "hash": level[sibling_index]})
            index = index // 2
        proofs[i] = proof
    return proofs

# API MỚI: KIỂM TRA QUYỀN CỦA VÍ TRƯỜNG HỌC
@app.route('/api/check-issuer', methods=['POST'])
def check_issuer():
    try:
        data = request.json
        address = data.get("address")

        if not address or not w3.is_address(address):
            return jsonify({"status": "error", "message": "Invalid wallet address"}), 400

        # GỌI HÀM isAuthorizedIssuer TRÊN BLOCKCHAIN
        is_authorized = contract.functions.isAuthorizedIssuer(address).call()

        return jsonify({"status": "success", "isAuthorized": is_authorized}), 200

    except Exception as e:
        print(f"Check Issuer Error: {e}")
        return jsonify({"status": "error", "message": "Failed to check authorization on blockchain."}), 500


@app.route('/api/issue', methods=['POST'])
def api_issue():
    try:
        data = request.json
        issuer_address = data.get("issuerAddress")
        
        if not issuer_address:
            return jsonify({"status": "error", "message": "Issuer wallet not connected!"}), 403

        # BẢO MẬT: KIỂM TRA LẠI QUYỀN TRƯỚC KHI CẤP BẰNG (Chống hack gọi API trực tiếp)
        is_authorized = contract.functions.isAuthorizedIssuer(issuer_address).call()
        if not is_authorized:
            return jsonify({
                "status": "error", 
                "message": "Unauthorized: This wallet does not have Issuer permission on Blockchain!"
            }), 403

        # --- ĐOẠN CODE CẤP BẰNG CỦA BẠN ---
        courses = data.get("courses", data.get("transcript", []))
        if not courses and "credentialSubject" in data:
            subj = data.get("credentialSubject", {})
            courses = subj.get("transcript", subj.get("courses", []))
            
        if not courses:
            return jsonify({"status": "error", "message": "No courses found!"}), 400

        leaves = [hash_leaf(f"{c.get('courseCode')}-{c.get('grade')}") for c in courses]
        tree = build_merkle_tree(leaves)
        merkle_root = tree[-1][0]
        proofs_by_index = get_merkle_proofs(tree)
        
        merkle_proofs_dict = {}
        for i, course in enumerate(courses):
            merkle_proofs_dict[course.get('courseCode')] = proofs_by_index[i]

        credential = {
            "id": f"urn:uuid:{uuid.uuid4()}",
            "type": ["VerifiableCredential", "UniversityDegreeCredential"],
            "issuer": issuer_address,
            "issuanceDate": datetime.datetime.utcnow().isoformat() + "Z",
            "merkle_root": merkle_root,
            "merkle_proofs": merkle_proofs_dict,
            "credentialSubject": {
                "id": data.get("studentId", "N/A"),
                "studentName": data.get("fullName", data.get("studentName", "N/A")),
                "degreeName": data.get("degree", "N/A"),
                "major": data.get("major", "N/A"),
                "institution": data.get("institution", "N/A"),
                "graduationYear": data.get("graduationYear", "N/A"),
                "transcript": courses
            },
            "proof": {
                "type": "EthereumEip712Signature2021",
                "proofPurpose": "assertionMethod",
                "verificationMethod": f"{issuer_address}#key-1" 
            }
        }
        
        return jsonify({"status": "success", "data": credential}), 200
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)