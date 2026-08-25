import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  History,
  User as UserIcon,
  Settings,
  Leaf,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  EyeOff,
  BookOpen,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

// Import modular components
import { DashboardUtama } from "@/components/dashboard/DashboardUtama";
import { HistoriVerification } from "@/components/dashboard/HistoriVerification";
import { Pengaturan } from "@/components/dashboard/Pengaturan";

import { ProfilPengguna } from "@/components/dashboard/ProfilPengguna";
import { AdminPanel } from "@/components/dashboard/AdminPanel";
import { ReviewerQueueTab } from "@/components/dashboard/ReviewerQueueTab";
import { SopManagementTab } from "@/components/dashboard/SopManagementTab";

type DashboardSearch = {
  tab?: string;
};

export const Route = createFileRoute("/dashboard")({
  validateSearch: (search: Record<string, unknown>): DashboardSearch => {
    return {
      tab: search.tab as string | undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Dashboard — OzikOps Platform" },
    ],
  }),
  component: Dashboard,
});

const NAV_ITEMS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "history", label: "Assessment History", icon: History },
  { key: "profile", label: "Account Profile", icon: UserIcon },
  { key: "settings", label: "Settings", icon: Settings },
] as const;

function Dashboard() {
  const { tab } = Route.useSearch();
  const active = tab || "overview";
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [dbUser, setDbUser] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  const refreshHistory = () => {
    setLoadingHistory(true);
    Promise.all([
      api.getHistory().then(res => setHistoryData(res.audits || [])).catch(err => {
        console.error("History fetch error:", err);
      }),
      api.getMe().then(res => {
        setDbUser(res);
      }).catch(err => {
        console.error("User fetch error:", err);
        if (err.message?.includes("Akun pengguna tidak ditemukan") || err.message?.includes("401")) {
          signOut().then(() => navigate({ to: "/auth" }));
        }
      })
    ]).finally(() => setLoadingHistory(false));
  };

  // Redirect to /auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth" });
    } else if (user) {
      refreshHistory();
    }
  }, [user, loading, navigate]);


  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  if (loading || !user) {
    return (
      <div suppressHydrationWarning className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const userEmail = user.email || "user@example.com";
  const userAvatar = user.user_metadata?.avatar_url;
  const userInitials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans selection:bg-slate-800 selection:text-white">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={cn(
          "bg-white border-r-4 border-slate-800 flex flex-col shrink-0 transition-transform duration-300 z-50 w-[280px]",
          "fixed inset-y-0 left-0 lg:relative lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="h-20 flex items-center px-6 border-b-4 border-slate-800 shrink-0 bg-blue-50 text-slate-900">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center bg-transparent overflow-hidden">
              <img src="/logo.png" alt="OzikOps" className="h-7 w-7 text-blue-600 object-contain mix-blend-multiply" />
            </div>
            <span className="text-[17px] font-black uppercase tracking-widest">OzikOps</span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto lg:hidden text-slate-600 hover:text-slate-900"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-6 mt-4">
          {[
            {
              group: "Operations & Data",
              items: [
                { key: "overview", label: "Overview", icon: LayoutDashboard },
                { key: "history", label: "Assessment History", icon: History },
                { key: "regulasi", label: "SOP Directory", icon: BookOpen, path: "/sop" },
                { key: "chat", label: "Ask AI", icon: ShieldCheck, path: "/chat" },
              ]
            },
            {
              group: "Account",
              items: [
                { key: "profile", label: "Account Profile", icon: UserIcon },
              ]
            },
            {
              group: "System",
              items: [
                ...(user && ["okitr52@gmail.com", "okitarunaramadhan@gmail.com"].includes(user?.email || "") 
                  ? [{ key: "admin", label: "CEO Panel", icon: ShieldCheck }] : []),

                ...(dbUser?.role === "ADMIN" || dbUser?.role === "senior_engineer" || (user && ["okitr52@gmail.com", "okitarunaramadhan@gmail.com"].includes(user?.email || ""))
                  ? [
                      { key: "sop-management", label: "SOP Management", icon: ShieldCheck },
                      { key: "reviewer", label: "Expert Approval", icon: EyeOff }
                    ] : []),
                { key: "settings", label: "Settings", icon: Settings },
              ]
            }
          ].map((group) => {
            if (group.items.length === 0) return null;
            return (
              <div key={group.group} className="space-y-2">
                <h4 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">{group.group}</h4>
                {group.items.map((item) => {
                  const isActive = item.key === active;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        if ((item as any).path) {
                          navigate({ to: (item as any).path });
                        } else {
                          navigate({ to: "/dashboard", search: { tab: item.key } });
                        }
                        setMobileOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-4 px-4 py-3 text-sm font-black uppercase tracking-widest transition-all rounded-none border-4",
                        isActive
                          ? "bg-slate-800 text-white border-slate-800 shadow-[4px_4px_0_rgba(6,78,59,0.3)] translate-x-1"
                          : "bg-transparent text-slate-600 border-transparent hover:border-slate-800 hover:bg-blue-50 hover:text-slate-900"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t-4 border-slate-800 bg-white">
          <div className="p-4 border-4 border-slate-800 shadow-[4px_4px_0_rgba(6,78,59,0.5)] mb-4 flex items-center gap-3">
            <Avatar className="h-10 w-10 rounded-none border-2 border-slate-800">
              {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
              <AvatarFallback className="bg-slate-800 text-white font-black text-xs">{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black text-slate-900 truncate uppercase">{userName}</div>
              <Badge variant="outline" className="text-[9px] border-slate-800 bg-blue-50 text-slate-800 font-black rounded-none mt-1 px-1">
                {dbUser?.role === "senior_engineer" || dbUser?.role === "REVIEWER" ? "SENIOR ENGINEER" : (dbUser?.role === "ADMIN" || ["okitr52@gmail.com", "okitarunaramadhan@gmail.com"].includes(user?.email || "")) ? "CEO" : "PROJECT DEVELOPER"}
              </Badge>
            </div>
          </div>
          <Button
            variant="destructive"
            className="w-full rounded-none font-black uppercase tracking-widest border-4 border-red-600 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white shadow-[4px_4px_0_rgba(220,38,38,0.2)] transition-all h-12"
            onClick={() => setLogoutOpen(true)}
          >
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b-4 border-slate-800 flex items-center px-4 md:px-8 gap-4 shrink-0 justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-900 hover:bg-blue-50"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-black uppercase tracking-widest text-slate-900 hidden sm:block">
              {NAV_ITEMS.find((n) => n.key === active)?.label || (active === 'admin' ? 'CEO Panel' : active === 'reviewer' ? 'Expert Approval' : 'Dashboard')}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 border-4 border-slate-800 p-1.5 shadow-[2px_2px_0_rgba(6,78,59,0.5)] bg-white">
              <span className="flex items-center gap-1.5 px-2 text-xs font-black uppercase text-slate-900">
                <img src="/logo.png" alt="OzikOps" className="h-4 w-4 text-blue-600 object-contain mix-blend-multiply" />
                {["okitr52@gmail.com", "okitarunaramadhan@gmail.com"].includes(user?.email || "") ? "UNLIMITED (CEO)" : `${dbUser?.creditsBalance ?? 0} Credits Left`}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {active === "overview" && <DashboardUtama history={historyData} onVerificationComplete={refreshHistory} userName={userName} userEmail={userEmail} />}
          {active === "history" && <HistoriVerification history={historyData} loading={loadingHistory} refreshHistory={refreshHistory} />}
          {active === "profile" && <ProfilPengguna dbUser={dbUser} onProfileUpdate={refreshHistory} />}
          {active === "admin" && <AdminPanel />}

          {active === "reviewer" && <ReviewerQueueTab />}
          {active === "sop-management" && <SopManagementTab />}
          {active === "settings" && <Pengaturan dbUser={dbUser} refreshUser={refreshHistory} />}

        </main>
      </div>

      {/* Logout Modal */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="border-4 border-slate-800 rounded-none shadow-[16px_16px_0_rgba(6,78,59,0.5)] p-0 gap-0 sm:max-w-md bg-white">
          <div className="p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-wide text-slate-900">
                Confirm Logout
              </DialogTitle>
              <DialogDescription className="text-slate-600 font-bold mt-2">
                Are you sure you want to log out? Your session will end securely.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-8 gap-3 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setLogoutOpen(false)}
                className="rounded-none border-4 border-slate-800 font-black uppercase tracking-widest text-slate-900 hover:bg-blue-50 h-12"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleLogout}
                className="rounded-none border-4 border-red-600 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest shadow-[4px_4px_0_rgba(220,38,38,0.3)] h-12"
              >
                Yes, Logout
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
