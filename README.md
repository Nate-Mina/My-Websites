# My-Websites — GitHub Pages aggregator

This repo generates an index of all repositories under @Nate-Mina that currently have successful GitHub Pages builds.

Setup:
1. Add the workflow and scripts to the repo.
2. (Optional) Create a secret `GH_PAT` if you need to include private repos or want higher rate limits:
   - Scopes: `public_repo` (public-only) or `repo` (private).
3. In this repo's Settings → Pages, set Source to "main branch /docs" and save.
4. The workflow runs daily (and on demand) and updates `docs/index.html`.