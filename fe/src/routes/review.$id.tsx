import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ShieldCheck, AlertTriangle, FileText, CheckCircle2, XCircle, Fingerprint, Lock, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VerificationWorkspace } from "@/components/VerificationWorkspace";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

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
  const [isPinPromptOpen, setIsPinPromptOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [pendingVerdict, setPendingVerdict] = useState<string | null>(null);

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

  const handleAction = async (verdict: string) => {
    if (verdict !== "APPROVED" && !feedback.trim()) {
      toast.error("Tolong berikan feedback mengapa ditolak/perlu direvisi.");
      return;
    }
    
    // Trigger PIN & Biometric if Approved
    if (verdict === "APPROVED") {
      setPendingVerdict(verdict);
      setIsPinPromptOpen(true);
      setPin("");
      setPinError(false);
    } else {
      // Just submit directly for Needs Revision / Rejected
      submitReview(verdict);
    }
  };

  const handleBiometricApprove = async () => {
    if (pin !== "123456") {
      setPinError(true);
      toast.error("Incorrect Authorization PIN!");
      return;
    }
    
    setIsPinPromptOpen(false);
    toast.success("Authorization Verified", { description: "Cryptographic SHA-256 Badge generated." });
    submitReview(pendingVerdict!);
  };

  const submitReview = async (verdict: string) => {
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
              <FileText className="h-5 w-5" /> AI Analysis Results
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
            <h3 className="font-black text-xl uppercase tracking-widest text-slate-900 mb-4 border-b-4 border-slate-800 pb-2">Senior Engineer Decision</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-black uppercase text-slate-900 mb-2 block">Notes / Needs Revision (Optional)</label>
                <Textarea 
                  placeholder="Add note for technician..." 
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  className="min-h-[120px] border-4 border-slate-800 rounded-none font-bold resize-none focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => handleAction('APPROVED')}
                disabled={submitting}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-none border-4 border-slate-800 font-black uppercase tracking-widest shadow-[4px_4px_0_rgba(6,78,59,0.5)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all"
              >
                <CheckCircle2 className="h-5 w-5 mr-2" /> Accepted (Approved)
              </Button>
              
              <Button 
                onClick={() => handleAction('NEEDS_REVISION')}
                disabled={submitting}
                className="w-full h-14 bg-yellow-400 hover:bg-yellow-500 text-slate-900 rounded-none border-4 border-slate-800 font-black uppercase tracking-widest shadow-[4px_4px_0_rgba(6,78,59,0.5)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all"
              >
                <AlertTriangle className="h-5 w-5 mr-2" /> Needs Revision
              </Button>

              <Button 
                onClick={() => handleAction('REJECTED')}
                disabled={submitting}
                className="w-full h-14 bg-red-500 hover:bg-red-600 text-white rounded-none border-4 border-slate-800 font-black uppercase tracking-widest shadow-[4px_4px_0_rgba(6,78,59,0.5)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all"
              >
                <XCircle className="h-5 w-5 mr-2" /> Rejected
              </Button>
            </div>
          </div>
          
          <div className="bg-blue-50 border-4 border-slate-800 p-4">
             <p className="text-[11px] font-bold text-slate-800 leading-relaxed uppercase">
               If approved, the document will be cryptographically locked (SHA-256) and a Safe Work Protocol QR Code will be automatically generated.
             </p>
          </div>
        </div>
      </main>

      {/* ══ PIN PROMPT OVERLAY ══ */}
      {isPinPromptOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center text-white">
          <div className="bg-white p-8 border-4 border-[#1e3a8a] shadow-[8px_8px_0_rgba(56,189,248,1)] max-w-sm w-full text-center">
            <Lock className="h-12 w-12 text-[#1e3a8a] mx-auto mb-4" />
            <h3 className="text-xl font-black uppercase text-[#1e3a8a] mb-2">Authorization Required</h3>
            <p className="text-xs font-bold text-slate-500 mb-6">Masukkan 6 digit Secure PIN yang dikirim ke email Anda untuk menandatangani dokumen ini.</p>
            
            <div className="flex justify-center mb-6 text-slate-800">
              <InputOTP maxLength={6} value={pin} onChange={(v) => { setPin(v); setPinError(false); }}>
                <InputOTPGroup className="gap-2">
                  {[...Array(6)].map((_, i) => (
                    <InputOTPSlot key={i} index={i} className={`h-12 w-12 text-lg font-black border-2 rounded-none shadow-[2px_2px_0_rgba(0,0,0,0.3)] ${pinError ? 'border-red-500 bg-red-50' : 'border-[#1e3a8a]'}`} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            
            <div className="flex gap-3">
              <Button onClick={() => setIsPinPromptOpen(false)} className="flex-1 rounded-none border-2 border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black uppercase text-xs">Batal</Button>
              <Button onClick={handleBiometricApprove} disabled={pin.length < 6} className="flex-1 rounded-none border-2 border-[#1e3a8a] bg-[#bfdbfe] hover:bg-yellow-400 text-[#1e3a8a] font-black uppercase text-xs shadow-[4px_4px_0_rgba(30,58,138,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">Verifikasi PIN</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
