"use client";
import { useState } from 'react';
import { initWeb3 } from "../../../contract";

export default function CongRegistry() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddIssuer = async () => {
    if (!address.startsWith('0x') || address.length !== 42) {
      return alert("Địa chỉ ví không hợp lệ! (Phải bắt đầu bằng 0x và đủ 42 ký tự)");
    }

    setLoading(true);
    try {
      const conn = await initWeb3();
      if (!conn) {
        setLoading(false);
        return;
      }
      
      const { contract, account } = conn;
      console.log("Đang gọi giao dịch từ ví:", account);

      // --- PHẦN SỬA ĐỔI QUAN TRỌNG TẠI ĐÂY ---
      // Thay vì dùng estimateGas (dễ bị chặn nếu sai ví Admin), 
      // chúng ta gọi trực tiếp hàm .send() để MetaMask bật lên xác nhận.
      
      await contract.methods.addIssuer(address).send({ 
        from: account,
        // Chúng ta set Gas cứng để MetaMask không cần tính toán trước 
        // (Tránh lỗi chặn giao dịch trước khi hiện cửa sổ)
        gas: 500000 
      })
      .on('transactionHash', (hash: string) => {
        console.log("Transaction Hash:", hash);
        alert("Giao dịch đã được gửi! Đang chờ xác nhận trên Blockchain...");
      });
      
      alert("Thành công! Trường học đã được cấp quyền trên Blockchain.");
      setAddress('');
    } catch (error: any) {
      console.error("Registry Error:", error);
      
      // Thông báo thông minh hơn để bạn biết cần đổi ví
      if (error.message.includes("revert") || error.message.includes("denied")) {
         alert("LỖI QUYỀN HẠN: MetaMask không bật hoặc giao dịch bị từ chối. Hãy chắc chắn bạn đang dùng ví ADMIN (Ví đầu tiên trong Ganache/Ví Deploy).");
      } else {
         alert("Lỗi hệ thống: " + (error.message || "Kiểm tra kết nối MetaMask"));
      }
    } finally {
      setLoading(false);
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
          <p className="text-slate-400 text-sm mt-2">Cấp quyền cho địa chỉ ví trường học</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">University Wallet Address</label>
            <input 
              className="w-full p-4 bg-slate-900/50 rounded-2xl border border-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all font-mono text-sm"
              placeholder="0x..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <button 
            onClick={handleAddIssuer}
            disabled={loading}
            className={`w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-lg ${
              loading 
                ? 'bg-slate-700 cursor-not-allowed text-slate-400' 
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white'
            }`}
          >
            {loading ? "Đang kết nối MetaMask..." : "Xác nhận quyền"}
          </button>
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