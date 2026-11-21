import { API } from "./config";
import { useState, useEffect } from "react";
import "./AdminLogin.css";
import {
  IconShield,
  IconLock,
  IconUser,
  IconEye,
  IconEyeOff,
  IconArrowLeft,
  IconAlertCircle,
  IconAlertTriangle,
  IconCheckCircle,
  IconX,
} from "./components/Icons";

const CURRENT_YEAR = new Date().getFullYear();

function AdminLogin() {
  const [username, setUsername] = useState(() => {
    return localStorage.getItem("rememberedAdminUsername") || "";
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return Boolean(localStorage.getItem("rememberedAdminUsername"));
  });
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [existingUser, setExistingUser] = useState(null);

  // Check if token already exists and is still valid
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    const storedUsername = localStorage.getItem("adminUsername");

    if (!token) {
      return;
    }

    // Verify existing token
    fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) {
          setExistingUser(storedUsername || data.admin?.username || "Admin");
        } else {
          localStorage.removeItem("adminToken");
          localStorage.removeItem("adminUsername");
        }
      })
      .catch(() => {
        // Server might be starting or offline
      });
  }, []);

  const handleKeyDown = (e) => {
    if (e.getModifierState && typeof e.getModifierState === "function") {
      setCapsLockOn(e.getModifierState("CapsLock"));
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Please enter your admin username.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Invalid username or password. Please verify your credentials.");
        return;
      }

      // Save token and username
      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("adminUsername", data.admin.username);

      if (rememberMe) {
        localStorage.setItem("rememberedAdminUsername", data.admin.username);
      } else {
        localStorage.removeItem("rememberedAdminUsername");
      }

      // Smooth transition to dashboard
      window.location.href = "/admin/dashboard";
    } catch (err) {
      console.error("Login error:", err);
      setError("Cannot connect to server at " + API + ". Please ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleContinueExisting = () => {
    window.location.href = "/admin/dashboard";
  };

  const handleSwitchAccount = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUsername");
    setExistingUser(null);
  };

  return (
    <div className="admin-login-wrapper">
      {/* Decorative ambient background mesh & glows */}
      <div className="login-bg-glow glow-1"></div>
      <div className="login-bg-glow glow-2"></div>
      <div className="login-grid-overlay"></div>

      <div className="login-container">
        {/* Top return link */}
        <div className="login-nav-top">
          <a href="/" className="back-website-link">
            <IconArrowLeft size={16} />
            <span>Return to Public Website</span>
          </a>
          <span className="secure-badge">
            <IconShield size={13} />
            <span>256-Bit SSL Protected</span>
          </span>
        </div>

        {/* Login Card */}
        <div className="login-card">
          <div className="card-brand-header">
            <div className="brand-emblem">
              <span className="brand-logo-text">DB</span>
            </div>
            <div className="brand-titles">
              <span className="company-sub">DB METAL FABRICATION</span>
              <h1 className="portal-title">Admin Management Portal</h1>
            </div>
          </div>

          <p className="login-description">
            Sign in to manage fabrication projects, update work gallery photographs, and oversee live portfolio listings.
          </p>

          {/* Active session quick-resume banner */}
          {existingUser && (
            <div className="active-session-banner">
              <div className="active-session-info">
                <IconCheckCircle size={20} className="session-icon" />
                <div>
                  <strong>Active Session Detected</strong>
                  <p>You are already signed in as <span>{existingUser}</span>.</p>
                </div>
              </div>
              <div className="active-session-actions">
                <button
                  type="button"
                  className="btn-continue-session"
                  onClick={handleContinueExisting}
                >
                  Enter Dashboard →
                </button>
                <button
                  type="button"
                  className="btn-switch-account"
                  onClick={handleSwitchAccount}
                >
                  Switch Account
                </button>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} onKeyDown={handleKeyDown}>
            {/* Username Input */}
            <div className="form-group">
              <label htmlFor="login-username">Admin Username</label>
              <div className="input-with-icon">
                <IconUser size={18} className="field-icon" />
                <input
                  id="login-username"
                  type="text"
                  placeholder="e.g. admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
                {username && (
                  <button
                    type="button"
                    className="clear-field-btn"
                    onClick={() => setUsername("")}
                    tabIndex={-1}
                    aria-label="Clear username"
                  >
                    <IconX size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Password Input */}
            <div className="form-group">
              <div className="label-row">
                <label htmlFor="login-password">Password</label>
                {capsLockOn && (
                  <span className="caps-warning">
                    <IconAlertTriangle size={12} />
                    <span>Caps Lock is ON</span>
                  </span>
                )}
              </div>
              <div className="input-with-icon">
                <IconLock size={18} className="field-icon" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your security password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
            </div>

            {/* Options row */}
            <div className="form-options">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="custom-checkmark"></span>
                <span className="checkbox-label">Remember username</span>
              </label>

              <span className="session-info-pill">1-Hour Session Expiry</span>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div className="error-alert" role="alert">
                <IconAlertCircle size={18} className="error-alert-icon" />
                <div className="error-alert-text">
                  <strong>Authentication Failed</strong>
                  <p>{error}</p>
                </div>
                <button
                  type="button"
                  className="error-dismiss-btn"
                  onClick={() => setError("")}
                  aria-label="Dismiss error"
                >
                  <IconX size={14} />
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="btn-spinner"></span>
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Control Center</span>
                  <span className="btn-arrow">→</span>
                </>
              )}
            </button>
          </form>

          {/* Card footer details */}
          <div className="card-footer-info">
            <div className="security-notice">
              <IconLock size={13} />
              <span>Restricted access for DB Metal Fabrication authorized staff only.</span>
            </div>
          </div>
        </div>

        {/* Global Page Footer */}
        <footer className="login-global-footer">
          <p>© {CURRENT_YEAR} DB Metal Fabrication. All system actions are securely logged.</p>
        </footer>
      </div>
    </div>
  );
}

export default AdminLogin;
