import { useState } from "react";
import { X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { supabase } from "../../lib/supabaseClient";

interface LoginModalProps {
  onClose: () => void;
  onLogin: () => void; // called after successful login
}

export function LoginModal({ onClose, onLogin }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    // session will update in App.tsx automatically via onAuthStateChange
    onLogin();
  };

  const handleForgotPassword = async () => {
    setErrorMsg(null);

    if (!email.trim()) {
      setErrorMsg("Enter your email first, then click “Forgot password?”");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);

    if (error) setErrorMsg(error.message);
    else setErrorMsg("Password reset email sent. Check your inbox.");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md rounded-xl">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Login to WebPulse</CardTitle>
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
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg"
                required
                autoComplete="current-password"
              />
            </div>

            <div className="flex items-center justify-between">
              {/* “Remember me” is handled by Supabase session persistence by default */}
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" className="rounded" disabled />
                <span className="text-muted-foreground">Remember me</span>
              </label>

              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-primary hover:underline"
                disabled={loading}
              >
                Forgot password?
              </button>
            </div>

            {errorMsg && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {errorMsg}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 rounded-lg py-6"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>

            {/* Your existing “Sign up” link is UI-only right now.
                If you want it to open your SignupPage, tell me and I’ll wire it. */}
            <div className="text-center text-sm text-gray-600">
              Don't have an account?{" "}
              <span className="text-primary hover:underline cursor-pointer">
                Sign up
              </span>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
