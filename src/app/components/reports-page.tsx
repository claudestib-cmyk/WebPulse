import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Calendar,
  AlertTriangle,
  Clock3,
  Gauge,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from "recharts";

import { supabase } from "../../lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface ReportsPageProps {
  onBack?: () => void;
  userRole: "viewer" | "admin" | "super_admin";
}

type SiteRow = {
  id: number;
  name: string;
  url: string;
  client: string | null;
  project: string | null;
  environment: string | null;
  is_active: boolean | null;
};

type CheckRow = {
  site_id: number;
  checked_at: string;
  is_up: boolean | null;
  response_ms: number | null;
  status_code?: number | null;
  error?: string | null;
};

type IncidentRow = {
  id: number;
  site_id: number;
  started_at: string | null;
  resolved_at: string | null;
  is_open: boolean | null;
  last_status: boolean | string | null;
  last_message: string | null;
};

type DailyPerformanceRow = {
  site_id: number;
  measured_at: string;
  load_ms: number | null;
  ttfb_ms: number | null;
  page_bytes?: number | null;
  requests_count?: number | null;
  psi_strategy?: string | null;
  psi_performance_score?: number | null;
  psi_lcp_ms?: number | null;
  psi_cls?: number | null;
  psi_tbt_ms?: number | null;
  status_code?: number | null;
  error?: string | null;
  source?: string | null;
};

type DateRangeKey = "7d" | "30d";

function isoMinusDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function pct(n: number) {
  return `${n.toFixed(1)}%`;
}

function ms(n: number | null | undefined) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return `${Math.round(n)}ms`;
}

function minutesBetween(startIso: string | null, endIso: string | null) {
  if (!startIso) return 0;
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.round((end - start) / 60000);
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function safeAvg(values: Array<number | null | undefined>) {
  const usable = values.filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v)
  );
  if (!usable.length) return null;
  return usable.reduce((a, b) => a + b, 0) / usable.length;
}

function classifyIncidentType(message?: string | null):
  | "DNS Error"
  | "SSL Error"
  | "Timeout"
  | "Connection Error"
  | "Keyword Missing"
  | "Keyword Config Error"
  | "HTTP 4xx"
  | "HTTP 5xx"
  | "Performance"
  | "Availability Error"
  | "Other" {
  const s = (message || "").toLowerCase();

  if (s.includes("dns_error")) return "DNS Error";
  if (s.includes("ssl_error") || s.includes("ssl")) return "SSL Error";
  if (s.includes("timeout") || s.includes("timed out") || s.includes("etimedout")) return "Timeout";
  if (s.includes("connection_error") || s.includes("connection") || s.includes("refused")) {
    return "Connection Error";
  }
  if (s.includes("keyword_missing")) return "Keyword Missing";
  if (s.includes("keyword_not_set")) return "Keyword Config Error";

  if (
    s.includes("(500") ||
    s.includes("(502") ||
    s.includes("(503") ||
    s.includes("(504") ||
    s.includes("http 500") ||
    s.includes("http 502") ||
    s.includes("http 503") ||
    s.includes("http 504") ||
    s.includes("server error")
  ) {
    return "HTTP 5xx";
  }

  if (
    s.includes("(400") ||
    s.includes("(401") ||
    s.includes("(403") ||
    s.includes("(404") ||
    s.includes("http 400") ||
    s.includes("http 401") ||
    s.includes("http 403") ||
    s.includes("http 404")
  ) {
    return "HTTP 4xx";
  }

  if (s.includes("slow") || s.includes("performance") || s.includes("response >")) {
    return "Performance";
  }

  if (s.includes("down")) return "Availability Error";

  return "Other";
}

function categorizeBadgeVariant(
  type: ReturnType<typeof classifyIncidentType>
): "default" | "secondary" | "destructive" | "outline" {
  switch (type) {
    case "DNS Error":
    case "SSL Error":
    case "Timeout":
    case "Connection Error":
    case "HTTP 5xx":
    case "Availability Error":
      return "destructive";
    case "HTTP 4xx":
    case "Keyword Missing":
    case "Keyword Config Error":
      return "secondary";
    case "Performance":
      return "outline";
    default:
      return "secondary";
  }
}

