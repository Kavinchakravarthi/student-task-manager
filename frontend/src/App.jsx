import { Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import { useState } from "react";
import SubmitPage from "./pages/SubmitPage";
import TrackPage from "./pages/TrackPage";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const loggedIn = Boolean(localStorage.getItem("campuscare_token"));

  const logout = () => {
    localStorage.removeItem("campuscare_token");
    navigate("/");
  };

  return (
    <>
      <header className="topbar">
        <Link className="brand" to="/" aria-label="CampusCare home">
          <span className="brand-mark">CC</span>
          <span>CampusCare</span>
        </Link>
        <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle navigation">☰</button>
        <nav className={open ? "nav open" : "nav"}>
          <Link to="/" onClick={() => setOpen(false)}>Submit complaint</Link>
          <Link to="/track" onClick={() => setOpen(false)}>Track status</Link>
          {loggedIn ? (
            <>
              <Link to="/admin/dashboard" onClick={() => setOpen(false)}>Dashboard</Link>
              <button className="nav-logout" onClick={logout}>Logout</button>
            </>
          ) : (
            <Link className="admin-link" to="/admin/login" onClick={() => setOpen(false)}>Admin login</Link>
          )}
        </nav>
      </header>
      <main>{children}</main>
    </>
  );
}

function ProtectedRoute({ children }) {
  return localStorage.getItem("campuscare_token") ? children : <Navigate to="/admin/login" replace />;
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<SubmitPage />} />
        <Route path="/track" element={<TrackPage />} />
        <Route path="/track/:complaintId" element={<TrackPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
