import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { supabase } from "../../lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

interface DashboardProps {
  userRole: "viewer" | "admin" | "super_admin";
  userId: string;
  refreshKey?: number;
}

type SiteRow = {
  id: number;
  name: string;
  url: string;
  is_active: boolean;
};

type CheckRow = {
  site_id: number;
  checked_at: string;
  is_up: boolean | null;
  is_slow?: boolean;
  response_ms: number | null;
};

type IncidentRow = {
  id: number;
  site_id: number;
  started_at: string | null;
  resolved_at: string | null;
  is_open: boolean | null;
  last_status: string | null;
  last_message: string | null;
};

function isoMinusDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function pct(n: number) {
  return `${n.toFixed(1)}%`;
}

function safeNumber(n: number | null | undefined) {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function startOfHourLocal(d: Date) {
  const x = new Date(d);
  x.setMinutes(0, 0, 0);
  return x;
}

function startOfLocalDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatHourLabelLocal(dt: Date) {
  const hh = String(dt.getHours()).padStart(2, "0");
  return `${hh}:00`;
}

function formatDayLabelLocal(dt: Date) {
  return dt.toLocaleDateString(undefined, { weekday: "short" });
}

function hourLabelWithDay(d: Date) {
  const day = d.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
  });
  return `${day} ${formatHourLabelLocal(d)}`;
}

function timeAgo(iso: string | null) {
  if (!iso) return "—";

  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.round((now - then) / 1000);

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(-diffSec, "second");

  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(-diffMin, "minute");

  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return rtf.format(-diffHr, "hour");

  const diffDay = Math.round(diffHr / 24);
  return rtf.format(-diffDay, "day");
}

