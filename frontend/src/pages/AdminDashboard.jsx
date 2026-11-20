import { useEffect, useState } from "react";
import api from "../api";

const statuses = ["Submitted", "Acknowledged", "In Progress", "Resolved"];
const categories = ["All categories", "Projectors", "Wi-Fi", "Drinking Water", "Lab Equipment", "Washrooms", "Hostel Maintenance", "Other"];

export default function AdminDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [summary, setSummary] = useState({});
  const [categoryData, setCategoryData] = useState([]);
  const [filters, setFilters] = useState({ status: "", category: "", priority: "", search: "" });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [statusDraft, setStatusDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;
      if (filters.priority) params.priority = filters.priority;
      if (filters.search) params.search = filters.search;
      const [list, analytics, breakdown] = await Promise.all([
        api.get("/complaints", { params }),
        api.get("/analytics/summary"),
        api.get("/analytics/categories"),
      ]);
      setComplaints(list.data);
      setSummary(analytics.data);
      setCategoryData(breakdown.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("campuscare_token");
        window.location.href = "/admin/login";
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openComplaint = (complaint) => {
    setSelected(complaint);
    setStatusDraft(complaint.status);
    setNotesDraft(complaint.resolution_notes || "");
  };

  const updateComplaint = async (event) => {
    event.preventDefault();
    try {
      await api.patch(`/complaints/${selected.complaint_id}`, {
        status: statusDraft,
        resolution_notes: notesDraft,
      });
      setMessage("Complaint updated successfully.");
      setSelected(null);
      await load();
    } catch (err) {
      setMessage(err.response?.data?.detail || "Could not update complaint.");
    }
  };

  const applyFilters = (event) => {
    event.preventDefault();
    load();
  };

  const maxCategory = Math.max(...categoryData.map((item) => item.count), 1);

  return (
    <div className="dashboard">
      <div className="dashboard-heading">
        <div><span className="eyebrow">Admin workspace</span><h1>Complaint overview</h1></div>
        <button className="primary-button" onClick={load}>Refresh <span>↻</span></button>
      </div>

      {message && <div className="alert success">{message}<button onClick={() => setMessage("")}>×</button></div>}

      <section className="stat-grid">
        <article><span>Total complaints</span><strong>{summary.total ?? 0}</strong><small>All time</small></article>
        <article><span>Open requests</span><strong>{summary.open ?? 0}</strong><small>Needs attention</small></article>
        <article><span>In progress</span><strong>{summary.in_progress ?? 0}</strong><small>Being resolved</small></article>
        <article><span>Resolution rate</span><strong>{summary.resolution_rate ?? 0}%</strong><small>{summary.resolved ?? 0} resolved</small></article>
      </section>

      <section className="dashboard-grid">
        <div className="table-card">
          <div className="table-heading"><h2>All complaints</h2><span>{complaints.length} records</span></div>
          <form className="filters" onSubmit={applyFilters}>
            <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Search ID, name or location" />
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All statuses</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select>
            <select value={filters.category || "All categories"} onChange={(event) => setFilters({ ...filters, category: event.target.value === "All categories" ? "" : event.target.value })}>{categories.map((item) => <option key={item}>{item}</option>)}</select>
            <select value={filters.priority} onChange={(event) => setFilters({ ...filters, priority: event.target.value })}><option value="">All priorities</option><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select>
            <button type="submit">Apply</button>
          </form>
          <div className="table-scroll">
            <table>
              <thead><tr><th>ID</th><th>Issue</th><th>Location</th><th>Priority</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {complaints.map((item) => (
                  <tr key={item.complaint_id}>
                    <td><strong>{item.complaint_id}</strong></td>
                    <td><span>{item.category}</span><small>{item.name}</small></td>
                    <td>{item.location}</td>
                    <td><span className={`priority ${item.priority.toLowerCase()}`}>{item.priority}</span></td>
                    <td><span className={`status-pill ${item.status.toLowerCase().replaceAll(" ", "-")}`}>{item.status}</span></td>
                    <td><button className="row-button" onClick={() => openComplaint(item)} aria-label={`Manage ${item.complaint_id}`}>Manage</button></td>
                  </tr>
                ))}
                {!loading && complaints.length === 0 && <tr><td colSpan="6" className="empty">No complaints match these filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="chart-card">
          <h2>Issues by category</h2>
          <div className="bars">
            {categoryData.map((item) => (
              <div className="bar-row" key={item.category}>
                <div><span>{item.category}</span><strong>{item.count}</strong></div>
                <div className="bar-track"><div style={{ width: `${(item.count / maxCategory) * 100}%` }} /></div>
              </div>
            ))}
            {categoryData.length === 0 && <p className="empty">No category data yet.</p>}
          </div>
        </aside>
      </section>

      {selected && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
          <form className="modal" onSubmit={updateComplaint}>
            <button type="button" className="modal-close" onClick={() => setSelected(null)}>×</button>
            <span className="eyebrow">{selected.complaint_id}</span>
            <h2>Manage complaint</h2>
            <p className="modal-description">{selected.description}</p>
            <label>Status<select value={statusDraft} onChange={(event) => setStatusDraft(event.target.value)}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Resolution notes<textarea value={notesDraft} onChange={(event) => setNotesDraft(event.target.value)} maxLength="3000" placeholder="Add actions taken or next steps..." /></label>
            <button className="primary-button" type="submit">Save update <span>→</span></button>
          </form>
        </div>
      )}
    </div>
  );
}
