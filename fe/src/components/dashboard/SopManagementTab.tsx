import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, FileText, Search, Loader2, ExternalLink, X } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface SopItem {
  id: number;
  title: string;
  risk: string;
  date: string;
  driveLink: string;
  content: string;
}

export function SopManagementTab() {
  const [sops, setSops] = useState<SopItem[]>([]);
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedSop, setSelectedSop] = useState<any | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formRisk, setFormRisk] = useState("HIGH_RISK");
  const [formDriveLink, setFormDriveLink] = useState("");
  const [formContent, setFormContent] = useState("");

  const fetchSOPs = async () => {
    try {
      const res = await api.getSOPs();
      setSops((res.sops || []).map((s: any) => ({
        id: s.id,
        title: s.regName,
        risk: s.riskCategory,
        date: "Recently Added", // Assuming createdAt is not in the search result for now
        driveLink: s.article,
        content: s.content
      })));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load SOPs");
    }
  };

  useEffect(() => {
    fetchSOPs();
  }, []);

  const resetForm = () => {
    setFormTitle("");
    setFormRisk("HIGH_RISK");
    setFormDriveLink("");
    setFormContent("");
  };

  const handleAddSOP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.addSOP({
        title: formTitle,
        risk: formRisk,
        driveLink: formDriveLink,
        content: formContent
      });
      toast.success("SOP successfully indexed into Vector Database & Drive linked!");
      setIsAddOpen(false);
      resetForm();
      fetchSOPs();
    } catch (err) {
      toast.error("Failed to add SOP");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSOP = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.error("Editing existing SOPs requires re-vectorization, which is disabled in this demo. Please delete and recreate.");
    setIsEditOpen(false);
  };

  const handleDeleteSOP = async () => {
    if (!selectedSop) return;
    try {
      await api.deleteSOP(selectedSop.id);
      toast.success("SOP removed from database.");
      setIsDeleteOpen(false);
      fetchSOPs();
    } catch (err) {
      toast.error("Failed to delete SOP");
    }
  };

  const openEdit = (sop: SopItem) => {
    setSelectedSop(sop);
    setFormTitle(sop.title);
    setFormRisk(sop.risk);
    setFormDriveLink(sop.driveLink);
    setFormContent(sop.content);
    setIsEditOpen(true);
  };

  const openDelete = (sop: SopItem) => {
    setSelectedSop(sop);
    setIsDeleteOpen(true);
  };

  const filteredSops = sops.filter(s => s.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-widest text-slate-800 mb-1">SOP Database Management</h2>
          <p className="text-slate-600 text-sm">Upload and manage Plant SOPs and P&IDs. Documents are automatically vectorized for AI retrieval.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(o) => { setIsAddOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase rounded-none border-4 border-slate-800 shadow-[4px_4px_0_rgba(30,58,138,0.3)]">
              <Plus className="w-4 h-4 mr-2" />
              Upload SOP
            </Button>
          </DialogTrigger>
          <DialogContent className="border-4 border-slate-800 rounded-none shadow-[8px_8px_0_rgba(30,58,138,0.3)] bg-white max-w-2xl">
            <form onSubmit={handleAddSOP}>
              <DialogHeader>
                <DialogTitle className="text-xl font-black uppercase">Add New Protocol</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 my-4">
                <div>
                  <label className="text-xs font-black uppercase mb-1 block">Document Title</label>
                  <Input required placeholder="e.g. SOP-MNT-005" className="border-2 border-slate-800 rounded-none" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-black uppercase mb-1 block">Risk Category</label>
                  <select className="w-full border-2 border-slate-800 rounded-none p-2" required value={formRisk} onChange={(e) => setFormRisk(e.target.value)}>
                    <option value="HIGH_RISK">High Risk (Critical)</option>
                    <option value="MEDIUM_RISK">Medium Risk (Caution)</option>
                    <option value="LOW_RISK">Low Risk (Routine)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black uppercase mb-1 block">Google Drive Link (Required)</label>
                  <Input type="url" required placeholder="https://drive.google.com/file/d/..." className="border-2 border-slate-800 rounded-none" value={formDriveLink} onChange={(e) => setFormDriveLink(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-black uppercase mb-1 block">Protocol Text (Markdown / Plain Text)</label>
                  <Textarea required className="border-2 border-slate-800 rounded-none min-h-[150px]" placeholder="Paste the exact protocol steps here for the AI to index..." value={formContent} onChange={(e) => setFormContent(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSaving} className="bg-blue-600 text-white rounded-none border-2 border-slate-800 w-full font-black uppercase">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Vectorize & Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(o) => { setIsEditOpen(o); if (!o) { setSelectedSop(null); resetForm(); } }}>
        <DialogContent className="border-4 border-slate-800 rounded-none shadow-[8px_8px_0_rgba(30,58,138,0.3)] bg-white max-w-2xl">
          <form onSubmit={handleEditSOP}>
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase">Edit Protocol</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 my-4">
              <div>
                <label className="text-xs font-black uppercase mb-1 block">Document Title</label>
                <Input required className="border-2 border-slate-800 rounded-none" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-black uppercase mb-1 block">Risk Category</label>
                <select className="w-full border-2 border-slate-800 rounded-none p-2" required value={formRisk} onChange={(e) => setFormRisk(e.target.value)}>
                  <option value="HIGH_RISK">High Risk (Critical)</option>
                  <option value="MEDIUM_RISK">Medium Risk (Caution)</option>
                  <option value="LOW_RISK">Low Risk (Routine)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-black uppercase mb-1 block">Google Drive Link</label>
                <Input type="url" required className="border-2 border-slate-800 rounded-none" value={formDriveLink} onChange={(e) => setFormDriveLink(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-black uppercase mb-1 block">Protocol Text</label>
                <Textarea required className="border-2 border-slate-800 rounded-none min-h-[150px]" value={formContent} onChange={(e) => setFormContent(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSaving} className="bg-blue-600 text-white rounded-none border-2 border-slate-800 w-full font-black uppercase">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={(o) => { setIsDeleteOpen(o); if (!o) setSelectedSop(null); }}>
        <DialogContent className="border-4 border-slate-800 rounded-none shadow-[8px_8px_0_rgba(30,58,138,0.3)] bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase text-slate-800">Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 my-4">
            Are you sure you want to delete <strong>{selectedSop?.title}</strong>? This action cannot be undone and the document will be removed from the vector database.
          </p>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="rounded-none border-2 border-slate-800 font-bold uppercase flex-1">
              Cancel
            </Button>
            <Button onClick={handleDeleteSOP} className="rounded-none border-2 border-slate-800 bg-slate-800 text-white font-bold uppercase flex-1 hover:bg-slate-700">
              Delete SOP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="bg-white border-4 border-slate-800 shadow-[8px_8px_0_rgba(30,58,138,0.15)]">
        <div className="p-4 border-b-4 border-slate-800 bg-slate-50 flex items-center">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input 
            type="text" 
            placeholder="Search SOP by title..." 
            className="bg-transparent border-none outline-none w-full font-bold text-slate-800 placeholder:text-slate-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="divide-y-2 divide-slate-200">
          {filteredSops.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-bold">No SOPs found matching your search.</div>
          ) : filteredSops.map((sop) => (
            <div key={sop.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="bg-blue-100 p-3 rounded-none border-2 border-blue-900 shrink-0">
                  <FileText className="w-5 h-5 text-blue-900" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 truncate">{sop.title}</h4>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-slate-500 font-bold">Added {sop.date}</span>
                    <Badge variant="outline" className={`text-[10px] rounded-none border-2 px-1 ${
                      sop.risk === 'HIGH_RISK' ? 'border-blue-800 text-blue-900 bg-blue-100' :
                      sop.risk === 'MEDIUM_RISK' ? 'border-slate-600 text-slate-700 bg-slate-100' :
                      'border-blue-600 text-blue-700 bg-blue-50'
                    }`}>
                      {sop.risk.replace('_', ' ')}
                    </Badge>
                    {sop.driveLink && (
                      <a href={sop.driveLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-[10px] font-bold uppercase">
                        <ExternalLink className="w-3 h-3" /> Drive
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0 ml-4">
                <Button variant="outline" size="sm" className="rounded-none border-2 border-slate-800 hover:bg-slate-800 hover:text-white" onClick={() => openEdit(sop)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" className="rounded-none border-2 border-slate-600 bg-white text-slate-600 hover:bg-slate-600 hover:text-white" onClick={() => openDelete(sop)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
