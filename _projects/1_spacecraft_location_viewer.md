---
layout: page
title: Spacecraft Location Viewer
description: Interactive GSE dashboard for heliophysics and magnetospheric spacecraft trajectories powered by live ephemeris APIs.
importance: 1
permalink: /projects/spacecraft-location-viewer/
---

This dashboard shows multi-scale spacecraft trajectories in **GSE** coordinates with live backend data.

- Source frame: GSE (`x` sunward, `z` ecliptic north, `y = z × x`)
- Units: `km` in API responses
- Providers: JPL Horizons + SSCWeb (for THEMIS/Cluster/Geotail)

<p class="viewer-launch-wrap">
  <a
    class="viewer-launch-btn"
    href="{{ '/assets/1_SCviewer/Spacecraft%20Location%20Viewer/Heliospheric%20Locator.html' | relative_url }}"
    target="_blank"
    rel="noopener noreferrer"
  >
    Open Full Dashboard
  </a>
</p>

<iframe
  class="viewer-embed-frame"
  src="{{ '/assets/1_SCviewer/Spacecraft%20Location%20Viewer/Heliospheric%20Locator.html' | relative_url }}"
  title="Spacecraft Location Viewer"
  loading="lazy"
></iframe>
