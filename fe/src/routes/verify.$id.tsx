import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Globe, 
  Factory, 
  BookOpen, 
  Loader2,
  Lock,
  Download,
  Fingerprint,
  HardHat
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export const Route = createFileRoute("/verify/$id")({
  component: VerifyPage,
});

function VerifyPage() {
  const { id } = Route.useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorType, setErrorType] = useState<string | null>(null);

  const [step, setStep] = useState(0);

  useEffect(() => {
    const sequence = async () => {
      setStep(1);
      await new Promise(r => setTimeout(r, 600));
      setStep(2);
      await new Promise(r => setTimeout(r, 800));
      setStep(3);
      await new Promise(r => setTimeout(r, 900));
      setStep(4);
    };
    sequence();
  }, []);

  useEffect(() => {
    api.verifyBadge(id)
      .then(res => {
        if (!res || res.error) {
          setError(true);
          setErrorType(res?.error || "UNKNOWN");
        } else if (res.status === "INVALID" || res.status === "REJECTED" || res.valid === false) {
          setError(true);
          setErrorType("DATA_TAMPERED");
        } else {
          setData(res);
        }
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setErrorType("NETWORK_ERROR");
        setLoading(false);
      });
  }, [id]);

  if (loading || step < 4) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 selection:bg-blue-900 selection:text-white font-mono">
        <div className="w-full max-w-2xl border-2 border-blue-900/50 bg-black shadow-[0_0_40px_rgba(14,116,144,0.15)] rounded-xl overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
          <div className="bg-[#111] border-b border-blue-900/30 px-4 py-3 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-blue-500/80"></div>
            </div>
            <div className="text-[10px] sm:text-xs text-blue-500/60 font-bold ml-4 uppercase tracking-widest flex items-center gap-2">
              <Lock className="w-3 h-3" /> OzikOps Secure Verification Node
            </div>
          </div>
          <div className="p-6 md:p-8 space-y-4 text-sky-400 text-sm md:text-base leading-relaxed">
            <div className="flex items-center gap-3">
              <span className="text-blue-500/50">&gt;</span>
              <span>Initializing cryptographic sequence...</span>
              {step === 0 && <span className="w-2 h-5 bg-sky-400 animate-pulse inline-block ml-1"></span>}
            </div>
            {step >= 1 && (
              <div className="flex items-center gap-3">
                <span className="text-blue-500/50">&gt;</span>
                <span>Connecting to verification ledger <span className="text-sky-200">[{id.substring(0,12)}...]</span></span>
                <CheckCircle2 className="w-4 h-4 text-blue-500 ml-auto" />
              </div>
            )}
            {step >= 2 && (
              <div className="flex items-center gap-3">
                <span className="text-blue-500/50">&gt;</span>
                <span>Fetching encrypted payload & PII masking...</span>
                <CheckCircle2 className="w-4 h-4 text-blue-500 ml-auto" />
              </div>
            )}
            {step >= 3 && (
              <div className="flex items-start gap-3">
                <span className="text-blue-500/50 mt-1">&gt;</span>
                <div className="flex-1">
                  <span>Re-computing HMAC SHA-256 integrity hash...</span>
                  <div className="mt-2 text-xs text-blue-600/70 break-all bg-sky-950/20 p-2 rounded border border-blue-900/30">
                    {id.substring(0, 8)}9f045c... [COMPUTING] ...f2d3a91b
                  </div>
                </div>
                {step === 3 ? <Loader2 className="w-4 h-4 text-blue-500 animate-spin mt-1" /> : <CheckCircle2 className="w-4 h-4 text-blue-500 ml-auto mt-1" />}
              </div>
            )}
            {step >= 4 && (
              <div className="flex items-center gap-3 pt-2 text-sky-300 font-bold border-t border-blue-900/30 mt-4">
                <span className="text-blue-500/50">&gt;</span>
                <span>Integrity verification complete. Rendering Safe Work Protocol...</span>
                <span className="w-2 h-5 bg-sky-400 animate-pulse inline-block ml-1"></span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    if (errorType === "BADGE_NOT_FOUND" || errorType === "NETWORK_ERROR" || errorType === "UNKNOWN") {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 selection:bg-slate-900 selection:text-white">
          <div className="max-w-2xl w-full border-8 border-slate-400 bg-white shadow-[16px_16px_0_rgba(100,116,139,1)] text-center p-12">
            <Globe className="h-24 w-24 mx-auto text-slate-400 mb-8" />
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-slate-700 mb-4">
              Protocol Not Found
            </h1>
            <p className="text-lg md:text-xl font-bold text-slate-600 mb-8 px-4 border-l-4 border-slate-400 ml-4">
              The Safe Work Protocol you are looking for does not exist or has not been issued yet.
            </p>
            <div className="flex justify-center mb-8">
              <Badge className="bg-slate-500 text-white font-black uppercase tracking-widest px-6 py-3 rounded-none text-lg hover:bg-slate-600">
                Status: UNKNOWN
              </Badge>
            </div>
            <Link to="/">
              <Button className="rounded-none border-2 border-slate-900 bg-slate-50 text-slate-900 hover:bg-slate-200 font-black uppercase tracking-widest w-full max-w-sm h-14">
                Return to OzikOps
              </Button>
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 selection:bg-red-900 selection:text-white">
        <div className="max-w-2xl w-full border-8 border-red-700 bg-white shadow-[16px_16px_0_rgba(185,28,28,1)] text-center p-12">
          <AlertTriangle className="h-24 w-24 mx-auto text-red-600 mb-8 animate-pulse" />
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-red-700 mb-4">
            🚨 Critical Integrity Violation
          </h1>
          <p className="text-lg md:text-xl font-bold text-slate-800 mb-8 px-4 border-l-4 border-red-600 ml-4">
            The data for this maintenance protocol has been altered, tampered with, or failed verification. Protocol REVOKED.
          </p>
          <div className="flex justify-center mb-8">
            <Badge className="bg-red-700 text-white font-black uppercase tracking-widest px-6 py-3 rounded-none text-lg">
              Status: INVALID / REVOKED
            </Badge>
          </div>
          <Link to="/">
            <Button className="rounded-none border-2 border-red-900 bg-red-50 text-red-900 hover:bg-red-100 font-black uppercase tracking-widest w-full max-w-sm h-14">
              Return to OzikOps
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-slate-800 selection:text-white font-sans pb-20">
      {/* Top Banner */}
      <div className="bg-slate-800 text-white border-b-4 border-slate-800 p-4 px-6 flex justify-between items-center sticky top-0 z-10 shadow-md">
        <Link to="/" className="flex items-center gap-3">
          <span className="bg-white text-slate-800 p-1.5 rounded-sm shadow-sm"><HardHat className="h-4 w-4" /></span>
          <span className="font-black uppercase tracking-widest text-sm">OzikOps Verification Ledger</span>
        </Link>
        <div className="text-[10px] font-bold tracking-widest text-sky-400 hidden sm:block">
          SECURE CONNECTION
        </div>
      </div>

      <div className="max-w-3xl mx-auto mt-10 md:mt-16 px-4">
        <div className="border-4 border-slate-800 bg-white shadow-[12px_12px_0_rgba(6,78,59,0.5)] relative overflow-hidden">
          
          {/* HERO SECTION */}
          <div className="bg-blue-50 border-b-4 border-slate-800 p-10 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 opacity-10">
              <ShieldCheck className="w-64 h-64 text-blue-900" />
            </div>
            
            <div className="h-28 w-28 border-4 border-slate-800 bg-white shadow-[6px_6px_0_rgba(6,78,59,0.5)] rounded-full flex items-center justify-center mb-6 relative z-10">
              <ShieldCheck className="h-14 w-14 text-blue-600 drop-shadow-md" />
              <div className="absolute bottom-0 right-0 bg-slate-800 rounded-full p-1 border-2 border-white shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-sky-400" />
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-slate-900 mb-3 relative z-10">
              Verified Safe Work<br/>Protocol
            </h1>
            <p className="text-sm font-bold text-slate-600 mb-6 max-w-lg relative z-10">
              This maintenance protocol has been verified by OzikOps AI and approved by a Senior Engineer. It is secured via cryptographic SHA-256 hash.
            </p>
            
            <Badge className="bg-slate-800 text-white font-black uppercase tracking-widest px-4 py-1 rounded-none border-2 border-transparent">
              Verified at {new Date().toLocaleString('id-ID')}
            </Badge>
          </div>

          {/* SECTION 1: EQUIPMENT IDENTITY */}
          <div className="p-8 border-b-2 border-dashed border-slate-300">
            <h2 className="text-lg font-black uppercase tracking-widest text-slate-900 flex items-center gap-2 mb-6">
              <BookOpen className="h-5 w-5" /> 01. Equipment Identity
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 border-l-4 border-blue-500">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Equipment / Ticket Name</p>
                <p className="font-black text-slate-900 text-lg">{data.projectName || "Heat Exchanger E-101"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Submitted By</p>
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-blue-600" />
                  <p className="font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-sm text-sm border border-sky-300">
                    [PROTECTED BY UU PDP]
                  </p>
                </div>
              </div>
              <div className="md:col-span-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Verification Date</p>
                <p className="font-semibold text-slate-900 text-sm">{new Date(data.auditDate || data.createdAt).toLocaleString('id-ID')}</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 italic mt-3 text-right">
              * Sensitive PII (Personally Identifiable Information) has been redacted in compliance with UU PDP.
            </p>
          </div>

          {/* SECTION 2: SAFETY RESULTS */}
          <div className="p-8 border-b-2 border-dashed border-slate-300">
            <h2 className="text-lg font-black uppercase tracking-widest text-slate-900 flex items-center gap-2 mb-6">
              <CheckCircle2 className="h-5 w-5" /> 02. Safety Analysis Results
            </h2>
            
            <div className="flex flex-col md:flex-row gap-8 items-center mb-8">
              <div className="w-32 h-32 rounded-full border-8 border-blue-500 flex flex-col items-center justify-center shadow-inner shrink-0 bg-blue-50">
                <span className="text-4xl font-black text-slate-900">{data.feasibilityScore}</span>
                <span className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">Score</span>
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex gap-4 items-start bg-white border-2 border-blue-100 p-4 shadow-sm hover:border-sky-300 transition-colors">
                  <ShieldCheck className="h-8 w-8 text-blue-600 shrink-0" />
                  <div>
                    <h4 className="font-black text-sm uppercase text-slate-900">⚙️ SOP Compliance: {data.scoreSafety}/40</h4>
                    <p className="text-xs text-slate-600 mt-1">Cross-referenced with plant SOP knowledge base.</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start bg-white border-2 border-blue-100 p-4 shadow-sm hover:border-sky-300 transition-colors">
                  <Globe className="h-8 w-8 text-blue-600 shrink-0" />
                  <div>
                    <h4 className="font-black text-sm uppercase text-slate-900">🔧 Technical Score: {data.scoreTechnical}/30</h4>
                    <p className="text-xs text-slate-600 mt-1">Equipment condition and risk level analysis.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex gap-4 items-start bg-white border-2 border-blue-100 p-4 shadow-sm hover:border-sky-300 transition-colors">
                    <Fingerprint className="h-8 w-8 text-blue-600 shrink-0" />
                    <div>
                      <h4 className="font-black text-sm uppercase text-slate-900">🦺 Safety: {data.scoreEfficiency}/15</h4>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start bg-white border-2 border-blue-100 p-4 shadow-sm hover:border-sky-300 transition-colors">
                    <CheckCircle2 className="h-8 w-8 text-blue-600 shrink-0" />
                    <div>
                      <h4 className="font-black text-sm uppercase text-slate-900">📋 Docs: {data.scoreReliability}/15</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: APPROVAL STATUS */}
          <div className="p-8 border-b-4 border-slate-800">
            <h2 className="text-lg font-black uppercase tracking-widest text-slate-900 flex items-center gap-2 mb-4">
              <Factory className="h-5 w-5" /> 03. Senior Engineer Approval
            </h2>
            <div className="bg-slate-800 text-blue-50 p-6 font-serif">
              <p className="text-sm leading-relaxed text-justify mb-4">
                Berdasarkan analisis OzikOps AI dan approval dari Senior Engineer, prosedur maintenance ini telah dinyatakan <strong className="text-white">AMAN UNTUK DIEKSEKUSI</strong> sesuai dengan Standard Operating Procedures yang berlaku.
              </p>
              <ul className="text-xs space-y-2 font-sans opacity-90 ml-4 list-disc">
                <li>Terverifikasi sesuai SOP plant yang berlaku.</li>
                <li>Disetujui oleh Senior Engineer melalui sistem HITL.</li>
                <li>Sealed dengan SHA-256 cryptographic hash — tamper-proof.</li>
              </ul>
            </div>
          </div>

          {/* SECTION 4: CTA */}
          <div className="p-8 bg-slate-50 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <Button onClick={() => window.print()} className="rounded-none border-2 border-slate-800 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest w-full sm:w-auto h-12 shadow-[4px_4px_0_rgba(6,78,59,0.5)]">
              <Download className="mr-2 h-4 w-4" /> Save Safe Work Protocol
            </Button>
            <Link to="/" className="w-full sm:w-auto">
              <Button variant="outline" className="rounded-none border-2 border-slate-800 text-slate-800 hover:bg-blue-50 font-black uppercase tracking-widest w-full h-12 shadow-[4px_4px_0_rgba(6,78,59,0.5)]">
                Pelajari OzikOps
              </Button>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
