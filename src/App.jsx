import { useState, useEffect, useCallback } from "react";

const FILTERS = ["All", "Internship", "Graduate", "Permanent", "Contract"];
const DISCIPLINES = ["All", "Software", "Mechanical", "Civil", "Electrical", "Structural", "Chemical", "Aerospace"];

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

function SortArrow({ col, sortCol, sortDir }) {
  return (
    <span style={{ marginLeft: 4, opacity: sortCol === col ? 1 : 0.3, fontSize: 10 }}>
      {sortCol === col ? (sortDir === "asc" ? "▲" : "▼") : "▲"}
    </span>
  );
}

export default function App() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("All");
  const [discipline, setDiscipline] = useState("All");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [count, setCount] = useState(0);
  const [lastFetched, setLastFetched] = useState(null);
  const [sortCol, setSortCol] = useState("posted");
  const [sortDir, setSortDir] = useState("desc");

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiFilter = filter === "Internship" ? "internship"
        : filter === "Graduate" ? "graduate"
        : "all";
      const params = new URLSearchParams({ filter: apiFilter });
      if (search) params.set("search", search);
      if (discipline !== "All") params.set("search", discipline + " engineer");
      const res = await fetch(`/.netlify/functions/jobs?${params}`);
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setJobs(data.jobs || []);
      setCount(data.count || 0);
      setLastFetched(new Date());
    } catch (err) {
      setError("Couldn't load jobs. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filter, search, discipline]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const sorted = [...jobs].sort((a, b) => {
    let va = a[sortCol] || "";
    let vb = b[sortCol] || "";
    if (sortCol === "posted") { va = new Date(va || 0); vb = new Date(vb || 0); }
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const cols = [
    { key: "source", label: "Source" },
    { key: "company", label: "Company" },
    { key: "title", label: "Programme / Role" },
    { key: "location", label: "Location" },
    { key: "type", label: "Type" },
    { key: "salary", label: "Salary" },
    { key: "posted", label: "Posted" },
  ];

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif", background: "#f5f5f2", minHeight: "100vh", color: "#111" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f5f5f2; }
        table { border-collapse: collapse; width: 100%; }
        th { cursor: pointer; user-select: none; }
        th:hover { background: #e6e6e2 !important; }
        tbody tr:hover td { background: #efefeb !important; }
        a { color: inherit; text-decoration: none; }
        input, select, button { font-family: inherit; }
        ::-webkit-scrollbar { height: 5px; width: 5px; }
        ::-webkit-scrollbar-track { background: #eee; }
        ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }
        @keyframes shimmer { 0%,100% { opacity:.4 } 50% { opacity:.9 } }
      `}</style>

      {/* Nav */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e2de", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 28px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 17, fontWeight: 500, letterSpacing: "-0.02em" }}>EngTrack</span>
            <span style={{ color: "#bbb", fontSize: 13 }}>UK Engineering Jobs & Internships</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {lastFetched && (
              <span style={{ fontSize: 11, color: "#aaa", fontFamily: "'IBM Plex Mono', monospace" }}>
                {count} roles · {lastFetched.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button onClick={fetchJobs} style={{ border: "1px solid #e0e0dc", background: "#fff", borderRadius: 6, padding: "4px 11px", fontSize: 12, cursor: "pointer", color: "#666" }}>
              ↺ Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e2de", padding: "14px 28px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
            <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>UK Engineering Tracker</h1>
            <form onSubmit={handleSearch} style={{ display: "flex", gap: 6 }}>
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search roles, companies..."
                style={{ border: "1px solid #ddd", borderRadius: 6, padding: "5px 11px", fontSize: 13, width: 210, outline: "none" }}
              />
              <button type="submit" style={{ background: "#111", color: "#fff", border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 13, cursor: "pointer" }}>Search</button>
              {search && <button type="button" onClick={() => { setSearch(""); setSearchInput(""); }} style={{ background: "none", border: "1px solid #ddd", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", color: "#888" }}>✕</button>}
            </form>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "#aaa", letterSpacing: "0.06em", fontFamily: "'IBM Plex Mono', monospace", marginRight: 2 }}>TYPE</span>
              {FILTERS.map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: "3px 11px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                  border: filter === f ? "1.5px solid #111" : "1px solid #ddd",
                  background: filter === f ? "#111" : "#fff",
                  color: filter === f ? "#fff" : "#666",
                  fontWeight: filter === f ? 500 : 400,
                }}>
                  {f}
                </button>
              ))}
            </div>
            <div style={{ width: 1, background: "#e2e2de", alignSelf: "stretch" }} />
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "#aaa", letterSpacing: "0.06em", fontFamily: "'IBM Plex Mono', monospace", marginRight: 2 }}>DISCIPLINE</span>
              {DISCIPLINES.map(d => (
                <button key={d} onClick={() => setDiscipline(d)} style={{
                  padding: "3px 11px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                  border: discipline === d ? "1.5px solid #2563eb" : "1px solid #ddd",
                  background: discipline === d ? "#eff6ff" : "#fff",
                  color: discipline === d ? "#2563eb" : "#666",
                  fontWeight: discipline === d ? 500 : 400,
                }}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 28px" }}>
        {error ? (
          <div style={{ background: "#fff", border: "1px solid #fcc", borderRadius: 8, padding: 32, textAlign: "center", color: "#c00" }}>
            <p style={{ marginBottom: 12 }}>{error}</p>
            <button onClick={fetchJobs} style={{ background: "#111", color: "#fff", border: "none", borderRadius: 6, padding: "7px 18px", cursor: "pointer", fontSize: 13 }}>Try Again</button>
          </div>
        ) : (
          <div style={{ background: "#fff", border: "1px solid #e2e2de", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e2e2de" }}>
                    {cols.map(col => (
                      <th key={col.key} onClick={() => handleSort(col.key)} style={{
                        padding: "9px 14px", textAlign: "left", fontSize: 10.5,
                        fontWeight: 600, color: "#888", letterSpacing: "0.05em",
                        textTransform: "uppercase", background: "#f9f9f7",
                        whiteSpace: "nowrap", borderRight: "1px solid #efefeb",
                      }}>
                        {col.label}<SortArrow col={col.key} sortCol={sortCol} sortDir={sortDir} />
                      </th>
                    ))}
                    <th style={{ padding: "9px 14px", fontSize: 10.5, fontWeight: 600, color: "#888", letterSpacing: "0.05em", textTransform: "uppercase", background: "#f9f9f7" }}>
                      Apply
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 14 }).map((_, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f5f5f2" }}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} style={{ padding: "12px 14px" }}>
                            <div style={{ height: 11, borderRadius: 3, background: "#f0f0ec", width: `${35 + (i * 7 + j * 13) % 50}%`, animation: `shimmer 1.4s ease ${i * 0.05}s infinite` }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : sorted.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: 52, textAlign: "center", color: "#aaa", fontSize: 14 }}>
                        No roles found — try adjusting your filters.
                      </td>
                    </tr>
                  ) : sorted.map((job) => (
                    <tr key={job.id} style={{ borderBottom: "1px solid #f5f5f2" }}>
                      <td style={{ padding: "9px 14px", borderRight: "1px solid #f5f5f2" }}>
                        <span style={{
                          fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                          padding: "2px 6px", borderRadius: 3,
                          background: job.source === "Reed" ? "#fff0f0" : job.source === "GitHub" ? "#f0fff4" : "#f0f5ff",
                          color: job.source === "Reed" ? "#b91c1c" : job.source === "GitHub" ? "#166534" : "#1d4ed8",
                          border: `1px solid ${job.source === "Reed" ? "#fecaca" : job.source === "GitHub" ? "#bbf7d0" : "#bfdbfe"}`,
                        }}>
                          {job.source}
                        </span>
                      </td>
                      <td style={{ padding: "9px 14px", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", borderRight: "1px solid #f5f5f2" }}>
                        {job.company}
                      </td>
                      <td style={{ padding: "9px 14px", fontSize: 13, borderRight: "1px solid #f5f5f2", maxWidth: 340 }}>
                        <a href={job.url} target="_blank" rel="noopener noreferrer"
                          style={{ color: "#1d4ed8", fontWeight: 500 }}
                          onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                          onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}>
                          {job.title}
                        </a>
                      </td>
                      <td style={{ padding: "9px 14px", fontSize: 12.5, color: "#666", whiteSpace: "nowrap", borderRight: "1px solid #f5f5f2" }}>
                        {job.location || "—"}
                      </td>
                      <td style={{ padding: "9px 14px", borderRight: "1px solid #f5f5f2" }}>
                        <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 3, background: "#f2f2ef", color: "#666" }}>
                          {job.type || "Full Time"}
                        </span>
                      </td>
                      <td style={{ padding: "9px 14px", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: "#444", whiteSpace: "nowrap", borderRight: "1px solid #f5f5f2" }}>
                        {job.salary || "—"}
                      </td>
                      <td style={{ padding: "9px 14px", fontSize: 11.5, color: "#999", fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "nowrap", borderRight: "1px solid #f5f5f2" }}>
                        {formatDate(job.posted)}
                      </td>
                      <td style={{ padding: "9px 14px" }}>
                        <a href={job.url} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 12, padding: "4px 11px", borderRadius: 5, background: "#111", color: "#fff", display: "inline-block" }}
                          onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
                          onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                          Apply →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!loading && sorted.length > 0 && (
              <div style={{ padding: "10px 16px", borderTop: "1px solid #f0f0ec", fontSize: 11.5, color: "#aaa", display: "flex", justifyContent: "space-between", fontFamily: "'IBM Plex Mono', monospace" }}>
                <span>{sorted.length} roles shown · Reed & Adzuna</span>
                <span>EngTrack · UK Only</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}