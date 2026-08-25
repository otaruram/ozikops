import { createFileRoute, Link } from "@tanstack/react-router";
import { VerificationWorkspace } from "@/components/VerificationWorkspace";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/sample-analysis")({
  component: SampleAnalysisPage,
});

const DUMMY_RESULT = {
  id: "sample-1234-abcd",
  projectName: "Work Order: Heat Exchanger Cleaning & Overhaul",
  companyName: "Chandra Asri",
  authorName: "OKI",
  authorEmail: "okitarunaramadhan@gmail.com",
  feasibilityScore: 78,
  scoreLegal: 85,
  scoreTechnical: 70,
  scoreSocial: 80,
  scoreTransparency: 77,
  reviewStatus: "APPROVED",
  reviewerName: "Senior Engineer",
  reviewerEmail: "expert@chandra-asri.com",
  reviewNotes: "Approved with a note to ensure valve isolation procedures include specific LOTO forms.",
  reviewDate: new Date().toISOString(),
  clauses: [
    {
      id: 1,
      clause: "Execution Instruction 1",
      text: "Perform isolation on inlet and outlet valves of the Heat Exchanger. Ensure all valves are tightly closed.",
      status: "high",
      issue: {
        id: "iss-1",
        severity: "HIGH_RISK",
        matchedLaw: "SOP-MNT-005: Hazardous Equipment Isolation Procedure",
        originalLawText: "Any isolation of equipment containing hazardous materials must be accompanied by the installation of Lockout/Tagout (LOTO) and recorded in the Isolation Log Book.",
        suggestedRevision: "Add explicit instruction for 'LOTO installation' after valves are closed, and validate zero-energy state before work begins."
      }
    },
    {
      id: 2,
      clause: "Execution Instruction 2",
      text: "Open the tube cover and begin water jetting at 5000 PSI to remove scale from the tubes.",
      status: "medium",
      issue: {
        id: "iss-2",
        severity: "MEDIUM_RISK",
        matchedLaw: "SOP-SAF-021: High Pressure Equipment Usage",
        originalLawText: "Operators of high-pressure water jetting (>3000 PSI) must wear special PPE including Kevlar/metal mesh protective suits, and the area must be barricaded within a 5-meter radius.",
        suggestedRevision: "State the mandatory requirements for Kevlar/metal mesh PPE and barricade installation before water jetting starts."
      }
    },
    {
      id: 3,
      clause: "Execution Instruction 3",
      text: "Once clean, close the cover and perform tightening on the bolts using a torque wrench. Ensure no leaks during the initial hydrotest.",
      status: "compliant",
      issue: null
    }
  ],
  auditId: "sample-1234-abcd"
};

function SampleAnalysisPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <header className="border-b-4 border-blue-900 bg-white px-6 py-4 flex justify-between items-center z-50">
        <Link to="/" className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="hover:bg-blue-50 rounded-none h-10 w-10 border-2 border-transparent hover:border-blue-900 text-blue-900">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="bg-white p-1.5 rounded-none border-2 border-blue-900 hidden sm:block shadow-[2px_2px_0_rgba(30,58,138,1)]">
            <img src="/logo.png" alt="OzikOps" className="h-5 w-5 object-contain" />
          </div>
          <span className="text-sm font-black tracking-widest uppercase text-blue-900 hidden sm:block">Back to Home</span>
        </Link>
        <div className="font-black uppercase tracking-widest text-blue-900 text-sm">
          Sample Analysis Report
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Note Banner */}
          <div className="bg-blue-50 border-4 border-blue-900 p-4 mb-8 shadow-[8px_8px_0_rgba(30,58,138,1)] flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black uppercase text-blue-900 tracking-widest">Interactive Demo</h2>
              <p className="text-blue-900/70 font-bold text-sm mt-1">This is a sample view of AI analysis results on a Work Execution Plan (Work Order).</p>
            </div>
            <Link to="/auth">
              <Button className="bg-blue-900 hover:bg-blue-800 text-white rounded-none border-2 border-blue-900 font-black tracking-widest uppercase shadow-[4px_4px_0_rgba(147,197,253,1)] hover:shadow-none transition-all">
                Try Now
              </Button>
            </Link>
          </div>

          <VerificationWorkspace 
            isFreemium={false} 
            initialResult={DUMMY_RESULT} 
            initialStatus="result" 
            userName="Visitor"
            userEmail="visitor@chandra-asri.com"
          />
        </div>
      </main>
    </div>
  );
}