export function Dashboard({
  userRole,
  userId,
  refreshKey = 0,
}: DashboardProps) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [sites, setSites] = useState<SiteRow[]>([]);
  const [checks30d, setChecks30d] = useState<CheckRow[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);

  useEffect(() => {
  let cancelled = false;

  async function loadDashboard() {
    console.log("LOGGED USER ID:", userId);

    if (!userId) {
      console.log("NO USER ID YET");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const since30d = isoMinusDays(30);

      const { data: siteData, error: siteError } = await supabase
        .from("sites")
        .select("id, name, url, is_active")
        .eq("is_active", true);

      console.log("SITE DATA:", siteData);
      console.log("SITE ERROR:", siteError);

      if (siteError) throw siteError;

      const siteRows = (siteData || []);
      const siteIds = siteRows.map((site) => site.id);

      if (cancelled) return;

      setSites(siteRows);

      if (siteIds.length === 0) {
        setChecks30d([]);
        setIncidents([]);
        return;
      }

      const [checksResult, incidentsResult] = await Promise.all([
        supabase
          .from("checks")
          .select("site_id, checked_at, is_up, is_slow, response_ms")
          .in("site_id", siteIds)
          .gte("checked_at", since30d),

        supabase
          .from("incidents")
          .select("*")
          .in("site_id", siteIds),
      ]);

      if (checksResult.error) throw checksResult.error;
      if (incidentsResult.error) throw incidentsResult.error;

      if (cancelled) return;

      setChecks30d(checksResult.data || []);
      setIncidents(incidentsResult.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (!cancelled) setLoading(false);
    }
  }

  loadDashboard();

  return () => {
    cancelled = true;
  };
}, [userId, refreshKey]);

  const siteById = useMemo(() => {
    const map = new Map<number, SiteRow>();
    for (const site of sites) {
      map.set(site.id, site);
    }
    return map;
  }, [sites]);

  const latestCheckBySite = useMemo(() => {
    const map = new Map<number, CheckRow>();
    for (const check of checks30d) {
      if (!map.has(check.site_id)) {
        map.set(check.site_id, check);
      }
    }
    return map;
  }, [checks30d]);

  const now = Date.now();

  const checks24h = useMemo(() => {
    const cutoff = now - 24 * 60 * 60 * 1000;
    return checks30d.filter((check) => new Date(check.checked_at).getTime() >= cutoff);
  }, [checks30d, now]);

  const checks7d = useMemo(() => {
    const cutoff = now - 7 * 24 * 60 * 60 * 1000;
    return checks30d.filter((check) => new Date(check.checked_at).getTime() >= cutoff);
  }, [checks30d, now]);

  const totalWebsites = sites.length;

  const sitesUpDown = useMemo(() => {
    let up = 0;
    let down = 0;
    let slow = 0;

    for (const site of sites) {
      const latest = latestCheckBySite.get(site.id);
      if (!latest || latest.is_up == null) continue;

      if (latest.is_up === false) {
        down += 1;
      } else if (latest.is_slow) {
        slow += 1;
      } else {
        up += 1;
      }
    }

    return { up, down, slow };
  }, [sites, latestCheckBySite]);

  const avgResponse24h = useMemo(() => {
    const values = checks24h
      .map((check) => safeNumber(check.response_ms))
      .filter((value): value is number => value != null);

    if (!values.length) return null;

    const sum = values.reduce((acc, value) => acc + value, 0);
    return sum / values.length;
  }, [checks24h]);

  const uptimePct = useMemo(() => {
    function compute(rows: CheckRow[]) {
      const usable = rows.filter((row) => row.is_up === true || row.is_up === false);
      if (!usable.length) return null;

      const upCount = usable.filter((row) => row.is_up === true).length;
      return (upCount / usable.length) * 100;
    }

    return {
      p24h: compute(checks24h),
      p7d: compute(checks7d),
      p30d: compute(checks30d),
    };
  }, [checks24h, checks7d, checks30d]);

  const responseTimeData = useMemo(() => {
    const cutoff = now - 24 * 60 * 60 * 1000;
    const bins = new Map<string, { label: string; sum: number; count: number }>();

    for (let i = 24; i >= 0; i--) {
      const d = startOfHourLocal(new Date(now - i * 60 * 60 * 1000));
      bins.set(d.toISOString(), {
        label: hourLabelWithDay(d),
        sum: 0,
        count: 0,
      });
    }

    for (const check of checks30d) {
      const t = new Date(check.checked_at).getTime();
      if (t < cutoff) continue;

      const ms = safeNumber(check.response_ms);
      if (ms == null) continue;

      const hour = startOfHourLocal(new Date(t));
      const key = hour.toISOString();
      const bucket = bins.get(key);

      if (!bucket) continue;

      bucket.sum += ms;
      bucket.count += 1;
    }

    return Array.from(bins.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, bucket]) => ({
        time: bucket.label,
        ms: bucket.count ? Math.round(bucket.sum / bucket.count) : null,
      }));
  }, [checks30d, now]);

  const uptimeData = useMemo(() => {
    const today = startOfLocalDay(new Date());
    const days: { label: string; start: number; end: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);

      const start = d.getTime();
      const end = start + 24 * 60 * 60 * 1000;

      days.push({
        label: formatDayLabelLocal(d),
        start,
        end,
      });
    }

    const usableChecks = checks7d.filter(
      (check) => check.is_up === true || check.is_up === false
    );

    return days.map((day) => {
      const checksInDay = usableChecks.filter((check) => {
        const time = new Date(check.checked_at).getTime();
        return time >= day.start && time < day.end;
      });

      if (!checksInDay.length) {
        return { date: day.label, uptime: null as number | null };
      }

      const upCount = checksInDay.filter((check) => check.is_up === true).length;
      const uptime = (upCount / checksInDay.length) * 100;

      return {
        date: day.label,
        uptime: Number(uptime.toFixed(1)),
      };
    });
  }, [checks7d]);

  const recentIncidents = useMemo(() => {
    return incidents.map((incident) => {
      const site = siteById.get(incident.site_id);

      return {
        id: incident.id,
        site: site?.name || site?.url || `Site #${incident.site_id}`,
        issue:
          incident.last_message ||
          (incident.is_open ? "Incident Open" : "Incident Closed"),
        severity: incident.is_open ? "high" : "medium",
        time: timeAgo(incident.started_at),
        isOpen: !!incident.is_open,
      };
    });
  }, [incidents, siteById]);

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Websites</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : totalWebsites}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Active monitored sites
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sites Up</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loading ? "..." : sitesUpDown.up}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Currently healthy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sites Slow</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {loading ? "..." : sitesUpDown.slow}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Performance issues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sites Down</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {loading ? "..." : sitesUpDown.down}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading
                ? "..."
                : avgResponse24h == null
                ? "—"
                : `${Math.round(avgResponse24h)}ms`}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Uptime</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading || uptimePct.p30d == null ? "—" : pct(uptimePct.p30d)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uptime Percentages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {loading || uptimePct.p24h == null ? "—" : pct(uptimePct.p24h)}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Last 24 hours</p>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {loading || uptimePct.p7d == null ? "—" : pct(uptimePct.p7d)}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Last 7 days</p>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {loading || uptimePct.p30d == null ? "—" : pct(uptimePct.p30d)}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Last 30 days</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Response Time Trend (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="ms"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Uptime Trend (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={uptimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: any) =>
                    value == null ? ["—", "Uptime"] : [`${value}%`, "Uptime"]
                  }
                />
                <Area
                  type="monotone"
                  dataKey="uptime"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.2}
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading incidents...</p>
          ) : recentIncidents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent incidents found.</p>
          ) : (
            <div className="space-y-4">
              {recentIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <AlertCircle
                      className={
                        incident.severity === "high"
                          ? "h-5 w-5 text-red-500"
                          : "h-5 w-5 text-amber-500"
                      }
                    />
                    <div>
                      <div className="font-medium">{incident.site}</div>
                      <div className="text-sm text-muted-foreground">
                        {incident.issue}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant={incident.isOpen ? "destructive" : "secondary"}>
                      {incident.isOpen ? "Open" : "Resolved"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {incident.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        Signed in as <span className="font-medium">{userRole}</span>
      </div>
    </div>
  );
}