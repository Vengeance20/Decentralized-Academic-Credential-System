"use client";
import { useState } from 'react';
import Link from 'next/link';
import Web3 from "web3"; // Chỉ cần import Web3

declare global {
  interface Window {
    ethereum?: any;
  }
}

const CONTRACT_ADDRESS = "0x45b0f6A20f44A0Aa3416C9b8338e38C83256724a";

const CONTRACT_ABI = [
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"isAuthorizedIssuer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}
];

export default function IssuancePortal() {
  const [formData, setFormData] = useState({
    studentName: "",
    studentId: "",
    institution: "",
    courses: [{ courseCode: "", courseName: "", grade: "", semester: "" }]
  });
  
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);

  // HÀM KẾT NỐI METAMASK - GIỮ NGUYÊN KHÔNG SỬA
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask not found! Please install MetaMask extension.");
      return;
    }

    setIsConnecting(true);
    try {
      const web3 = new Web3(window.ethereum);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length === 0) {
        alert("No account found.");
        return;
      }
      const address = accounts[0];

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }],
        });
      } catch (switchError) {
        console.error("Network switch error", switchError);
        alert("Please switch to Sepolia network in MetaMask!");
        setIsConnecting(false);
        return;
      }

      const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
      const isAuthorized = await contract.methods.isAuthorizedIssuer(address).call();

      if (isAuthorized) {
        setWalletAddress(address);
      } else {
        alert("❌ Access Denied: This wallet is not registered as an Authorized Issuer on the Blockchain!");
        setWalletAddress(""); 
      }

    } catch (error: any) {
      console.error("Connect error:", error);
      if (error.code === 4001) {
        alert("You rejected the connection request.");
      } else {
        alert("Failed to verify issuer authorization: " + error.message);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const shortenAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  const handleCourseChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const updatedCourses = [...formData.courses];
    updatedCourses[index][e.target.name as keyof typeof updatedCourses[0]] = e.target.value;
    setFormData({ ...formData, courses: updatedCourses });
  };

  const addCourse = () => {
    setFormData({
      ...formData,
      courses: [...formData.courses, { courseCode: "", courseName: "", grade: "", semester: "" }]
    });
  };

  // HÀM CẤP BẰNG - ĐÃ SỬA LỖI CHECKSUM Ở ĐÂY
  const handleIssue = async () => {
    if (!walletAddress) return alert("Wallet not connected!");
    if (!formData.studentName || !formData.studentId) return alert("Please fill Student Name and ID!");
    
    setIsIssuing(true);
    try {
      // FIX LỖI: Chuyển địa chỉ ví sang chuẩn EIP-55 Checksum trước khi gửi cho Backend Python
      const web3 = new Web3(window.ethereum);
      const checksumAddress = web3.utils.toChecksumAddress(walletAddress);

      const response = await fetch('http://127.0.0.1:5000/api/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          issuerAddress: checksumAddress // Gửi địa chỉ đã chuẩn hóa thay vì walletAddress ban đầu
        }),
      });

      const result = await response.json();
      
      if (result.status === "success") {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result.data, null, 2));
        const link = document.createElement('a');
        link.setAttribute("href", dataStr);
        link.setAttribute("download", `Credential_${formData.studentId}.json`);
        link.click();
        alert("✅ Credential issued and downloaded successfully!");
      } else {
        alert("Error from API: " + result.message);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to call Issuance API (Port 5000)!");
    } finally {
      setIsIssuing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 flex items-center justify-center font-sans">
      <div className="max-w-4xl w-full">
        <Link href="/" className="text-blue-400 hover:underline mb-8 inline-block font-medium">← Back to Home</Link>
        
        <div className="bg-slate-800 p-10 rounded-[2rem] border border-blue-500/20 shadow-2xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-blue-500 mb-2 uppercase tracking-tighter">Issuance Portal</h2>
            <p className="text-slate-500 text-sm italic">University Credential Issuer</p>
          </div>
          
          {/* Khu vực Kết nối Ví */}
          <div className="mb-8 p-6 bg-slate-900/50 rounded-2xl border border-slate-700 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Issuer Wallet Status</p>
              {walletAddress ? (
                <p className="text-emerald-400 font-mono font-bold text-lg">{shortenAddress(walletAddress)}</p>
              ) : (
                <p className="text-red-400 font-bold">Not Connected / Unauthorized</p>
              )}
            </div>
            
            {!walletAddress ? (
              <button 
                onClick={connectWallet} 
                disabled={isConnecting}
                className="px-6 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-400 transition-all disabled:opacity-50"
              >
                {isConnecting ? "Verifying on Blockchain..." : "🦊 Connect & Verify"}
              </button>
            ) : (
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
                <span className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></span> Authorized Issuer
              </div>
            )}
          </div>

          {/* Form nhập liệu */}
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="Student Name" value={formData.studentName} onChange={(e) => setFormData({...formData, studentName: e.target.value})} className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl focus:border-blue-500 outline-none"/>
              <input type="text" placeholder="Student ID" value={formData.studentId} onChange={(e) => setFormData({...formData, studentId: e.target.value})} className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl focus:border-blue-500 outline-none"/>
            </div>
            <input type="text" placeholder="Institution Name" value={formData.institution} onChange={(e) => setFormData({...formData, institution: e.target.value})} className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl focus:border-blue-500 outline-none"/>

            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
              <p className="text-slate-400 text-xs font-bold uppercase mb-3">Courses / Transcript</p>
              {formData.courses.map((course, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2 mb-2">
                  <input type="text" name="courseCode" placeholder="Code" value={course.courseCode} onChange={(e) => handleCourseChange(idx, e)} className="p-2 bg-slate-800 border border-slate-600 rounded-lg text-sm outline-none"/>
                  <input type="text" name="courseName" placeholder="Name" value={course.courseName} onChange={(e) => handleCourseChange(idx, e)} className="p-2 bg-slate-800 border border-slate-600 rounded-lg text-sm outline-none"/>
                  <input type="text" name="grade" placeholder="Grade" value={course.grade} onChange={(e) => handleCourseChange(idx, e)} className="p-2 bg-slate-800 border border-slate-600 rounded-lg text-sm outline-none"/>
                  <input type="text" name="semester" placeholder="Semester" value={course.semester} onChange={(e) => handleCourseChange(idx, e)} className="p-2 bg-slate-800 border border-slate-600 rounded-lg text-sm outline-none"/>
                </div>
              ))}
              <button onClick={addCourse} className="text-blue-400 text-sm font-bold mt-2 hover:underline">+ Add Course</button>
            </div>
          </div>

          {/* Nút Cấp bằng */}
          <button 
            onClick={handleIssue} 
            disabled={!walletAddress || isIssuing} 
            className={`w-full py-5 rounded-2xl font-black text-xl transition-all shadow-xl uppercase tracking-widest ${
              !walletAddress 
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-600/20 disabled:opacity-50'
            }`}
          >
            {!walletAddress ? "🔒 VERIFY WALLET TO ISSUE" : isIssuing ? "ISSUING..." : "🎓 ISSUE CREDENTIAL"}
          </button>

        </div>
      </div>
    </div>
  );
}