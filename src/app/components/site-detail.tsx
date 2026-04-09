import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Activity, Clock, Gauge, AlertCircle, RefreshCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "../../lib/supabaseClient";

type SiteRow = {
  id: number;
  name: string;
  url: string;
};

type CheckRow = {
  id: number;
  checked_at: string;
  is_up: boolean | null;
  is_slow?: boolean;
  status_code: number | null;
  response_ms: number | null;
  error: string | null;
};

type IncidentRow = {
  id: number;
  started_at: string;
  resolved_at: string | null;
  is_open: boolean;
  last_message: string | null;
};

interface SiteDetailProps {
  onBack: () => void;
  userRole: "viewer" | "admin" | "super_admin";
  siteId: number;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function relativeTime(iso: string) {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const mins = Math.round((now - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs} hr ago`;
}

function duration(startIso: string, endIso: string | null) {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const ms = Math.max(0, end - start);
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} minutes`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs} hours`;
  const days = Math.round(hrs / 24);
  return `${days} days`;
}

export function SiteDetail({ onBack, userRole, siteId }: SiteDetailProps) {
  const [site, setSite] = useState<SiteRow | null>(null);
  const [checks20, setChecks20] = useState<CheckRow[]>([]);
  const [checks24h, setChecks24h] = useState<CheckRow[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [uptime24h, setUptime24h] = useState<{ up: number; total: number; pct: number } | null>(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const latestCheck = useMemo(() => checks20[0] ?? null, [checks20]);

  const responseTimeData = useMemo(() => {
    return checks24h
      .filter((c) => typeof c.response_ms === "number")
      .slice()
      .sort((a, b) => new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime())
      .map((c) => ({
        time: timeLabel(c.checked_at),
        ms: c.response_ms ?? 0,
      }));
  }, [checks24h]);

  async function loadAll() {
    console.log("SiteDetail props siteId:", siteId, "type:", typeof siteId);

    const numericSiteId = Number(siteId);

    if (!Number.isFinite(numericSiteId) || numericSiteId <= 0) {
      setErr(`Invalid site id: ${String(siteId)}`);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const siteRes = await supabase
        .from("sites")
        .select("id, name, url")
        .eq("id", numericSiteId)
        .single();

      if (siteRes.error) throw siteRes.error;
      setSite(siteRes.data as SiteRow);

      const checksRes = await supabase
        .from("checks")
        .select("id, checked_at, is_up, is_slow, status_code, response_ms, error")
        .eq("site_id", numericSiteId)
        .order("checked_at", { ascending: false })
        .limit(20);

      if (checksRes.error) throw checksRes.error;
      setChecks20((checksRes.data ?? []) as CheckRow[]);

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const checks24Res = await supabase
        .from("checks")
        .select("id, checked_at, is_up, is_slow, status_code, response_ms, error")
        .eq("site_id", numericSiteId)
        .gte("checked_at", since)
        .order("checked_at", { ascending: false });

      if (checks24Res.error) throw checks24Res.error;

      const rows24 = (checks24Res.data ?? []) as CheckRow[];
      setChecks24h(rows24);

      const total = rows24.length;
      const up = rows24.filter((r) => r.is_up === true).length;
      const pct = total === 0 ? 0 : Math.round((up / total) * 1000) / 10;
      setUptime24h({ up, total, pct });

      const incRes = await supabase
        .from("incidents")
        .select("id, started_at, resolved_at, is_open, last_message")
        .eq("site_id", numericSiteId)
        .order("started_at", { ascending: false })
        .limit(20);

      if (incRes.error) throw incRes.error;
      setIncidents((incRes.data ?? []) as IncidentRow[]);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load site details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  const statusBadge =
  latestCheck?.is_up === false
    ? { text: "Down", cls: "bg-destructive hover:bg-destructive/90" }
    : latestCheck?.is_slow === true ||
      (latestCheck?.is_up === true && (latestCheck?.response_ms ?? 0) >= 1500)
    ? { text: "Slow", cls: "bg-yellow-500 hover:bg-yellow-500/90 text-black" }
    : latestCheck?.is_up === true
    ? { text: "Up", cls: "bg-[#10b981] hover:bg-[#10b981]/90" }
    : { text: "No Data", cls: "bg-secondary" };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onBack} className="rounded-lg">
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-semibold">{site?.name ?? "Site"}</h2>
            <Badge className={`${statusBadge.cls} rounded-full`}>{statusBadge.text}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">{site?.url ?? ""}</p>
        </div>

        <Button variant="outline" className="rounded-lg" onClick={loadAll} disabled={loading}>
          <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {err && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{err}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-xl border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Current Status</CardTitle>
            <Activity
  className={`h-4 w-4 ${
    latestCheck?.is_up === false
      ? "text-red-500"
      : latestCheck?.is_slow === true ||
        (latestCheck?.is_up === true && (latestCheck?.response_ms ?? 0) >= 1500)
      ? "text-yellow-500"
      : latestCheck?.is_up === true
      ? "text-[#10b981]"
      : "text-muted-foreground"
  }`}
/>
          </CardHeader>
          <CardContent>
            <div
  className={`text-2xl font-semibold ${
    latestCheck?.is_up === false
      ? "text-red-600"
      : latestCheck?.is_slow === true ||
        (latestCheck?.is_up === true && (latestCheck?.response_ms ?? 0) >= 1500)
      ? "text-yellow-600"
      : latestCheck?.is_up === true
      ? "text-[#10b981]"
      : ""
  }`}
>
  {latestCheck?.is_up === false
    ? "Offline"
    : latestCheck?.is_slow === true ||
      (latestCheck?.is_up === true && (latestCheck?.response_ms ?? 0) >= 1500)
    ? "Slow"
    : latestCheck?.is_up === true
    ? "Online"
    : "No Data"}
</div>
            <p className="text-xs text-muted-foreground mt-1">
              {latestCheck?.is_up === false
                ? (latestCheck.error ?? "Incident detected")
                : latestCheck?.is_slow
                ? "Site is reachable but responding slowly"
                : "Latest check result"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Last Check</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{latestCheck ? relativeTime(latestCheck.checked_at) : "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {latestCheck ? fmtDate(latestCheck.checked_at) : "No checks yet"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Response Time</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{latestCheck?.response_ms != null ? `${latestCheck.response_ms}ms` : "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {latestCheck?.status_code != null ? `HTTP ${latestCheck.status_code}` : "No code"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Uptime (24h)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{uptime24h ? `${uptime24h.pct}%` : "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {uptime24h ? `${uptime24h.up}/${uptime24h.total} checks UP` : "No data"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border-border/50">
        <CardHeader>
          <CardTitle>Response Time Chart (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          {responseTimeData.length === 0 ? (
            <div className="p-4 rounded-lg bg-muted/30 text-sm text-muted-foreground">
              No response time data in the last 24 hours yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="ms" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-xl border-border/50">
        <CardHeader>
          <CardTitle>Last 20 Checks</CardTitle>
        </CardHeader>
        <CardContent>
          {checks20.length === 0 ? (
            <div className="p-4 rounded-lg bg-muted/30 text-sm text-muted-foreground">No checks yet.</div>
          ) : (
            <div className="space-y-2">
              {checks20.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{fmtDate(c.checked_at)}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.error ? c.error : c.status_code ? `HTTP ${c.status_code}` : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{c.response_ms != null ? `${c.response_ms}ms` : "—"}</span>

                    {c.is_up === false ? (
  <Badge variant="destructive" className="rounded-full">
    DOWN
  </Badge>
) : c.is_slow === true ||
  (c.is_up === true && (c.response_ms ?? 0) >= 1500) ? (
  <Badge className="rounded-full bg-yellow-500 hover:bg-yellow-500/90 text-black">
    SLOW
  </Badge>
) : (
  <Badge className="rounded-full bg-[#10b981] hover:bg-[#10b981]/90">
    UP
  </Badge>
)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-xl border-border/50">
        <CardHeader>
          <CardTitle>Incident History</CardTitle>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <div className="p-4 rounded-lg bg-muted/30 text-sm text-muted-foreground">No incidents yet.</div>
          ) : (
            <div className="space-y-3">
              {incidents.map((inc) => (
                <div key={inc.id} className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{inc.is_open ? "Incident Open" : "Incident Resolved"}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Started: {fmtDate(inc.started_at)}
                          {inc.resolved_at ? ` · Resolved: ${fmtDate(inc.resolved_at)}` : ""}
                        </p>
                        {inc.last_message && <p className="text-sm mt-2">{inc.last_message}</p>}
                      </div>
                      <div className="text-right">
                        <Badge variant={inc.is_open ? "destructive" : "secondary"} className="rounded-full">
                          {inc.is_open ? "Active" : "Resolved"}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          Duration: {duration(inc.started_at, inc.resolved_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}