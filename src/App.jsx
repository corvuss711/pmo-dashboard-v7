import React, { useCallback, useEffect, useState } from "react";
import Summary from "./Summary.jsx";
import Comparative from "./Comparative.jsx";
import Process from "./Process.jsx";
import Login from "./Login.jsx";
import OcemsLoginModal from "./OcemsLoginModal.jsx";
import { INITIATIVES, REGIONS } from "./data.js";
import { apiUrl } from "./api.js";
import { ocemsMe, ocemsLogout } from "./ocemsApi.js";

/* Routes live in the hash so browser Back and refresh both work:
   #summary                        initiative tiles
   #<initiative>                   process view at Delhi NCR level
   #<initiative>/<state>           process view for one state
   #<initiative>/comparative       one card per state */
function parseHash() {
  const raw = decodeURIComponent((window.location.hash || "").replace(/^#/, ""));
  const [screen, level] = raw.split("/");
  const known = INITIATIVES.some((i) => i.key === screen);
  if (!known) return { screen: "summary", level: null };
  const valid = level === "comparative" || level === "All-Delhi NCR" || REGIONS.includes(level);
  return { screen, level: valid ? level : "All-Delhi NCR" };
}

export default function App() {
  const [route, setRoute] = useState(parseHash);
  const [authStatus, setAuthStatus] = useState("checking"); // "checking" | "in" | "out"
  const [loggingOut, setLoggingOut] = useState(false);
  const [ocemsConnected, setOcemsConnected] = useState(false);
  const [showOcemsModal, setShowOcemsModal] = useState(false);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    fetch(apiUrl("/me"), { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAuthStatus(d.authenticated ? "in" : "out"))
      .catch(() => setAuthStatus("out"));
  }, []);

  useEffect(() => {
    ocemsMe().then(setOcemsConnected);
  }, []);

  const go = (screen, level) => {
    window.location.hash = level ? `${screen}/${encodeURIComponent(level)}` : screen;
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch(apiUrl("/logout"), { method: "POST", credentials: "include" });
    } finally {
      setLoggingOut(false);
      setAuthStatus("out");
      window.location.hash = "";
    }
  };

  // Stable identity (empty deps) so it's safe to depend on inside
  // useOcemsIndustry's effect without triggering extra re-fetches.
  const handleOcemsExpired = useCallback(() => setOcemsConnected(false), []);

  const handleOcemsDisconnect = async () => {
    try {
      await ocemsLogout();
    } catch {
      // Best-effort -- even if the upstream logout call fails, drop the local connected state
      // so the user can retry the login flow (e.g. to re-check the captcha/OTP process).
    } finally {
      setOcemsConnected(false);
    }
  };

  if (authStatus === "checking") return null;
  if (authStatus === "out") return <Login onLogin={() => setAuthStatus("in")} />;

  const ocemsProps = {
    ocemsConnected,
    onOpenOcemsLogin: () => setShowOcemsModal(true),
    onOcemsDisconnect: handleOcemsDisconnect,
    onOcemsExpired: handleOcemsExpired,
  };
  const initiative = INITIATIVES.find((i) => i.key === route.screen);
  const screen = !initiative
    ? <Summary onNavigate={go} onLogout={handleLogout} loggingOut={loggingOut} {...ocemsProps} />
    : route.level === "comparative"
      ? <Comparative initiative={initiative} onNavigate={go} onLogout={handleLogout} loggingOut={loggingOut} {...ocemsProps} />
      : <Process initiative={initiative} region={route.level} onNavigate={go} onLogout={handleLogout} loggingOut={loggingOut} {...ocemsProps} />;

  return (
    <>
      {screen}
      {showOcemsModal && (
        <OcemsLoginModal
          onClose={() => setShowOcemsModal(false)}
          onConnected={() => { setOcemsConnected(true); setShowOcemsModal(false); }}
        />
      )}
    </>
  );
}
