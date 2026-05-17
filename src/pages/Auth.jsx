import React, { useState, useEffect, useRef } from 'react';
import { I } from '../components/Icons';
import { toast } from '../components/Toast';
import { Divider } from '../components/Shared';
import { auth, users } from '../api';

export const Auth = ({ onAuthSuccess, setPage }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isForgot, setIsForgot] = useState(false);

  const isMounted = useRef(true);


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');
    
    if (token && token !== 'null' && token !== 'undefined') {
      console.log('[Auth] Google OAuth token received in URL');
      localStorage.setItem('cp_token', token);
      
      // Fetch user data from Render backend using users.profile() instead of non-existent auth.me()
      users.profile()
        .then(res => {
          if (res && res.user) {
            onAuthSuccess({ token, user: res.user });
            toast("Signed in with Google successfully!");
          } else {
            throw new Error("Invalid profile response");
          }
          // Clean URL without refreshing
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch(err => {
          console.error('Google auth error:', err);
          toast("Failed to complete Google sign in", "error");
          localStorage.removeItem('cp_token');
        });
    }
    
    if (error) {
      toast(`Google sign in failed: ${error}`, "error");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [onAuthSuccess]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (isForgot) {
        const data = await auth.forgotPassword(email);
        if (isMounted.current) {
          toast(data.message || "Reset link sent!");
          setIsForgot(false);
          setIsLogin(true);
        }
        return;
      }

      const payload = isLogin ? { email, password } : { email, name, password };
      const data = isLogin ? await auth.login(payload) : await auth.register(payload);
      
      console.log('[Auth] Response data:', data);

      if (isMounted.current) {
        onAuthSuccess(data);
        toast(isLogin ? "Welcome back!" : "Account created successfully!");
      }
    } catch (err) {
      const isDemoEnabled = import.meta.env.VITE_ENABLE_DEMO === 'true';
      if (!isForgot && isDemoEnabled && email === "demo@certifypro.io" && password === "demo1234") {
        onAuthSuccess({
          token: "demo-token",
          user: { email, plan: "pro", id: "demo-user-id", name: "Demo User", org: "CertifyPro Demo" }
        });
        toast("Demo access granted!");
      } else {
        const errorMsg = isForgot 
          ? (err.message || "Failed to send reset link.")
          : (err.message || "Authentication failed.");
        toast(errorMsg, "error");
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };



  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <div className="hide-mobile" style={{ flex: 1, padding: "80px", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "url('https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80') center/cover", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(3,4,6,0.98), rgba(18,20,28,0.85))" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setPage("landing")}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 16px rgba(191,164,106,0.2)" }}>
              <I n="award" c="#030406" s={26} />
            </div>
            <span style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>Certify<span style={{ color: "var(--accent)" }}>Pro</span></span>
          </div>
        </div>
        <div style={{ position: "relative", zIndex: 1, maxWidth: 480 }}>
          <h2 style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.1, marginBottom: 24, letterSpacing: "-0.03em" }}>Elevate your brand's certification experience.</h2>
          <p style={{ fontSize: 18, color: "var(--sub)", lineHeight: 1.6 }}>Join thousands of organizations generating secure, beautiful, and verifiable credentials seamlessly.</p>
        </div>
      </div>

      <div style={{ width: 560, flex: "none", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px", borderLeft: "1px solid var(--border)" }} className="p-mobile-20 stack-mobile">
        <div style={{ width: "100%", maxWidth: 380 }} className="au0">
          <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, letterSpacing: "-0.02em" }}>
            {isForgot ? "Reset password" : (isLogin ? "Welcome back" : "Create account")}
          </h2>
          <p style={{ color: "var(--sub)", marginBottom: 32, fontSize: 15 }}>
            {isForgot ? "Enter your email for a password reset link." : (isLogin ? "Enter your credentials to access your workspace." : "Start generating beautiful certificates today.")}
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--sub)", marginBottom: 8, display: "block" }}>Email Address</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="field" placeholder="name@company.com" />
            </div>
            {!isLogin && !isForgot && (
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--sub)", marginBottom: 8, display: "block" }}>Full Name</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} className="field" placeholder="John Doe" />
              </div>
            )}
            {!isForgot && (
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--sub)", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                  <span>Password</span>
                  {isLogin && <a href="#" style={{ color: "var(--accent)", fontSize: 12 }} onClick={(e) => { e.preventDefault(); setIsForgot(true); }}>Forgot password?</a>}
                </label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="field" placeholder="••••••••" />
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-gold" style={{ padding: "14px", marginTop: 8, fontSize: 15 }}>
              {loading ? "Processing..." : (isForgot ? "Send Reset Link" : (isLogin ? "Sign In" : "Create Account"))}
            </button>
            {isForgot && (
              <button type="button" onClick={() => setIsForgot(false)} className="btn-ghost" style={{ fontSize: 13 }}>
                Back to Login
              </button>
            )}
          </form>

          <Divider label="OR CONTINUE WITH" />

          <a 
            href={`${import.meta.env.VITE_API_URL}/auth/google`}
            className="btn-ghost" 
            style={{ width: "100%", padding: "12px", fontSize: 14, display: "flex", justifyContent: "center", alignItems: "center", textDecoration: "none", boxSizing: "border-box" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" style={{ marginRight: 8 }}>
              <path fill="#EA4335" d="M12.48 10.92v3.28h7.84c-.24 1.84-1.88 5.39-7.84 5.39-5.11 0-9.27-4.22-9.27-9.44s4.16-9.44 9.27-9.44c2.91 0 5.4 1.25 6.51 3.42l3.05-3c-1.99-1.84-4.57-2.96-9.56-2.96-6.63 0-12 5.37-12 12s5.37 12 12 12c6.92 0 11.52-4.87 11.52-11.72 0-.79-.08-1.4-.24-2.01h-11.28z" />
            </svg>
            Continue with Google
          </a>

          <p style={{ textAlign: "center", marginTop: 32, fontSize: 13, color: "var(--sub)" }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <a href="#" style={{ color: "var(--accent)", fontWeight: 600 }} onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); }}>
              {isLogin ? "Sign up" : "Sign in"}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
