import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ShieldCheck, AlertTriangle, FileText, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VerificationWorkspace } from "@/components/VerificationWorkspace";

export const Route = createFileRoute("/review/$id")({
  head: () => ({
    meta: [{ title: "Senior Engineer Approval — OzikOps" }],
  }),
  component: ReviewerWorkspace,
});

function ReviewerWorkspace() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [audit, setVerification] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/auth" });
    } else if (user) {
      fetchVerification();
    }
  }, [user, authLoading]);

  const fetchVerification = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<any>(`/audit/${id}`);
      setVerification(res);
    } catch (err: any) {
      toast.error("Gagal mengambil data ticket. Anda mungkin tidak memiliki akses.");
      navigate({ to: "/dashboard" });
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (verdict: string) => {
    if (verdict !== "APPROVED" && !feedback.trim()) {
      toast.error("Tolong berikan feedback mengapa ditolak/perlu direvisi.");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch(`/reviewer/audit/${id}/review`, {
        method: 'PUT',
        body: JSON.stringify({ verdict, feedback }),
      });
      toast.success("Review berhasil disubmit!");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "Gagal submit review");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!audit) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-slate-800 text-white p-4 border-b-4 border-slate-800 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon" className="hover:bg-white/10 text-white rounded-none">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-yellow-400" /> Senior Engineer Approval Desk
            </h1>
            <p className="text-xs font-bold text-white/70">Human-in-the-Loop (HITL) Approval Mode</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-8 flex flex-col lg:flex-row gap-8 overflow-hidden max-w-[1600px] mx-auto w-full">
        {/* Left: Document View */}
        <div className="flex-1 bg-white border-4 border-slate-800 shadow-[6px_6px_0_rgba(6,78,59,0.5)] overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
          <div className="bg-blue-50 border-b-4 border-slate-800 p-4">
            <h2 className="font-black uppercase text-slate-900 tracking-widest text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" /> Hasil Analisis AI
            </h2>
            <div className="text-sm font-bold text-slate-600 mt-1">
              Equipment: {audit.projectName} • Safety Score: {audit.feasibilityScore}/100
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
             <VerificationWorkspace 
               isFreemium={false} 
               initialStatus="result"
               initialResult={{
                  id: audit.id,
                  projectName: audit.projectName || "Equipment",
                  feasibilityScore: audit.feasibilityScore,
                  scoreSafety: audit.scoreSafety,
                  scoreTechnical: audit.scoreTechnical,
                  scoreEfficiency: audit.scoreEfficiency,
                  scoreReliability: audit.scoreReliability,
                  issues: audit.issues || [],
                  clauses: audit.clauses || [],
                  parsedDocumentJson: audit.parsedDocumentJson,
                  hash: audit.sha256Hash
               }}
               userName="Senior Engineer"
               userEmail="reviewer"
             />
          </div>
        </div>

        {/* Right: Review Actions */}
        <div className="w-full lg:w-[400px] flex flex-col gap-6 shrink-0 h-[calc(100vh-8rem)] overflow-y-auto pr-2 pb-8">
          <div className="bg-white border-4 border-slate-800 p-6 shadow-[6px_6px_0_rgba(6,78,59,0.5)]">
            <h3 className="font-black text-xl uppercase tracking-widest text-slate-900 mb-4 border-b-4 border-slate-800 pb-2">Keputusan Senior Engineer</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-black uppercase text-slate-900 mb-2 block">Catatan / Needs Revision (Opsional)</label>
                <Textarea 
                  placeholder="Tambahkan catatan untuk teknisi..." 
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  className="min-h-[120px] border-4 border-slate-800 rounded-none font-bold resize-none focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => submitReview('APPROVED')}
                disabled={submitting}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-none border-4 border-slate-800 font-black uppercase tracking-widest shadow-[4px_4px_0_rgba(6,78,59,0.5)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all"
              >
                <CheckCircle2 className="h-5 w-5 mr-2" /> Diterima (Approved)
              </Button>
              
              <Button 
                onClick={() => submitReview('NEEDS_REVISION')}
                disabled={submitting}
                className="w-full h-14 bg-yellow-400 hover:bg-yellow-500 text-slate-900 rounded-none border-4 border-slate-800 font-black uppercase tracking-widest shadow-[4px_4px_0_rgba(6,78,59,0.5)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all"
              >
                <AlertTriangle className="h-5 w-5 mr-2" /> Perlu Needs Revision
              </Button>

              <Button 
                onClick={() => submitReview('REJECTED')}
                disabled={submitting}
                className="w-full h-14 bg-red-500 hover:bg-red-600 text-white rounded-none border-4 border-slate-800 font-black uppercase tracking-widest shadow-[4px_4px_0_rgba(6,78,59,0.5)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all"
              >
                <XCircle className="h-5 w-5 mr-2" /> Reject (Rejected)
              </Button>
            </div>
          </div>
          
          <div className="bg-blue-50 border-4 border-slate-800 p-4">
             <p className="text-[11px] font-bold text-slate-800 leading-relaxed uppercase">
               Jika disetujui, dokumen akan dikunci secara kriptografis (SHA-256) dan QR Code Safe Work Protocol akan dibuat secara otomatis.
             </p>
          </div>
        </div>
      </main>
    </div>
  );
}
