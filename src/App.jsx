import React, { useEffect, useState } from "react";
import Summary from "./pages/Summary.jsx";
import Comparative from "./pages/Comparative.jsx";
import Process from "./pages/Process.jsx";
import Login from "./pages/Login.jsx";
import { INITIATIVES, REGIONS } from "./lib/data.js";
import { apiUrl } from "./lib/api.js";

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

  if (authStatus === "checking") return null;
  if (authStatus === "out") return <Login onLogin={() => setAuthStatus("in")} />;

  const initiative = INITIATIVES.find((i) => i.key === route.screen);
  if (!initiative) return <Summary onNavigate={go} onLogout={handleLogout} loggingOut={loggingOut} />;
  // ICCC has no per-state breakdown -- Comparative's 4-state grid never
  // applies to it, regardless of how this route was reached (bookmark,
  // back button, a stale link), same reasoning as Process.jsx hiding
  // ICCC's region picker.
  if (route.level === "comparative" && initiative.key !== "iccc") {
    return <Comparative initiative={initiative} onNavigate={go} onLogout={handleLogout} loggingOut={loggingOut} />;
  }
  const region = initiative.key === "iccc" && route.level === "comparative" ? "All-Delhi NCR" : route.level;
  return <Process initiative={initiative} region={region} onNavigate={go} onLogout={handleLogout} loggingOut={loggingOut} />;
}
