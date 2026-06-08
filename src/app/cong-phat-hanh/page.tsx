"use client";
import { useState } from 'react';
import Link from 'next/link';
import Web3 from "web3";

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

  // --- HÀM BỔ TRỢ MẬT MÃ TÍNH MERKLE ROOT TRỰC TIẾP TẠI FRONT-END ---
  const calculateMerkleRootAtClient = (courses: any[]) => {
    const web3 = new Web3();
    
    // 1. Tính toán nút lá giống hàm hash_leaf của Flask
    const leaves = courses.map(c => {
      const leafText = `${c.courseCode}-${c.grade}`;
      return web3.utils.keccak256(leafText);
    });

    if (leaves.length === 0) return "0x0000000000000000000000000000000000000000000000000000000000000000";

    // 2. Cuốn chiếu dựng cây ngược lên Đỉnh giống hàm build_merkle_tree của Flask
    let currentLevel = [...leaves];
    while (currentLevel.length > 1) {
      const nextLevel = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = (i + 1 < currentLevel.length) ? currentLevel[i + 1] : left;
        
        // Chuẩn hóa chuỗi hex bốc bytes ghép nút cha giống hash_node của Flask
        const leftStr = left.startsWith('0x') ? left.slice(2) : left;
        const rightStr = right.startsWith('0x') ? right.slice(2) : right;
        const combinedHex = '0x' + leftStr + rightStr;
        
        nextLevel.append ? nextLevel.push(web3.utils.keccak256(combinedHex)) : nextLevel.push(web3.utils.keccak256(combinedHex));
      }
      currentLevel = nextLevel;
    }
    return currentLevel[0];
  };

  // HÀM CẤP BẰNG - ĐÃ ĐỒNG BỘ CHỮ KÝ THẬT VỚI BACKEND VÀ VERIFY
  const handleIssue = async () => {
    if (!walletAddress) return alert("Wallet not connected!");
    if (!formData.studentName || !formData.studentId) return alert("Please fill Student Name and ID!");
    
    setIsIssuing(true);
    try {
      const web3 = new Web3(window.ethereum);
      const checksumAddress = web3.utils.toChecksumAddress(walletAddress);

      // BƯỚC 1: Tự động tính toán Merkle Root từ dữ liệu học bạ động của Form
      const clientComputedRoot = calculateMerkleRootAtClient(formData.courses);
      console.log("Calculated Merkle Root for Signature:", clientComputedRoot);

      // BƯỚC 2: Bật popup kích hoạt MetaMask ký xác nhận ĐÚNG vào mã Root này
      let cryptographicSignature;
      try {
        // Sử dụng eth_sign hoặc personal_sign để sinh chữ ký chuẩn cho verify_api giải mã
        cryptographicSignature = await window.ethereum.request({
          method: "personal_sign",
          params: [clientComputedRoot, walletAddress]
        });
      } catch (signError: any) {
        setIsIssuing(false);
        if (signError.code === 4001) {
          return alert("❌ Issuance canceled: You rejected the signature request on MetaMask.");
        }
        return alert("Failed to generate signature from MetaMask: " + signError.message);
      }

      // BƯỚC 3: Bắn duy nhất 1 endpoint nộp toàn bộ dữ liệu kèm chữ ký xịn lên Flask
      const response = await fetch('http://127.0.0.1:5000/api/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          issuerAddress: checksumAddress,
          signature: cryptographicSignature // Trường chữ ký thật gửi lên cho Flask hứng
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