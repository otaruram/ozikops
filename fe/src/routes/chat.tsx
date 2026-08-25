import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  MessageCircle,
  Send,
  Loader2,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Cpu,
  FileText,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});

const EQUIPMENT_TAGS = [
  { value: "", label: "All Equipment (Global Search)" },
  { value: "GA-1201A", label: "GA-1201A — Hexane Feed Pump" },
  { value: "FA-8901", label: "FA-8901 — Reflux Accumulator Drum" },
];

const QUICK_QUESTIONS = [
  "What is the seal flush pressure requirement for GA-1201A?",
  "What is the LOTO procedure before pump maintenance?",
  "What are the vibration alarm thresholds for GA-1201A?",
  "What PPE is required for hexane service equipment?",
  "What is the PSV set pressure for FA-8901?",
  "How to perform bearing oil level check?",
];

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: any[];
  riskLevel?: string;
  confidence?: number;
  timestamp: Date;
};

function RiskBadge({ level }: { level: string }) {
  if (level === "HIGH_RISK") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 border border-red-300 text-[10px] font-black uppercase tracking-wider">
        <AlertTriangle className="h-3 w-3" /> HIGH RISK
      </span>
    );
  }
  if (level === "MEDIUM_RISK") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 border border-yellow-300 text-[10px] font-black uppercase tracking-wider">
        <Shield className="h-3 w-3" /> MEDIUM RISK
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 border border-green-300 text-[10px] font-black uppercase tracking-wider">
      <CheckCircle2 className="h-3 w-3" /> COMPLIANT
    </span>
  );
}

function ChatPage() {
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem("ozikops_chat");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
      } catch (e) {}
    }
    return [];
  });
  const [input, setInput] = useState("");
  const [equipmentTag, setEquipmentTag] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    localStorage.setItem("ozikops_chat", JSON.stringify(messages));
  }, [messages]);

  const clearChat = () => {
    if (window.confirm("Are you sure you want to clear the chat history?")) {
      setMessages([]);
      localStorage.removeItem("ozikops_chat");
    }
  };

  const sendMessage = async (question?: string) => {
    const q = question || input.trim();
    if (!q) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: q,
      timestamp: new Date(),
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
      const res = await api.chat({ messages: apiMessages, equipmentTag: equipmentTag || undefined });
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: res.answer || "No response generated.",
        sources: res.sources || [],
        riskLevel: res.riskLevel || "COMPLIANT",
        confidence: res.confidence || 0,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: "Failed to process your question. Please check your connection and try again.",
        riskLevel: "COMPLIANT",
        confidence: 0,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Main Container - No Header */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        <div className="absolute top-4 left-4 z-50">
          <Link to="/dashboard">
            <Button variant="outline" size="sm" className="bg-white border-2 border-slate-800 shadow-[4px_4px_0_rgba(30,58,138,0.3)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all rounded-none text-blue-900 font-bold flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
        </div>

        {/* Equipment Tag Selector and Clear Chat Floating Right */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          {messages.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearChat}
              className="bg-white border-2 border-red-800 shadow-[4px_4px_0_rgba(153,27,27,0.3)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all rounded-none text-red-700 font-bold flex items-center gap-2 px-2"
              title="Clear Chat"
            >
              <Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">Clear</span>
            </Button>
          )}
          <div className="relative">
            <select
              value={equipmentTag}
              onChange={(e) => setEquipmentTag(e.target.value)}
              className="appearance-none bg-white border-2 border-slate-800 px-3 py-1.5 pr-8 text-xs font-bold text-slate-800 shadow-[4px_4px_0_rgba(30,58,138,0.3)] focus:outline-none cursor-pointer"
            >
              {EQUIPMENT_TAGS.map((tag) => (
                <option key={tag.value} value={tag.value}>
                  {tag.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-6 pt-12">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-blue-50 border-4 border-slate-800 shadow-[6px_6px_0_rgba(30,58,138,0.5)] flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="h-10 w-10 text-blue-900" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black uppercase text-slate-900 mb-3 tracking-tight">
                Ask the Knowledge Hub
              </h2>
              <p className="text-slate-500 font-bold max-w-md mx-auto mb-10">
                Get instant, AI-verified answers from Chandra Asri's SOPs, OPLs, datasheets, and maintenance history — with full source traceability.
              </p>

              {/* Quick Questions */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-3xl mx-auto">
                {QUICK_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="text-left p-4 bg-white border-4 border-slate-800 shadow-[4px_4px_0_rgba(30,58,138,0.4)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all text-sm font-bold text-slate-700 hover:text-blue-900"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] ${
                  msg.role === "user"
                    ? "bg-blue-900 text-white border-4 border-blue-900 shadow-[4px_4px_0_rgba(30,58,138,0.5)] p-4"
                    : "bg-white border-4 border-slate-800 shadow-[6px_6px_0_rgba(30,58,138,0.3)] p-5"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b-2 border-slate-200">
                    <Cpu className="h-4 w-4 text-blue-900" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-900">
                      OzikOps AI
                    </span>
                    {msg.riskLevel && <RiskBadge level={msg.riskLevel} />}
                    {msg.confidence !== undefined && msg.confidence > 0 && (
                      <span className="text-[10px] font-bold text-slate-400 ml-auto">
                        Confidence: {Math.round(msg.confidence * 100)}%
                      </span>
                    )}
                  </div>
                )}

                <div className={`whitespace-pre-wrap text-sm font-medium leading-relaxed ${msg.role === "user" ? "text-white" : "text-slate-700"}`}>
                  {msg.content}
                </div>

                {/* Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-3 border-t-2 border-slate-200">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Sources ({msg.sources.length})
                    </span>
                    <div className="space-y-2">
                      {msg.sources.map((src: any, j: number) => (
                        <div
                          key={j}
                          className="flex items-start gap-2 p-2 bg-slate-50 border-2 border-slate-200"
                        >
                          <FileText className="h-4 w-4 text-blue-900 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <div className="text-xs font-black text-slate-800 truncate">
                              {src.document}
                            </div>
                            {src.equipmentTag && (
                              <span className="text-[10px] font-bold text-blue-600">
                                {src.equipmentTag}
                              </span>
                            )}
                            {src.excerpt && (
                              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                                {src.excerpt}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className={`text-[10px] mt-2 ${msg.role === "user" ? "text-blue-300" : "text-slate-400"} font-medium`}>
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border-4 border-slate-800 shadow-[6px_6px_0_rgba(30,58,138,0.3)] p-5 flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-900" />
                <span className="text-sm font-bold text-slate-500">
                  Searching knowledge base...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t-4 border-slate-800 bg-white p-4 shrink-0">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about procedures, safety requirements, equipment specs..."
            className="flex-1 border-4 border-slate-800 px-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-900 shadow-[4px_4px_0_rgba(30,58,138,0.3)] bg-white"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="h-[52px] px-6 rounded-none bg-blue-900 hover:bg-blue-800 text-white font-black uppercase tracking-widest border-4 border-slate-800 shadow-[4px_4px_0_rgba(30,58,138,0.5)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
