import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Filter, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { supabase } from "../../lib/supabaseClient";

type UserRole = "viewer" | "admin" | "super_admin";

type SiteRow = {
  id: number | string;
  owner_id: string;
  name: string;
  url: string;
  interval_minutes: number;
  is_active: boolean;
  created_at?: string;
  client?: string | null;
  project?: string | null;
  environment?: string | null;
};

type LatestCheck = {
  site_id: number;
  checked_at: string;
  is_up: boolean;
  is_slow?: boolean;
  response_ms: number | null;
  status_code: number | null;
  error: string | null;
};

interface SitesListProps {
  refreshKey?: number;
  onAddWebsite: () => void;
  onViewDetails: (id: number) => void;
  onBack?: () => void;
  userRole: UserRole;
}

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const days = Math.floor(h / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function normFilterValue(v: string | null | undefined) {
  const s = (v ?? "").trim();
  return s ? s : "(Unassigned)";
}

export function SitesList({
  refreshKey,
  onAddWebsite,
  onViewDetails,
  onBack,
  userRole,
}: SitesListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const [clientFilter, setClientFilter] = useState("all");
  const [environmentFilter, setEnvironmentFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");

  const [sites, setSites] = useState<SiteRow[]>([]);
  const [latestChecks, setLatestChecks] = useState<Record<number, LatestCheck>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [togglingSiteId, setTogglingSiteId] = useState<number | null>(null);

  async function loadSitesAndChecks() {
    setLoading(true);
    setErrorMsg(null);

    const { data: sitesData, error: sitesErr } = await supabase
      .from("sites")
      .select(
        "id, owner_id, name, url, interval_minutes, is_active, created_at, client, project, environment"
      )
      .order("created_at", { ascending: false });

    if (sitesErr) {
      setLoading(false);
      setErrorMsg(sitesErr.message);
      return;
    }

    const sitesRows = (sitesData ?? []) as SiteRow[];
    setSites(sitesRows);

    const siteIds = sitesRows
      .map((s) => Number(s.id))
      .filter((n) => Number.isFinite(n));

    if (siteIds.length === 0) {
      setLatestChecks({});
      setLoading(false);
      return;
    }

    const { data: checksData, error: checksErr } = await supabase
      .from("checks")
      .select(
        "site_id, checked_at, is_up, is_slow, response_ms, status_code, error"
      )
      .in("site_id", siteIds)
      .order("checked_at", { ascending: false })
      .limit(Math.min(siteIds.length * 5, 500));

    if (checksErr) {
      console.warn("Checks fetch warning:", checksErr.message);
      setLatestChecks({});
      setLoading(false);
      return;
    }

    const map: Record<number, LatestCheck> = {};

    for (const row of checksData) {
      const existing = map[row.site_id];

      if (!existing) {
        map[row.site_id] = row;
      } else {
        if (new Date(row.checked_at) > new Date(existing.checked_at)) {
          map[row.site_id] = row;
        }
      }
    }

    setLatestChecks(map);
    setLoading(false);
  }

  async function toggleSiteActive(siteId: number, nextValue: boolean) {
    setTogglingSiteId(siteId);
    setErrorMsg(null);

    const { error } = await supabase
      .from("sites")
      .update({ is_active: nextValue })
      .eq("id", siteId);

    if (error) {
      setErrorMsg(error.message);
      setTogglingSiteId(null);
      return;
    }

    setSites((prev) =>
      prev.map((site) =>
        Number(site.id) === siteId ? { ...site, is_active: nextValue } : site
      )
    );

    setTogglingSiteId(null);
  }

  useEffect(() => {
    loadSitesAndChecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const clients = useMemo(() => {
    const set = new Set<string>();
    for (const s of sites) set.add(normFilterValue(s.client));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [sites]);

  const environments = useMemo(() => {
    const set = new Set<string>();
    for (const s of sites) set.add(normFilterValue(s.environment));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [sites]);

  const projects = useMemo(() => {
    const set = new Set<string>();
    for (const s of sites) set.add(normFilterValue(s.project));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [sites]);

  const filteredSites = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return sites.filter((s) => {
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.url.toLowerCase().includes(q);

      const clientVal = normFilterValue(s.client);
      const envVal = normFilterValue(s.environment);
      const projVal = normFilterValue(s.project);

      const matchesClient = clientFilter === "all" || clientFilter === clientVal;
      const matchesEnv =
        environmentFilter === "all" || environmentFilter === envVal;
      const matchesProject =
        projectFilter === "all" || projectFilter === projVal;

      return matchesSearch && matchesClient && matchesEnv && matchesProject;
    });
  }, [sites, searchQuery, clientFilter, environmentFilter, projectFilter]);

  return (
    <div className="space-y-6">
      {onBack && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button
            onClick={onBack}
            variant="ghost"
            className="h-auto p-0 font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
          >
            <span className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </span>
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-semibold">Monitored Websites</h2>
          <p className="mt-1 text-muted-foreground">
            Manage and monitor all your websites
          </p>
        </div>

        {userRole !== "viewer" && (
          <div className="flex items-center gap-2">
            <Button
              onClick={loadSitesAndChecks}
              variant="secondary"
              className="rounded-lg"
              disabled={loading}
            >
              Refresh
            </Button>

            <Button
              onClick={onAddWebsite}
              className="rounded-lg bg-primary hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Website
            </Button>
          </div>
        )}
      </div>

      <Card className="rounded-xl border-border/50">
        <CardHeader className="border-b border-border/50">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search websites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-lg bg-input-background pl-9"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-[180px] rounded-lg bg-input-background">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client} value={client}>
                      {client}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={environmentFilter}
                onValueChange={setEnvironmentFilter}
              >
                <SelectTrigger className="w-[200px] rounded-lg bg-input-background">
                  <SelectValue placeholder="All Environments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Environments</SelectItem>
                  {environments.map((env) => (
                    <SelectItem key={env} value={env}>
                      {env}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[180px] rounded-lg bg-input-background">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Showing <span className="font-medium">{filteredSites.length}</span>{" "}
              of <span className="font-medium">{sites.length}</span>
            </div>

            {(clientFilter !== "all" ||
              environmentFilter !== "all" ||
              projectFilter !== "all") && (
              <Button
                variant="ghost"
                className="h-8 rounded-lg px-3 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setClientFilter("all");
                  setEnvironmentFilter("all");
                  setProjectFilter("all");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading && (
            <div className="p-6 text-sm text-muted-foreground">
              Loading websites…
            </div>
          )}

          {!loading && errorMsg && (
            <div className="p-6 text-sm text-red-600">
              Error loading websites:{" "}
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {!loading && !errorMsg && (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Website Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Check</TableHead>
                  <TableHead>Response Time</TableHead>
                  <TableHead>Interval</TableHead>
                  <TableHead>Active</TableHead>
                  {userRole !== "viewer" && <TableHead>Action</TableHead>}
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredSites.map((site) => {
                  const siteId = Number(site.id);
                  const chk = Number.isFinite(siteId)
                    ? latestChecks[siteId]
                    : undefined;

                  let status = "unknown";
                  if (chk) {
                    if (chk.is_up === false) {
                      status = "down";
                    } else if (
                      chk.is_slow === true ||
                      (chk.is_up === true && (chk.response_ms ?? 0) >= 1500)
                    ) {
                      status = "slow";
                    } else if (chk.is_up === true) {
                      status = "up";
                    }
                  }

                  const lastCheck = chk ? timeAgo(chk.checked_at) : "—";
                  const responseTime =
                    chk && typeof chk.response_ms === "number"
                      ? `${chk.response_ms}ms`
                      : "—";

                  return (
                    <TableRow
                      key={String(site.id)}
                      className="cursor-pointer"
                      onClick={() => onViewDetails(siteId)}
                    >
                      <TableCell className="font-medium">{site.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {site.url}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {normFilterValue(site.client)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {normFilterValue(site.project)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {normFilterValue(site.environment)}
                      </TableCell>

                      <TableCell>
                        {status === "unknown" ? (
                          <Badge variant="secondary" className="rounded-full">
                            No Data
                          </Badge>
                        ) : status === "down" ? (
                          <Badge variant="destructive" className="rounded-full">
                            Down
                          </Badge>
                        ) : status === "slow" ? (
                          <Badge className="rounded-full bg-yellow-500 text-black hover:bg-yellow-500/90">
                            Slow
                          </Badge>
                        ) : (
                          <Badge className="rounded-full bg-[#10b981] hover:bg-[#10b981]/90">
                            Up
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {lastCheck}
                      </TableCell>
                      <TableCell className="font-medium">
                        {responseTime}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {site.interval_minutes} min
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`rounded-full ${
                            site.is_active
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                              : "bg-slate-200 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {site.is_active ? "Enabled" : "Disabled"}
                        </Badge>
                      </TableCell>

                      {userRole !== "viewer" && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={site.is_active}
                            disabled={togglingSiteId === siteId}
                            onClick={() =>
                              toggleSiteActive(siteId, !site.is_active)
                            }
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              site.is_active ? "bg-primary" : "bg-slate-300"
                            } ${
                              togglingSiteId === siteId
                                ? "cursor-not-allowed opacity-60"
                                : "cursor-pointer"
                            }`}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                                site.is_active ? "translate-x-5" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}

                {filteredSites.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={userRole !== "viewer" ? 11 : 10}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No websites found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}