import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Mail,
  MessageSquare,
  Monitor,
  Plus,
  ArrowLeft,
  RefreshCcw,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { supabase } from "../../lib/supabaseClient";

interface AlertsPageProps {
  onBack?: () => void;
  userRole: "viewer" | "admin" | "super_admin";
  onViewSite?: (siteId: number) => void;
  refreshKey?: number;
}

/** ✅ REAL DB RULE ROW */
type AlertRuleRow = {
  id: number;
  owner_id: string;
  name: string;
  rule_type: string;
  threshold: string;
  cooldown: string;
  channels: string[];
  enabled: boolean;
  created_at: string;
};

type IncidentRow = {
  id: number;
  site_id: number;
  started_at: string;
  resolved_at: string | null;
  is_open: boolean;
  last_status: string | null;
  last_message: string | null;
};

type SiteRow = {
  id: number;
  name: string;
  url: string;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function duration(startIso: string, endIso: string | null) {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const ms = Math.max(0, end - start);
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  return `${days}d`;
}

export function AlertsPage({
  onBack,
  userRole,
  onViewSite,
  refreshKey,
}: AlertsPageProps) {
  // ✅ REAL RULES (from DB)
  const [rules, setRules] = useState<AlertRuleRow[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);

  const [showNewRuleForm, setShowNewRuleForm] = useState(false);

  // Incident feed state (unchanged)
  const [tab, setTab] = useState<"open" | "resolved" | "all">("open");
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [sitesById, setSitesById] = useState<Record<number, SiteRow>>({});
  const [loading, setLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);

  const filteredIncidents = useMemo(() => {
    if (tab === "open") return incidents.filter((i) => i.is_open);
    if (tab === "resolved") return incidents.filter((i) => !i.is_open);
    return incidents;
  }, [incidents, tab]);

  async function loadIncidentFeed() {
    setLoading(true);
    setFeedError(null);

    try {
      const incRes = await supabase
        .from("incidents")
        .select("id, site_id, started_at, resolved_at, is_open, last_status, last_message")
        .order("started_at", { ascending: false })
        .limit(50);

      if (incRes.error) throw incRes.error;

      const incRows = (incRes.data ?? []) as IncidentRow[];
      setIncidents(incRows);

      const uniqueSiteIds = Array.from(new Set(incRows.map((r) => r.site_id))).filter(Boolean);
      if (uniqueSiteIds.length === 0) {
        setSitesById({});
        return;
      }

      const siteRes = await supabase
        .from("sites")
        .select("id, name, url")
        .in("id", uniqueSiteIds);

      if (siteRes.error) throw siteRes.error;

      const map: Record<number, SiteRow> = {};
      (siteRes.data ?? []).forEach((s: any) => {
        map[s.id] = { id: s.id, name: s.name, url: s.url };
      });
      setSitesById(map);
    } catch (e: any) {
      setFeedError(e?.message ?? "Failed to load incidents.");
    } finally {
      setLoading(false);
    }
  }

  /** ✅ Load real rules from DB */
  async function loadRules() {
    setRulesLoading(true);
    setRulesError(null);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const uid = userData.user?.id;
      if (!uid) {
        setRules([]);
        return;
      }

      const res = await supabase
        .from("alert_rules")
        .select("id, owner_id, name, rule_type, threshold, cooldown, channels, enabled, created_at")
        .order("id", { ascending: true });

      if (res.error) throw res.error;

      setRules((res.data ?? []) as AlertRuleRow[]);
    } catch (e: any) {
      setRulesError(e?.message ?? "Failed to load alert rules.");
    } finally {
      setRulesLoading(false);
    }
  }

  /** ✅ Toggle enabled + save to DB */
  async function toggleRule(id: number, nextEnabled: boolean) {
    // optimistic UI
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: nextEnabled } : r)));

    const res = await supabase.from("alert_rules").update({ enabled: nextEnabled }).eq("id", id);
    if (res.error) {
      // revert
      setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !nextEnabled } : r)));
      setRulesError(res.error.message);
    }
  }

  /** Optional convenience: seed defaults if empty */
  async function seedDefaultRules() {
    setRulesLoading(true);
    setRulesError(null);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not authenticated.");

      const payload = [
        {
          owner_id: uid,
          name: "Site Down Alert",
          rule_type: "Site Down",
          threshold: "Immediate",
          cooldown: "5 minutes",
          channels: ["Email", "SMS", "Dashboard"],
          enabled: true,
        },
        {
          owner_id: uid,
          name: "Site Recovery",
          rule_type: "Site Up",
          threshold: "Immediate",
          cooldown: "None",
          channels: ["Email", "Dashboard"],
          enabled: true,
        },
        {
          owner_id: uid,
          name: "Performance Degradation",
          rule_type: "Performance Drop",
          threshold: "Response > 1000ms",
          cooldown: "15 minutes",
          channels: ["Email"],
          enabled: true,
        },
        {
          owner_id: uid,
          name: "SSL Certificate Expiry",
          rule_type: "SSL Warning",
          threshold: "30 days before expiry",
          cooldown: "24 hours",
          channels: ["Email", "Dashboard"],
          enabled: false,
        },
      ];

      const ins = await supabase.from("alert_rules").insert(payload);
      if (ins.error) throw ins.error;

      await loadRules();
    } catch (e: any) {
      setRulesError(e?.message ?? "Failed to seed rules.");
    } finally {
      setRulesLoading(false);
    }
  }

  // Load both incidents + rules (and reload on refreshKey)
  useEffect(() => {
    loadIncidentFeed();
    loadRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      {onBack && (
        <Button
          onClick={onBack}
          variant="ghost"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-semibold">Alerts</h2>
          <p className="text-muted-foreground mt-1">Incident feed + alert rules</p>
        </div>
        {userRole !== "viewer" && (
          <Button onClick={() => setShowNewRuleForm(true)} className="bg-primary hover:bg-primary/90 rounded-lg">
            <Plus className="h-4 w-4 mr-2" />
            New Rule
          </Button>
        )}
      </div>

      {/* Incident Feed */}
      <Card className="rounded-xl border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Incident Feed
          </CardTitle>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border/50 overflow-hidden">
              <button
                className={`px-3 py-1 text-sm ${tab === "open" ? "bg-secondary" : "bg-transparent"}`}
                onClick={() => setTab("open")}
              >
                Open
              </button>
              <button
                className={`px-3 py-1 text-sm ${tab === "resolved" ? "bg-secondary" : "bg-transparent"}`}
                onClick={() => setTab("resolved")}
              >
                Resolved
              </button>
              <button
                className={`px-3 py-1 text-sm ${tab === "all" ? "bg-secondary" : "bg-transparent"}`}
                onClick={() => setTab("all")}
              >
                All
              </button>
            </div>

            <Button
              variant="outline"
              className="rounded-lg"
              onClick={loadIncidentFeed}
              disabled={loading}
            >
              <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {feedError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {feedError}
            </div>
          )}

          {!feedError && filteredIncidents.length === 0 && (
            <div className="p-4 rounded-lg bg-muted/30 text-sm text-muted-foreground">
              No incidents found for this filter.
            </div>
          )}

          {filteredIncidents.map((inc) => {
            const site = sitesById[inc.site_id];
            return (
              <div
                key={inc.id}
                className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/40 transition"
                onClick={() => onViewSite?.(inc.site_id)}
              >
                <AlertTriangle className={`h-5 w-5 mt-0.5 ${inc.is_open ? "text-destructive" : "text-muted-foreground"}`} />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {site ? site.name : `Site #${inc.site_id}`}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Started: {fmtDate(inc.started_at)}
                        {inc.resolved_at ? ` · Resolved: ${fmtDate(inc.resolved_at)}` : ""}
                        {" · "}Duration: {duration(inc.started_at, inc.resolved_at)}
                      </p>
                      {site?.url && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{site.url}</p>
                      )}
                      {inc.last_message && <p className="text-sm mt-2">{inc.last_message}</p>}
                    </div>

                    <div className="text-right shrink-0">
                      <Badge variant={inc.is_open ? "destructive" : "secondary"} className="rounded-full">
                        {inc.is_open ? "Open" : "Resolved"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ✅ REAL Alert Rules */}
      <div>
        <h3 className="text-xl font-semibold">Alert Rules</h3>
        <p className="text-muted-foreground mt-1">Configure notification rules for your websites</p>
      </div>

      {rulesError && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {rulesError}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button variant="outline" className="rounded-lg" onClick={loadRules} disabled={rulesLoading}>
          <RefreshCcw className={`h-4 w-4 mr-2 ${rulesLoading ? "animate-spin" : ""}`} />
          Refresh Rules
        </Button>

        {rules.length === 0 && (
          <Button className="rounded-lg" onClick={seedDefaultRules} disabled={rulesLoading}>
            Seed Default Rules
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {rulesLoading && rules.length === 0 && (
          <div className="p-4 rounded-lg bg-muted/30 text-sm text-muted-foreground">
            Loading rules...
          </div>
        )}

        {!rulesLoading && rules.length === 0 && (
          <div className="p-4 rounded-lg bg-muted/30 text-sm text-muted-foreground">
            No rules found. Click <b>Seed Default Rules</b> to add your initial rules.
          </div>
        )}

        {rules.map((rule) => (
          <Card key={rule.id} className="rounded-xl border-border/50">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{rule.name}</h3>

                    <Badge
                      variant={
                        rule.rule_type === "Site Down"
                          ? "destructive"
                          : rule.rule_type === "Site Up"
                          ? "default"
                          : "secondary"
                      }
                      className={`rounded-full ${
                        rule.rule_type === "Site Up" ? "bg-[#10b981] hover:bg-[#10b981]/90" : ""
                      }`}
                    >
                      {rule.rule_type}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Notification Channels</p>
                      <div className="flex flex-wrap gap-2">
                        {rule.channels.map((channel, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary/50 rounded-full text-sm"
                          >
                            {channel === "Email" && <Mail className="h-3 w-3" />}
                            {channel === "SMS" && <MessageSquare className="h-3 w-3" />}
                            {channel === "Dashboard" && <Monitor className="h-3 w-3" />}
                            {channel}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Threshold</p>
                      <p className="text-sm font-medium">{rule.threshold}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Cooldown Period</p>
                      <p className="text-sm font-medium">{rule.cooldown}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/50">
                    <p className="text-sm text-muted-foreground">
                      Rule ID: <span className="font-medium text-foreground">{rule.id}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(checked) => toggleRule(rule.id, checked)}
                  />
                  <Badge
                    variant={rule.enabled ? "default" : "secondary"}
                    className={`rounded-full ${rule.enabled ? "bg-[#10b981] hover:bg-[#10b981]/90" : ""}`}
                  >
                    {rule.enabled ? "Active" : "Disabled"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Everything below is still UI-only (can DB-wire later) */}
      <Card className="rounded-xl border-border/50">
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Email Notifications</h4>
                    <p className="text-sm text-muted-foreground">Receive alerts via email</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Addresses (comma separated)</Label>
                <Input
                  id="email"
                  placeholder="admin@example.com, team@example.com"
                  className="rounded-lg bg-input-background"
                  defaultValue="admin@example.com, ops@example.com"
                />
              </div>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">SMS Notifications</h4>
                    <p className="text-sm text-muted-foreground">Receive alerts via SMS</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Numbers (comma separated)</Label>
                <Input
                  id="phone"
                  placeholder="+1234567890, +0987654321"
                  className="rounded-lg bg-input-background"
                  defaultValue="+1234567890"
                />
              </div>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Monitor className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Dashboard Notifications</h4>
                    <p className="text-sm text-muted-foreground">Show alerts in the dashboard</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-border/50">
        <CardHeader>
          <CardTitle>Global Alert Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <h4 className="font-medium">Quiet Hours</h4>
                <p className="text-sm text-muted-foreground">
                  Suppress non-critical alerts during specific hours
                </p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <h4 className="font-medium">Alert Digest</h4>
                <p className="text-sm text-muted-foreground">
                  Receive daily summary of all alerts
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium">Maximum Alert Frequency</h4>
                  <p className="text-sm text-muted-foreground">
                    Limit the number of alerts per website
                  </p>
                </div>
              </div>
              <Select defaultValue="10">
                <SelectTrigger className="rounded-lg bg-input-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 alerts per hour</SelectItem>
                  <SelectItem value="10">10 alerts per hour</SelectItem>
                  <SelectItem value="20">20 alerts per hour</SelectItem>
                  <SelectItem value="unlimited">Unlimited</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* placeholder: create form later */}
      {showNewRuleForm && (
        <div className="p-4 rounded-lg border border-border/50 bg-muted/20 text-sm text-muted-foreground">
          New Rule form is not implemented yet (rules are now stored in Supabase).
          <div className="mt-2">
            <Button variant="outline" size="sm" onClick={() => setShowNewRuleForm(false)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}