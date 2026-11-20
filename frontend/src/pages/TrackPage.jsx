import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../api";

const stages = ["Submitted", "Acknowledged", "In Progress", "Resolved"];

export default function TrackPage() {
  const { complaintId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [id, setId] = useState(complaintId || "");
  const [complaint, setComplaint] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchComplaint = async (value) => {
    if (!value.trim()) return;
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/complaints/${encodeURIComponent(value.trim())}`);
      setComplaint(response.data);
    } catch (err) {
      setComplaint(null);
      setError(err.response?.status === 404 ? "No complaint was found with that ID." : "Could not retrieve the complaint.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (complaintId) fetchComplaint(complaintId);
  }, [complaintId]);

  const search = (event) => {
    event.preventDefault();
    navigate(`/track/${id.trim()}`);
  };

  const stageIndex = complaint ? stages.indexOf(complaint.status) : -1;
  return (
    <div className="page narrow">
      {location.state?.justSubmitted && <div className="alert success">Complaint submitted successfully. Save your complaint ID for tracking.</div>}
      <section className="form-card track-card">
        <span className="eyebrow">Complaint tracking</span>
        <h1>Where is my request?</h1>
        <form className="track-form" onSubmit={search}>
          <input value={id} onChange={(event) => setId(event.target.value.toUpperCase())} placeholder="Enter complaint ID, e.g. CMP-ABC123" required />
          <button className="primary-button" disabled={loading}>{loading ? "Searching..." : "Track"}</button>
        </form>
        {error && <div className="alert error">{error}</div>}
        {complaint && (
          <div className="tracking-result">
            <div className="track-meta">
              <div><span>Complaint ID</span><strong>{complaint.complaint_id}</strong></div>
              <div><span>Current status</span><strong className={`status-text ${complaint.status.toLowerCase().replaceAll(" ", "-")}`}>{complaint.status}</strong></div>
            </div>
            <div className="timeline">
              {stages.map((stage, index) => (
                <div className={index <= stageIndex ? "stage complete" : "stage"} key={stage}>
                  <div className="stage-dot">{index <= stageIndex ? "✓" : ""}</div>
                  <span>{stage}</span>
                </div>
              ))}
            </div>
            <div className="complaint-details">
              <dl><dt>Category</dt><dd>{complaint.category}</dd></dl>
              <dl><dt>Location</dt><dd>{complaint.location}</dd></dl>
              <dl><dt>Priority</dt><dd>{complaint.priority}</dd></dl>
              <dl className="full"><dt>Issue</dt><dd>{complaint.description}</dd></dl>
              {complaint.resolution_notes && <dl className="full"><dt>Resolution notes</dt><dd>{complaint.resolution_notes}</dd></dl>}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
