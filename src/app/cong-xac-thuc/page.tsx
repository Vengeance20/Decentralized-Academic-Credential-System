"use client";
import { useState } from 'react';
import Link from 'next/link';

export default function VerifierPortal() {
  const [proofFile, setProofFile] = useState<any>(null);
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "success" | "revoked" | "invalid" | "error">("idle");
  const [backendMessage, setBackendMessage] = useState("");
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Đã xóa các state và biến liên quan đến Revoke (revoking, currentMerkleRoot, CONTRACT_ADDRESS, ABI)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setProofFile(json);
        // Reset states when uploading new file
        setVerificationStatus("idle");
        setDetails(null);
        setBackendMessage("");
      } catch (err) { 
        alert("Invalid JSON format!"); 
      }
    };
    reader.readAsText(file);
  };

  const handleVerify = async () => {
    if (!proofFile) return alert("Please upload a proof file!");
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:5002/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disclosure_package: proofFile }), 
      });
      const result = await response.json();
      
      if (result.status === "success") {
        setVerificationStatus("success");
        setDetails(result.details);
        setBackendMessage(result.message || "Verification complete. Credential is authentic.");
      } else if (result.status === "revoked") {
        setVerificationStatus("revoked");
        setBackendMessage(result.message || "This credential has been revoked!");
        setDetails(result.details || null);
      } else { 
        setVerificationStatus(result.status || "invalid"); 
        setBackendMessage(result.message || "Verification failed.");
        setDetails(null);
      }
    } catch (error) {
      setVerificationStatus("error");
      setBackendMessage("Verifier API (Port 5002) is offline.");
      setDetails(null);
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 flex items-center justify-center font-sans tracking-tight">
      <div className="max-w-2xl w-full">
        <Link href="/" className="text-orange-400 hover:underline mb-8 inline-block font-medium">← Back to Home</Link>
        <div className="bg-slate-800 p-10 rounded-[2rem] border border-slate-700 shadow-2xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-orange-500 mb-2 uppercase tracking-tighter">Verifier Portal</h2>
            <p className="text-slate-500 text-sm italic">Merkle Proof & Blockchain Verification</p>
          </div>
          
          <div className="border-2 border-dashed border-slate-700 rounded-[2rem] p-12 mb-8 bg-slate-900/50 relative text-center">
            <input type="file" accept=".json" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
            <div className="text-5xl mb-4">{proofFile ? "📄" : "📥"}</div>
            <p className="text-slate-300 font-bold">{proofFile ? "File Ready" : "Upload Proof (.json)"}</p>
          </div>

          {/* Đã xóa div flex và nút Revoke, chỉ giữ lại nút Verify duy nhất */}
          <button 
            onClick={handleVerify} 
            disabled={loading} 
            className="w-full py-5 rounded-2xl font-black text-xl bg-orange-500 text-slate-900 hover:bg-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-orange-500/20"
          >
            {loading ? "VERIFYING..." : "VERIFY NOW"}
          </button>

          {verificationStatus !== "idle" && (
            <div className={`mt-8 p-8 rounded-3xl border-2 ${
              verificationStatus === "success" 
                ? 'bg-emerald-500/10 border-emerald-500/40' 
                : verificationStatus === "revoked"
                ? 'bg-yellow-500/10 border-yellow-500/40'
                : 'bg-red-500/10 border-red-500/40'
            }`}>
              <div className="flex flex-col items-center text-center">
                <h3 className={`text-xl font-black uppercase mb-2 ${
                  verificationStatus === "success" 
                    ? 'text-emerald-400' 
                    : verificationStatus === "revoked"
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}>
                  {verificationStatus === "success" ? "AUTHENTIC" : verificationStatus === "revoked" ? "REVOKED" : "INVALID / ERROR"}
                </h3>
                <p className="text-slate-300 text-sm italic mb-4">"{backendMessage}"</p>
                
                {details && (
                  <div className="w-full bg-slate-900/50 p-5 rounded-xl border border-slate-700/50 text-left">
                    <p className="text-orange-400 text-[10px] font-bold uppercase tracking-widest mb-3">Disclosed Data:</p>
                    
                    {details.subjects && details.subjects.length > 0 ? (
                      <div className="space-y-2">
                        {details.subjects.map((subj: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center bg-slate-800/80 px-4 py-3 rounded-lg border border-slate-700">
                            <span className="text-white font-bold">{subj.courseCode}</span>
                            <span className="text-emerald-400 font-mono font-bold text-lg">{subj.grade}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm">No subjects disclosed.</p>
                    )}
                    
                    {details.result && (
                      <p className="text-slate-500 text-[10px] mt-3 uppercase tracking-wider">{details.result}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}