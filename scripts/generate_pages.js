#!/usr/bin/env node
// Generate docs/index.html listing repos under GITHUB_USER that have Pages built successfully.

const fs = require('fs');
const username = process.env.GITHUB_USER;
const token = process.env.GH_PAT || process.env.GITHUB_TOKEN || '';
if (!username) {
  console.error('GITHUB_USER (owner username) not set in environment.');
  process.exit(1);
}

const headers = {
  'User-Agent': 'pages-aggregator-script',
  Accept: 'application/vnd.github.v3+json',
};
if (token) headers.Authorization = `token ${token}`;

async function fetchJson(url) {
  const res = await fetch(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed ${url}: ${res.status} ${text}`);
  }
  return res.json();
}

async function fetchAllRepos() {
  let page = 1;
  const out = [];
  while (true) {
    const url = `https://api.github.com/users/${username}/repos?per_page=100&page=${page}&type=owner&sort=updated`;
    const data = await fetchJson(url);
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < 100) break;
    page++;
  }
  return out;
}

(async () => {
  try {
    const repos = await fetchAllRepos();
    const builtPages = [];
    for (const r of repos) {
      try {
        const pages = await fetchJson(`https://api.github.com/repos/${username}/${r.name}/pages`);
        if (!pages) continue; // no pages
        // try to get latest build info
        const build = await fetchJson(`https://api.github.com/repos/${username}/${r.name}/pages/builds/latest`);
        const status = (build && build.status) || pages?.status || 'unknown';
        // treat 'built' as success
        if (status === 'built') {
          builtPages.push({
            name: r.name,
            html_url: pages.html_url || `https://${username}.github.io/${r.name}/`,
            description: r.description || '',
            updated_at: r.updated_at,
          });
        }
      } catch (err) {
        // ignore repos we cannot access; continue
        console.warn(`skip ${r.name}: ${err.message}`);
      }
    }

    builtPages.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${username} — GitHub Pages index</title>
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5;padding:2rem;max-width:900px;margin:auto}
h1{margin-bottom:0.25rem}
ul{padding-left:1.2rem}
.repo-desc{color:#555;font-size:0.95rem}
</style>
</head>
<body>
  <h1>${username} — Deployed GitHub Pages</h1>
  <p>Automatically generated list of repositories with successful Pages builds.</p>
  <ul>
    ${builtPages.map(p => `<li><a href="${p.html_url}" target="_blank" rel="noopener noreferrer">${p.name}</a><div class="repo-desc">${p.description || ''}</div></li>`).join('\n    ')}
  </ul>
  <footer><p>Last updated: ${new Date().toISOString()}</p></footer>
</body>
</html>`;

    if (!fs.existsSync('docs')) fs.mkdirSync('docs');
    const outPath = 'docs/index.html';
    fs.writeFileSync(outPath, html, 'utf8');
    console.log(`Wrote ${outPath} with ${builtPages.length} entries.`);
  } catch (err) {
    console.error('Error:', err);
    process.exit(2);
  }
})();