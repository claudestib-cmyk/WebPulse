import { useState } from "react";
import { X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { supabase } from "../../lib/supabaseClient";

interface SignupPageProps {
  onSignup: () => void; // called after successful signup (or signup initiated)
  onClose: () => void;
}

export function SignupPage({ onSignup, onClose }: SignupPageProps) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    company: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const email = formData.email.trim();
    const fullName = formData.fullName.trim();
    const company = formData.company.trim();

    if (formData.password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);

    // Create the auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password: formData.password,
      options: {
        // This stores extra info in the auth user metadata (optional)
        data: {
          full_name: fullName,
          company,
        },
      },
    });

    if (error) {
      setLoading(false);
      setErrorMsg(error.message);
      return;
    }

    // If email confirmation is ON, session may be null until user confirms.
    // If confirmation is OFF, session may already exist.
    const userId = data.user?.id;

    // Update profiles table with extra fields (your trigger already inserts the row)
    if (userId) {
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          email,
          full_name: fullName || null,
          company: company || null,
        })
        .eq("id", userId);

      // If your profiles table doesn’t have full_name/company columns yet,
      // this will error. We'll handle it gracefully.
      if (profileErr) {
        // Don’t fail signup just because profile extras didn’t save.
        console.warn("Profile update warning:", profileErr.message);
      }
    }

    setLoading(false);

    // Give user a helpful message depending on email confirmation setting
    if (!data.session) {
      setInfoMsg("Account created! Please check your email to confirm, then log in.");
      // Keep modal open so they can read the message, but you can close if you prefer:
      // onClose();
      return;
    }

    // Session exists => user is logged in, App.tsx will switch to dashboard
    onSignup();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <Card className="w-full max-w-md rounded-xl my-8">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Create Your Account</CardTitle>
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={(e) => handleChange("fullName", e.target.value)}
                className="rounded-lg"
                required
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="rounded-lg"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company (Optional)</Label>
              <Input
                id="company"
                type="text"
                placeholder="Your Company"
                value={formData.company}
                onChange={(e) => handleChange("company", e.target.value)}
                className="rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                className="rounded-lg"
                required
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                className="rounded-lg"
                required
                autoComplete="new-password"
              />
            </div>

            <div className="flex items-start gap-2">
              <input type="checkbox" id="terms" className="mt-1 rounded" required />
              <label htmlFor="terms" className="text-sm text-gray-600">
                I agree to the Terms of Service and Privacy Policy
              </label>
            </div>

            {errorMsg && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {errorMsg}
              </div>
            )}

            {infoMsg && (
              <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                {infoMsg}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 rounded-lg py-6"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create Account"}
            </Button>

            <div className="text-center text-sm text-gray-600">
              Already have an account?{" "}
              <button type="button" onClick={onClose} className="text-primary hover:underline">
                Login
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
