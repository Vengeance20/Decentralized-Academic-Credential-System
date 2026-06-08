from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

@app.route('/api/wallet/disclose', methods=['POST'])
def api_disclose():
    try:
        req_body = request.json
        raw_json = req_body.get('credential_package', {})
        actual_vc = raw_json.get('data', raw_json)

        course_codes = req_body.get('course_codes', [])
        if not course_codes or not isinstance(course_codes, list):
            return jsonify({"status": "error", "message": "Please select at least one course!"}), 400

        merkle_root = actual_vc.get('merkle_root', '')
        merkle_proofs = actual_vc.get('merkle_proofs', {})
        subj = actual_vc.get('credentialSubject', {})
        courses_list = subj.get('transcript', [])
        
        revealed_courses = [c for c in courses_list if c.get('courseCode') in course_codes]
        
        specific_proofs = {}
        for code in course_codes:
            if code in merkle_proofs:
                specific_proofs[code] = merkle_proofs[code]

        proof_data = actual_vc.get('proof', {})

        disclosure_package = {
            "credential": {
                "issuer": actual_vc.get('issuer'),
                "id": actual_vc.get('id')
            },
            "revealedData": revealed_courses, 
            "merkleProof": specific_proofs,   
            "merkle_root": merkle_root,    
            "proof": proof_data  
        }
                
        return jsonify({"status": "success", "disclosure_package": disclosure_package}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": f"Error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True)