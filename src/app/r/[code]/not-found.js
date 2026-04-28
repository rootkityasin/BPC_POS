import Link from "next/link";

export default function ReceiptNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 text-slate-900">
      <div className="max-w-md rounded-[28px] bg-white p-8 text-center shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Receipt</div>
        <h1 className="mt-3 text-3xl font-black text-slate-900">Not Found</h1>
        <p className="mt-3 text-sm text-slate-500">This receipt link is invalid or no longer available.</p>
        <Link href="/login" className="mt-6 inline-flex items-center justify-center rounded-2xl bg-[#2f6fc6] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#255ca8]">
          Back to Login
        </Link>
      </div>
    </main>
  );
}
