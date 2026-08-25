import { createFileRoute, Link } from "@tanstack/react-router";
import { VerificationWorkspace } from "@/components/VerificationWorkspace";
import { Leaf } from "lucide-react";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Verification Gratis — OzikGrid" },
    ],
  }),
  component: VerificationPage,
});

function VerificationPage() {
  return (
    <div className="min-h-screen bg-white selection:bg-slate-800 selection:text-white pb-20">
      <div className="bg-slate-800 text-white border-b-4 border-slate-800 py-12 px-4 mb-12 text-center">
        <div className="max-w-4xl mx-auto">
          <Link to="/" className="inline-flex items-center justify-center gap-2 mb-6">
            <span className="bg-white text-slate-800 p-1.5 rounded-sm"><img src="/logo.png" alt="OzikOps" className="h-5 w-5 object-contain mix-blend-multiply" /></span>
            <span className="font-black uppercase tracking-widest text-lg">OzikGrid</span>
          </Link>
          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4">Uji Coba Verification Work Order</h1>
          <p className="font-bold text-white/80 max-w-2xl mx-auto">
            Coba kehebatan agregasi AI kami. Unggah sampel Work Order, dan lihat bagaimana AI mendeteksi kelayakan teknis serta potensi pelanggaran hukum secara instan.
          </p>
        </div>
      </div>
      
      <div className="px-4">
        <VerificationWorkspace isFreemium={true} />
      </div>
    </div>
  );
}