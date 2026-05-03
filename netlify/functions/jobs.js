const REED_KEY = "5c50d4a2-b7da-44bb-b88d-ceeb1e4d4cc2";
const ADZUNA_APP_ID = "743c3948";
const ADZUNA_APP_KEY = "c0a2d1782f4a78139d919e6f8f2a53b8";

const ENGINEERING_KEYWORDS = [
  "mechanical engineer",
  "civil engineer",
  "structural engineer",
  "electrical engineer",
  "software engineer",
  "chemical engineer",
  "aerospace engineer",
  "systems engineer",
  "engineering graduate",
  "engineering internship",
  "graduate engineer",
];

async function fetchReed(keyword, graduate) {
  const params = new URLSearchParams({
    keywords: keyword,
    locationName: "United Kingdom",
    resultsToTake: "10",
    ...(graduate ? { graduate: "true" } : {}),
  });

  const url = `https://www.reed.co.uk/api/1.0/search?${params}`;
  const auth = Buffer.from(`${REED_KEY}:`).toString("base64");

  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).map((job) => ({
    id: `reed-${job.jobId}`,
    source: "Reed",
    title: job.jobTitle,
    company: job.employerName,
    location: job.locationName,
    salary:
      job.minimumSalary && job.maximumSalary
        ? `£${Math.round(job.minimumSalary / 1000)}k–£${Math.round(job.maximumSalary / 1000)}k`
        : job.minimumSalary
          ? `£${Math.round(job.minimumSalary / 1000)}k+`
          : null,
    description: job.jobDescription?.slice(0, 200) + "...",
    url: job.jobUrl,
    type: job.contractType || "Full Time",
    posted: job.date,
  }));
}

async function fetchAdzuna(keyword) {
  const params = new URLSearchParams({
    app_id: ADZUNA_APP_ID,
    app_key: ADZUNA_APP_KEY,
    results_per_page: "10",
    what: keyword,
    where: "UK",
    content_type: "application/json",
  });

  const url = `https://api.adzuna.com/v1/api/jobs/gb/search/1?${params}`;

  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).map((job) => ({
    id: `adzuna-${job.id}`,
    source: "Adzuna",
    title: job.title,
    company: job.company?.display_name || "Unknown",
    location: job.location?.display_name || "UK",
    salary:
      job.salary_min && job.salary_max
        ? `£${Math.round(job.salary_min / 1000)}k–£${Math.round(job.salary_max / 1000)}k`
        : null,
    description: job.description?.slice(0, 200) + "...",
    url: job.redirect_url,
    type: job.contract_time === "part_time" ? "Part Time" : "Full Time",
    posted: job.created,
  }));
}

export const handler = async (event) => {
  const params = event.queryStringParameters || {};
  const filter = params.filter || "all"; // all | internship | graduate | permanent
  const search = params.search || "";

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=1800", // cache 30 mins
  };

  try {
    // Pick keywords based on filter
    let keywords;
    if (filter === "internship") {
      keywords = ["engineering internship", "engineer intern", "engineering placement"];
    } else if (filter === "graduate") {
      keywords = ["graduate engineer", "engineering graduate scheme", "graduate mechanical engineer", "graduate civil engineer"];
    } else {
      keywords = search
        ? [search + " engineer"]
        : ["mechanical engineer", "civil engineer", "electrical engineer", "software engineer", "structural engineer"];
    }

    // Fetch from both sources in parallel (limit to 3 keyword queries to avoid rate limits)
    const keywordsToFetch = keywords.slice(0, 3);
    const [reedResults, adzunaResults] = await Promise.all([
      Promise.all(keywordsToFetch.map((kw) => fetchReed(kw, filter === "graduate"))),
      Promise.all(keywordsToFetch.map((kw) => fetchAdzuna(kw))),
    ]);

    const allJobs = [...reedResults.flat(), ...adzunaResults.flat()];

    // Deduplicate by title+company
    const seen = new Set();
    const unique = allJobs.filter((job) => {
      const key = `${job.title?.toLowerCase()}-${job.company?.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by posted date (newest first)
    unique.sort((a, b) => new Date(b.posted || 0) - new Date(a.posted || 0));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ jobs: unique.slice(0, 60), count: unique.length }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
