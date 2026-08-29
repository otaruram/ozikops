import { useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Upload, Lock, Loader2, AlertTriangle, Globe, ShieldCheck, Zap,
  CheckCircle2, BookOpen, Copy, ChevronLeft, ChevronRight, FileText,
  ZoomIn, ZoomOut, Download, Fingerprint, Calendar, Hash, FileStack,
  Scale, Building2, Wand2, ScanFace
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { PDFReportTemplate } from "./PDFReportTemplate";

interface VerificationWorkspaceProps {
  isFreemium?: boolean;
  onVerificationComplete?: () => void;
  userName?: string;
  userCompany?: string;
  userEmail?: string;
  initialResult?: any; // Contains reviewStatus, reviewFeedback, etc.
  initialStatus?: "idle" | "configure" | "parsing" | "masking" | "spatial" | "law" | "result";
}

export function VerificationWorkspace({ 
  isFreemium = true, 
  onVerificationComplete, 
  userName, 
  userCompany,
  userEmail = "user@example.com",
  initialResult = null, 
  initialStatus = "idle" 
}: VerificationWorkspaceProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "configure" | "parsing" | "masking" | "spatial" | "law" | "result">(initialStatus);
  const [result, setResult] = useState<any>(initialResult);
  const [activeClauseId, setActiveClauseId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [pageScope, setPageScope] = useState("teaser");
  const [customRange, setCustomRange] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [view, setView] = useState<"cover" | "workspace">("cover");
  const CLAUSES_PER_PAGE = 4;

  const { session } = useAuth();
  const [creditsBalance, setCreditsBalance] = useState<number | null>(null);
  const [isVerificationing, setIsVerificationing] = useState(false);
  const [auditStep, setVerificationStep] = useState(0);

  useEffect(() => {
    if (session?.user) {
      api.getMe().then((res: any) => setCreditsBalance(res.creditsBalance)).catch(console.error);
    }
    
    const request = indexedDB.open("OzikDB", 2);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("auditState")) {
        db.createObjectStore("auditState");
      }
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("auditState")) return;
      const tx = db.transaction("auditState", "readonly");
      const getReq = tx.objectStore("auditState").get("savedVerification");
      getReq.onsuccess = () => {
        if (getReq.result && session?.user) {
          const data = getReq.result;
          setFile(data.file);
          setFileName(data.fileName);
          setFileSize(data.fileSize);
          setResult(data.result);
          setStatus(data.status);
          setPageScope(data.pageScope);
          // Clear after restoring
          const delTx = db.transaction("auditState", "readwrite");
          delTx.objectStore("auditState").delete("savedVerification");
          toast.success("Workspace Restored", { description: "Continuing your previous session." });
        }
      };
    };
  }, [session]);

  const isGuest = !session?.user;
  const effectiveFreemium = isFreemium || isGuest;

  useEffect(() => {
    let interval: any;
    if (isVerificationing) {
      interval = setInterval(() => {
        setStatus((prev) => {
          if (prev === "parsing") return "masking";
          if (prev === "masking") return "spatial";
          if (prev === "spatial") return "law";
          return "law"; // stays at law until complete
        });
      }, 4000);
    } else {
      setVerificationStep(0);
    }
    return () => clearInterval(interval);
  }, [isVerificationing]);

  const loadingMessages = [
    "📄 Extracting text from PDF...",
    "🛡️ Detecting inconsistencies and permanence risks...",
    "⚖️ Analyzing local community impact...",
    "🤖 AI is generating feasibility insights...",
    "📊 Calculating 4-Pillar Feasibility Score..."
  ];


  const getFlatClauses = () => {
    if (result?.clauses && Array.isArray(result.clauses) && result.clauses.length > 0) return result.clauses;
    if (result?.parsedDocumentJson) {
      try {
        let parsed = typeof result.parsedDocumentJson === 'string' 
          ? JSON.parse(result.parsedDocumentJson) 
          : result.parsedDocumentJson;
          
        if (typeof parsed === 'string') {
          parsed = JSON.parse(parsed); // Handle double-encoded JSON
        }
          
        if (parsed?.pages) {
          return parsed.pages.flatMap((p: any) => p.chunks || p.Chunks || []);
        }
      } catch (e) {
        console.error("Failed to parse document JSON:", e);
      }
    }
    return [];
  };

  const flatClauses = getFlatClauses();

  const totalPages = result?.totalPages || (flatClauses.length > 0 ? Math.max(1, Math.ceil(flatClauses.length / CLAUSES_PER_PAGE)) : 1);
  const visibleClauses = flatClauses.slice((currentPage - 1) * CLAUSES_PER_PAGE, currentPage * CLAUSES_PER_PAGE);

  // Stats
  const totalClauses = flatClauses.length || 0;
  const highCount = flatClauses.filter((c: any) => { const l = (c.status || "").toLowerCase(); return l.includes("high"); }).length || 0;
  const mediumCount = flatClauses.filter((c: any) => { const l = (c.status || "").toLowerCase(); return l.includes("medium"); }).length || 0;
  const compliantCount = flatClauses.filter((c: any) => { const l = (c.status || "").toLowerCase(); return !l.includes("high") && !l.includes("medium"); }).length || 0;
  const totalWords = result?.totalWords || (flatClauses.reduce((acc: number, c: any) => acc + (c.text?.split(/\s+/).length || 0), 0) || 0);
  const totalSentences = result?.totalSentences || (flatClauses.reduce((acc: number, c: any) => acc + (c.text?.split(/[.!?]+/).filter(Boolean).length || 0), 0) || 0);

  const radarData = [
    { subject: 'Safety', A: result?.scoreSafety || 0, fullMark: 40 },
    { subject: 'Technical', A: result?.scoreTechnical || 0, fullMark: 30 },
    { subject: 'Efficiency', A: result?.scoreEfficiency || 0, fullMark: 15 },
    { subject: 'Reliability', A: result?.scoreReliability || 0, fullMark: 15 },
  ];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (activeClauseId !== null && rightPanelRef.current) {
      const card = rightPanelRef.current.querySelector(`[data-clause-id="${activeClauseId}"]`);
      if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeClauseId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 10 * 1024 * 1024) {
      alert("Size file melebihi batas 10 MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (selectedFile.type.startsWith("image/")) {
      alert("Format gambar tidak didukung. Harap unggah PDF, DOCX, atau TXT.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setFileSize(selectedFile.size);
    setStatus("configure");
  };


  const startVerification = async () => {
    if (!file) return;

    if (!effectiveFreemium && creditsBalance !== null && creditsBalance <= 0) {
      toast.error("Credits Exhausted", {
        description: "You do not have enough credits to perform a full assessment."
      });
      return;
    }

    const formData = new FormData();
    formData.append("document", file);
    if (!effectiveFreemium) formData.append("projectName", file.name);
    
    formData.append("page_mode", pageScope);
    if (pageScope === "custom") {
      formData.append("custom_range", customRange);
    }
    
    setIsVerificationing(true);
    setStatus("parsing");

    // Simulate progress animation since API might take 10-20 seconds
    const steps = ["parsing", "masking", "spatial", "law"];
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length - 1) {
        currentStep++;
        setStatus(steps[currentStep] as any);
      }
    }, 2000);

    try {
      const res = effectiveFreemium ? await api.guestTeaser(formData) : await api.processFullVerification(formData);
      clearInterval(interval);
      
      // Fast-forward remaining steps if any
      for (let i = currentStep + 1; i < steps.length; i++) {
        setStatus(steps[i] as any);
        await new Promise(r => setTimeout(r, 500));
      }
      
      setIsVerificationing(false);
      onVerificationComplete?.();

      if (res.auditId && !effectiveFreemium) {
        toast.success("Assessment Complete!", { description: "Redirecting to Workspace..." });
        navigate({ to: `/workspace/${res.auditId}` });
        return;
      }

      toast.success("Preview Complete", { description: "Displaying analysis results." });
      setResult(res);
      setStatus("result");
      setCurrentPage(1);
    } catch (e: any) {
      clearInterval(interval);
      console.error(e);
      setIsVerificationing(false);
      setStatus("idle");
      toast.error("Failed to process document", {
        description: "AI server is busy or an error occurred, please try again later."
      });
    }
  };
  const handleRegister = () => {
    const request = indexedDB.open("OzikDB", 2);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("auditState")) {
        db.createObjectStore("auditState");
      }
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const tx = db.transaction("auditState", "readwrite");
      tx.objectStore("auditState").put({ file, fileName, fileSize, result: null, status: "configure", pageScope }, "savedVerification");
      tx.oncomplete = () => {
        navigate({ to: "/auth" });
      };
    };
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const blob = await pdf(<PDFReportTemplate data={{...result, projectName: fileName || result?.projectName || "Work Order Plan"}} userName={userName || "OzikOps User"} userEmail={userEmail} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `OzikOps-Verification-${result?.auditId?.substring(0, 8) || "report"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) { console.error("PDF export failed:", e); alert("Failed to export PDF."); }
  };

  // Normalize status: backend returns "high"/"medium"/"compliant" (guest) OR "HIGH_RISK"/"MEDIUM_RISK"/"COMPLIANT" (pro)
  const norm = (s: string) => { const l = s?.toLowerCase() || ""; return l.includes("high") ? "high" : l.includes("medium") ? "medium" : "compliant"; };
  const getBg = (s: string) => { const n = norm(s); return n === "high" ? "#FEE2E2" : n === "medium" ? "#FEF3C7" : "#D1FAE5"; };
  const getBorder = (s: string) => { const n = norm(s); return n === "high" ? "#EF4444" : n === "medium" ? "#F59E0B" : "#3b82f6"; };
  const isHigh = (s: string) => norm(s) === "high";
  const isMedium = (s: string) => norm(s) === "medium";
  const isCompliant = (s: string) => norm(s) === "compliant";

  // ─── IDLE ───
  if (status === "idle") {
    return (
      <div className="w-full border-4 border-[#1e3a8a] bg-white shadow-[12px_12px_0_rgba(30,58,138,1)] flex flex-col font-sans">
        <div className="border-b-4 border-[#1e3a8a] bg-[#1e3a8a] px-6 py-4">
          <h3 className="font-black uppercase tracking-widest text-white text-sm flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#bfdbfe] fill-[#bfdbfe]" /> {isFreemium ? "Freemium Teaser Workspace" : "OzikOps Full Workspace"}
          </h3>
        </div>
        <div className="flex-1 p-8 md:p-12 flex flex-col items-center justify-center bg-white min-h-[400px]">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.doc,.docx,.txt" />
          <div className="w-full max-w-2xl border-4 border-dashed border-[#1e3a8a] p-12 hover:bg-[#1e3a8a] hover:text-white transition-all cursor-pointer flex flex-col items-center justify-center group text-[#1e3a8a]" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-16 w-16 mb-6 group-hover:-translate-y-2 transition-transform" />
            <h4 className="text-2xl font-black uppercase tracking-widest mb-2 text-center">Upload Work Order Plan</h4>
            <p className="font-bold opacity-70 text-center text-sm mb-4">Max 10 MB (PDF, DOCX)</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── CONFIGURE ───
  if (status === "configure") {
    return (
      <div className="w-full border-4 border-[#1e3a8a] bg-white shadow-[12px_12px_0_rgba(30,58,138,1)] flex flex-col font-sans min-h-[400px]">
        <div className="border-b-4 border-[#1e3a8a] bg-[#1e3a8a] px-6 py-4">
          <h3 className="font-black uppercase tracking-widest text-white text-sm flex items-center gap-2">
            <FileStack className="h-5 w-5 text-[#bfdbfe]" /> Document Configuration
          </h3>
        </div>
        <div className="p-8 max-w-3xl mx-auto w-full">
          <div className="bg-gray-50 border-2 border-[#1e3a8a] p-4 mb-6 flex justify-between items-center">
            <div>
              <p className="text-xs font-black uppercase text-gray-500 mb-1">Selected File</p>
              <p className="font-bold text-[#1e3a8a] truncate max-w-sm">{fileName}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-black uppercase text-gray-500 mb-1">Size</p>
              <p className="font-bold text-[#1e3a8a]">{(fileSize / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>

          <h4 className="font-black uppercase text-sm text-[#1e3a8a] mb-4">Select Analysis Scope</h4>
            {effectiveFreemium && <div className="mb-3 text-xs text-yellow-600 bg-yellow-50 p-2 border border-yellow-200 rounded font-medium"><Lock className="inline w-3 h-3 mr-1" />Sign up for a free account to unlock Full Assessment & Custom Range.</div>}
          <div className="space-y-3 mb-8">
            <label className={`block border-2 p-4 cursor-pointer transition-all ${pageScope === "teaser" ? "border-[#1e3a8a] bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
              <div className="flex items-center gap-3">
                <input type="radio" name="scope" value="teaser" checked={pageScope === "teaser"} onChange={() => setPageScope("teaser")} className="w-4 h-4 accent-[#1e3a8a]" />
                <div>
                  <div className="font-bold text-[#1e3a8a]">Free Teaser / Quick Verification</div>
                  <div className="text-xs text-gray-500">Quick analysis limited to Pages 1 - 3.</div>
                </div>
              </div>
            </label>
            <label className={`block border-2 p-4 cursor-pointer transition-all ${pageScope === "custom" ? "border-[#1e3a8a] bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
              <div className="flex items-center gap-3">
                <input type="radio" name="scope" value="custom" checked={pageScope === "custom"} onChange={() => setPageScope("custom")} className="w-4 h-4 accent-[#1e3a8a]" disabled={effectiveFreemium} />
                <div className="w-full">
                  <div className="font-bold text-[#1e3a8a] flex items-center justify-between">
                    Custom Range
                    {effectiveFreemium && <Badge variant="outline" className="text-[9px] uppercase"><Lock className="w-2 h-2 inline mr-1"/>Pro</Badge>}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">Select specific pages.</div>
                  {pageScope === "custom" && (
                    <input type="text" placeholder="Example: 1-5, 8, 11-13" value={customRange} onChange={(e) => setCustomRange(e.target.value)} className="w-full border border-gray-300 p-2 text-sm focus:outline-none focus:border-[#1e3a8a]" />
                  )}
                </div>
              </div>
            </label>
            <label className={`block border-2 p-4 cursor-pointer transition-all ${pageScope === "full" ? "border-[#1e3a8a] bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
              <div className="flex items-center gap-3">
                <input type="radio" name="scope" value="full" checked={pageScope === "full"} onChange={() => setPageScope("full")} className="w-4 h-4 accent-[#1e3a8a]" disabled={effectiveFreemium} />
                <div>
                  <div className="font-bold text-[#1e3a8a] flex items-center justify-between gap-2">
                    Full Document Verification (All Pages)
                    {effectiveFreemium && <Badge variant="outline" className="text-[9px] uppercase"><Lock className="w-2 h-2 inline mr-1"/>Pro</Badge>}
                  </div>
                  <div className="text-xs text-gray-500">Comprehensive analysis for the entire Work Order document.</div>
                </div>
              </div>
            </label>
          </div>

          <Button onClick={startVerification} className="w-full bg-[#bfdbfe] hover:bg-yellow-500 text-[#1e3a8a] font-black text-sm uppercase tracking-widest h-14 border-4 border-[#1e3a8a] flex items-center justify-center gap-2">
            🚀 Start Assessment Now
          </Button>
        </div>
      </div>
    );
  }

  // ─── LOADING ───
  if (status !== "result") {
    return (
      <div className="w-full border-4 border-[#1e3a8a] bg-[#1e3a8a] shadow-[12px_12px_0_rgba(30,58,138,1)] flex flex-col min-h-[400px]">
        <div className="flex-1 p-12 flex flex-col items-center justify-center text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]" />
          <div className="relative z-10 flex flex-col items-center">
            <Loader2 className="h-20 w-20 animate-spin mb-8 text-[#bfdbfe]" />
            <h3 className="text-3xl font-black uppercase tracking-widest text-center mb-6">AI Analysis In Progress...</h3>
            <div className="flex flex-col items-center gap-3">
              {[
                { key: "parsing", label: "1. Reading Document (In-Memory)" },
                { key: "masking", label: "2. PII Auto-Masking (PDP Law)" },
                { key: "spatial", label: "3. Spatial Data Verification" },
                { key: "law", label: "4. RAG Verification SOP (Chandra Asri Knowledge Base)" },
              ].map((step) => {
                const order = ["parsing", "masking", "spatial", "law"];
                const curIdx = order.indexOf(status);
                const sIdx = order.indexOf(step.key);
                const isActive = sIdx <= curIdx;
                const isCurrent = sIdx === curIdx;
                return (
                  <Badge key={step.key} variant={isActive ? "default" : "outline"} className={`border-2 border-white rounded-none font-black text-xs uppercase px-4 py-2 w-72 justify-center transition-all ${isCurrent ? "bg-[#bfdbfe] text-[#1e3a8a] border-[#bfdbfe] scale-105" : ""}`}>
                    {isActive && sIdx < curIdx && <CheckCircle2 className="h-3 w-3 mr-1" />}{step.label}
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── RESULT ───
  return (
    <div ref={reportRef} className="w-full border-4 border-[#1e3a8a] bg-white shadow-[12px_12px_0_rgba(30,58,138,1)] flex flex-col font-sans relative" style={{ minHeight: "600px" }}>
      
      {/* ══ TOP BAR ══ */}
      <div className="border-b-4 border-[#1e3a8a] bg-[#1e3a8a] px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button onClick={() => setView("cover")} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${view === "cover" ? "bg-[#bfdbfe] text-[#1e3a8a]" : "text-white/60 hover:text-white"}`}>
            📋 Cover Report
          </button>
          <button onClick={() => setView("workspace")} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${view === "workspace" ? "bg-[#bfdbfe] text-[#1e3a8a]" : "text-white/60 hover:text-white"}`}>
            🔍 DrillBit Workspace
          </button>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button size="sm" onClick={handleDownloadPDF} className="flex-1 sm:flex-none rounded-none bg-[#bfdbfe] hover:bg-yellow-500 text-[#1e3a8a] font-black text-[10px] uppercase h-9 px-3 sm:px-4 border-2 border-[#1e3a8a] flex items-center justify-center gap-2 shadow-[2px_2px_0_rgba(30,58,138,1)] hover:translate-y-0.5 hover:shadow-none transition-all whitespace-nowrap">
            <Download className="h-4 w-4" /> <span className="hidden sm:inline">Download</span> PDF
          </Button>
        </div>
      </div>

      {/* ═══════════════════ COVER REPORT PAGE ═══════════════════ */}
      {view === "cover" && (
        <div className="flex-1 overflow-y-auto">
          {/* Header Banner */}
          <div className="bg-[#1e3a8a] text-white px-8 py-6 border-b-4 border-[#bfdbfe]">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-[#bfdbfe] p-2"><ShieldCheck className="h-6 w-6 text-[#1e3a8a]" /></div>
                  <div>
                    <h1 className="text-xl font-black uppercase tracking-wider">OzikOps Verification Report</h1>
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mt-0.5">SHA-256 Verification ID: {result?.auditId?.substring(0, 16) || result?.sha256Hash?.substring(0, 16) || "N/A"}...</p>
                  </div>
                </div>
              </div>
              {result?.reviewStatus === "APPROVED" && result?.sha256Hash && (
                <div className="flex items-center gap-4">
                  <Badge className="bg-blue-600 text-white border-2 border-sky-400 rounded-none font-black text-[9px] uppercase px-3 py-1">
                    <Fingerprint className="h-3 w-3 mr-1" /> SHA-256 Verified
                  </Badge>
                  <div className="bg-white p-1 rounded-sm">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(`${window.location.origin}/verify/${result.sha256Hash || result.auditId}`)}`} 
                      alt="Verification QR" 
                      className="w-12 h-12"
                    />
                  </div>
                </div>
              )}
            </div>
            <p className="text-white/50 text-[9px] font-bold mt-3 italic">
              The Report is Generated by OzikOps AI Compliance & Safety Verification Engine (Chandra Asri Knowledge Base Integrated)
            </p>
          </div>

          {result?.reviewStatus && (
            <div className={`px-8 py-4 border-b-4 flex items-start gap-3 ${
              result.reviewStatus === 'APPROVED' ? 'bg-blue-50 border-sky-400 text-slate-800' :
              result.reviewStatus === 'REJECTED' ? 'bg-red-50 border-red-400 text-red-950' :
              result.reviewStatus === 'NEEDS_REVISION' ? 'bg-yellow-50 border-yellow-400 text-yellow-950' :
              'bg-blue-50 border-blue-400 text-blue-950'
            }`}>
              <div className="mt-0.5">
                {result.reviewStatus === 'APPROVED' && <CheckCircle2 className="h-5 w-5 text-blue-600" />}
                {result.reviewStatus === 'REJECTED' && <AlertTriangle className="h-5 w-5 text-red-600" />}
                {result.reviewStatus === 'NEEDS_REVISION' && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
                {result.reviewStatus === 'PENDING_REVIEW' && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
              </div>
              <div className="flex-1 flex justify-between items-center">
                <div>
                  <h4 className="font-black uppercase text-sm">
                    {result.reviewStatus === 'APPROVED' ? 'Approved by Senior Engineer' :
                     result.reviewStatus === 'REJECTED' ? 'Rejected by Senior Engineer' :
                     result.reviewStatus === 'NEEDS_REVISION' ? 'Needs Revision (Human-in-the-Loop)' :
                     'Pending Approval (Human-in-the-Loop)'}
                  </h4>
                  {result.reviewFeedback && (
                    <p className="text-sm mt-1 font-bold opacity-80 whitespace-pre-wrap">{result.reviewFeedback}</p>
                  )}
                  {result.reviewStatus === 'PENDING_REVIEW' && (
                    <p className="text-xs mt-1 font-bold opacity-70">Awaiting cryptographic signature from Senior Operations Manager.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Two Columns: Metadata + Pie Chart */}
          <div className="flex flex-col md:flex-row gap-0 border-b-2 border-[#1e3a8a]/10">
            {/* Left: Submission Information */}
            <div className="p-6 md:border-r-2 border-[#1e3a8a]/10 border-b-2 md:border-b-0 w-full md:w-1/2">
              <h3 className="font-black text-[11px] uppercase tracking-widest text-[#1e3a8a] mb-4 flex items-center gap-2">
                <FileStack className="h-4 w-4" /> Submission Information
              </h3>
              <table className="w-full text-sm">
                <tbody>
                  {[
                    { icon: <Building2 className="h-3 w-3" />, label: "Author / Company", value: userName || userCompany || "User" },
                    { icon: <FileText className="h-3 w-3" />, label: "Project Title", value: fileName || result?.projectName || "Work Order Plan" },
                    { icon: <Hash className="h-3 w-3" />, label: "Submission ID", value: result?.auditId?.substring(0, 12) || "—" },
                    { icon: <Calendar className="h-3 w-3" />, label: "Verification Date", value: new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) },
                    { icon: <FileStack className="h-3 w-3" />, label: "Metadata", value: `${totalPages} Halaman, ${totalSentences} Kalimat, ${totalWords} Kata` },
                    { icon: <Scale className="h-3 w-3" />, label: "Safety Standard", value: "Equipment Specifications & Plant Safety Manuals (Chandra Asri Knowledge Base)" },
                    { icon: <Globe className="h-3 w-3" />, label: "Feasibility Score", value: `${result?.feasibilityScore ?? 0}/100` },
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-[#1e3a8a]/10">
                      <td className="py-2.5 pr-3 text-[#1e3a8a]/50 font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                        <span className="flex items-center gap-1.5">{row.icon} {row.label}</span>
                      </td>
                      <td className="py-2.5 font-bold text-[#1e3a8a] text-xs">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Right: Radar Chart */}
            <div className="p-6 flex flex-col items-center justify-center relative w-full md:w-1/2">
              {isFreemium && (
                <div className="absolute inset-0 z-10 backdrop-blur-sm bg-white/50 flex flex-col items-center justify-center p-4">
                  <Lock className="h-8 w-8 mb-2 text-[#bfdbfe]" />
                  <p className="text-[10px] font-black uppercase text-center text-[#1e3a8a]">Skor Disembunyikan</p>
                  <Button onClick={handleRegister} size="sm" className="mt-2 bg-[#bfdbfe] hover:bg-yellow-500 text-[#1e3a8a] text-[9px] font-black h-6 uppercase border-2 border-[#1e3a8a]">
                    Upgrade (3 Kredit)
                  </Button>
                </div>
              )}
              <h3 className="font-black text-[11px] uppercase tracking-widest text-[#1e3a8a] mb-4 text-center">4-Pillar Scoring</h3>
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#1e3a8a" opacity={0.2} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "#1e3a8a", fontSize: 10, fontWeight: "bold" }} />
                    <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={false} axisLine={false} />
                    <Radar name="Score" dataKey="A" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.6} />
                    <Tooltip contentStyle={{ backgroundColor: "#1e3a8a", color: "white", borderRadius: "0px", border: "2px solid #3b82f6" }} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-sm">No data</p>
              )}
              {/* Score Summary Badges */}
              <div className="flex gap-3 mt-4 flex-wrap justify-center">
                <div className="bg-[#D1FAE5] border-2 border-[#3b82f6] px-3 py-1.5 text-center">
                  <div className="text-lg font-black text-[#1e3a8a]">{isFreemium ? "**" : compliantCount}</div>
                  <div className="text-[8px] font-black uppercase text-[#1e3a8a]/60">Compliant</div>
                </div>
                <div className="bg-[#FEF3C7] border-2 border-[#F59E0B] px-3 py-1.5 text-center">
                  <div className="text-lg font-black text-[#1e3a8a]">{isFreemium ? "**" : mediumCount}</div>
                  <div className="text-[8px] font-black uppercase text-[#1e3a8a]/60">Medium</div>
                </div>
                <div className="bg-[#FEE2E2] border-2 border-[#EF4444] px-3 py-1.5 text-center">
                  <div className="text-lg font-black text-[#1e3a8a]">{isFreemium ? "**" : highCount}</div>
                  <div className="text-[8px] font-black uppercase text-[#1e3a8a]/60">High Risk</div>
                </div>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="px-8 py-4 bg-[#FFFBEB] border-t-2 border-[#F59E0B]/30">
            <p className="text-[10px] text-[#1e3a8a]/70 leading-relaxed font-bold">
              📌 <strong>Disclaimer:</strong> This compliance report is generated using OzikOps AI in integration with live Chandra Asri Knowledge Base legal databases and spatial environmental APIs.
              It serves as an official proof of compliance for PLN SustainAction 2026. The SHA-256 hash ensures tamper-proof verification of audit integrity.
            </p>
          </div>

          {/* CTA to workspace */}
          <div className="px-8 py-6 flex items-center justify-center border-t-2 border-[#1e3a8a]/10">
            <Button onClick={() => setView("workspace")} className="rounded-none bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white font-black text-xs uppercase tracking-wider px-8 h-11 border-2 border-[#1e3a8a] flex items-center gap-2">
              🔍 Buka DrillBit Workspace (Inspeksi Detail)
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════════ DRILLBIT WORKSPACE ═══════════════════ */}
      {view === "workspace" && (
        <div className="flex-1 flex flex-col md:flex-row h-auto md:h-[calc(100vh-240px)] min-h-[500px]">

          {/* ─── LEFT PANEL ─── */}
          <div className="w-full md:w-1/2 flex flex-col bg-[#F8F9FA] md:border-r-4 border-b-4 md:border-b-0 border-[#1e3a8a] h-[600px] md:h-auto overflow-hidden">
            {/* Toolbar */}
            <div className="px-3 py-2 border-b-2 border-[#1e3a8a]/20 bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-[#1e3a8a] shrink-0" />
                <span className="text-[9px] font-black text-[#1e3a8a] uppercase tracking-wider truncate max-w-[140px]">{fileName || "Dokumen"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="h-6 w-6 rounded-none text-[#1e3a8a]"><ChevronLeft className="h-3 w-3" /></Button>
                <span className="text-[9px] font-black text-[#1e3a8a] whitespace-nowrap">Hal {currentPage}/{totalPages}</span>
                <Button size="icon" variant="ghost" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="h-6 w-6 rounded-none text-[#1e3a8a]"><ChevronRight className="h-3 w-3" /></Button>
                <div className="w-px h-4 bg-[#1e3a8a]/20 mx-1" />
                <Button size="icon" variant="ghost" onClick={() => setZoom(z => Math.max(80, z - 10))} className="h-6 w-6 rounded-none"><ZoomOut className="h-3 w-3" /></Button>
                <span className="text-[8px] font-bold text-[#1e3a8a]/50 w-7 text-center">{zoom}%</span>
                <Button size="icon" variant="ghost" onClick={() => setZoom(z => Math.min(150, z + 10))} className="h-6 w-6 rounded-none"><ZoomIn className="h-3 w-3" /></Button>
              </div>
            </div>

            {/* Document Content */}
            <div className="flex-1 overflow-y-auto p-5 relative bg-white" style={{ fontSize: `${zoom}%` }}>
              <div className="max-w-none space-y-6 font-serif text-[14px] leading-[1.85] text-gray-800 selection:bg-yellow-200">
                {visibleClauses.map((p: any) => {
                  const isActive = activeClauseId === p.id;
                  const isLocked = isFreemium && currentPage > 1;
                  const isHeading = p.text.match(/^(\d+\.\d+|\b[IVX]+\b|\bBab\b)\s/i) || p.text.length < 50;

                  return (
                    <div
                      key={p.id}
                      onClick={() => !isLocked && setActiveClauseId(p.id)}
                      className={`relative px-4 py-3 rounded-sm transition-all cursor-pointer ${isLocked ? "opacity-25 blur-[3px] pointer-events-none select-none" : ""}`}
                      style={{ 
                        backgroundColor: isHeading ? "#FFFFFF" : getBg(p.status), 
                        borderLeft: isHeading ? "none" : `4px solid ${getBorder(p.status)}`, 
                        boxShadow: isActive ? `0 0 0 2px ${getBorder(p.status)}, 0 4px 16px rgba(0,0,0,0.12)` : "none", 
                        transform: isActive ? "scale(1.01)" : "none",
                        zIndex: isActive ? 10 : 1
                      }}
                    >
                      {!isHeading && (
                        <div className="absolute -top-3 right-2 z-10 opacity-90 hover:opacity-100">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-sm shadow-sm cursor-pointer" style={{ backgroundColor: isHigh(p.status) ? "#EF4444" : isMedium(p.status) ? "#F59E0B" : "#3b82f6", color: isMedium(p.status) ? "#78350F" : "#FFF" }}>
                            {isHigh(p.status) ? "🔴 HIGH RISK - KLIK UTK SOLUSI" : isMedium(p.status) ? "🟡 MEDIUM RISK - KLIK UTK SOLUSI" : "🟢 COMPLIANT"}
                          </span>
                        </div>
                      )}
                      
                      {isHeading ? (
                        <h4 className="font-black text-lg text-[#1e3a8a] mt-4 mb-2">{p.text || p.Text}</h4>
                      ) : (
                        <p className="leading-[1.9] text-gray-900">{p.text || p.Text}</p>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Saran Halaman Ini */}
              {visibleClauses.some((p: any) => p.issue && !isCompliant(p.status) && p.issue.suggestedRevision) && (
                <div className="mt-8 border-4 border-slate-800 bg-blue-50 p-6 shadow-[6px_6px_0_rgba(6,78,59,1)]">
                  <h4 className="font-black text-slate-800 uppercase tracking-widest text-sm mb-4 border-b-2 border-slate-800/20 pb-2 flex items-center gap-2">
                    <Wand2 className="h-5 w-5" /> Rekomendasi & Saran Halaman Ini
                  </h4>
                  <ul className="space-y-4">
                    {visibleClauses
                      .filter((p: any) => p.issue && !isCompliant(p.status) && p.issue.suggestedRevision)
                      .map((p: any, idx: number) => (
                        <li key={idx} className="text-sm font-bold text-slate-800/80 leading-relaxed flex items-start gap-3">
                           <div className="w-1.5 h-1.5 rounded-none bg-slate-800 mt-1.5 shrink-0" />
                           <div>
                             <span className="bg-slate-800 text-white px-1.5 py-0.5 text-[10px] uppercase font-black mr-2">
                               {isHigh(p.status) ? "High Risk" : "Medium Risk"}
                             </span>
                             {p.issue.suggestedRevision}
                           </div>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {isFreemium && currentPage > 1 && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-md flex flex-col items-center justify-center z-20">
                  <div className="bg-[#1e3a8a] text-white p-6 border-4 border-[#1e3a8a] shadow-[8px_8px_0_rgba(30,58,138,0.3)] text-center max-w-xs">
                    <Lock className="h-8 w-8 mx-auto mb-3 text-[#bfdbfe]" />
                    <h4 className="font-black uppercase text-sm mb-2">🔒 Terkunci</h4>
                    <p className="text-white/70 text-xs font-bold mb-4">Daftar Akun Gratis (3 Kredit) untuk Buka Seluruh Draf Needs Revision AI & SHA-256 QR Badge</p>
                    <Button onClick={handleRegister} className="bg-[#bfdbfe] hover:bg-yellow-500 text-[#1e3a8a] rounded-none border-2 border-[#1e3a8a] font-black text-xs uppercase w-full">Daftar Gratis</Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─── RIGHT PANEL ─── */}
          <div className="w-full md:w-1/2 flex flex-col bg-white">
            <div className="px-3 py-2 border-b-2 border-[#1e3a8a]/20 bg-[#1e3a8a] flex items-center justify-between shrink-0">
              <span className="font-black text-[9px] uppercase tracking-widest text-white flex items-center gap-2"><Zap className="h-3 w-3 text-[#bfdbfe] fill-[#bfdbfe]" /> Detail Analisis & Resolusi</span>
              <span className="text-[8px] font-black uppercase text-[#bfdbfe]">{isFreemium ? "Preview" : "Full Access"}</span>
            </div>

            {/* Score Widgets */}
            <div className="grid grid-cols-3 gap-0 border-b border-[#1e3a8a]/10 shrink-0">
              <div className="p-2.5 border-r border-[#1e3a8a]/10 text-center">
                <div className="text-[7px] font-black uppercase text-gray-400 tracking-wider">Feasibility</div>
                <div className="text-xl font-black text-[#1e3a8a]">{result?.feasibilityScore ?? 0}<span className="text-[10px] text-gray-400">/100</span></div>
              </div>
              <div className="p-2.5 border-r border-[#1e3a8a]/10 text-center">
                <div className="text-[7px] font-black uppercase text-gray-400 tracking-wider">Technical</div>
                <div className="text-xl font-black text-[#1e3a8a] flex items-center justify-center gap-1"><Globe className="h-3 w-3 text-blue-500" />{result?.scoreTechnical ?? 0}</div>
              </div>
              <div className="p-2.5 text-center">
                <div className="text-[7px] font-black uppercase text-gray-400 tracking-wider">SHA-256</div>
                <div className="text-xl font-black text-[#1e3a8a] flex items-center justify-center gap-1"><ShieldCheck className="h-3 w-3 text-blue-500" />{result?.sha256Hash ? "✓" : "—"}</div>
              </div>
            </div>

            {/* Dynamic Inspector Right Panel */}
            <div ref={rightPanelRef} className="flex-1 overflow-y-auto p-4">
              {(!activeClauseId || !flatClauses.find((c: any) => c.id === activeClauseId)) ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-50 border-2 border-dashed border-gray-200">
                  <BookOpen className="h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-sm font-bold text-gray-500 max-w-xs leading-relaxed">
                    🔍 Klik salah satu paragraf berwarna di dokumen sebelah kiri untuk melihat detail analisis, pasal rujukan, dan rekomendasi perbaikan.
                  </p>
                </div>
              ) : (
                (() => {
                  const clause = flatClauses.find((c: any) => c.id === activeClauseId);
                  const isLockedCard = isFreemium && flatClauses.findIndex((c: any) => c.id === activeClauseId) > 0;
                  return (
                    <div key={clause.id} data-clause-id={clause.id} className="border-2 border-blue-500 shadow-[0_4px_12px_rgba(0,0,0,0.08)] bg-white">
                      <div className="px-3 py-1.5 flex items-center justify-between" style={{ backgroundColor: isHigh(clause.status) ? "#EF4444" : isMedium(clause.status) ? "#F59E0B" : "#3b82f6" }}>
                        <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: isMedium(clause.status) ? "#78350F" : "#FFF" }}>
                          {isHigh(clause.status) ? "🔴 HIGH RISK" : isMedium(clause.status) ? "🟡 MEDIUM RISK" : "🟢 COMPLIANT"}
                        </span>
                        <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: isMedium(clause.status) ? "#78350F" : "rgba(255,255,255,0.8)" }}>{clause.clause}</span>
                      </div>
                      
                      {isLockedCard ? (
                        <div className="p-5 text-center bg-gray-50">
                          <Lock className="h-5 w-5 mx-auto mb-2 text-gray-400" />
                          <p className="text-[9px] font-bold uppercase text-gray-400 mb-2">🔒 Upgrade untuk Buka</p>
                          <Button onClick={handleRegister} size="sm" className="bg-[#bfdbfe] hover:bg-yellow-500 text-[#1e3a8a] rounded-none border-2 border-[#1e3a8a] font-black text-[8px] uppercase h-6">Upgrade (3 Kredit)</Button>
                        </div>
                      ) : isCompliant(clause.status) ? (
                        <div className="p-4 bg-blue-50/50">
                          <div className="flex items-center gap-1.5 mb-2"><CheckCircle2 className="h-4 w-4 text-blue-600" /><span className="text-xs font-black text-blue-800 uppercase">Klausul Aman</span></div>
                          <p className="text-xs text-gray-600 leading-relaxed font-serif italic border-l-2 border-sky-300 pl-3">"{clause.text}"</p>
                          <p className="text-xs text-gray-600 leading-relaxed mt-4 bg-white p-3 border border-blue-100 rounded-sm">Tidak ada pelanggaran terdeteksi pada klausul ini. Kalimat telah mematuhi standar hukum yang berlaku.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          <div className="p-4 bg-gray-50/50">
                            <p className="text-xs text-gray-600 leading-relaxed font-serif italic border-l-2 border-gray-300 pl-3">"{clause.text}"</p>
                          </div>
                          <div className="p-4">
                            <div className="flex items-center gap-2 mb-2"><AlertTriangle className={`h-4 w-4 ${isHigh(clause.status) ? "text-red-600" : "text-yellow-600"}`} /><span className="text-[10px] font-black uppercase tracking-wider text-[#1e3a8a]">Problem Analysis</span></div>
                            <p className="text-sm text-gray-800 leading-relaxed font-medium bg-red-50/50 p-3 rounded-sm border border-red-100">{clause.issue?.clauseText || clause.issue?.explanation || "Risiko terdeteksi oleh mesin analisis."}</p>
                          </div>
                          {clause.issue?.matchedLaw && (
                            <div className="p-4 bg-[#F0FFF4]">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-[#1e3a8a] flex items-center gap-1"><BookOpen className="h-4 w-4" /> Official Plant SOP Citation (Chandra Asri Knowledge Base)</span>
                                <Badge variant="outline" className="border border-[#1e3a8a]/20 rounded-none text-[8px] uppercase font-bold px-2 py-0.5">Live FRBR URI</Badge>
                              </div>
                              <a href="#" className="bg-[#1e3a8a] text-white px-2 py-1 text-[10px] font-black uppercase tracking-wider inline-block mb-2 hover:underline">
                                {clause.issue?.matchedLaw}
                              </a>
                              {clause.issue?.originalLawText && (
                                <p className="text-xs text-[#1e3a8a]/90 leading-relaxed font-serif italic border-l-2 border-[#1e3a8a]/30 pl-3">"{clause.issue?.originalLawText}"</p>
                              )}
                            </div>
                          )}
                          {clause.issue?.suggestedRevision && (
                            <div className="p-4 relative">
                              <div className="absolute top-0 right-0 bg-[#3b82f6] text-white text-[8px] font-black uppercase px-2 py-1 border-l-2 border-b-2 border-[#3b82f6]">AI Revision</div>
                              <span className="text-[10px] font-black uppercase tracking-wider text-[#3b82f6] block mb-2">AI Suggested Solution & Draft Revision</span>
                              <div className="p-4 bg-[#eff6ff] border-2 border-[#3b82f6] font-serif text-sm text-[#1e3a8a] leading-relaxed shadow-inner">"{clause.issue?.suggestedRevision}"</div>
                              <Button onClick={() => handleCopy(clause.issue?.suggestedRevision || "")} className="mt-4 w-full rounded-none bg-[#3b82f6] hover:bg-blue-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 h-10 shadow-[4px_4px_0_rgba(30,58,138,1)] border-2 border-[#1e3a8a] transition-all active:translate-x-1 active:translate-y-1 active:shadow-none">
                                {copied ? <CheckCircle2 className="h-4 w-4 text-white" /> : <Copy className="h-4 w-4" />}
                                {copied ? "Successfully Copied!" : "Copy Revision Draft"}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
