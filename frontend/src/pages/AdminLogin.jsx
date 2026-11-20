import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/auth/login", credentials);
      localStorage.setItem("campuscare_token", response.data.access_token);
      navigate("/admin/dashboard");
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-card">
        <div className="login-icon">CC</div>
        <span className="eyebrow">Administration</span>
        <h1>Welcome back</h1>
        <p>Sign in to manage campus complaints.</p>
        {error && <div className="alert error">{error}</div>}
        <form onSubmit={submit}>
          <label>Username<input value={credentials.username} onChange={(event) => setCredentials({ ...credentials, username: event.target.value })} required autoComplete="username" /></label>
          <label>Password<input type="password" value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} required autoComplete="current-password" /></label>
          <button className="primary-button" disabled={loading}>{loading ? "Signing in..." : "Sign in"} <span>→</span></button>
        </form>
      </section>
    </div>
  );
}
