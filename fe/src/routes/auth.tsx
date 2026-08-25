import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Leaf,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Login — OzikOps" },
      { name: "description", content: "Login to OzikOps to screen maintenance work orders for credibility, sustainability, and feasibility." },
    ],
  }),
  component: AuthPage,
});

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.44c-.28 1.48-1.12 2.73-2.39 3.58v2.98h3.86c2.26-2.09 3.58-5.17 3.58-8.8z"/>
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.93l-3.86-2.98c-1.07.72-2.44 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/>
      <path fill="#FBBC05" d="M5.27 14.29c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29A11.99 11.99 0 000 12c0 1.94.47 3.77 1.29 5.38l3.98-3.09z"/>
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"/>
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading, signInWithGoogle } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/dashboard" });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white selection:bg-slate-800 selection:text-white">
      {/* Brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-slate-800 text-white p-12 xl:p-16 border-r-4 border-slate-800">
        <div className="absolute inset-0 -z-0">
        </div>

        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <span className="grid h-20 w-20 place-items-center bg-white rounded-xl transition-transform group-hover:scale-105 overflow-hidden shadow-lg border border-slate-700/50 p-2">
              <img src="/logo.png" alt="OzikOps" className="w-full h-full object-contain" />
            </span>
            <div className="flex flex-col leading-none">
              <span className="text-xl font-black tracking-widest uppercase">OzikOps</span>
              <span className="mt-1 text-[11px] font-bold uppercase tracking-wider text-white/70">
                Manufacturing Operation Intelligence
              </span>
            </div>
          </Link>
        </div>

        <div className="relative z-10 max-w-lg mt-12 mb-auto">
          <div className="inline-flex items-center gap-2 border-4 border-white bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-white mb-8 shadow-[4px_4px_0_rgba(255,255,255,1)]">
            <Sparkles className="h-4 w-4" /> SME Accelerator 2026
          </div>
          <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-[1.1] uppercase">
            Evaluate Effective Manufacturing Operations
          </h1>
          <p className="mt-6 text-white/80 font-bold leading-relaxed text-lg">
            Login to screen maintenance work orders for credibility, sustainability, and feasibility using AI-driven insights and satellite imagery.
          </p>

          <ul className="mt-10 space-y-4">
            {[
              "AI-Powered Document Processing",
              "Satellite Imagery Validation",
              "Explainable Feasibility Scoring",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3 text-sm font-bold uppercase tracking-wide text-white/90">
                <CheckCircle2 className="h-5 w-5 text-blue-400 shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Google Auth panel */}
      <section className="flex items-center justify-center p-6 sm:p-10 relative">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden mb-10 flex justify-center">
            <Link to="/" className="inline-flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center bg-transparent overflow-hidden">
                <img src="/logo.png" alt="OzikOps" className="h-8 w-8 text-blue-600 object-contain mix-blend-multiply" />
              </span>
              <span className="text-xl font-black tracking-widest uppercase text-slate-900">OzikOps</span>
            </Link>
          </div>

          <div className="border-4 border-slate-800 bg-white shadow-[8px_8px_0_rgba(6,78,59,0.5)] sm:shadow-[12px_12px_0_rgba(6,78,59,0.5)] p-6 sm:p-10">
            <div className="mb-6 sm:mb-8 text-center">
              <div className="mx-auto mb-4 sm:mb-6 grid h-20 w-20 sm:h-24 sm:w-24 place-items-center bg-white border-4 border-slate-200 shadow-[4px_4px_0_rgba(15,23,42,0.1)] p-2 rounded-xl">
                <img src="/logo.png" alt="OzikOps" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-wide text-slate-900 uppercase">
                Welcome Back
              </h2>
              <p className="mt-2 text-xs sm:text-sm font-bold text-slate-600">
                Login or sign up with your Google account to access the OzikOps platform.
              </p>
            </div>

            {/* Google Auth Button (Single CTA) */}
            <Button
              size="lg"
              className="w-full h-14 sm:h-16 gap-3 sm:gap-4 bg-white text-slate-900 border-4 border-slate-800 hover:bg-blue-50 rounded-none shadow-[4px_4px_0_rgba(6,78,59,0.5)] sm:shadow-[6px_6px_0_rgba(6,78,59,0.5)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all font-black uppercase tracking-widest text-xs sm:text-sm whitespace-normal text-center"
              onClick={signInWithGoogle}
            >
              <GoogleIcon className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
              Continue with Google
            </Button>

            <div className="mt-6 sm:mt-8 space-y-3 sm:space-y-4">
              <div className="bg-blue-50 border-4 border-slate-800 p-3 sm:p-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-black text-slate-900 text-[10px] sm:text-xs uppercase">Free Full Access</div>
                    <div className="text-[10px] sm:text-xs font-bold text-slate-500 mt-1">All work order evaluation tools are available at no cost during the beta period.</div>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 border-4 border-slate-800 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-black text-slate-900 text-xs uppercase">Guaranteed Security</div>
                    <div className="text-xs font-bold text-slate-500 mt-1">Secure authentication via Google OAuth 2.0. No passwords are stored.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs font-bold text-slate-400">
              By logging in, you agree to the <a href="#" className="underline font-black">Terms of Service</a> and <a href="#" className="underline font-black">Privacy Policy</a> of OzikOps.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
