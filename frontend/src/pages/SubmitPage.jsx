import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

const categories = ["Projectors", "Wi-Fi", "Drinking Water", "Lab Equipment", "Washrooms", "Hostel Maintenance", "Other"];

export default function SubmitPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", student_id: "", category: "", location: "", description: "", priority: "Medium" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/complaints", form);
      navigate(`/track/${response.data.complaint_id}`, { state: { justSubmitted: true } });
    } catch (err) {
      setError(err.response?.data?.detail || "Could not submit your complaint. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <section className="hero">
        <div>
          <span className="eyebrow">Student support portal</span>
          <h1>Report it. Track it.<br /><em>Get it resolved.</em></h1>
          <p>Tell us what needs attention anywhere on campus. You can track every update using a single complaint ID.</p>
        </div>
        <div className="hero-stat"><strong>Simple</strong><span>3-step resolution</span></div>
      </section>

      <section className="form-card">
        <div className="section-heading">
          <span>01</span>
          <div><h2>Submit a complaint</h2><p>All fields marked with * are required</p></div>
        </div>
        {error && <div className="alert error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-grid">
            <label>Full name *<input name="name" value={form.name} onChange={update} minLength="2" required placeholder="Enter your name" /></label>
            <label>Student / staff ID<input name="student_id" value={form.student_id} onChange={update} placeholder="Optional" /></label>
            <label>Issue category *<select name="category" value={form.category} onChange={update} required><option value="">Select category</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Location *<input name="location" value={form.location} onChange={update} minLength="2" required placeholder="Building, room or area" /></label>
            <label>Priority<select name="priority" value={form.priority} onChange={update}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label>
            <label className="full">Describe the issue *<textarea name="description" value={form.description} onChange={update} minLength="10" maxLength="3000" required placeholder="Explain what happened and how it affects campus users..." /></label>
          </div>
          <button className="primary-button" disabled={loading}>{loading ? "Submitting..." : "Submit complaint"} <span>→</span></button>
        </form>
      </section>
    </div>
  );
}
