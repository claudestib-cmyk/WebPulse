import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  Globe,
  Bell,
  FileText,
  Users,
  LogOut,
  Plus,
} from "lucide-react";

import { supabase } from "../lib/supabaseClient";
import { Dashboard } from "./components/dashboard";
import { SitesList } from "./components/sites-list";
import { AddWebsiteForm } from "./components/add-website-form";
import { SiteDetail } from "./components/site-detail";
import { AlertsPage } from "./components/alerts-page";
import { ReportsPage } from "./components/reports-page";
import { LandingPage } from "./components/landing-page";
import { LoginModal } from "./components/login-modal";
import { SignupPage } from "./components/signup-page";
import { UserManagement } from "./components/user-management";

type Page =
  | "dashboard"
  | "sites"
  | "site-detail"
  | "alerts"
  | "reports"
  | "user-management";

type UserRole = "viewer" | "admin" | "super_admin";

type SidebarUptimeStats = {
  uptime: number;
  up: number;
  down: number;
  loading: boolean;
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupPage, setShowSignupPage] = useState(false);
  const [showAddWebsiteForm, setShowAddWebsiteForm] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<UserRole>("viewer");
  const [refreshKey, setRefreshKey] = useState(0);

  const [uptimeStats, setUptimeStats] = useState<SidebarUptimeStats>({
    uptime: 0,
    up: 0,
    down: 0,
    loading: true,
  });

  useEffect(() => {
    const getInitialSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting session:", error);
        return;
      }
      setSession(data.session);
    };

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!session?.user?.id) {
        setUserRole("viewer");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching user role:", error);
        setUserRole("viewer");
        return;
      }

      setUserRole((data?.role as UserRole) || "viewer");
    };

    fetchUserRole();
  }, [session]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((prev) => prev + 1);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadSidebarUptime = async () => {
      if (!session?.user?.id) {
        setUptimeStats({
          uptime: 0,
          up: 0,
          down: 0,
          loading: false,
        });
        return;
      }

      setUptimeStats((prev) => ({ ...prev, loading: true }));

      try {
        const since = new Date();
        since.setDate(since.getDate() - 30);

        const { data: userSites, error: sitesError } = await supabase
          .from("sites")
          .select("id")
          .eq("owner_id", session.user.id)
          .eq("is_active", true);

        if (sitesError) throw sitesError;

        const siteIds = (userSites || []).map((site) => site.id);

        console.log("session user id:", session.user.id);
        console.log("userSites:", userSites);
        console.log("siteIds:", siteIds);

        if (siteIds.length === 0) {
          setUptimeStats({
            uptime: 0,
            up: 0,
            down: 0,
            loading: false,
          });
          return;
        }

        const { data: checks, error: checksError } = await supabase
          .from("checks")
          .select("is_up, site_id, checked_at")
          .in("site_id", siteIds)
          .gte("checked_at", since.toISOString());

        if (checksError) throw checksError;

        console.log("checks:", checks);

        const total = checks?.length || 0;
        const up = checks?.filter((check) => check.is_up === true).length || 0;
        const down =
          checks?.filter((check) => check.is_up === false).length || 0;
        const uptime = total > 0 ? Number(((up / total) * 100).toFixed(2)) : 0;

        console.log("uptime totals:", { total, up, down, uptime });

        setUptimeStats({
          uptime,
          up,
          down,
          loading: false,
        });
      } catch (error) {
        console.error("Error loading sidebar uptime:", error);
        setUptimeStats({
          uptime: 0,
          up: 0,
          down: 0,
          loading: false,
        });
      }
    };

    loadSidebarUptime();
  }, [session?.user?.id, refreshKey]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout error:", error);
      return;
    }

    setCurrentPage("dashboard");
    setSelectedSiteId(null);
    setShowAddWebsiteForm(false);
  };

  const handleSiteAdded = () => {
    setShowAddWebsiteForm(false);
    setRefreshKey((prev) => prev + 1);
    setCurrentPage("sites");
  };

  const handleViewDetails = (siteId: number) => {
    setSelectedSiteId(siteId);
    setCurrentPage("site-detail");
  };

  const renderPage = () => {
    if (!session?.user?.id) return null;

    switch (currentPage) {
      case "dashboard":
        return (
          <Dashboard
            userRole={userRole}
            userId={session.user.id}
            refreshKey={refreshKey}
          />
        );

      case "sites":
        return showAddWebsiteForm ? (
          <AddWebsiteForm
            onClose={() => setShowAddWebsiteForm(false)}
            onSaved={handleSiteAdded}
          />
        ) : (
          <SitesList
            onAddWebsite={() => setShowAddWebsiteForm(true)}
            onViewDetails={handleViewDetails}
            refreshKey={refreshKey}
            userRole={userRole}
            onBack={() => setCurrentPage("dashboard")}  // ✅ ADD THIS LINE
          />
        );

      case "site-detail":
        return selectedSiteId ? (
          <SiteDetail
            siteId={selectedSiteId}
            onBack={() => setCurrentPage("sites")}
            userRole={userRole}
          />
        ) : (
          <div className="rounded-xl border border-border/50 bg-card p-6 text-sm text-muted-foreground">
            No site selected.
          </div>
        );

      case "alerts":
        return (
          <AlertsPage
            onBack={() => setCurrentPage("dashboard")}
            userRole={userRole}
            onViewSite={handleViewDetails}
            refreshKey={refreshKey}
          />
        );

      case "reports":
        return (
          <ReportsPage
            onBack={() => setCurrentPage("dashboard")}
            userRole={userRole}
          />
        );

      case "user-management":
        return userRole === "super_admin" ? (
          <UserManagement onBack={() => setCurrentPage("dashboard")} />
        ) : (
          <div className="rounded-xl border border-border/50 bg-card p-6 text-sm text-muted-foreground">
            You do not have permission to view this page.
          </div>
        );

      default:
        return null;
    }
  };

  if (!session) {
    return (
      <>
        <LandingPage
          onGetStarted={() => setShowSignupPage(true)}
          onLogin={() => setShowLoginModal(true)}
        />

        {showLoginModal && (
          <LoginModal
            onClose={() => setShowLoginModal(false)}
            onLogin={() => setShowLoginModal(false)}
          />
        )}

        {showSignupPage && (
          <SignupPage
            onSignup={() => setShowSignupPage(false)}
            onClose={() => setShowSignupPage(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full flex justify-center">
        <div className="flex w-full max-w-[1300px]">
          <aside className="w-64 min-h-screen border-r bg-card/50 backdrop-blur-sm">
            <div className="p-6">
              <div className="mb-8">
                <h1 className="text-2xl font-semibold text-foreground">WebPulse</h1>
                <p className="text-sm text-muted-foreground">
                  Website Monitoring Dashboard
                </p>
              </div>

              <nav className="space-y-2">
                <button
                  onClick={() => setCurrentPage("dashboard")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    currentPage === "dashboard"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  Dashboard
                </button>

                <button
                  onClick={() => {
                    setCurrentPage("sites");
                    setShowAddWebsiteForm(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    currentPage === "sites" || currentPage === "site-detail"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Globe className="h-5 w-5" />
                  Websites
                </button>

                <button
                  onClick={() => setCurrentPage("alerts")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    currentPage === "alerts"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Bell className="h-5 w-5" />
                  Alerts
                </button>

                <button
                  onClick={() => setCurrentPage("reports")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    currentPage === "reports"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="h-5 w-5" />
                  Reports
                </button>

                {userRole === "super_admin" && (
                  <button
                    onClick={() => setCurrentPage("user-management")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      currentPage === "user-management"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Users className="h-5 w-5" />
                    User Management
                  </button>
                )}
              </nav>

        

              <div className="mt-8 p-4 bg-gradient-to-br from-primary to-primary/80 rounded-xl text-primary-foreground">
                <div className="text-sm opacity-90 mb-2">Overall Uptime</div>

                <div className="text-3xl font-semibold mb-1">
                  {uptimeStats.loading ? "..." : `${uptimeStats.uptime}%`}
                </div>

                <div className="text-xs opacity-75">Last 30 days</div>

                <div className="mt-4 pt-4 border-t border-primary-foreground/20">
                  <div className="flex justify-between text-sm">
                    <div className="flex flex-col">
                      <span className="opacity-90">Up</span>
                      <span className="font-medium">
                        {uptimeStats.loading ? "..." : uptimeStats.up}
                      </span>
                    </div>

                    <div className="flex flex-col text-right">
                      <span className="opacity-90">Down</span>
                      <span className="font-medium">
                        {uptimeStats.loading ? "..." : uptimeStats.down}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full mt-6 flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="h-5 w-5" />
                Logout
              </button>
            </div>
          </aside>

          <div className="flex-1 flex flex-col">
            <div className="flex justify-end px-8 pt-6">
              <div className="flex items-center gap-4 text-sm text-black">
                <span>Role: <strong>{userRole}</strong></span>
                <span>Status: All Systems Operational</span>
                <span>Refresh: Every 30s</span>
              </div>
            </div>

            <main className="flex-1 p-8">
              {renderPage()}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}