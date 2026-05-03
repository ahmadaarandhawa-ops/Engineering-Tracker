import { useState, useEffect, useCallback } from "react";

const FILTERS = [
  { id: "all", label: "All Roles" },
  { id: "internship", label: "Internships" },
  { id: "graduate", label: "Graduate" },
  { id: "permanent", label: "Permanent" },
];

const DISCIPLINES = [
  "All",
  "Software",
  "Mechanical",
  "Civil",
  "Electrical",
  "Structural",
  "Chemical",
  "Aerospace",
];

function timeAgo(dateStr) {
  if (!dateStr) return "Recently";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function SourceBadge({ source }) {
  const style = {
    Reed: { bg: "#2a0808", color: "#ff6666", border: "#cc2222" },
    Adzuna: { bg: "#08082a", color: "#6699ff", border: "#0044aa" },
  }[source] || { bg: "#1a1a2a", color: "#aaa", border: "#333" };

  return (
    <span style={{
      fontSize: "10px",
      fontFamily: "'Space Mono', monospace",
      padding: "2px 7px",
      borderRadius: "4px",
      background: style.bg,
      color: style.color,
      border: `1px solid ${style.border}`,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
    }}>
      {source}
    </span>
  );
}

function JobCard({ job, index }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        cursor: "pointer",
        transition: "border-color 0.2s, transform 0.2s",
        animation: `fadeUp 0.4s ease both`,
        animationDelay: `${Math.min(index * 40, 400)}ms`,
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "var(--accent)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Subtle left accent bar */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: "3px",
        background: "var(--accent)", borderRadius: "3px 0 0 3px", opacity: 0.6,
      }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
            <SourceBadge source={job.source} />
            {job.type && (
              <span style={{
                fontSize: "10px", fontFamily: "'Space Mono', monospace",
                padding: "2px 7px", borderRadius: "4px",
                background: "var(--bg3)", color: "var(--muted)",
                border: "1px solid var(--border)", textTransform: "uppercase",
              }}>
                {job.type}
              </span>
            )}
            <span style={{ fontSize: "11px", color: "var(--muted)", marginLeft: "auto" }}>
              {timeAgo(job.posted)}
            </span>
          </div>
          <h3 style={{
            fontSize: "16px", fontWeight: 600, color: "var(--text)",
            lineHeight: 1.3, marginBottom: "4px",
          }}>
            {job.title}
          </h3>
          <p style={{ fontSize: "13px", color: "var(--muted)" }}>
            {job.company} · {job.location}
          </p>
        </div>
        {job.salary && (
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "13px", color: "var(--accent)",
            whiteSpace: "nowrap", flexShrink: 0,
          }}>
            {job.salary}
          </div>
        )}
      </div>

      {expanded && (
        <div style={{
          fontSize: "13px", color: "var(--muted)", lineHeight: 1.7,
          borderTop: "1px solid var(--border)", paddingTop: "12px",
        }}>
          <p style={{ marginBottom: "12px" }}>{job.description}</p>
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              background: "var(--accent)", color: "#0a0a0f",
              padding: "8px 16px", borderRadius: "8px",
              fontWeight: 600, fontSize: "13px", textDecoration: "none",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            Apply Now →
          </a>
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{
      background: "var(--bg2)", border: "1px solid var(--border)",
      borderRadius: "12px", padding: "20px 24px",
    }}>
      {[80, 60, 40].map((w, i) => (
        <div key={i} style={{
          height: i === 0 ? 16 : 12,
          width: `${w}%`,
          background: "var(--bg3)",
          borderRadius: "4px",
          marginBottom: i < 2 ? "10px" : 0,
          animation: "pulse 1.5s ease infinite",
          animationDelay: `${i * 200}ms`,
        }} />
      ))}
    </div>
  );
}

