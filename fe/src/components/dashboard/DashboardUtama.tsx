import { Factory, ShieldCheck, Leaf, BarChart } from "lucide-react";
import { VerificationWorkspace } from "@/components/VerificationWorkspace";

interface DashboardUtamaProps {
  history: any[];
  onVerificationComplete: () => void;
  userName: string;
  userEmail: string;
}

export function DashboardUtama({ history, onVerificationComplete, userName, userEmail }: DashboardUtamaProps) {
  const total = history.length;
  const avgCompliance = total > 0 
    ? (history.reduce((acc, curr) => acc + (curr.feasibilityScore || 0), 0) / total).toFixed(1)
    : "0.0";
  const verifiedProtocols = history.filter(h => h.status === "ACTIVE" || (h.feasibilityScore || 0) >= 50).length;

  return (
    <div suppressHydrationWarning className="max-w-7xl mx-auto space-y-8">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border-4 border-slate-800 bg-white p-6 shadow-[6px_6px_0_rgba(6,78,59,0.5)]">
          <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Total Plans Evaluated</div>
          <div className="mt-2 text-4xl font-black text-slate-900">{total} <span className="text-xl">Plans</span></div>
        </div>
        <div className="border-4 border-slate-800 bg-slate-800 text-white p-6 shadow-[6px_6px_0_rgba(6,78,59,0.3)] relative overflow-hidden">
          <div className="text-xs font-black text-white/60 uppercase tracking-widest">Avg Execution Score</div>
          <div className="mt-2 text-4xl font-black">{avgCompliance}<span className="text-xl text-white/60">/100</span></div>
          <BarChart className="absolute -right-4 -bottom-4 h-24 w-24 text-white/10" />
        </div>
        <div className="border-4 border-slate-800 bg-white p-6 shadow-[6px_6px_0_rgba(6,78,59,0.5)]">
          <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Verified Plans</div>
          <div className="mt-2 text-4xl font-black text-slate-900 flex items-center gap-3">
            {verifiedProtocols} <ShieldCheck className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      <VerificationWorkspace isFreemium={false} onVerificationComplete={onVerificationComplete} userName={userName} userEmail={userEmail} />
    </div>
  );
}
