import React, { useState, useEffect, useCallback } from 'react';
import { Landing } from './pages/Landing';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Builder } from './pages/Builder';
import { Billing } from './pages/Billing';
import { Bulk } from './pages/Bulk';
import { History } from './pages/History';
import { Settings } from './pages/Settings';
import { Terms } from './pages/Terms';
import { Privacy } from './pages/Privacy';
import { FAQs } from './pages/FAQs';
import { Contact } from './pages/Contact';
import { Payment } from './pages/Payment';
import { Admin } from './pages/Admin';
import { ResetPassword } from './pages/ResetPassword';
import { Shell } from './components/Shell';
import { Toast } from './components/Toast';
import { users } from './api';

const PUBLIC_ROUTES = ["landing", "auth", "terms", "privacy", "faqs", "contact", "reset-password"];

const App = () => {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [page, setPage] = useState(() => {
    const path = window.location.pathname.slice(1);
    return path || "landing";
  });

  const hydrateUser = useCallback(async () => {
    try {
      // Check for token in URL first (for OAuth redirects)
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      if (urlToken && urlToken !== 'null' && urlToken !== 'undefined') {
        console.log('[App] Extracted Google OAuth token from URL');
        localStorage.setItem('cp_token', urlToken);
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const token = localStorage.getItem("cp_token");
      if (!token || token === 'null' || token === 'undefined') return;

      const cached = localStorage.getItem("cp_user");
      if (cached) {
        try { setUser(JSON.parse(cached)); } catch (e) { localStorage.removeItem("cp_user"); }
      }

      const res = await users.profile();
      if (res?.user) {
        setUser(res.user);
        localStorage.setItem("cp_user", JSON.stringify(res.user));
      } else {
        throw new Error("Invalid session");
      }
    } catch (e) {
      localStorage.removeItem("cp_token");
      localStorage.removeItem("cp_user");
      setUser(null);
    } finally {
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    hydrateUser();
  }, [hydrateUser]);

  useEffect(() => {
    if (!authReady) return;
    const currentPath = window.location.pathname.slice(1) || "landing";
    const isPublic = PUBLIC_ROUTES.includes(currentPath);
    if (!user && !isPublic) setPage("auth");
    if (user && currentPath === "auth") setPage("dashboard");
  }, [authReady, user]);

  useEffect(() => {
    const handlePopState = () => setPage(window.location.pathname.slice(1) || "landing");
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const handleAuthError = () => {
      setUser(null);
      localStorage.removeItem("cp_token");
      localStorage.removeItem("cp_user");
      setPage("auth");
    };
    window.addEventListener("cp:auth-error", handleAuthError);
    return () => window.removeEventListener("cp:auth-error", handleAuthError);
  }, []);

  useEffect(() => {
    const currentPath = window.location.pathname.slice(1) || "landing";
    if (page !== currentPath) {
      window.history.pushState({}, "", `/${page === 'landing' ? '' : page}`);
    }
    window.scrollTo(0, 0);
  }, [page]);

  useEffect(() => {
    if (!authReady) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [authReady]);

  const onAuthSuccess = (data) => {
    console.log('[App] Auth success, received data:', data);
    if (data && data.token && data.token !== 'null' && data.token !== 'undefined') {
      localStorage.setItem("cp_token", data.token);
    } else {
      console.error('[App] Missing or invalid token in auth response!');
    }
    
    if (data && data.user) {
      localStorage.setItem("cp_user", JSON.stringify(data.user));
      setUser(data.user);
    }
    setPage("dashboard");
  };

  const handleLogOut = () => {
    localStorage.removeItem("cp_user");
    localStorage.removeItem("cp_token");
    setUser(null);
    setPage("landing");
  };

  const renderPage = () => {
    if (!authReady) {
      return (
        <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="spin" style={{ width: 40, height: 40, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%" }}></div>
        </div>
      );
    }

    if (page === "landing") return <Landing user={user} setPage={setPage} />;
    if (page === "auth") return <Auth onAuthSuccess={onAuthSuccess} setPage={setPage} />;
    if (PUBLIC_ROUTES.includes(page)) {
      if (page === "terms") return <Terms user={user} setPage={setPage} />;
      if (page === "privacy") return <Privacy user={user} setPage={setPage} />;
      if (page === "faqs") return <FAQs user={user} setPage={setPage} />;
      if (page === "contact") return <Contact user={user} setPage={setPage} />;
      if (page === "reset-password") return <ResetPassword setPage={setPage} />;
    }

    if (!user) return <Auth onAuthSuccess={onAuthSuccess} setPage={setPage} />;

    return (
      <Shell user={user} page={page} setPage={setPage} handleLogOut={handleLogOut}>
        {page === "dashboard" && <Dashboard user={user} setPage={setPage} />}
        {page === "builder" && <Builder user={user} />}
        {page === "billing" && <Billing user={user} setPage={setPage} setUser={setUser} />}
        {page === "bulk" && <Bulk user={user} setPage={setPage} />}
        {page === "history" && <History user={user} />}
        {page === "settings" && <Settings user={user} setUser={setUser} />}
        {page.startsWith("payment") && <Payment user={user} setPage={setPage} planType={page.split("-")[1]} />}
        {page === "admin" && (
          user.role === 'admin' 
            ? <Admin user={user} /> 
            : <div style={{ padding: 60, color: "var(--red)" }}><h2 style={{ fontSize: 24, fontWeight: 700 }}>Restricted Access</h2></div>
        )}
        {["analytics", "users"].includes(page) && (
          <div style={{ padding: 60, color: "var(--sub)" }}><h2 style={{ fontSize: 24, fontWeight: 700 }}>Coming Soon</h2></div>
        )}
      </Shell>
    );
  };

  return (
    <>
      <Toast />
      {renderPage()}
    </>
  );
};

export default App;
