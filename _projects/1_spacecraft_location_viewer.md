---
layout: page
title: Spacecraft Location Viewer
description: Interactive dashboard for heliophysics and magnetospheric spacecraft trajectories.
importance: 1
permalink: /projects/spacecraft-location-viewer/
---

This dashboard shows multi-scale spacecraft trajectories in **GSE** coordinates with live backend data.

- Coordinate frame: Geocentric Solar Ecliptic System (GSE) 
- Units: `km` in API responses, adaptable to `Re` and `AU`
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
