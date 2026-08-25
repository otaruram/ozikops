import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  ShieldCheck,
  ArrowRight,
  Globe,
  Leaf,
  FileText,
  Search,
  Loader2,
  Lock,
  AlertTriangle,
  BarChart,
  CheckCircle2,
  Eye,
  Settings as SettingsIcon,
  HardHat,
  Database,
  Cpu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/dashboard" });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-900" />
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="bg-white min-h-screen text-slate-900 font-sans selection:bg-blue-900 selection:text-white overflow-hidden">
      <div className="relative z-10">
        <Hero />
        <AboutPlatform />
        <Features />
        <VerificationChecker />
        <HowItWorks />
        <PlatformMetrics />
        <FinalCTA />
        <Footer />
      </div>
    </div>
  );
}

function Hero() {
  const { user } = useAuth();
  return (
    <section className="relative pt-24 pb-32 md:pt-36 md:pb-40 px-4 bg-white border-b-4 border-slate-800">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(30,58,138,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(30,58,138,0.04)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
      <div className="max-w-7xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 border-2 border-slate-800 bg-blue-50 text-slate-800 font-black uppercase tracking-widest text-xs mb-8 shadow-[4px_4px_0_rgba(30,58,138,0.6)]">
          <Cpu className="h-4 w-4 text-blue-900" /> AI-Powered Knowledge Integration
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1] mb-8 uppercase">
          Future-Ready <br className="hidden md:block" />
          <span className="text-blue-900">Operational Excellence</span>
        </h1>
        
        <p className="max-w-3xl mx-auto text-lg md:text-xl font-bold text-slate-600 leading-relaxed mb-12">
          OzikOps empowers Chandra Asri Plant Operators to reduce improper execution risks by integrating scattered SOPs, tacit knowledge, and disconnected operational data into one actionable AI Knowledge Hub.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
          <Link to={user ? "/dashboard" : "/auth"}>
            <Button size="lg" className="h-16 px-10 rounded-none bg-blue-900 hover:bg-blue-800 text-white font-black uppercase tracking-widest text-base transition-all hover:translate-y-1 hover:translate-x-1 shadow-[6px_6px_0_rgba(30,58,138,0.8)] border-4 border-slate-800 hover:shadow-none">
              {user ? "Open Dashboard" : <><Lock className="mr-2 h-5 w-5 inline" /> Login to Platform</>} <ArrowRight className="ml-2 h-5 w-5 inline" />
            </Button>
          </Link>
          <Link to="/sample-analysis">
            <Button size="lg" variant="outline" className="h-16 px-10 rounded-none border-4 border-slate-800 bg-white hover:bg-blue-50 text-slate-800 font-black uppercase tracking-widest text-base transition-all hover:translate-y-1 hover:translate-x-1 shadow-[6px_6px_0_rgba(30,58,138,0.6)] hover:shadow-none">
              <Eye className="mr-2 h-5 w-5" /> View Sample Analysis
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function AboutPlatform() {
  return (
    <section className="py-24 bg-white relative border-b-4 border-slate-800 overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-50" />
      <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          <div className="lg:w-1/2">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-slate-800 font-black uppercase tracking-widest text-xs mb-6 border-2 border-slate-800 shadow-[4px_4px_0_rgba(30,58,138,0.6)]">
              <HardHat className="h-4 w-4" /> Petrochemical Manufacturing
            </div>
            <h2 className="text-3xl md:text-5xl font-black uppercase text-slate-900 tracking-tight mb-6">
              Empowering Safer Operations at Chandra Asri
            </h2>
            <p className="text-lg font-bold text-slate-600 leading-relaxed mb-8 text-justify">
              OzikOps is a web-based AI platform designed to evaluate the safety, reliability, and efficiency of maintenance execution plans. By replacing scattered manuals with automated SOP retrieval, we ensure compliance and prevent execution failures before they happen.
            </p>
          </div>
          
          <div className="lg:w-1/2 flex flex-col gap-6 w-full">
            <div className="p-6 bg-white border-4 border-slate-800 shadow-[8px_8px_0_rgba(30,58,138,0.5)] relative transition-transform hover:-translate-y-1">
              <div className="absolute -top-5 -left-5 w-10 h-10 bg-yellow-400 text-slate-900 flex items-center justify-center font-black text-xl border-4 border-slate-800 shadow-sm">1</div>
              <h3 className="text-xl font-black uppercase text-slate-900 mb-3 flex items-center gap-3"><FileText className="h-6 w-6 text-blue-900" /> Maintenance Plan Ingestion</h3>
              <p className="text-slate-600 font-bold text-sm leading-relaxed text-justify">Advanced NLP extracts structured insights from proposed Work Orders, identifying vague procedures, weak safety protocols, or indicators of improper execution.</p>
            </div>
            
            <div className="p-6 bg-white border-4 border-slate-800 shadow-[8px_8px_0_rgba(30,58,138,0.5)] relative ml-0 md:ml-8 transition-transform hover:-translate-y-1">
              <div className="absolute -top-5 -left-5 w-10 h-10 bg-blue-400 text-slate-900 flex items-center justify-center font-black text-xl border-4 border-slate-800 shadow-sm">2</div>
              <h3 className="text-xl font-black uppercase text-slate-900 mb-3 flex items-center gap-3"><Database className="h-6 w-6 text-blue-900" /> Tacit Knowledge & SOP RAG</h3>
              <p className="text-slate-600 font-bold text-sm leading-relaxed text-justify">Using Retrieval-Augmented Generation to scan Chandra Asri's historical incident logs and official SOPs, bringing tacit knowledge directly to the operator.</p>
            </div>
            
            <div className="p-6 bg-white border-4 border-slate-800 shadow-[8px_8px_0_rgba(30,58,138,0.5)] relative ml-0 md:ml-16 transition-transform hover:-translate-y-1">
              <div className="absolute -top-5 -left-5 w-10 h-10 bg-slate-800 text-white flex items-center justify-center font-black text-xl border-4 border-slate-800 shadow-sm">3</div>
              <h3 className="text-xl font-black uppercase text-slate-900 mb-3 flex items-center gap-3"><BarChart className="h-6 w-6 text-blue-900" /> Execution Safety Scoring</h3>
              <p className="text-slate-600 font-bold text-sm leading-relaxed text-justify">Consolidates multi-source data into an explainable 4-pillar execution score, measuring Safety, Reliability, Efficiency, and Corporate Compliance.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: Database,
      title: "Knowledge Integration",
      desc: "Instantly access Chandra Asri's vast repository of SOPs and manuals securely using context-aware AI search.",
    },
    {
      icon: AlertTriangle,
      title: "Execution Risk Detection",
      desc: "Identify inconsistencies, vague instructions, and safety risks in submitted Maintenance Work Orders.",
    },
    {
      icon: SettingsIcon,
      title: "Tacit Knowledge Retention",
      desc: "Capture and digitize experienced engineers' tacit knowledge from historical logs to train the next generation.",
    },
    {
      icon: ShieldCheck,
      title: "Explainable Reliability",
      desc: "Receive clear reasoning and official SOP citations behind the AI's execution risk assessments.",
    },
  ];

  return (
    <section id="features" className="py-24 relative bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-black uppercase text-slate-900 tracking-tight mb-4">
            Why OzikOps?
          </h2>
          <p className="text-slate-600 font-bold max-w-2xl mx-auto">Unifying fragmented manufacturing performance and knowledge data to build smarter, safer petrochemical facilities.</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div key={i} className="group p-8 bg-white border-4 border-slate-800 hover:-translate-y-2 hover:-translate-x-2 transition-transform shadow-[8px_8px_0_rgba(30,58,138,0.5)] hover:shadow-[12px_12px_0_rgba(30,58,138,0.5)]">
              <div className="w-14 h-14 bg-blue-50 flex items-center justify-center mb-6 border-2 border-slate-800">
                <f.icon className="h-7 w-7 text-slate-800" />
              </div>
              <h3 className="text-xl font-black uppercase text-slate-900 mb-3">{f.title}</h3>
              <p className="text-slate-600 font-bold leading-relaxed text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function VerificationChecker() {
  const [projectId, setProjectId] = useState("");
  const navigate = useNavigate();

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId.trim()) return;
    navigate({ to: "/verify/$id", params: { id: projectId.trim() } });
  };

  return (
    <section id="verify" className="py-24 relative bg-white border-y-4 border-slate-800 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,58,138,0.05)_0,transparent_100%)]" />
      <div className="max-w-4xl mx-auto px-4 md:px-6 relative z-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 border-4 border-slate-800 shadow-[4px_4px_0_rgba(30,58,138,0.6)] mb-8">
          <Search className="w-8 h-8 text-slate-800" />
        </div>
        <h2 className="text-3xl md:text-5xl font-black uppercase text-slate-900 mb-4">View Pre-Execution Safety Briefings</h2>
        <p className="text-slate-600 font-bold mb-10 text-lg max-w-2xl mx-auto">
          Enter a OzikOps Analysis ID to view validated Execution Scores and Official SOP Citations.
        </p>
        
        <form onSubmit={handleVerify} className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input 
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="Example: OZK-9703BF35" 
              className="pl-12 h-16 border-4 border-slate-800 rounded-none font-bold text-slate-800 focus-visible:ring-0 shadow-[6px_6px_0_rgba(30,58,138,0.5)] bg-white text-lg" 
            />
          </div>
          <Button type="submit" className="h-16 px-10 rounded-none bg-slate-800 hover:bg-slate-700 text-white font-black uppercase tracking-widest text-lg border-4 border-slate-800 shadow-[6px_6px_0_rgba(30,58,138,0.6)] transition-transform hover:translate-y-1 hover:translate-x-1 hover:shadow-none">
            View Analysis
          </Button>
        </form>
      </div>
    </section>
  );
}

