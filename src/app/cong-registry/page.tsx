"use client";
import { useState } from 'react';
import { initWeb3 } from "../../../contract";

export default function CongRegistry() {
  const [address, setAddress] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // --- HÀM 1: CẤP QUYỀN (ADD ISSUER) ---
  const handleAddIssuer = async () => {
    if (!address.startsWith('0x') || address.length !== 42) {
      return alert("Địa chỉ ví không hợp lệ! (Phải bắt đầu bằng 0x và đủ 42 ký tự)");
    }

    setIsAdding(true);
    try {
      const conn = await initWeb3();
      if (!conn) {
        setIsAdding(false);
        return;
      }
      
      const { contract, account } = conn;
      console.log("Đang gọi giao dịch CẤP QUYỀN từ ví:", account);
      
      await contract.methods.addIssuer(address).send({ 
        from: account,
        gas: 500000 
      })
      .on('transactionHash', (hash: string) => {
        console.log("Transaction Hash:", hash);
        alert("Giao dịch đã được gửi! Đang chờ xác nhận trên Blockchain...");
      });
      
      alert("Thành công! Trường học đã được CẤP QUYỀN trên Blockchain.");
      setAddress('');
    } catch (error: any) {
      console.error("Registry Add Error:", error);
      if (error.message.includes("revert") || error.message.includes("denied")) {
         alert("LỖI QUYỀN HẠN: Giao dịch bị từ chối. Hãy chắc chắn bạn đang dùng ví ADMIN.");
      } else {
         alert("Lỗi hệ thống: " + (error.message || "Kiểm tra kết nối MetaMask"));
      }
    } finally {
      setIsAdding(false);
    }
  };

  // --- HÀM 2: XÓA QUYỀN (REMOVE ISSUER) ---
  const handleRemoveIssuer = async () => {
    if (!address.startsWith('0x') || address.length !== 42) {
      return alert("Địa chỉ ví không hợp lệ! (Phải bắt đầu bằng 0x và đủ 42 ký tự)");
    }

    setIsRemoving(true);
    try {
      const conn = await initWeb3();
      if (!conn) {
        setIsRemoving(false);
        return;
      }
      
      const { contract, account } = conn;
      console.log("Đang gọi giao dịch XÓA QUYỀN từ ví:", account);
      
      await contract.methods.removeIssuer(address).send({ 
        from: account,
        gas: 500000 
      })
      .on('transactionHash', (hash: string) => {
        console.log("Transaction Hash:", hash);
        alert("Giao dịch Xóa quyền đã được gửi! Đang chờ xác nhận...");
      });
      
      alert("Thành công! Đã THU HỒI QUYỀN của trường học này.");
      setAddress('');
    } catch (error: any) {
      console.error("Registry Remove Error:", error);
      if (error.message.includes("revert") || error.message.includes("denied")) {
         alert("LỖI QUYỀN HẠN: Giao dịch bị từ chối. Hãy chắc chắn bạn đang dùng ví ADMIN.");
      } else {
         alert("Lỗi hệ thống: " + (error.message || "Kiểm tra kết nối MetaMask"));
      }
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-10 flex items-center justify-center font-sans">
      <div className="max-w-md w-full bg-slate-800 p-8 rounded-[2.5rem] border border-purple-500/30 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-purple-500/10 rounded-full mb-4">
            <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04kM12 21.48l.342-1.372a9.96 9.96 0 001.378-1.378l1.372-.342m0-3.376a9.96 9.96 0 00-1.378-1.378l-1.372-.342m0-3.376a9.96 9.96 0 001.378 1.378l1.372.342" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">On-chain Registry</h2>
          <p className="text-slate-400 text-sm mt-2">Quản lý quyền hạn ví trường học</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">University Wallet Address</label>
            <input 
              className="w-full p-4 bg-slate-900/50 rounded-2xl border border-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all font-mono text-sm mt-1"
              placeholder="0x..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={isAdding || isRemoving}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* NÚT THÊM QUYỀN */}
            <button 
              onClick={handleAddIssuer}
              disabled={isAdding || isRemoving || !address}
              className={`w-full py-3 rounded-2xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
                isAdding || isRemoving || !address
                  ? 'bg-slate-700 cursor-not-allowed text-slate-400' 
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white'
              }`}
            >
              {isAdding ? (
                "Đang xử lý..."
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                  Cấp Quyền
                </>
              )}
            </button>

            {/* NÚT XÓA QUYỀN */}
            <button 
              onClick={handleRemoveIssuer}
              disabled={isAdding || isRemoving || !address}
              className={`w-full py-3 rounded-2xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
                isAdding || isRemoving || !address
                  ? 'bg-slate-700 cursor-not-allowed text-slate-400' 
                  : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-95 text-white'
              }`}
            >
              {isRemoving ? (
                "Đang xử lý..."
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  Thu Hồi
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-700/50">
          <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-slate-500">
            <span>Status:</span>
            <span className="text-emerald-400">Sepolia Live / Local Network</span>
          </div>
        </div>
      </div>
    </div>
  );
}