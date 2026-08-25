import { useState } from "react";
import { Copy, Loader2, Zap, AlertTriangle, Terminal, Code2, BookOpen, Play, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VerificationWorkspace } from "@/components/VerificationWorkspace";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface PengaturanProps {
  dbUser: any;
  refreshUser: () => void;
}

export function Pengaturan({ dbUser, refreshUser }: PengaturanProps) {
  const { user } = useAuth();
  const [loadingKey, setLoadingKey] = useState(false);
  const [pddFile, setPddFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState('Sample Work Order Verification');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [loadingPlayground, setLoadingPlayground] = useState(false);
  const [copied, setCopied] = useState(false);
  const [apiTab, setApiTab] = useState<'playground' | 'docs'>('playground');
  const [confirmKeyOpen, setConfirmKeyOpen] = useState(false);
  const [notifyReportDone, setNotifyReportDone] = useState(dbUser?.notifyReportDone ?? true);
  const [notifyRegulation, setNotifyRegulation] = useState(dbUser?.notifyRegulation ?? true);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  const userEmail = user?.email || "";
  const userAvatar = user?.user_metadata?.avatar_url;

  const handleSavePreferences = async () => {
    setIsSavingPrefs(true);
    try {
      await api.updateNotifications({ notifyReportDone, notifyRegulation });
      toast.success("Notification preferences saved successfully!");
      refreshUser();
    } catch (err: any) {
      toast.error(err.message || "Failed to save preferences");
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleTestAPI = async () => {
    if (!dbUser?.apiKey) {
      toast.error("Please generate an API Key above first.");
      return;
    }
    if (!pddFile) {
      toast.error("Please upload a Work Order document first.");
      return;
    }
    setLoadingPlayground(true);
    setApiResponse(null);
    
    try {
      const baseUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:3000") + "/api/v1";
      const res = await fetch(`${baseUrl}/audit/full-process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${dbUser.apiKey}`,
        },
        body: (() => {
          const fd = new FormData();
          fd.append('projectName', projectName);
          fd.append('document', pddFile);
          return fd;
        })()
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = text;
      }
      setApiResponse({ status: res.status, data });
    } catch (err: any) {
      setApiResponse({ error: err.message });
    } finally {
      setLoadingPlayground(false);
      refreshUser(); // refresh credits
    }
  };

  const apiHost = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
  const curlCode = `curl -X POST ${apiHost}/api/v1/audit/full-process \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "projectName=My Manufacturing Operation" \\
  -F "document=@/path/to/pdd.pdf"`;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="bg-white border-4 border-slate-800 h-auto sm:h-16 p-1 rounded-none shadow-[6px_6px_0_rgba(6,78,59,1)] mb-8 flex flex-col sm:flex-row w-full gap-1 sm:gap-0">
          {["account", "notifications", "api"].map((val, idx) => (
            <TabsTrigger 
              key={val} 
              value={val}
              className="w-full sm:flex-1 rounded-none data-[state=active]:bg-slate-800 data-[state=active]:text-white font-black uppercase tracking-widest text-xs h-12 sm:h-full"
            >
              {idx === 0 ? "Akun Google" : idx === 1 ? "Notifikasi" : "Kunci API"}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="account" className="border-4 border-slate-800 bg-white p-6 sm:p-8 shadow-[8px_8px_0_rgba(6,78,59,1)]">
          <h3 className="text-xl font-black uppercase text-slate-800 mb-6">Akun Google Terhubung</h3>
          <div className="border-4 border-slate-800 bg-blue-50 p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            <div className="grid h-16 w-16 place-items-center bg-white border-4 border-slate-800 shrink-0">
              <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden>
                <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.44c-.28 1.48-1.12 2.73-2.39 3.58v2.98h3.86c2.26-2.09 3.58-5.17 3.58-8.8z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.93l-3.86-2.98c-1.07.72-2.44 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/>
                <path fill="#FBBC05" d="M5.27 14.29c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29A11.99 11.99 0 000 12c0 1.94.47 3.77 1.29 5.38l3.98-3.09z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"/>
              </svg>
            </div>
            <div className="flex-1 w-full truncate">
              <div className="font-black text-slate-800 text-sm uppercase truncate">{userEmail}</div>
              <div className="text-xs font-bold text-slate-800/60 mt-1 whitespace-normal">Autentikasi via Google OAuth 2.0 — Tidak ada kata sandi yang disimpan.</div>
            </div>
            <Badge className="sm:ml-auto mt-2 sm:mt-0 bg-slate-800 text-white font-black uppercase text-[10px] rounded-none px-3 py-1 shrink-0">Terhubung</Badge>
          </div>
          <p className="mt-6 text-xs font-bold text-slate-800/50">
            Untuk mengubah email atau menghapus akun, silakan kelola melalui pengaturan akun Google Anda.
          </p>
        </TabsContent>

        <TabsContent value="notifications" className="border-4 border-slate-800 bg-white p-8 shadow-[8px_8px_0_rgba(6,78,59,1)]">
          <h3 className="text-xl font-black uppercase text-slate-800 mb-6">Preferensi Notifikasi</h3>
          <div className="space-y-6">
            <label className="flex items-start gap-4 cursor-pointer group">
              <Checkbox 
                className="mt-1 border-4 border-slate-800 rounded-none h-6 w-6 data-[state=checked]:bg-slate-800 data-[state=checked]:text-white" 
                checked={notifyReportDone}
                onCheckedChange={(c) => setNotifyReportDone(c as boolean)}
              />
              <div>
                <div className="font-black text-slate-800 uppercase text-sm">Email Report Selesai</div>
                <div className="text-xs font-bold text-slate-800/60 mt-1">Kirim email setiap kali dual-track audit Work Order selesai.</div>
              </div>
            </label>
            <label className="flex items-start gap-4 cursor-pointer group">
              <Checkbox 
                className="mt-1 border-4 border-slate-800 rounded-none h-6 w-6 data-[state=checked]:bg-slate-800 data-[state=checked]:text-white" 
                checked={notifyRegulation}
                onCheckedChange={(c) => setNotifyRegulation(c as boolean)}
              />
              <div>
                <div className="font-black text-slate-800 uppercase text-sm">Peringatan SOP ESDM</div>
                <div className="text-xs font-bold text-slate-800/60 mt-1">Kirim pemberitahuan jika ada perubahan aturan di Chandra Asri Knowledge Base.</div>
              </div>
            </label>
            <Button 
              className="h-12 bg-slate-800 text-white rounded-none border-2 border-slate-800 font-black uppercase mt-4"
              onClick={handleSavePreferences}
              disabled={isSavingPrefs}
            >
              {isSavingPrefs ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
              ) : "Save Preferences"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="api" className="bg-white p-4 sm:p-8 rounded-2xl shadow-sm border border-blue-100">
          <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-4 sm:mb-6">Manajemen Kunci API</h3>
          <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-4 sm:p-6 mb-6 sm:mb-8 relative overflow-hidden">
            <Label className="text-sm font-semibold text-blue-900 mb-3 block">Live API Key</Label>
            <div className="flex flex-row gap-2 sm:gap-3">
              <Input type="password" readOnly value={dbUser?.apiKey || ""} placeholder="Belum ada kunci API. Silakan buat (Regenerate)." className="h-12 border-sky-200 rounded-lg font-medium bg-white text-slate-800 font-mono focus-visible:ring-blue-500" />
              <Button size="icon" variant="outline" onClick={() => {
                if (dbUser?.apiKey) {
                  navigator.clipboard.writeText(dbUser.apiKey);
                  toast.success("API Key copied to clipboard!");
                }
              }} className="h-12 w-12 shrink-0 border-sky-200 rounded-lg hover:bg-blue-100 hover:text-blue-900">
                <Copy className="h-5 w-5" />
              </Button>
            </div>
            <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button size="sm" disabled={loadingKey} onClick={() => setConfirmKeyOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold h-10 px-4 w-full sm:w-auto shadow-[4px_4px_0_rgba(6,78,59,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all border-2 border-slate-800">
                {loadingKey ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />} 
                {loadingKey ? "Memproses..." : "Generate Key Baru"}
              </Button>
            </div>
          </div>

          <Dialog open={confirmKeyOpen} onOpenChange={setConfirmKeyOpen}>
            <DialogContent className="border-4 border-slate-800 rounded-none shadow-[12px_12px_0_rgba(6,78,59,1)] p-0 gap-0 sm:max-w-md bg-white">
              <div className="p-8">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black uppercase tracking-wide text-slate-800 flex items-center gap-3">
                    <AlertTriangle className="h-6 w-6 text-yellow-500" />
                    Konfirmasi Regenerate API
                  </DialogTitle>
                  <DialogDescription className="text-slate-800/70 font-bold mt-2 text-sm leading-relaxed">
                    Apakah Anda yakin ingin mengganti kunci API lama? 
                    <span className="block mt-2 font-black text-slate-800">Kunci yang lama akan langsung hangus dan tidak dapat digunakan lagi.</span>
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-8 gap-3 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={() => setConfirmKeyOpen(false)}
                    className="rounded-none border-4 border-slate-800 font-black uppercase tracking-widest text-slate-800 hover:bg-blue-50 h-12"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      setLoadingKey(true);
                      setConfirmKeyOpen(false);
                      try {
                        await api.regenerateApiKey();
                        refreshUser();
                        toast.success("Kunci API baru berhasil dibuat!");
                      } catch(e) {
                        toast.error("Gagal membuat kunci API");
                      }
                      setLoadingKey(false);
                    }}
                    className="rounded-none border-4 border-slate-800 bg-slate-800 hover:bg-blue-900 text-white font-black uppercase tracking-widest shadow-[4px_4px_0_rgba(16,185,129,0.3)] h-12"
                  >
                    Ya, Ganti Key
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>

          <div className="space-y-3 mb-10">
            <div className="flex justify-between items-center text-xs font-black uppercase text-slate-800">
              <span>Sisa Saldo Kredit API</span>
              <span>{dbUser?.creditsBalance ?? 0} KREDIT</span>
            </div>
            <div className="h-4 w-full bg-blue-100 border-2 border-slate-800 overflow-hidden">
              <div className="h-full bg-slate-800 transition-all duration-500" style={{ width: `${Math.min(((dbUser?.creditsBalance ?? 0) / 1000) * 100, 100)}%` }}></div>
            </div>
          </div>

          <div className="border-t-4 border-slate-800 pt-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
              <div>
                <h3 className="text-xl font-black uppercase tracking-widest flex items-center gap-3 text-slate-800">
                  <Terminal className="h-6 w-6 text-blue-600" /> Developer API
                </h3>
                <p className="text-slate-800/70 font-bold text-xs uppercase tracking-wider mt-1">Integrasi Verification Kepatuhan & AI Spasial ke Sistem Anda</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setApiTab('playground')} variant={apiTab === 'playground' ? 'default' : 'outline'} className={cn("rounded-none font-black text-xs uppercase border-2", apiTab === 'playground' ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-800 text-slate-800 hover:bg-blue-50')}>
                  <Code2 className="h-4 w-4 mr-2" /> Production Test
                </Button>
                <Button onClick={() => setApiTab('docs')} variant={apiTab === 'docs' ? 'default' : 'outline'} className={cn("rounded-none font-black text-xs uppercase border-2", apiTab === 'docs' ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-800 text-slate-800 hover:bg-blue-50')}>
                  <BookOpen className="h-4 w-4 mr-2" /> Dokumen
                </Button>
              </div>
            </div>

            {apiTab === 'playground' ? (
              <div className="flex flex-col gap-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Request Panel */}
                  <div className="bg-white border-4 border-slate-800 shadow-[6px_6px_0_rgba(6,78,59,1)] p-6">
                    <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 border-b-4 border-slate-800 pb-2 mb-6 flex items-center gap-2">
                      <Code2 className="h-5 w-5 text-blue-600" /> Request Configuration
                    </h2>
  
                    <div className="space-y-6">
                      <div>
                        <Label className="text-xs font-black uppercase text-slate-800 mb-2 block">1. Project Name</Label>
                        <Input 
                          value={projectName} 
                          onChange={e => setProjectName(e.target.value)}
                          className="border-4 border-slate-800 rounded-none h-12 font-bold focus-visible:ring-0"
                        />
                      </div>
  
                      <div>
                        <Label className="text-xs font-black uppercase text-slate-800 mb-2 block">2. Work Order Plan (PDF)</Label>
                        <Input 
                          type="file"
                          accept=".pdf"
                          onChange={e => setPddFile(e.target.files?.[0] || null)}
                          className="border-4 border-slate-800 rounded-none h-12 font-bold focus-visible:ring-0 file:bg-slate-800 file:text-white file:border-0 file:mr-4 file:h-full file:px-4 cursor-pointer"
                        />
                      </div>
  
                      <Button 
                        onClick={handleTestAPI}
                        disabled={loadingPlayground}
                        className="w-14 rounded-none bg-yellow-400 hover:bg-yellow-500 text-slate-800 border-4 border-slate-800 font-black uppercase tracking-widest h-14 shadow-[4px_4px_0_rgba(6,78,59,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all mx-auto block"
                        title="Jalankan Verification"
                      >
                        {loadingPlayground ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : <Play className="h-6 w-6 fill-slate-800 mx-auto" />}
                      </Button>
  
                      <div className="bg-yellow-50 border-4 border-yellow-400 p-4 flex gap-3 items-start">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
                        <p className="text-[10px] font-bold text-yellow-800 leading-relaxed uppercase">Setiap hit ke endpoint ini akan memotong 1 kredit dari akun Anda. Pastikan API key Anda dijaga kerahasiaannya.</p>
                      </div>
                    </div>
                  </div>
  
                  {/* Response Panel */}
                  <div className="bg-slate-800 border-4 border-slate-800 shadow-[6px_6px_0_rgba(6,78,59,1)] p-6 text-white flex flex-col">
                    <div className="flex items-center justify-between border-b-4 border-white/20 pb-2 mb-6">
                      <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        <Terminal className="h-5 w-5 text-yellow-400" /> API Response
                      </h2>
                      {apiResponse && (
                        <div className={cn("px-3 py-1 font-black text-xs rounded-none border-2", apiResponse.status === 200 ? 'bg-blue-500 border-sky-300' : 'bg-red-500 border-red-300')}>
                          HTTP {apiResponse.status || 'ERROR'}
                        </div>
                      )}
                    </div>
  
                    <div className="flex-1 bg-black/50 border-2 border-white/10 p-4 overflow-auto font-mono text-[11px] leading-relaxed relative min-h-[300px] max-h-[300px]">
                      {apiResponse ? (
                        <pre className="whitespace-pre-wrap text-sky-400">{JSON.stringify(apiResponse.data || apiResponse.error, null, 2)}</pre>
                      ) : (
                        <div className="h-full flex items-center justify-center text-white/30 italic">
                          Tunggu respons API... Tekan Jalankan Verification.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {apiResponse && apiResponse.status === 200 && apiResponse.data && (
                  <div className="bg-white border-4 border-slate-800 shadow-[6px_6px_0_rgba(6,78,59,1)] h-[800px] overflow-hidden">
                    <VerificationWorkspace 
                      isFreemium={false} 
                      userName={user?.user_metadata?.full_name || "Author"} 
                      userEmail={userEmail} 
                      initialResult={{
                        id: apiResponse.data.auditId,
                        projectName: projectName,
                        feasibilityScore: apiResponse.data.feasibilityScore,
                        scoreSafety: apiResponse.data.scoreSafety,
                        scoreTechnical: apiResponse.data.scoreTechnical,
                        scoreEfficiency: apiResponse.data.scoreEfficiency,
                        scoreReliability: apiResponse.data.scoreReliability,
                        parsedDocumentJson: apiResponse.data.parsedDocumentJson,
                        issues: apiResponse.data.issues || [],
                        totalPages: apiResponse.data.totalPages,
                        totalWords: apiResponse.data.totalWords,
                        totalSentences: apiResponse.data.totalSentences,
                        hash: apiResponse.data.sha256Hash
                      }} 
                      initialStatus="result" 
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-blue-50 border-4 border-slate-800 shadow-[6px_6px_0_rgba(6,78,59,1)] p-8">
                <h2 className="text-2xl font-black uppercase tracking-widest text-slate-800 mb-8">Dokumentasi API</h2>
                
                <div className="prose max-w-none prose-sky">
                  <h3 className="font-black text-lg uppercase text-slate-800 border-b-4 border-slate-800 pb-2 inline-block">Authentication</h3>
                  <p className="font-bold text-slate-800/80 mt-4 mb-4 text-sm">Semua permintaan ke API OzikOps memerlukan header <code>Authorization: Bearer &lt;API_KEY&gt;</code>.</p>
                  
                  <h3 className="font-black text-lg uppercase text-slate-800 border-b-4 border-slate-800 pb-2 inline-block mt-8">Endpoint Utama</h3>
                  
                  <div className="bg-white border-4 border-slate-800 p-6 mt-4">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="bg-yellow-400 border-2 border-slate-800 text-slate-800 font-black px-3 py-1 text-sm uppercase">POST</span>
                      <span className="font-mono font-bold text-slate-800 text-sm sm:text-base">/api/v1/audit/full-process</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800/70 mb-4">Mengeksekusi audit legalitas dan kelayakan secara menyeluruh terhadap dokumen Work Order.</p>
                    
                    <h4 className="font-black uppercase text-xs mb-2 text-slate-800">Request Format (multipart/form-data)</h4>
                    <ul className="list-disc pl-5 text-sm font-bold text-slate-800/80 space-y-1 mb-6">
                      <li><code>projectName</code> (string, optional) - Nama proyek karbon.</li>
                      <li><code>document</code> (file, required) - File PDF / DOCX / TXT maksimal 10MB.</li>
                    </ul>

                    <h4 className="font-black uppercase text-xs mb-2 text-slate-800">Contoh cURL</h4>
                    <div className="relative">
                      <pre className="bg-slate-800 text-sky-400 p-4 font-mono text-[11px] overflow-x-auto border-4 border-slate-800 shadow-[4px_4px_0_rgba(6,78,59,1)]">
                        {curlCode}
                      </pre>
                      <Button 
                        onClick={() => handleCopy(curlCode)} 
                        size="icon" 
                        className="absolute top-2 right-2 h-8 w-8 bg-white/10 hover:bg-white/20 text-white rounded-none border border-white/30"
                      >
                        {copied ? <CheckCircle2 className="h-4 w-4 text-sky-400" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <h3 className="font-black text-lg uppercase text-slate-800 border-b-4 border-slate-800 pb-2 inline-block mt-10">Rate Limit & Credit</h3>
                  <p className="font-bold text-slate-800/80 mt-4 text-sm">Setiap kali Anda menembak endpoint <code>/full-process</code>, sistem akan memotong 1 kredit dari akun Anda. Batasan (Rate Limit) standar adalah 60 request per menit per IP address.</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
