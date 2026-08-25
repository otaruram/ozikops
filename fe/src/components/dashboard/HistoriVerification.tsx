import { useState, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { Search, ChevronLeft, ChevronRight, Trash2, ShieldCheck, Copy, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface HistoriVerificationProps {
  history: any[];
  loading: boolean;
  refreshHistory: () => void;
}

export function HistoriVerification({ history, loading, refreshHistory }: HistoriVerificationProps) {
  const [badgeOpen, setBadgeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const qrRef = useRef<SVGSVGElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleDelete = async () => {
    if (!selectedProject) return;
    try {
      await api.deleteVerification(selectedProject.id);
      setDeleteOpen(false);
      refreshHistory();
    } catch (err) {
      console.error(err);
      alert("Failed to delete assessment");
    }
  };

  const downloadSVG = () => {
    if (!qrRef.current) return;
    const svgData = new XMLSerializer().serializeToString(qrRef.current);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `QR-${selectedProject?.code}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPNG = () => {
    if (!qrRef.current) return;
    const svgData = new XMLSerializer().serializeToString(qrRef.current);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      }
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR-${selectedProject?.code}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const mappedHistory = history.map((item) => ({
    id: item.id,
    name: item.projectName,
    date: new Date(item.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
    score: item.feasibilityScore,
    status: item.reviewStatus === 'APPROVED' ? 'Verified Compliant' : (item.reviewStatus === 'REJECTED' ? 'Rejected (Integrity Violation)' : (item.reviewStatus === 'NEEDS_REVISION' ? 'Needs Revision (Reviewer)' : (item.feasibilityScore >= 80 ? 'Pending Review' : (item.feasibilityScore >= 60 ? 'Pending Review (Medium Risk)' : 'Pending Review (High Risk)')))),
    color: item.reviewStatus === 'APPROVED' ? 'blue' : 'slate',
    reviewStatus: item.reviewStatus,
    code: `OZK-${item.id.substring(0, 8).toUpperCase()}`,
  }));

  const totalPages = Math.ceil(mappedHistory.length / itemsPerPage);
  const paginatedHistory = mappedHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const embedCode = `<script src="https://ozikops.vercel.app/badge.js" data-id="${selectedProject?.code}"></script>`;

  return (
    <>
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-800/50" />
          <Input 
            placeholder="Search assessment history..." 
            className="pl-12 h-14 border-4 border-slate-800 rounded-none font-bold text-slate-800 focus-visible:ring-0 shadow-[4px_4px_0_rgba(6,78,59,0.5)]" 
          />
        </div>
        <div className="flex gap-2">
          {["All", "High Feasibility", "Needs Review"].map(f => (
            <Button key={f} variant="outline" className="h-14 border-4 border-slate-800 rounded-none font-black uppercase tracking-widest text-xs hover:bg-slate-800 hover:text-white shadow-[4px_4px_0_rgba(6,78,59,0.5)]">
              {f}
            </Button>
          ))}
        </div>
      </div>

      <div className="border-4 border-slate-800 bg-white shadow-[8px_8px_0_rgba(6,78,59,0.5)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white border-b-4 border-slate-800">
                <th className="p-4 font-black text-xs uppercase tracking-widest">Project Name / Work Order</th>
                <th className="p-4 font-black text-xs uppercase tracking-widest">Date</th>
                <th className="p-4 font-black text-xs uppercase tracking-widest">Feasibility Score</th>
                <th className="p-4 font-black text-xs uppercase tracking-widest">Status</th>
                <th className="p-4 font-black text-xs uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-800/60 font-bold">Loading history data...</td>
                </tr>
              ) : mappedHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-800/60 font-bold">No project assessment history available.</td>
                </tr>
              ) : paginatedHistory.map((row) => (
                <tr key={row.id} className="border-b-2 border-slate-800/20 hover:bg-blue-50">
                  <td className="p-4 font-bold text-slate-800 text-sm">{row.name}</td>
                  <td className="p-4 font-bold text-slate-800/70 text-sm">{row.date}</td>
                  <td className="p-4 font-black text-slate-800 text-sm">{row.score}/100</td>
                  <td className="p-4">
                    <Badge variant="outline" className={cn(
                      "rounded-none border-2 font-black uppercase text-[10px]",
                      row.color === 'blue' ? "border-blue-600 bg-blue-50 text-blue-700" :
                      "border-slate-600 bg-slate-50 text-slate-700"
                    )}>
                      {row.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    <Link to="/workspace/$id" params={{ id: row.id }}>
                      <Button size="sm" className="rounded-none bg-slate-800 hover:bg-blue-900 text-white font-black text-[10px] uppercase border-2 border-slate-800">Report</Button>
                    </Link>
                    {row.reviewStatus === 'APPROVED' && (
                      <Button size="sm" variant="outline" onClick={() => { setSelectedProject(row); setBadgeOpen(true); }} className="rounded-none font-black text-[10px] uppercase border-2 border-slate-800 hover:bg-blue-50">Badge</Button>
                    )}
                    {row.reviewStatus !== 'APPROVED' && (
                      <Button size="sm" variant="outline" className="rounded-none font-black text-[10px] uppercase border-2 border-slate-800 hover:bg-blue-50 text-slate-800/50 cursor-not-allowed">Pending Badge</Button>
                    )}
                    <Button size="icon" variant="outline" onClick={() => { setSelectedProject(row); setDeleteOpen(true); }} className="h-8 w-8 rounded-none bg-white text-slate-600 border-2 border-slate-600 hover:bg-slate-600 hover:text-white transition-all shadow-[2px_2px_0_rgba(71,85,105,0.2)] hover:shadow-none">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="p-4 border-t-4 border-slate-800 flex items-center justify-between bg-blue-50">
            <span className="text-sm font-bold text-slate-800/70">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="rounded-none border-2 border-slate-800 font-black uppercase text-xs"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <Button 
                variant="outline" 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="rounded-none border-2 border-slate-800 font-black uppercase text-xs"
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
        </div>
      </div>

      <Dialog open={badgeOpen} onOpenChange={setBadgeOpen}>
        <DialogContent className="border-4 border-slate-800 rounded-none shadow-[8px_8px_0_rgba(6,78,59,0.5)] md:shadow-[12px_12px_0_rgba(6,78,59,0.5)] p-0 max-w-[95vw] md:max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
          <div className="bg-slate-800 p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-4 border-slate-800 gap-3">
            <div>
              <DialogTitle className="text-lg md:text-xl font-black uppercase tracking-widest text-white mb-1">
                Verified Safe Work Protocol Badge
              </DialogTitle>
              <DialogDescription className="text-white/70 font-bold text-xs">
                Verified Safe Work Protocol Badge for {selectedProject?.name}
              </DialogDescription>
            </div>
            <Badge className="bg-white text-slate-800 border-2 border-transparent font-black uppercase text-[10px] md:text-xs rounded-none px-2 md:px-3 py-1">
              Status: Active & Verified
            </Badge>
          </div>

          <div className="flex flex-col md:flex-row">
            <div className="w-full md:w-1/2 p-6 border-b-4 md:border-b-0 md:border-r-4 border-slate-800 bg-blue-50 flex flex-col items-center justify-center">
              <div className="border-4 border-slate-800 bg-white shadow-[6px_6px_0_rgba(6,78,59,0.5)] p-4 max-w-[240px] w-full flex flex-col items-center">
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-slate-800 text-white p-1.5 shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <span className="font-black text-slate-800 uppercase text-sm tracking-widest">OzikOps</span>
                </div>
                
                <div className="border-4 border-slate-800 p-2 mb-4 w-32 h-32 flex items-center justify-center relative bg-white">
                   <QRCodeSVG 
                     value={`https://ozikops.vercel.app/verify/${selectedProject?.code}`} 
                     size={110} 
                     bgColor={"#ffffff"} 
                     fgColor={"#022c22"} 
                     level={"Q"} 
                     ref={qrRef}
                   />
                </div>

                <div className="w-full text-center border-t-4 border-slate-800 pt-3 mt-1">
                  <div className="font-black uppercase text-slate-800 text-[10px] mb-1">ID: {selectedProject?.code}</div>
                  <div className="font-bold text-slate-800/70 text-[9px] uppercase">Score: {selectedProject?.score}/100</div>
                  <div className="font-bold text-slate-800/70 text-[9px] uppercase mt-0.5">Valid thru: Aug 2027</div>
                </div>
              </div>
            </div>

            <div className="w-full md:w-1/2 p-6 bg-white flex flex-col justify-center">
              <div className="mb-6">
                <h3 className="font-black uppercase tracking-widest text-slate-800 border-b-4 border-slate-800 pb-2 mb-3 text-sm">A. Download QR Image</h3>
                <div className="flex gap-3">
                  <Button onClick={downloadPNG} className="flex-1 rounded-none border-4 border-yellow-400 bg-yellow-400 hover:bg-yellow-500 text-slate-800 font-black uppercase text-xs h-12 shadow-[4px_4px_0_rgba(6,78,59,0.5)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all">
                    Download PNG
                  </Button>
                  <Button onClick={downloadSVG} variant="outline" className="flex-1 rounded-none border-4 border-slate-800 font-black text-slate-800 uppercase text-[10px] h-10 hover:bg-blue-50">
                    Download SVG
                  </Button>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-black uppercase tracking-widest text-slate-800 border-b-4 border-slate-800 pb-2 mb-3 text-sm">B. Website Integration (Embed)</h3>
                <div className="bg-blue-50 border-4 border-slate-800 p-3 mb-3">
                  <code className="text-[10px] font-bold text-slate-800 break-all select-all">
                    {embedCode}
                  </code>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 rounded-none border-4 border-slate-800 font-black text-slate-800 uppercase text-[10px] h-10 hover:bg-slate-800 hover:text-white transition-all shadow-[4px_4px_0_rgba(6,78,59,0.5)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none" onClick={() => navigator.clipboard.writeText(embedCode)}>
                    <Copy className="h-3 w-3 mr-2" /> Embed Code
                  </Button>
                  <Button variant="outline" className="flex-1 rounded-none border-4 border-slate-800 font-black text-slate-800 uppercase text-[10px] h-10 hover:bg-slate-800 hover:text-white transition-all shadow-[4px_4px_0_rgba(6,78,59,0.5)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none" onClick={() => navigator.clipboard.writeText(`https://ozikops.vercel.app/verify/${selectedProject?.code}`)}>
                    <Copy className="h-3 w-3 mr-2" /> Verification URL
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 p-3 border-2 border-slate-800 border-dashed">
                <p className="text-[10px] font-bold text-slate-800 leading-relaxed">
                  📌 <span className="font-black">IMPORTANT:</span> This badge proves the project is free from greenwashing and passed the spatial/legal assessment.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-4 border-slate-800 rounded-none shadow-[16px_16px_0_rgba(6,78,59,0.5)] p-0 gap-0 sm:max-w-md bg-white">
          <div className="p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-wide text-slate-800 flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                Permanent Delete
              </DialogTitle>
              <DialogDescription className="text-slate-800/70 font-bold mt-2">
                Are you sure you want to delete the assessment report for <span className="text-slate-800 font-black">{selectedProject?.name}</span>? This action cannot be undone and all related data will be permanently deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-8 gap-3 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setDeleteOpen(false)}
                className="rounded-none border-4 border-slate-800 font-black uppercase tracking-widest text-slate-800 hover:bg-blue-50 h-12"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                className="rounded-none border-4 border-red-600 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest shadow-[4px_4px_0_rgba(220,38,38,0.3)] h-12"
              >
                Yes, Delete
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
