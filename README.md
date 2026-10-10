# AvianAcoustics — product page

Static one-page site for the [birdcall-monitoring-system](https://github.com/Harshana1004/birdcall-monitoring-system) project. No build step: `index.html`, `styles.css`, `main.js` and `assets/` (clips cut from the project reel, ~13 MB).

## Preview locally

```bash
python -m http.server 8765
```

Then open http://localhost:8765.

## Deploy to GitHub Pages

1. Create a repo (e.g. `avianacoustics`) and push this folder to `main`.
2. Repo **Settings → Pages → Build and deployment**: Source *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. The site appears at `https://<user>.github.io/avianacoustics/`.

To host it from the project repo instead, copy this folder into `docs/` there and pick `main` + `/docs` in step 2.

All paths are relative, so it works under a sub-path. `.nojekyll` stops Jekyll from processing the files.
