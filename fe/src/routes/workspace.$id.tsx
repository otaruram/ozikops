import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { VerificationWorkspace } from "@/components/VerificationWorkspace";
import { Loader2, ArrowLeft, Leaf, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/workspace/$id")({
  component: WorkspacePage,
});

function WorkspacePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getVerificationDetail(id)
      .then((res) => {
        // Use parsedDocumentJson if available (DrillBit UI), else fallback
        let clauses = [];
        if (res.parsedDocumentJson) {
          try {
            let parsed = typeof res.parsedDocumentJson === 'string' ? JSON.parse(res.parsedDocumentJson) : res.parsedDocumentJson;
            if (typeof parsed === 'string') parsed = JSON.parse(parsed); // Double-encoded handler
            
            if (parsed && parsed.pages) {
              clauses = parsed.pages.flatMap((p: any) => p.chunks || p.Chunks || []);
            }
          } catch (e) {
            console.error("Failed to parse document JSON:", e);
          }
        }
        
        if (clauses.length === 0) {
          clauses = res.issues?.map((issue: any, i: number) => ({
            id: i + 1,
            clause: `Klausul Terdeteksi ${i + 1}`,
            text: issue.clauseText || "Teks paragraf tidak tersedia.",
            status: issue.severity === "HIGH_RISK" ? "high" : (issue.severity === "MEDIUM_RISK" ? "medium" : "compliant"),
            issue: {
              id: issue.id,
              severity: issue.severity,
              matchedLaw: issue.matchedLaw,
              originalLawText: issue.originalLawText,
              suggestedRevision: issue.suggestedRevision
            }
          })) || [];
        }

        setData({
          ...res,
          clauses,
          auditId: res.id,
        });
      })
      .catch((err) => {
        console.error("Failed to load audit:", err);
        alert("Gagal memuat detail audit.");
        navigate({ to: "/dashboard" });
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-slate-800" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-800">
      <header className="border-b-4 border-blue-900 bg-white px-6 py-4 flex justify-between items-center z-50">
        <Link to="/dashboard" className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="hover:bg-blue-50 rounded-none h-10 w-10 border-2 border-transparent hover:border-blue-900 text-blue-900">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="bg-white p-1.5 rounded-none border-2 border-blue-900 hidden sm:block shadow-[2px_2px_0_rgba(30,58,138,1)]">
            <img src="/logo.png" alt="OzikOps" className="h-5 w-5 object-contain" />
          </div>
          <span className="text-sm font-black tracking-widest uppercase text-blue-900 hidden sm:block">Kembali ke Dashboard</span>
        </Link>
        <div className="font-black uppercase tracking-widest text-blue-900 text-sm">
          Workspace Report
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {data.reviewStatus === "PENDING_REVIEW" ? (
            <div className="bg-white border-4 border-blue-900 p-12 text-center max-w-2xl mx-auto mt-12 shadow-[8px_8px_0_rgba(30,58,138,1)]">
              <div className="bg-blue-50 p-4 inline-block mb-6 border-2 border-blue-600">
                <ShieldCheck className="h-12 w-12 text-blue-600 mx-auto" />
              </div>
              <h2 className="text-2xl font-black text-blue-900 uppercase tracking-widest mb-4">Menunggu Tinjauan Senior Engineer</h2>
              <p className="text-blue-900/80 font-bold leading-relaxed mb-8">
                Dokumen Anda telah dianalisis oleh AI dan saat ini sedang dalam antrean tinjauan oleh <strong>Senior Engineer (Human-in-the-Loop)</strong> untuk memastikan akurasi mitigasi risiko. 
                <br /><br />
                Setelah tinjauan selesai (Disetujui/Needs Revision/Ditolak), Anda akan menerima pemberitahuan via email dan Anda akan mendapatkan akses penuh ke laporan PDF beserta QR Badge (jika lulus).
              </p>
              <Link to="/dashboard">
                <Button className="bg-blue-900 hover:bg-blue-800 text-white rounded-none border-2 border-blue-900 font-black tracking-widest uppercase px-8 h-12 shadow-[4px_4px_0_rgba(147,197,253,1)] hover:shadow-none hover:translate-y-1 hover:translate-x-1 transition-all">
                  Kembali ke Dashboard
                </Button>
              </Link>
            </div>
          ) : (
            <VerificationWorkspace 
              isFreemium={false} 
              initialResult={data} 
              initialStatus="result" 
              userName={data.authorName || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"}
              userEmail={data.authorEmail || user?.email || "user@example.com"}
            />
          )}
        </div>
      </main>
    </div>
  );
}
