
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Avatar } from "@/components/avatar";

import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  List,
  User,
  LogOut,
  RefreshCcw,
  BookOpen,
} from "lucide-react";
import { MainframeStrip } from "@/components/mainframe/MainframeStrip";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
  /** Tailwind max-width class for inner content (default max-w-4xl). */
  contentMaxWidthClass?: string;
}

const MainLayout = ({
  children,
  contentMaxWidthClass = "max-w-4xl",
}: MainLayoutProps) => {
  const profile = useAuthStore((state) => state.profile);
  const authLogout = useAuthStore((state) => state.logout);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const fetchUserProfile = useAuthStore((state) => state.fetchUserProfile);
  const isFetchingProfile = useAuthStore((state) => state.isFetchingProfile);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, isInitialized, navigate]);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: BookOpen, label: "Learn", path: "/learn" },
    { icon: List, label: "Leaderboard", path: "/leaderboard" },
    { icon: Users, label: "Friends", path: "/friends" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  const handleLogout = async () => {
    await authLogout();
    navigate("/");
  };

  const handleRefreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#060608] text-slate-200">
        <p className="font-mono text-sm text-slate-400">Initializing…</p>
      </div>
    );
  }

  if (isAuthenticated && isFetchingProfile && !profile) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#060608] text-slate-200">
        <p className="font-mono text-sm text-slate-400">Loading account details…</p>
      </div>
    );
  }

  if (isAuthenticated && !profile && !isFetchingProfile) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#060608] p-6 text-slate-200">
        <div className="mainframe-panel-muted w-full max-w-md space-y-4 p-6">
          <h2 className="text-lg font-semibold tracking-tight text-slate-100">Profile not found</h2>
          <p className="text-sm text-slate-500">Your profile information could not be loaded.</p>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              className="border border-slate-600/50 bg-slate-800/80 font-mono text-xs uppercase tracking-wide"
              onClick={handleRefreshProfile}
              disabled={isFetchingProfile}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              {isFetchingProfile ? "Refreshing…" : "Refresh profile"}
            </Button>
            <Button variant="outline" className="border-slate-600/60" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!profile) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#060608] text-destructive">
        <p className="font-mono text-sm">Loading profile…</p>
      </div>
    );
  }

  const navLinkClass = (path: string) =>
    cn(
      "h-auto justify-start gap-2 rounded-md px-3 py-2.5 font-mono text-xs uppercase tracking-wide transition-colors",
      isActive(path)
        ? "border border-cyan-700/40 bg-cyan-950/30 text-cyan-100 shadow-[inset_0_1px_0_rgba(34,211,238,0.12)] hover:bg-cyan-950/40"
        : "border border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-100",
    );

  return (
    <div className="flex h-screen bg-[#060608]">
      <aside className="mainframe-sidebar hidden w-64 flex-col md:flex">
        <MainframeStrip variant="muted" left="NAV — PRIMARY" right="ONLINE" />
        <div className="flex items-center gap-3 border-b border-slate-700/40 px-4 py-3">
          <img
            src="/logo.png"
            alt="Learn Cobol logo"
            className="h-9 w-9 shrink-0 select-none"
            draggable={false}
          />
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight text-slate-100">Learn Cobol</h1>
            <p className="font-mono text-[9px] tracking-wide text-slate-500">ENVIRONMENT DIV</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Main">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.path}
                variant="ghost"
                className={navLinkClass(item.path)}
                onClick={() => navigate(item.path)}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-90" />
                <span>{item.label}</span>
              </Button>
            );
          })}
          <div className="flex-1" />
          <Button
            variant="ghost"
            className="h-auto justify-start gap-2 rounded-md border border-transparent px-3 py-2.5 font-mono text-xs uppercase tracking-wide text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Logout
          </Button>
        </nav>
        <div className="border-t border-slate-700/40 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              src={profile.avatarUrl}
              alt={profile.username ? `${profile.username}'s avatar` : "User avatar"}
              size={32}
              userId={profile.id}
              fallback={profile.username || "?"}
              className="shrink-0 ring-2 ring-slate-600/50 ring-offset-2 ring-offset-[#060608]"
            />
            <div className="min-w-0">
              <div className="truncate font-mono text-sm font-medium text-slate-200">
                {profile.username || "User"}
              </div>
              <div className="font-mono text-[10px] text-cyan-700/90">PTS {profile.totalPoints}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="mainframe-mobile-tabbar fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="flex items-stretch justify-around py-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Button
                key={item.path}
                variant="ghost"
                size="icon"
                className={cn(
                  "h-12 w-auto flex-1 rounded-none flex-col gap-0.5 py-1 font-mono text-[9px] uppercase tracking-wide",
                  active
                    ? "bg-cyan-950/35 text-cyan-200/95"
                    : "text-slate-500 hover:bg-slate-800/40 hover:text-slate-300",
                )}
                onClick={() => navigate(item.path)}
                aria-label={item.label}
              >
                <Icon className="h-5 w-5" />
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-16 md:pb-0">
        <div className={`container mx-auto px-4 py-8 ${contentMaxWidthClass}`}>{children}</div>
      </div>
    </div>
  );
};

export default MainLayout;
