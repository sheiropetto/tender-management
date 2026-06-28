"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Loader2, LogIn, UserPlus, Star } from "lucide-react";

export default function LoginPage() {
  const { login, signup, loginWithGoogle, authError } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Please fill in both fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      if (isSignup) {
        await signup(email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      router.push("/");
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
        setError("Invalid email or password.");
      } else if (code === "auth/email-already-in-use") {
        setError("An account with this email already exists.");
      } else if (code === "auth/weak-password") {
        setError("Password is too weak. Use at least 6 characters.");
      } else if (code === "auth/invalid-email") {
        setError("Invalid email address.");
      } else {
        setError(err?.message || "Authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600">
            <Star className="h-6 w-6 stroke-[1.5]" />
          </div>
          <h1 className="text-xl font-medium text-zinc-900">TenderDocs</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {isSignup ? "Create an account to get started" : "Sign in to your account"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-zinc-500 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-800 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-zinc-500 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-800 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none transition-colors"
            />
          </div>

          {(error || authError) && (
            <p className="text-sm text-red-500 text-center">{error || authError}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-zinc-300 bg-transparent px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin stroke-[1.5]" />
            ) : isSignup ? (
              <UserPlus className="h-4 w-4 stroke-[1.5]" />
            ) : (
              <LogIn className="h-4 w-4 stroke-[1.5]" />
            )}
            {isSignup ? "Create Account" : "Sign In"}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-zinc-100 px-2 text-zinc-400">or continue with</span>
          </div>
        </div>

        {/* Google Sign-In */}
        <button
          type="button"
          onClick={async () => {
            setError("");
            setLoading(true);
            try {
              await loginWithGoogle();
              router.push("/");
            } catch (err: any) {
              const code = err?.code || "";
              if (code === "auth/popup-blocked") {
                setError("Sign-in popup was blocked. Please allow popups for this site.");
              } else if (code === "auth/popup-closed-by-user") {
                setError("Sign-in popup was closed before completing.");
              } else if (code === "auth/cancelled-popup-request") {
                setError("Sign-in was cancelled.");
              } else if (code === "auth/unauthorized-domain") {
                setError("This domain is not authorized for sign-in. Please check Firebase Console settings.");
              } else {
                setError(err?.message || err?.code || "Google sign-in failed.");
              }
              setLoading(false);
            }
          }}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2.5 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>

        {/* Toggle sign in / sign up */}
        <p className="mt-6 text-center text-sm text-zinc-400">
          {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() => { setIsSignup(!isSignup); setError(""); }}
            className="font-medium text-zinc-600 hover:text-zinc-800 transition-colors cursor-pointer"
          >
            {isSignup ? "Sign in" : "Create one"}
          </button>
        </p>
      </div>
    </div>
  );
}
