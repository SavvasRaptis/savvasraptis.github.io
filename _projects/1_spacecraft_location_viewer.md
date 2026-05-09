---
layout: page
title: Spacecraft Location Viewer
description: Interactive dashboard for heliophysics and magnetospheric spacecraft trajectories.
importance: 1
permalink: /projects/spacecraft-location-viewer/
---

This dashboard shows spacecraft trajectories and positions for heliospheric missions.

- Providers: JPL Horizons + SSCWeb (THEMIS/Cluster/Geotail + GOES/Arase/RBSP)
- Technical repositories:
  - [UI](https://github.com/SavvasRaptis/scviewer-ui)
  - [Backend](https://github.com/SavvasRaptis/scviewer-backend)
  - [Data](https://github.com/SavvasRaptis/scviewer-data)

<p class="viewer-launch-wrap">
  <a
    class="viewer-launch-btn"
    href="{{ '/spacecraft-location-viewer/heliospheric-locator/' | relative_url }}"
    target="_blank"
    rel="noopener noreferrer"
  >
    Open Full Dashboard
  </a>
</p>

<iframe
  class="viewer-embed-frame"
  src="{{ '/spacecraft-location-viewer/heliospheric-locator/' | relative_url }}"
  title="Spacecraft Location Viewer"
  loading="lazy"
></iframe>
