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
  } catch (err) {
    console.log(`[Reed] Exception for "${keyword}": ${err.message}`);
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
    const url = `https://api.adzuna.com/v1/api/jobs/gb/search/1?${params}`;
    console.log(`[Adzuna] Fetching: "${keyword}"`);
    const res = await fetch(url);
    console.log(`[Adzuna] Status for "${keyword}": ${res.status}`);
    if (!res.ok) {
      const errText = await res.text();
      console.log(`[Adzuna] Error: ${errText}`);
      return [];
    }
    const data = await res.json();
    console.log(`[Adzuna] Got ${data.results?.length || 0} jobs for "${keyword}" (${data.count} total)`);
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
  } catch (err) {
    console.log(`[Adzuna] Exception for "${keyword}": ${err.message}`);
    return [];
  }
}

async function fetchGitHubInternships() {
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/dev/.github/scripts/listings.json"
    );
    if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
    const data = await res.json();
    const filtered = data
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
    console.log(`[GitHub] Got ${filtered.length} internships`);
    return filtered;
  } catch (err) {
    console.log(`[GitHub] Exception: ${err.message}`);
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
  const seenIds = new Set();
  const seenTitleCompany = new Set();
  return jobs.filter((job) => {
    // Always dedupe by exact id
    if (seenIds.has(job.id)) return false;
    seenIds.add(job.id);
    // Also dedupe if same source has exact same title+company
    const tcKey = `${job.source}-${job.title?.toLowerCase().trim()}-${job.company?.toLowerCase().trim()}`;
    if (seenTitleCompany.has(tcKey)) return false;
    seenTitleCompany.add(tcKey);
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

    console.log(`[Handler] filter=${filter} keywords=${keywords.length}`);

    const delay = (ms) => new Promise((r) => setTimeout(r, ms));

    const reedPromises = keywords.map((kw) =>
      fetchReed(kw, filter === "graduate" ? { graduate: "true" } : {})
    );

    // Run Adzuna sequentially with 300ms gaps to avoid 429 rate limiting
    const adzunaKeywords = keywords.slice(0, 4);
    const adzunaResults = [];
    for (const kw of adzunaKeywords) {
      adzunaResults.push(await fetchAdzuna(kw));
      await delay(300);
    }

    const githubPromise =
      filter === "internship" || filter === "all"
        ? fetchGitHubInternships()
        : Promise.resolve([]);

    const [reedResults, githubJobs] = await Promise.all([
      Promise.all(reedPromises),
      githubPromise,
    ]);

    const reedFlat = reedResults.flat();
    const adzunaFlat = adzunaResults.flat();

    console.log(`[Handler] Reed: ${reedFlat.length}, Adzuna: ${adzunaFlat.length}, GitHub: ${githubJobs.length}`);

    const all = [...reedFlat, ...adzunaFlat, ...githubJobs];
    const unique = dedup(all);
    unique.sort((a, b) => new Date(b.posted || 0) - new Date(a.posted || 0));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        jobs: unique.slice(0, 200),
        count: unique.length,
        sources: {
          reed: reedFlat.length,
          adzuna: adzunaFlat.length,
          github: githubJobs.length,
        },
      }),
    };
  } catch (err) {
    console.log(`[Handler] Fatal error: ${err.message}`);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