export function ReportsPage({ onBack }: ReportsPageProps) {
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRangeKey>("30d");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [sites, setSites] = useState<SiteRow[]>([]);
  const [checks, setChecks] = useState<CheckRow[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [dailyPerf, setDailyPerf] = useState<DailyPerformanceRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMsg(null);

      try {
        const sinceIso = isoMinusDays(range === "30d" ? 30 : 7);

        const [sitesRes, checksRes, incidentsRes, perfRes] = await Promise.all([
          supabase
            .from("sites")
            .select("id,name,url,client,project,environment,is_active")
            .eq("is_active", true)
            .order("name", { ascending: true }),

          supabase
            .from("checks")
            .select("site_id,checked_at,is_up,response_ms,status_code,error")
            .gte("checked_at", sinceIso)
            .order("checked_at", { ascending: false })
            .limit(10000),

          supabase
            .from("incidents")
            .select("id,site_id,started_at,resolved_at,is_open,last_status,last_message")
            .gte("started_at", sinceIso)
            .order("started_at", { ascending: false })
            .limit(1000),

          supabase
            .from("daily_performance")
            .select(
              "site_id,measured_at,load_ms,ttfb_ms,page_bytes,requests_count,psi_strategy,psi_performance_score,psi_lcp_ms,psi_cls,psi_tbt_ms,status_code,error,source"
            )
            .gte("measured_at", sinceIso)
            .order("measured_at", { ascending: false })
            .limit(5000),
        ]);

        if (sitesRes.error) throw sitesRes.error;
        if (checksRes.error) throw checksRes.error;
        if (incidentsRes.error) throw incidentsRes.error;
        if (perfRes.error) throw perfRes.error;
console.log("perfRes.data:", perfRes.data);
console.log("perfRes.error:", perfRes.error);
        if (cancelled) return;

        setSites((sitesRes.data as SiteRow[]) ?? []);
        setChecks((checksRes.data as CheckRow[]) ?? []);
        setIncidents((incidentsRes.data as IncidentRow[]) ?? []);
        setDailyPerf((perfRes.data as DailyPerformanceRow[]) ?? []);
      } catch (e: any) {
        console.error("Reports load error:", e);
        if (!cancelled) setErrorMsg(e?.message ?? "Failed to load reports.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [range]);

  const siteById = useMemo(() => {
    const map = new Map<number, SiteRow>();
    for (const site of sites) map.set(site.id, site);
    return map;
  }, [sites]);

  const totalIncidents = incidents.length;

  const totalDowntimeMinutes = useMemo(() => {
    return incidents.reduce(
      (sum, inc) => sum + minutesBetween(inc.started_at, inc.resolved_at),
      0
    );
  }, [incidents]);

  const avgLoadMs = useMemo(() => safeAvg(dailyPerf.map((p) => p.load_ms)), [dailyPerf]);

  const avgPsi = useMemo(() => {
    const scores = dailyPerf
      .map((p) => p.psi_performance_score)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    if (!scores.length) return null;
    return (scores.reduce((a, b) => a + b, 0) / scores.length) * 100;
  }, [dailyPerf]);

  const siteReport = useMemo(() => {
    return sites.map((site) => {
      const siteChecks = checks.filter((c) => c.site_id === site.id);
      const usable = siteChecks.filter((c) => c.is_up === true || c.is_up === false);
      const upCount = usable.filter((c) => c.is_up === true).length;
      const uptime = usable.length ? (upCount / usable.length) * 100 : null;
      const avgResponse = safeAvg(siteChecks.map((c) => c.response_ms));

      return {
        siteId: site.id,
        name: site.name,
        url: site.url,
        uptime,
        avgResponse,
      };
    });
  }, [sites, checks]);

  const downtimeByWebsite = useMemo(() => {
    const counts = new Map<number, number>();

    for (const inc of incidents) {
      const minutes = minutesBetween(inc.started_at, inc.resolved_at);
      counts.set(inc.site_id, (counts.get(inc.site_id) || 0) + minutes);
    }

    return [...counts.entries()]
      .map(([siteId, minutes]) => ({
        name: siteById.get(siteId)?.name ?? `Site #${siteId}`,
        minutes,
      }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 10);
  }, [incidents, siteById]);

  const incidentsByType = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const inc of incidents) {
      const type = classifyIncidentType(inc.last_message);
      counts[type] = (counts[type] || 0) + 1;
    }

    const palette: Record<string, string> = {
      "DNS Error": "#ef4444",
      "SSL Error": "#7c3aed",
      "Timeout": "#f59e0b",
      "Connection Error": "#0ea5e9",
      "Keyword Missing": "#14b8a6",
      "Keyword Config Error": "#8b5cf6",
      "HTTP 4xx": "#f97316",
      "HTTP 5xx": "#dc2626",
      "Performance": "#10b981",
      "Availability Error": "#64748b",
      "Other": "#94a3b8",
    };

    return Object.entries(counts)
      .map(([name, value]) => ({
        name,
        value,
        color: palette[name] ?? "#94a3b8",
      }))
      .sort((a, b) => b.value - a.value);
  }, [incidents]);

  const slowestSites = useMemo(() => {
    return siteReport
      .filter((s) => typeof s.avgResponse === "number")
      .sort((a, b) => (b.avgResponse || 0) - (a.avgResponse || 0))
      .slice(0, 10)
      .map((s) => ({
        name: s.name,
        response: Math.round(s.avgResponse || 0),
      }));
  }, [siteReport]);

  const dailyLoadTrend = useMemo(() => {
    const grouped = new Map<string, { sum: number; count: number }>();

    for (const row of dailyPerf) {
      if (typeof row.load_ms !== "number" || !Number.isFinite(row.load_ms)) continue;

      const d = new Date(row.measured_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;

      const current = grouped.get(key) || { sum: 0, count: 0 };
      current.sum += row.load_ms;
      current.count += 1;
      grouped.set(key, current);
    }

    return [...grouped.entries()]
      .map(([date, v]) => ({
        date,
        avgLoad: Math.round(v.sum / v.count),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [dailyPerf]);

  function handleExportCsv() {
    const rows = [
      ["Site Name", "URL", "Uptime %", "Avg Response (ms)"],
      ...siteReport.map((row) => [
        row.name,
        row.url,
        row.uptime == null ? "" : row.uptime.toFixed(1),
        row.avgResponse == null ? "" : Math.round(row.avgResponse).toString(),
      ]),
    ];

    const csv = rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `webpulse-report-${range}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="gap-2 px-0" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Real uptime, incidents, and performance reports</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={range === "7d" ? "default" : "outline"}
            size="sm"
            onClick={() => setRange("7d")}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            Last 7 days
          </Button>

          <Button
            variant={range === "30d" ? "default" : "outline"}
            size="sm"
            onClick={() => setRange("30d")}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            Last 30 days
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setRange((r) => (r === "30d" ? "30d" : "7d"))}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          <Button size="sm" onClick={handleExportCsv}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {errorMsg && (
        <Card className="border-destructive/30">
          <CardContent className="pt-6 text-sm text-destructive">{errorMsg}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-xl border-border/50">
  <CardHeader>
    <CardTitle>Daily Performance Snapshot</CardTitle>
  </CardHeader>
  <CardContent>
    {loading ? (
      <div className="text-sm text-muted-foreground">Loading…</div>
    ) : dailyPerf.length === 0 ? (
      <div className="text-sm text-muted-foreground">
        No performance data yet.
      </div>
    ) : (
      (() => {
        const latest = dailyPerf[0];

const latestTime = latest?.measured_at
  ? new Date(latest.measured_at).toLocaleString()
  : null;

const latestSource = latest?.source || "unknown";

return (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">

    {/* Load Time */}
    <div>
      <div className="text-muted-foreground">Load Time</div>
      <div className="font-semibold">
        {latest.load_ms ? `${latest.load_ms}ms` : "--"}
      </div>
    </div>

    {/* TTFB */}
    <div>
      <div className="text-muted-foreground">TTFB</div>
      <div className="font-semibold">
        {latest.ttfb_ms ? `${latest.ttfb_ms}ms` : "--"}
      </div>
    </div>

    {/* Page Size */}
    <div>
      <div className="text-muted-foreground">Page Size</div>
      <div className="font-semibold">
        {latest.page_bytes
          ? `${(latest.page_bytes / 1024).toFixed(1)} KB`
          : "--"}
      </div>
    </div>

    {/* Requests */}
    <div>
      <div className="text-muted-foreground">Requests</div>
      <div className="font-semibold">
        {latest.requests_count ?? "--"}
      </div>
    </div>

    {/* ✅ NEW INFO (FIXED) */}
    <div className="col-span-2 md:col-span-4 mt-2 text-xs text-muted-foreground">
      {latestTime && (
        <p>Last measured: {latestTime}</p>
      )}
      {latestSource && (
        <p>Source: {latestSource}</p>
      )}
    </div>

  </div>
);
      })()
    )}
  </CardContent>
</Card>

        <Card className="rounded-xl border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Load</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-semibold">{loading ? "—" : ms(avgLoadMs)}</div>
              <Gauge className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">From daily performance rows</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg PSI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-semibold">
                {loading || avgPsi == null ? "—" : pct(avgPsi)}
              </div>
              <Activity className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">If PSI rows exist</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border-border/50">
        <CardHeader>
          <CardTitle>Uptime SLA Report ({range === "30d" ? "Last 30 Days" : "Last 7 Days"})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading report…</div>
          ) : siteReport.length === 0 ? (
            <div className="text-sm text-muted-foreground">No sites found.</div>
          ) : (
            siteReport.map((row) => {
              const percent = row.uptime ?? 0;
              const metSla = percent >= 99;

              return (
                <div key={row.siteId} className="space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground">{row.url}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Target: 99.0% · Avg: {ms(row.avgResponse)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-semibold">{pct(percent)}</div>
                      <Badge variant={metSla ? "default" : "destructive"} className="mt-1">
                        {metSla ? "SLA Met" : "SLA Missed"}
                      </Badge>
                    </div>
                  </div>

                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={metSla ? "h-full bg-emerald-500" : "h-full bg-destructive"}
                      style={{ width: `${Math.max(0, Math.min(percent, 100))}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-xl border-border/50">
          <CardHeader>
            <CardTitle>Downtime by Website (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : downtimeByWebsite.length === 0 ? (
              <div className="text-sm text-muted-foreground">No downtime found in this range.</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={downtimeByWebsite}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    angle={-20}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="minutes" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/50">
          <CardHeader>
            <CardTitle>Incidents by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : incidentsByType.length === 0 ? (
              <div className="text-sm text-muted-foreground">No incidents found in this range.</div>
            ) : (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={incidentsByType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
                      }
                      outerRadius={95}
                      dataKey="value"
                    >
                      {incidentsByType.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} incidents`, name]} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {incidentsByType.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-xl border-border/50">
          <CardHeader>
            <CardTitle>Performance: Slowest Sites (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : slowestSites.length === 0 ? (
              <div className="text-sm text-muted-foreground">No response-time data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={slowestSites}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    angle={-20}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="response" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/50">
          <CardHeader>
            <CardTitle>Performance: Daily Avg Load (ms)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : dailyLoadTrend.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Run daily performance monitoring to see trends.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyLoadTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="avgLoad" stroke="#7c3aed" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border-border/50">
        <CardHeader>
          <CardTitle>Downtime Incident Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading incidents…</div>
          ) : incidents.length === 0 ? (
            <div className="text-sm text-muted-foreground">No incidents in this range.</div>
          ) : (
            incidents.map((inc) => {
              const site = siteById.get(inc.site_id);
              const kind = classifyIncidentType(inc.last_message);
              const durationMins = minutesBetween(inc.started_at, inc.resolved_at);

              return (
                <div
                  key={inc.id}
                  className="rounded-lg border border-border/50 p-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{site?.name ?? `Site #${inc.site_id}`}</span>
                      <Badge variant={inc.is_open ? "destructive" : "default"}>
                        {inc.is_open ? "Open" : "Resolved"}
                      </Badge>
                      <Badge variant={categorizeBadgeVariant(kind)}>{kind}</Badge>
                    </div>

                    <div className="text-xs text-muted-foreground">{site?.url ?? "—"}</div>
                    <div className="text-sm">{inc.last_message || "No message"}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm min-w-[260px]">
                    <div className="text-muted-foreground">Start</div>
                    <div>{formatDateTime(inc.started_at)}</div>

                    <div className="text-muted-foreground">End</div>
                    <div>{formatDateTime(inc.resolved_at)}</div>

                    <div className="text-muted-foreground">Duration</div>
                    <div>{durationMins}m</div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}