import React, { useState } from "react";
import { C } from "./ui.jsx";
import { ocemsStart, ocemsLogin } from "./ocemsApi.js";

const inputStyle = {
  width: "100%", marginTop: 6, padding: "10px 12px", fontSize: 14, fontFamily: "inherit",
  border: `1px solid ${C.line}`, borderRadius: 6, outline: "none", boxSizing: "border-box", color: C.ink,
};

const labelStyle = { display: "block", fontSize: 12.5, fontWeight: 700, color: C.ink, marginTop: 16 };

const buttonStyle = (submitting) => ({
  width: "100%", marginTop: 22, padding: "11px 14px", background: C.blue, color: "#fff", border: 0,
  borderRadius: 6, fontFamily: "inherit", fontWeight: 700, fontSize: 14, cursor: submitting ? "default" : "pointer",
  opacity: submitting ? 0.7 : 1,
});

// Two-step login: (1) email+password -> fetch captcha, (2) captcha text ->
// complete login. Email/password/captcha are only ever entered here, once --
// every subsequent OCEMS call from the rest of the app is credential-free.
export default function OcemsLoginModal({ onClose, onConnected }) {
  const [step, setStep] = useState("credentials"); // "credentials" | "captcha"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaImage, setCaptchaImage] = useState("");
  const [captchaText, setCaptchaText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleStart = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const data = await ocemsStart(email);
      setCaptchaImage(data.captcha_image);
      setStep("captcha");
    } catch (err) {
      setError(err.message || "Could not fetch captcha.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      await ocemsLogin(email, password, captchaText);
      onConnected();
    } catch (err) {
      setError(err.message || "OCEMS login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,17,20,.55)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 100,
    }}>
      <div style={{ background: "#fff", borderRadius: 8, padding: 28, width: 360, boxShadow: "0 20px 50px rgba(0,0,0,.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.ink }}>Connect OCEMS</div>
          <button type="button" onClick={onClose} aria-label="Close"
            style={{ border: 0, background: "transparent", fontSize: 18, lineHeight: 1, cursor: "pointer", color: C.mute }}>
            ×
          </button>
        </div>

        {error && (
          <div style={{
            marginTop: 14, padding: "9px 12px", background: "#FDECEC", border: "1px solid #F3C5C5",
            borderRadius: 6, color: "#9B2C2C", fontSize: 13, fontWeight: 600,
          }}>
            {error}
          </div>
        )}

        {step === "credentials" && (
          <form onSubmit={handleStart}>
            <label htmlFor="ocems-email" style={labelStyle}>Email</label>
            <input id="ocems-email" type="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />

            <label htmlFor="ocems-password" style={labelStyle}>Password</label>
            <input id="ocems-password" type="password" autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />

            <button type="submit" disabled={submitting} style={buttonStyle(submitting)}>
              {submitting ? "Loading captcha…" : "Continue"}
            </button>
          </form>
        )}

        {step === "captcha" && (
          <form onSubmit={handleLogin}>
            <div style={{ marginTop: 16, textAlign: "center" }}>
              <img src={captchaImage} alt="Captcha"
                style={{ maxWidth: "100%", border: `1px solid ${C.line}`, borderRadius: 6 }} />
            </div>

            <label htmlFor="ocems-captcha" style={labelStyle}>Captcha text</label>
            <input id="ocems-captcha" type="text" autoComplete="off" autoFocus required
              value={captchaText} onChange={(e) => setCaptchaText(e.target.value)} style={inputStyle} />

            <button type="submit" disabled={submitting} style={buttonStyle(submitting)}>
              {submitting ? "Verifying…" : "Sign in to OCEMS"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