export default function App() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [discipline, setDiscipline] = useState("All");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [count, setCount] = useState(0);
  const [lastFetched, setLastFetched] = useState(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ filter });
      if (search) params.set("search", search);
      if (discipline !== "All") params.set("search", discipline);

      const res = await fetch(`/.netlify/functions/jobs?${params}`);
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setJobs(data.jobs || []);
      setCount(data.count || 0);
      setLastFetched(new Date());
    } catch (err) {
      setError("Couldn't load jobs right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filter, search, discipline]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; }
      `}</style>

      {/* Header */}
      <header style={{
        borderBottom: "1px solid var(--border)",
        padding: "0 32px",
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(10,10,15,0.95)",
        backdropFilter: "blur(12px)",
      }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: "64px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: 32, height: 32, background: "var(--accent)",
              borderRadius: "8px", display: "flex", alignItems: "center",
              justifyContent: "center",
            }}>
              <span style={{ fontSize: "16px" }}>⚙️</span>
            </div>
            <span style={{
              fontFamily: "'Space Mono', monospace",
              fontWeight: 700, fontSize: "18px", letterSpacing: "-0.02em",
            }}>
              EngTrackr
            </span>
            <span style={{
              fontSize: "11px", color: "var(--muted)",
              fontFamily: "'Space Mono', monospace",
            }}>
              UK Engineering Jobs
            </span>
          </div>

          {lastFetched && (
            <span style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "'Space Mono', monospace" }}>
              Updated {lastFetched.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              {" · "}
              <button onClick={fetchJobs} style={{
                background: "none", border: "none", color: "var(--accent2)",
                cursor: "pointer", fontSize: "11px", fontFamily: "'Space Mono', monospace",
              }}>
                Refresh ↺
              </button>
            </span>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 32px" }}>
        {/* Hero */}
        <div style={{ marginBottom: "40px", animation: "fadeUp 0.5s ease both" }}>
          <h1 style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "clamp(28px, 5vw, 48px)",
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: "12px",
            letterSpacing: "-0.03em",
          }}>
            UK Engineering{" "}
            <span style={{ color: "var(--accent)" }}>Jobs &</span>
            <br />Internships Board
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "15px", maxWidth: 500 }}>
            Live roles from Reed & Adzuna — all disciplines, updated regularly.
            {count > 0 && <strong style={{ color: "var(--text)" }}> {count} roles found.</strong>}
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} style={{
          display: "flex", gap: "10px", marginBottom: "28px",
          animation: "fadeUp 0.5s ease 0.1s both",
        }}>
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search roles, companies, locations..."
            style={{
              flex: 1, background: "var(--bg2)", border: "1px solid var(--border)",
              borderRadius: "10px", padding: "12px 16px", color: "var(--text)",
              fontSize: "14px", fontFamily: "'DM Sans', sans-serif",
              outline: "none", transition: "border-color 0.2s",
            }}
            onFocus={e => e.target.style.borderColor = "var(--accent)"}
            onBlur={e => e.target.style.borderColor = "var(--border)"}
          />
          <button type="submit" style={{
            background: "var(--accent)", color: "#0a0a0f", border: "none",
            borderRadius: "10px", padding: "12px 24px", cursor: "pointer",
            fontWeight: 600, fontSize: "14px", fontFamily: "'DM Sans', sans-serif",
            transition: "opacity 0.2s",
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            Search
          </button>
        </form>

        {/* Filters row */}
        <div style={{
          display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "32px",
          animation: "fadeUp 0.5s ease 0.15s both",
        }}>
          {/* Type filters */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{
                  padding: "7px 14px", borderRadius: "8px", cursor: "pointer",
                  fontSize: "13px", fontWeight: 500, transition: "all 0.2s",
                  background: filter === f.id ? "var(--accent)" : "var(--bg2)",
                  color: filter === f.id ? "#0a0a0f" : "var(--muted)",
                  border: `1px solid ${filter === f.id ? "var(--accent)" : "var(--border)"}`,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ width: "1px", background: "var(--border)", margin: "0 4px" }} />

          {/* Discipline filters */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {DISCIPLINES.map(d => (
              <button
                key={d}
                onClick={() => setDiscipline(d)}
                style={{
                  padding: "7px 14px", borderRadius: "8px", cursor: "pointer",
                  fontSize: "13px", fontWeight: 500, transition: "all 0.2s",
                  background: discipline === d ? "var(--accent2)" : "var(--bg2)",
                  color: discipline === d ? "#0a0a0f" : "var(--muted)",
                  border: `1px solid ${discipline === d ? "var(--accent2)" : "var(--border)"}`,
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {error ? (
          <div style={{
            background: "var(--bg2)", border: "1px solid #aa3333",
            borderRadius: "12px", padding: "32px", textAlign: "center", color: "#ff8888",
          }}>
            <p style={{ marginBottom: "12px" }}>{error}</p>
            <button onClick={fetchJobs} style={{
              background: "var(--accent)", color: "#0a0a0f", border: "none",
              borderRadius: "8px", padding: "8px 20px", cursor: "pointer", fontWeight: 600,
            }}>
              Try Again
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} />)
              : jobs.length === 0
                ? (
                  <div style={{
                    textAlign: "center", padding: "80px 32px",
                    color: "var(--muted)", border: "1px dashed var(--border)", borderRadius: "12px",
                  }}>
                    <p style={{ fontSize: "32px", marginBottom: "12px" }}>🔍</p>
                    <p>No roles found for this filter. Try adjusting your search.</p>
                  </div>
                )
                : jobs.map((job, i) => <JobCard key={job.id} job={job} index={i} />)
            }
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid var(--border)", padding: "24px 32px",
        textAlign: "center", color: "var(--muted)", fontSize: "12px",
        fontFamily: "'Space Mono', monospace",
      }}>
        EngTrackr · Pulling live roles from Reed & Adzuna · UK Engineering Only
      </footer>
    </>
  );
}
