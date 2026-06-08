"use client";
import { useState } from 'react';
import Link from 'next/link';
import Web3 from "web3"; // Import Web3

declare global {
  interface Window {
    ethereum?: any;
  }
}

const CONTRACT_ADDRESS = "0x45b0f6A20f44A0Aa3416C9b8338e38C83256724a";
const CONTRACT_ABI = [
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"isAuthorizedIssuer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"bytes32","name":"_merkleRoot","type":"bytes32"}],"name":"revokeCredential","outputs":[],"stateMutability":"nonpayable","type":"function"}
];

export default function StudentWallet() {
  const [credential, setCredential] = useState<any>(null);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]); 
  const [disclosureResult, setDisclosureResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false); // State cho Revoke

  const handleFileUpload = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event: any) => {
      try {
        const rawJson = JSON.parse(event.target.result);
        
        const json = rawJson.data ? rawJson.data : rawJson;
        
        const subject = json.credentialSubject || json;
        const hasName = subject.studentName || subject.fullName || subject.student_name;
        const hasTranscript = subject.transcript || subject.courses;
        
        if (!hasName || !hasTranscript) { 
          alert("Error: Invalid credential data structure."); 
          return; 
        }
        
        setSelectedCourses([]); 
        setDisclosureResult(null);

        setCredential(json); 
      } catch (err) { 
        alert("Error: Invalid JSON file."); 
      }
    };
    reader.readAsText(file);
  };

  const handleToggleCourse = (code: string) => {
    setSelectedCourses(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  const handleCreateDisclosure = async () => {
    if (selectedCourses.length === 0) { alert("Please select at least one course!"); return; }
    setIsLoading(true);
    try {
      const subject = credential.credentialSubject || credential;
      
      const response = await fetch('http://127.0.0.1:5001/api/wallet/disclose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          credential_package: credential, 
          course_codes: selectedCourses, 
          student_id: subject.id || subject.studentId 
        }),
      });
      const result = await response.json();
      if (result.status === "success") {
        setDisclosureResult(result.disclosure_package);
        alert("✅ Merkle Proof generated successfully!");
      } else { alert("Error: " + result.message); }
    } catch (error) { alert("Connection failed!"); } 
    finally { setIsLoading(false); }
  };

  const handleRevoke = async () => {
    if (!credential || !credential.merkle_root) return alert("No credential loaded!");
    if (!window.ethereum) return alert("MetaMask not found!");

    setIsRevoking(true);
    try {
      const web3 = new Web3(window.ethereum);
      const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length === 0) { alert("No account connected!"); return; }
      const connectedAddress = accounts[0];

      try {
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xaa36a7' }] });
      } catch { alert("Please switch to Sepolia!"); return; }

      const isAuthorized = await contract.methods.isAuthorizedIssuer(connectedAddress).call();
      if (!isAuthorized) {
        alert("❌ Access Denied: The connected MetaMask wallet does not have Issuer permission!");
        return;
      }

      if (!confirm("⚠️ Are you sure you want to REVOKE this credential? This cannot be undone!")) return;

      let rootHex = credential.merkle_root.startsWith('0x') ? credential.merkle_root : '0x' + credential.merkle_root;
      
      await contract.methods.revokeCredential(rootHex).send({ from: connectedAddress });
      
      alert("✅ Credential Revoked Successfully on Blockchain!");

    } catch (error: any) {
      console.error(error);
      if (error.code === 4001) { alert("Transaction rejected by user."); } 
      else { alert("Revocation Failed: " + (error.message || "Unknown error")); }
    } finally {
      setIsRevoking(false);
    }
  };

  const subjectInfo = credential?.credentialSubject || credential;
  const transcript = subjectInfo?.transcript || subjectInfo?.courses || [];

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-emerald-400 hover:underline mb-8 inline-block font-medium">← Back to Home</Link>
        
        <div className="bg-slate-800 p-10 rounded-[2.5rem] border border-emerald-500/20 shadow-2xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-emerald-400 mb-2 uppercase tracking-tight">Student Wallet</h2>
            <p className="text-slate-400 text-sm">Secure Grade Disclosure using Merkle Tree & Blockchain</p>
          </div>
          
          {!credential ? (
            <div className="border-2 border-dashed border-slate-700 rounded-[2rem] p-20 bg-slate-900/50 hover:border-emerald-500/50 transition-all text-center relative group cursor-pointer">
              <input type="file" accept=".json" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">📤</div>
              <p className="text-slate-300 font-bold text-lg">Upload Digital Credential (.json)</p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex justify-between items-center shadow-inner">
                <div>
                  <p className="text-emerald-400 font-black text-[10px] uppercase tracking-widest mb-1">Holder</p>
                  <p className="text-2xl font-black text-white leading-tight">{subjectInfo.studentName || subjectInfo.fullName}</p>
                  <p className="text-xs text-slate-500 font-mono mt-1">Student ID: {subjectInfo.id || subjectInfo.studentId}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleRevoke} 
                    disabled={isRevoking} 
                    className="px-4 py-2 bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-bold rounded-full hover:bg-orange-500 hover:text-white transition-all disabled:opacity-50"
                  >
                    {isRevoking ? "Revoking..." : "🔥 Revoke (Admin)"}
                  </button>
                  <button 
                    onClick={() => {setCredential(null); setDisclosureResult(null); setSelectedCourses([]);}} 
                    className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-bold rounded-full hover:bg-red-500 hover:text-white transition-all"
                  >
                    Delete File
                  </button>
                </div>
              </div>

              <div className="text-left">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 block">Select courses to disclose grades (Multiple):</label>
                <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2">
                  {transcript.map((course: any, idx: number) => {
                    const cCode = course.courseCode || course.code;
                    const cName = course.courseName || course.name;
                    return (
                      <button key={idx} onClick={() => handleToggleCourse(cCode)}
                        className={`flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 ${
                          selectedCourses.includes(cCode) ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_10px_25px_-5px_rgba(16,185,129,0.4)] scale-[1.01]' : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}>
                        <div className="text-left">
                          <p className="font-bold text-lg">{cName}</p>
                          <p className="text-[10px] opacity-60 uppercase tracking-widest">{cCode} • {course.semester || 'Current Sem'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase opacity-50 font-bold">Grade</p>
                          <span className="text-2xl font-black">{course.grade}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button onClick={handleCreateDisclosure} disabled={isLoading}
                className={`w-full py-5 rounded-2xl font-black text-xl transition-all shadow-xl uppercase tracking-widest ${
                    isLoading ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-emerald-500 text-slate-900 hover:bg-emerald-400 shadow-emerald-500/20'
                }`}>
                {isLoading ? "Processing Merkle Proof..." : "Confirm & Generate Proof"}
              </button>
            </div>
          )}

          {disclosureResult && (
            <div className="mt-10 p-8 bg-slate-900/80 rounded-[2.5rem] border-2 border-blue-500/40 shadow-2xl">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
                  <span className="text-3xl">🛡️</span>
                </div>
                <h3 className="text-blue-400 font-black uppercase tracking-widest text-sm mb-2">Secure Disclosure Successful</h3>
                <p className="text-slate-500 text-xs text-center mb-8 max-w-[80%] leading-relaxed">
                  Merkle Proof for <span className="text-white font-bold">{selectedCourses.join(', ')}</span> has been signed. 
                  The verifier will not be able to see your other courses.
                </p>
                <button onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(disclosureResult, null, 2));
                    const link = document.createElement('a');
                    link.setAttribute("href", dataStr);
                    const sId = subjectInfo.id || subjectInfo.studentId;
                    link.setAttribute("download", `Proof_${selectedCourses.join('_')}_${sId}.json`);
                    link.click();
                  }}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-sm transition-all shadow-lg shadow-blue-600/30 uppercase"
                >
                  Download Proof File (For Verifier)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}