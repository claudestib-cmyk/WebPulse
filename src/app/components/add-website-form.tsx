import { useState } from "react";
import { X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { supabase } from "../../lib/supabaseClient";

interface AddWebsiteFormProps {
  onClose: () => void;
  onSaved?: () => void;
}

type MonitoringType = "http" | "https" | "keyword";
type Environment = "production" | "staging" | "development";

export function AddWebsiteForm({ onClose, onSaved }: AddWebsiteFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    interval: "10",
    monitoringType: "https" as MonitoringType,
    keyword: "", // ✅ ADD THIS
    client: "",
    project: "",
    environment: "production" as Environment,
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function normalizeUrl(input: string) {
    const v = input.trim();
    if (!v) return v;

    if (!v.startsWith("http://") && !v.startsWith("https://")) {
      return `https://${v}`;
    }

    return v;
  }

  function isValidUrl(url: string) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const name = formData.name.trim();
      const url = normalizeUrl(formData.url);
      const intervalMinutes = Number(formData.interval);

      if (!name) {
        setErrorMsg("Website name is required.");
        return;
      }

      if (!url) {
        setErrorMsg("URL is required.");
        return;
      }

      if (!isValidUrl(url)) {
        setErrorMsg("Please enter a valid URL.");
        return;
      }

      if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) {
        setErrorMsg("Monitoring interval must be a valid positive number.");
        return;
      }
if (formData.monitoringType === "keyword") {
  if (!formData.keyword.trim()) {
    setErrorMsg("Keyword is required for keyword monitoring.");
    return;
  }
}



      const { data: sessionData, error: sessionErr } =
        await supabase.auth.getSession();

      if (sessionErr) {
        setErrorMsg("Could not verify your session.");
        return;
      }

      const userId = sessionData.session?.user.id;

      if (!userId) {
        setErrorMsg("You are not logged in.");
        return;
      }

      const payload = {
        owner_id: userId,
        name: name,
        url: url,
        interval_minutes: intervalMinutes,
        monitoring_type: formData.monitoringType,
        client: formData.client.trim() || null,
        project: formData.project.trim() || null,
        environment: formData.environment,
        is_active: true,
      };

      const { data: inserted, error } = await supabase
        .from("sites")
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("Insert site failed:", error);
        setErrorMsg(error.message);
        return;
      }

      console.log("Inserted site:", inserted);

      onSaved?.();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl rounded-xl border-border/50 max-h-[90vh] overflow-auto">
        <CardHeader className="border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle>Add New Website</CardTitle>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-lg"
              disabled={loading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Website Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Website Name</Label>
              <Input
                id="name"
                placeholder="Main Website"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            {/* URL */}
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>

              <Input
                id="url"
                placeholder="https://example.com"
                value={formData.url}
                onChange={(e) =>
                  setFormData({ ...formData, url: e.target.value })
                }
                required
              />
            </div>

            {/* Interval */}
            <div className="space-y-2">
              <Label>Monitoring Interval</Label>

              <Select
                value={formData.interval}
                onValueChange={(value) =>
                  setFormData({ ...formData, interval: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="5">Every 5 minutes</SelectItem>
                  <SelectItem value="10">Every 10 minutes</SelectItem>
                  <SelectItem value="30">Every 30 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Monitoring Type */}
            <div className="space-y-3">
              <Label>Monitoring Type</Label>

              <RadioGroup
                value={formData.monitoringType}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    monitoringType: value as MonitoringType,
                  })
                }
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="http" id="http" />
                  <Label htmlFor="http">HTTP</Label>
                </div>

                <div className="flex items-center gap-2">
                  <RadioGroupItem value="https" id="https" />
                  <Label htmlFor="https">HTTPS</Label>
                </div>

                <div className="flex items-center gap-2">
                  <RadioGroupItem value="keyword" id="keyword" />
                  <Label htmlFor="keyword">Keyword</Label>
                </div>
              </RadioGroup>
            </div>
            {formData.monitoringType === "keyword" && (
  <div className="space-y-2">
    <Label>Keyword to Monitor</Label>
    <Input
      placeholder="Enter keyword (e.g. Welcome, Login, Success)"
      value={formData.keyword}
      onChange={(e) =>
        setFormData({ ...formData, keyword: e.target.value })
      }
      required
    />
    <p className="text-xs text-muted-foreground">
      The system will check if this keyword exists on the page.
    </p>
  </div>
)}

            {/* Categorization */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div className="space-y-2">
                <Label>Client</Label>
                <Input
                  placeholder="Client"
                  value={formData.client}
                  onChange={(e) =>
                    setFormData({ ...formData, client: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Project</Label> 
                <Input
                  placeholder="Project"
                  value={formData.project}
                  onChange={(e) =>
                    setFormData({ ...formData, project: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Environment</Label>

                <Select
                  value={formData.environment}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      environment: value as Environment,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>

            {errorMsg && (
              <div className="text-red-600 text-sm">{errorMsg}</div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Website"}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}