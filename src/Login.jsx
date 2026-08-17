import React, { useState } from "react";
import { C } from "./ui.jsx";
import { apiUrl } from "./api.js";

const ink = "#0B0B0C";
const panel = "#141416";
const yellow = "#F5C518";
const yellowDim = "#C9A013";

const EyeIcon = ({ off }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {off ? (
      <>
        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-6.5 0-10-8-10-8a19.4 19.4 0 0 1 4.22-5.94M9.9 4.24A10.6 10.6 0 0 1 12 4c6.5 0 10 8 10 8a19.5 19.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" />
        <path d="M1 1l22 22" />
      </>
    ) : (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
);

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl("/login"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Invalid email or password");
      }
      onLogin(data.user || null);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "'Source Sans 3', system-ui, sans-serif" }}>
      <div style={{ width: 6, flex: "none", background: yellow }} />

      <div style={{
        flex: "1 1 46%", minWidth: 0, background: `linear-gradient(165deg, ${ink} 0%, ${panel} 60%, #1c1c1f 100%)`,
        display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 56px", color: "#fff",
      }}>
        <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-.01em", color: "#fff" }}>
          Delhi NCR<br />Clean Air Dashboard
        </div>
      </div>

      <div style={{
        flex: "1 1 54%", minWidth: 0, background: C.paper, display: "flex", alignItems: "center",
        justifyContent: "center", padding: 24,
      }}>
        <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.ink }}>Sign in to your account</div>
          {/* <div style={{ fontSize: 14, color: C.mute, marginTop: 6 }}>Enter your credentials to access the dashboard.</div> */}

          {error && (
            <div style={{
              marginTop: 20, padding: "10px 14px", background: "#FDECEC", border: "1px solid #F3C5C5",
              borderRadius: 6, color: "#9B2C2C", fontSize: 13.5, fontWeight: 600,
            }}>{error}</div>
          )}

          <label htmlFor="login-email" style={{ display: "block", fontSize: 13, fontWeight: 700, color: C.ink, marginTop: 26 }}>
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            placeholder="hello@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%", marginTop: 8, padding: "12px 14px", fontSize: 14.5, fontFamily: "inherit",
              border: `1px solid ${C.line}`, borderRadius: 6, outline: "none", boxSizing: "border-box", color: C.ink,
              background: "#fff",
            }}
          />

          <label htmlFor="login-password" style={{ display: "block", fontSize: 13, fontWeight: 700, color: C.ink, marginTop: 18 }}>
            Password
          </label>
          <div style={{ position: "relative", marginTop: 8 }}>
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%", padding: "12px 44px 12px 14px", fontSize: 14.5, fontFamily: "inherit",
                border: `1px solid ${C.line}`, borderRadius: 6, outline: "none", boxSizing: "border-box", color: C.ink,
                background: "#fff",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", border: 0,
                background: "transparent", color: C.mute, cursor: "pointer", padding: 4, display: "flex",
              }}
            >
              <EyeIcon off={showPassword} />
            </button>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%", marginTop: 28, padding: "13px 16px", background: submitting ? panel : ink,
              color: submitting ? yellowDim : yellow, border: 0, borderRadius: 6, fontFamily: "inherit", fontSize: 15, fontWeight: 700,
              cursor: submitting ? "default" : "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 8, opacity: submitting ? 0.85 : 1,
            }}
          >
            {submitting ? "Signing in…" : "Sign In →"}
          </button>
        </form>
      </div>
    </div>
  );
}
