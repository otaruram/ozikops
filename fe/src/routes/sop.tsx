import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Search, Loader2, Factory, ArrowRight, Circle, FileText, ExternalLink, Database } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const Route = createFileRoute("/sop")({
  component: SOPDirectory,
});

const QUICK_CHIPS = [
  "🔧 Heat Exchanger Maintenance",
  "⚠️ Pressure Relief Valve",
  "📉 Past Incident & RCA",
  "🏭 Reactor Shutdown Procedure",
  "📄 Compressor SOP"
];

const DEFAULT_RECOMMENDATIONS = [
  {
    id: "rec-1",
    regName: "SOP-MNT-001: Pump Overhaul Procedure",
    article: "Section 4.2",
    riskCategory: "HIGH_RISK",
    content: "Prosedur overhaul pompa sentrifugal untuk unit Olefin. Termasuk langkah isolasi, drainase, dan penggantian mechanical seal sesuai standar API 610."
  },
  {
    id: "rec-2",
    regName: "SOP-SAF-012: Hot Work Permit",
    article: "Section 2.1",
    riskCategory: "MEDIUM_RISK",
    content: "Prosedur penerbitan ijin kerja panas (Hot Work Permit) pada area classified zone. Wajib gas test dan continuous monitoring selama pekerjaan berlangsung."
  },
  {
    id: "rec-3",
    regName: "P&ID-UTL-003: Cooling Water System",
    article: "Sheet 5",
    riskCategory: "LOW_RISK",
    content: "Piping and Instrumentation Diagram untuk sistem pendingin air (Cooling Water) pada unit utilitas. Termasuk spesifikasi valve, instrumentasi, dan interlock system."
  }
];

function ResultCard({ item }: { item: any }) {
  const getRiskDisplay = (risk: string) => {
    const r = (risk || "").toUpperCase();
    if (r.includes("HIGH") || r.includes("CRITICAL")) {
      return { label: "HIGH RISK / Critical Step", color: "text-red-500", bg: "bg-red-50 text-red-700 border-red-200" };
    }
    if (r.includes("MEDIUM")) {
      return { label: "MEDIUM RISK / Caution", color: "text-yellow-500", bg: "bg-yellow-50 text-yellow-700 border-yellow-200" };
    }
    return { label: "LOW RISK / Routine", color: "text-blue-500", bg: "bg-blue-50 text-blue-700 border-blue-200" };
  };

  const riskData = getRiskDisplay(item.riskCategory);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-200 p-5 mb-4 flex flex-col gap-3 cursor-pointer group">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4">
            <h3 className="text-lg font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors break-words">
              {item.regName}
            </h3>
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-md font-semibold truncate max-w-full sm:max-w-[200px] shrink-0 inline-block">
              {item.article && item.article.startsWith('http') ? 'Google Drive Link' : item.article}
            </span>
          </div>

          {/* Body */}
          <p className="line-clamp-3 text-slate-500 text-sm leading-relaxed">
            {item.content}
          </p>

          {/* Footer */}
          <div className="mt-2 pt-3 flex flex-row items-center justify-between border-t border-slate-100">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-wide uppercase ${riskData.bg}`}>
              <Circle className={`h-2 w-2 fill-current ${riskData.color}`} />
              {riskData.label}
            </div>
            
            <button className="text-sm font-semibold text-blue-600 group-hover:text-blue-700 group-hover:underline flex items-center gap-1 transition-colors">
              View SOP <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </DialogTrigger>

      <DialogContent className="max-w-2xl bg-white border-0 shadow-2xl p-0 overflow-hidden">
        <div className="bg-slate-800 p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-blue-400 shrink-0" />
            <span className="text-blue-400 font-bold text-sm tracking-widest uppercase truncate max-w-[250px] sm:max-w-md">
              {item.article && item.article.startsWith('http') ? 'Google Drive Document' : item.article}
            </span>
          </div>
          <DialogTitle className="text-2xl font-black text-white leading-tight break-words">
            {item.regName}
          </DialogTitle>
          <div className="flex items-center gap-4 mt-2">
            <Badge variant="outline" className="border-blue-400/30 text-blue-100 bg-blue-900/20">
              {item.riskCategory}
            </Badge>
            <span className="text-slate-400 text-xs font-medium">Updated: Last Month</span>
          </div>
        </div>
        
        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div className="prose prose-sm md:prose-base prose-slate max-w-none prose-headings:text-slate-800 prose-a:text-blue-600">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {item.content}
            </ReactMarkdown>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between bg-slate-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Database className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Chandra Asri Knowledge Base</p>
                <p className="text-xs text-slate-500">Official Petrochemical Standard</p>
              </div>
            </div>
            <a href={item.article && item.article.startsWith('http') ? item.article : '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">
              Open Document <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SOPDirectory() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>(DEFAULT_RECOMMENDATIONS);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(DEFAULT_RECOMMENDATIONS);
      return;
    }

    setIsSearching(true);
    setError(null);
    try {
      const data = await apiFetch(`/regulasi/search?q=${encodeURIComponent(searchQuery)}`) as any;
      setResults(data.results || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to search the SOP Database.");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const handleChipClick = (chip: string) => {
    const cleanChip = chip.replace(/^[^\w\s]+/, '').trim();
    setQuery(cleanChip);
    performSearch(cleanChip);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 font-sans">
      {/* Hero Section */}
      <div className="bg-slate-900 border-b-4 border-blue-400 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.1)_0,transparent_100%)]" />
        
        <div className="max-w-4xl mx-auto px-4 py-16 md:py-20 relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800 border-2 border-blue-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] mb-6">
            <Database className="h-8 w-8 text-blue-400" />
          </div>
          
          <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
            Chandra Asri <span className="text-blue-400">Knowledge Base</span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl mx-auto mb-10">
            Search thousands of official SOPs, equipment manuals, and historical execution logs.
          </p>

          <form onSubmit={handleSearchSubmit} className="relative max-w-3xl mx-auto group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-6 w-6 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
            </div>
            <input
              type="text"
              className="block w-full pl-14 pr-32 py-5 bg-white border-4 border-transparent focus:border-blue-400 rounded-2xl text-lg text-slate-900 placeholder-slate-400 shadow-xl focus:outline-none transition-all"
              placeholder="Search equipment, procedures, or safety protocols..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute inset-y-2 right-2 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center transition-colors disabled:bg-slate-400"
            >
              {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : "Search"}
            </button>
          </form>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {QUICK_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleChipClick(chip)}
                className="px-4 py-2 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-blue-400/50 rounded-full text-sm font-medium transition-all"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-slate-900">
            {query && !isSearching 
              ? `Search Results for "${query}"` 
              : "Recommended SOPs"}
          </h2>
          <span className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-200">
            {results.length} Found
          </span>
        </div>

        {error && (
          <div className="p-4 mb-6 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        {isSearching ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="h-10 w-10 animate-spin mb-4 text-blue-500" />
            <p className="font-medium animate-pulse">Searching Chandra Asri Enterprise Database...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((item, idx) => (
              <ResultCard key={item.id || idx} item={item} />
            ))}
            
            {results.length === 0 && !error && (
              <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
                <Database className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-2">No documents found</h3>
                <p className="text-slate-500">Try adjusting your search terms or use the quick filters.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
