# Content Guide

This site uses a local-first content model:

- Publications: `_bibliography/papers.bib`
- Presentations: `_talks/*.md`
- CV (web version): `_data/cv.yml`
- Side projects: `_projects/*.md`

## Add a publication

1. Add a BibTeX entry to `_bibliography/papers.bib`.
2. Set core fields (`title`, `author`, `year`, `journal`/`booktitle`, `doi`).
3. Add optional website fields as needed (`pdf`, `abstract`, `selected`, `highlights`, `citation_apa`, `bibtex_show`).

## Add a presentation

1. Copy an existing file from `_talks/`.
2. Update front matter fields (`title`, `type`, `venue`, `date`, `location`).
3. Add links as available (`paperurl`, `ppt`, `abstract`, `video`, `youtubelink`).

## File links

- Store local material under `/files/...` (for example `/files/papers/...`, `/files/presentations/...`, `/files/theses/...`).
- Keep links local where possible and avoid legacy-hosted file URLs.