function HowItWorks() {
  const [clicked, setClicked] = useState<number | null>(null);

  const steps = [
    { title: "1. UPLOAD WORK ORDER & PLANS", highlightActive: false },
    { title: "2. SOP & TACIT KNOWLEDGE RAG", highlightActive: true },
    { title: "3. EXECUTION RISK EVALUATION", highlightActive: false },
    { title: "4. PRE-EXECUTION BRIEFING DELIVERED", highlightActive: false },
  ];

  return (
    <section id="how" className="py-24 relative bg-slate-800 text-white border-y-4 border-slate-800">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0,transparent_100%)]" />
      <div className="max-w-4xl mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black uppercase mb-4">The OzikOps Architecture</h2>
          <p className="text-white/70 font-bold">End-to-end processing from document ingestion to execution safety scoring.</p>
        </div>

        <div className="relative">
          <div className="absolute left-[15px] md:left-1/2 top-0 bottom-0 w-1 bg-white/10 md:-translate-x-1/2" />
          
          <div className="space-y-12">
            {steps.map((step, i) => (
              <div key={i} className={`relative flex flex-col md:flex-row gap-8 items-start md:items-center ${i % 2 === 0 ? "md:flex-row-reverse" : ""}`}>
                <div className="absolute left-[15px] md:left-1/2 w-8 h-8 rounded-full border-4 border-slate-800 bg-blue-400 md:-translate-x-1/2 -ml-[15px] md:ml-0 z-10 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-slate-800" />
                </div>
                
                <div className={`w-full md:w-1/2 pl-12 md:pl-0 ${i % 2 === 0 ? "md:text-left" : "md:text-right"}`}>
                  <div 
                    className={`inline-block p-6 bg-white/5 border-4 border-white/20 backdrop-blur-sm transition-all cursor-pointer hover:bg-white/10 ${step.highlightActive || clicked === i ? "border-blue-400 shadow-[8px_8px_0_rgba(34,211,238,0.2)] scale-105" : ""}`}
                    onClick={() => setClicked(i)}
                  >
                    <h3 className={`text-xl font-black uppercase tracking-wider ${step.highlightActive || clicked === i ? "text-blue-400" : "text-white"}`}>
                      {step.title}
                    </h3>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PlatformMetrics() {
  return (
    <section className="py-20 bg-blue-900 text-white border-b-4 border-slate-800">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl md:text-5xl font-black mb-2 text-blue-400">500+</div>
            <div className="text-sm font-bold uppercase tracking-widest text-white/70">SOPs & OPLs Indexed</div>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-black mb-2 text-blue-400">99.8%</div>
            <div className="text-sm font-bold uppercase tracking-widest text-white/70">Uptime</div>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-black mb-2 text-blue-400">~2.4s</div>
            <div className="text-sm font-bold uppercase tracking-widest text-white/70">Avg. Analysis Time</div>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-black mb-2 text-blue-400">150+</div>
            <div className="text-sm font-bold uppercase tracking-widest text-white/70">Maintenance Records</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  const { user } = useAuth();
  return (
    <section className="py-24 bg-white relative overflow-hidden text-center">
      <div className="max-w-3xl mx-auto px-4 md:px-6 relative z-10">
        <h2 className="text-4xl md:text-6xl font-black uppercase text-slate-900 mb-6 tracking-tight">Ready to Secure Operations?</h2>
        <p className="text-xl font-bold text-slate-600 mb-10">
          Join Chandra Asri Plant Operators integrating OzikOps to improve reliability and prevent execution risks.
        </p>
        <Link to={user ? "/dashboard" : "/auth"}>
          <Button size="lg" className="h-20 px-12 rounded-none bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-black uppercase tracking-widest text-xl border-4 border-slate-900 shadow-[8px_8px_0_rgba(15,23,42,1)] transition-transform hover:translate-y-1 hover:translate-x-1 hover:shadow-none">
            {user ? "Go to Dashboard" : "Start Evaluating Now"}
          </Button>
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-900 text-white py-12 border-t-8 border-blue-400">
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-400 flex items-center justify-center border-2 border-slate-900">
            <Cpu className="h-6 w-6 text-slate-900" />
          </div>
          <span className="text-2xl font-black tracking-widest uppercase">OzikOps</span>
        </div>
        
        <p className="text-slate-400 font-bold text-sm">
          © 2026 CALIBER Innovation Team. For Chandra Asri Limitless Innovation.
        </p>
      </div>
    </footer>
  );
}
