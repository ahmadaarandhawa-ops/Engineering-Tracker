const REED_KEY = "5c50d4a2-b7da-44bb-b88d-ceeb1e4d4cc2";
const ADZUNA_APP_ID = "743c3948";
const ADZUNA_APP_KEY = "c0a2d1782f4a78139d919e6f8f2a53b8";
const REED_AUTH = "Basic " + Buffer.from(`${REED_KEY}:`).toString("base64");

async function fetchReed(keyword, extraParams = {}) {
  try {
    const params = new URLSearchParams({
      keywords: keyword,
      locationName: "United Kingdom",
      resultsToTake: "100",
      ...extraParams,
    });
    const res = await fetch(`https://www.reed.co.uk/api/1.0/search?${params}`, {
      headers: { Authorization: REED_AUTH },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((job) => ({
      id: `reed-${job.jobId}`,
      source: "Reed",
      title: job.jobTitle || "",
      company: job.employerName || "",
      location: job.locationName || "UK",
      salary: formatSalary(job.minimumSalary, job.maximumSalary),
      description: (job.jobDescription || "").replace(/<[^>]+>/g, "").slice(0, 220) + "...",
      url: job.jobUrl || `https://www.reed.co.uk/jobs/${job.jobId}`,
      type: job.contractType || "Full Time",
      posted: job.date || null,
    }));
  } catch {
    return [];
  }
}

async function fetchAdzuna(keyword) {
  try {
    const params = new URLSearchParams({
      app_id: ADZUNA_APP_ID,
      app_key: ADZUNA_APP_KEY,
      results_per_page: "50",
      what: keyword,
      where: "UK",
      sort_by: "date",
    });
    const res = await fetch(`https://api.adzuna.com/v1/api/jobs/gb/search/1?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((job) => ({
      id: `adzuna-${job.id}`,
      source: "Adzuna",
      title: job.title || "",
      company: job.company?.display_name || "Unknown",
      location: job.location?.display_name || "UK",
      salary: formatSalary(job.salary_min, job.salary_max),
      description: (job.description || "").slice(0, 220) + "...",
      url: job.redirect_url || "",
      type: job.contract_time === "part_time" ? "Part Time" : "Full Time",
      posted: job.created || null,
    }));
  } catch {
    return [];
  }
}

async function fetchGitHubInternships() {
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/dev/.github/scripts/listings.json"
    );
    if (!res.ok) throw new Error("not ok");
    const data = await res.json();
    return data
      .filter((job) => {
        const isActive = job.active !== false;
        const isEng = /engineer|software|hardware|mechanical|civil|electrical|aerospace|systems|data/i
          .test((job.title || "") + (job.company_name || ""));
        return isActive && isEng;
      })
      .slice(0, 60)
      .map((job) => ({
        id: `gh-${job.id || job.company_name + job.title}`,
        source: "GitHub",
        title: job.title || "",
        company: job.company_name || "",
        location: Array.isArray(job.locations)
          ? job.locations.slice(0, 2).join(", ")
          : job.locations || "UK / Remote",
        salary: null,
        description: `${job.title} internship at ${job.company_name}. Apply via the link.`,
        url: Array.isArray(job.url) ? job.url[0] : job.url || "",
        type: "Internship",
        posted: job.date_posted || null,
      }));
  } catch {
    return [];
  }
}

function formatSalary(min, max) {
  if (!min && !max) return null;
  const fmt = (n) => (n >= 1000 ? `£${Math.round(n / 1000)}k` : `£${n}`);
  if (min && max) return `${fmt(min)}–${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return null;
}

function dedup(jobs) {
  const seen = new Set();
  return jobs.filter((job) => {
    const key = `${job.title?.toLowerCase().trim()}-${job.company?.toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const KEYWORD_SETS = {
  all: [
    "mechanical engineer",
    "civil engineer",
    "electrical engineer",
    "software engineer",
    "structural engineer",
    "chemical engineer",
    "aerospace engineer",
    "systems engineer",
    "engineering graduate scheme",
    "graduate engineer",
  ],
  internship: [
    "engineering internship",
    "engineer intern",
    "mechanical engineer intern",
    "civil engineer intern",
    "software engineer intern",
    "electrical engineer intern",
    "engineering placement year",
    "engineering summer internship",
  ],
  graduate: [
    "graduate engineer",
    "engineering graduate scheme",
    "graduate mechanical engineer",
    "graduate civil engineer",
    "graduate electrical engineer",
    "graduate software engineer",
    "graduate aerospace engineer",
    "graduate structural engineer",
  ],
};

export const handler = async (event) => {
  const p = event.queryStringParameters || {};
  const filter = p.filter || "all";
  const search = p.search || "";

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=1800",
  };

  try {
    let keywords;
    if (search) {
      keywords = [search, search + " engineer", search + " internship"];
    } else {
      keywords = KEYWORD_SETS[filter] || KEYWORD_SETS.all;
    }

    const reedPromises = keywords.map((kw) =>
      fetchReed(kw, filter === "graduate" ? { graduate: "true" } : {})
    );
    const adzunaPromises = keywords.slice(0, 4).map((kw) => fetchAdzuna(kw));
    const githubPromise =
      filter === "internship" || filter === "all"
        ? fetchGitHubInternships()
        : Promise.resolve([]);

    const [reedResults, adzunaResults, githubJobs] = await Promise.all([
      Promise.all(reedPromises),
      Promise.all(adzunaPromises),
      githubPromise,
    ]);

    const all = [...reedResults.flat(), ...adzunaResults.flat(), ...githubJobs];
    const unique = dedup(all);
    unique.sort((a, b) => new Date(b.posted || 0) - new Date(a.posted || 0));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        jobs: unique.slice(0, 100),
        count: unique.length,
        sources: {
          reed: reedResults.flat().length,
          adzuna: adzunaResults.flat().length,
          github: githubJobs.length,
        },
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};