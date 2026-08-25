import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

interface ProfilPenggunaProps {
  dbUser: any;
  onProfileUpdate: () => void;
}

export function ProfilPengguna({ dbUser, onProfileUpdate }: ProfilPenggunaProps) {
  const [name, setName] = useState(dbUser?.name || "");
  const [company, setCompany] = useState(dbUser?.company || "");
  const [nib, setNib] = useState("");
  const [industry, setIndustry] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (dbUser) {
      setName(dbUser.name || "");
      setCompany(dbUser.company || "");
    }
  }, [dbUser]);

  const handleAutoFill = () => {
    const randomNIB = Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
    setNib(randomNIB);
    setIndustry("Petrochemical Manufacturing");
    if (!company) setCompany("Green Solutions Ltd.");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updateMe({ name, company });
      toast.success("Profile & KYC Data updated successfully!");
      onProfileUpdate();
    } catch (err) {
      toast.error("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="border-4 border-slate-800 bg-white p-8 shadow-[8px_8px_0_rgba(6,78,59,0.5)] relative">
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleAutoFill}
          className="absolute top-8 right-8 h-8 px-3 rounded-none border-2 border-slate-800 text-[10px] font-black uppercase tracking-widest bg-yellow-400 hover:bg-yellow-500 text-slate-800 shadow-[2px_2px_0_rgba(6,78,59,0.5)]"
        >
          Auto Fill Demo
        </Button>

        <h2 className="text-2xl font-black uppercase tracking-widest text-slate-800 mb-1">Profile & KYC</h2>
        <p className="text-xs font-bold text-slate-800/60 mb-6">Complete your data for Execution Badge certification.</p>
        
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label className="font-bold text-slate-800 uppercase text-xs">User Email</Label>
            <Input disabled value={dbUser?.email || ""} className="mt-1 border-4 border-slate-800/20 bg-gray-50 rounded-none font-bold" />
          </div>
          <div>
            <Label className="font-bold text-slate-800 uppercase text-xs">Person in Charge Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 border-4 border-slate-800 rounded-none font-bold text-slate-800 focus-visible:ring-0" />
          </div>
          <div className="pt-4 mt-4 border-t-2 border-dashed border-slate-800/20">
            <Label className="font-bold text-slate-800 uppercase text-xs">Company Name (Appears on Badge)</Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} required placeholder="Chandra Asri Pacific" className="mt-1 border-4 border-slate-800 rounded-none font-bold text-slate-800 focus-visible:ring-0" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-bold text-slate-800 uppercase text-xs">Business License / Registration Number</Label>
              <Input value={nib} onChange={(e) => setNib(e.target.value)} placeholder="13 Digit Registration Number" required className="mt-1 border-4 border-slate-800 rounded-none font-bold text-slate-800 focus-visible:ring-0" />
            </div>
            <div>
              <Label className="font-bold text-slate-800 uppercase text-xs">Industry Type</Label>
              <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Energy" required className="mt-1 border-4 border-slate-800 rounded-none font-bold text-slate-800 focus-visible:ring-0" />
            </div>
          </div>
          <div className="text-[10px] font-bold text-yellow-600 bg-yellow-50 p-2 border-l-4 border-yellow-400 mt-2">
            Info: Registration number is confidential and will not be displayed on the public QR Code.
          </div>
          
          <Button type="submit" disabled={loading} className="w-full h-12 mt-4 rounded-none bg-slate-800 hover:bg-blue-900 text-white font-black uppercase tracking-widest text-xs border-2 border-slate-800">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Save Profile & KYC"}
          </Button>
        </form>
      </div>
    </div>
  );
}
