import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white p-4 text-center relative" style={{ fontFamily: 'Arial, sans-serif' }}>
      <Link href="/cong-registry" className="absolute top-8 right-8 p-3 bg-slate-800 rounded-full hover:bg-purple-600 transition-all border border-slate-700 shadow-lg group">
        <span className="text-xl group-hover:scale-110 block">⚙️</span>
      </Link>

      <h1 className="text-5xl md:text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 uppercase tracking-tighter">
        DIGITAL DIPLOMA
      </h1>

      <p className="text-slate-400 mb-12 text-lg font-medium italic opacity-80">
        Blockchain-based Digital Diploma Management System
      </p>
      
      <div className="flex flex-col md:flex-row gap-8">
        <Link href="/cong-phat-hanh" className="px-10 py-5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500 transition shadow-xl shadow-blue-500/20 active:scale-95 min-w-[240px] text-xl border-b-4 border-blue-800">
          Issuer Portal
        </Link>

        <Link href="/vi-sinh-vien" className="px-10 py-5 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-500 transition shadow-xl shadow-emerald-500/20 active:scale-95 min-w-[240px] text-xl border-b-4 border-emerald-800">
          Student Wallet
        </Link>

        <Link href="/cong-xac-thuc" className="px-10 py-5 bg-orange-500 text-white rounded-2xl font-bold hover:bg-orange-400 transition shadow-xl shadow-orange-500/30 active:scale-95 min-w-[240px] text-xl border-b-4 border-orange-700">
          Verifier Portal
        </Link>
      </div>

      <div className="absolute bottom-10 p-4 border border-slate-800 rounded-2xl bg-slate-800/30 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
        System Status: <span className="text-emerald-400 animate-pulse ml-1">● Live On Blockchain</span>
      </div>
    </div>
  );
}