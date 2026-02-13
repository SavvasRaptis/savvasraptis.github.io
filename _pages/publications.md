---
layout: page
permalink: /publications/
title: publications
description: Peer-reviewed publications and selected highlights.
nav: true
nav_order: 2
---
<div class="publications-page">
  <aside class="publications-sidebar" aria-label="Publication filters">
    <div class="publications-sidebar-inner">
      <label class="publications-filter-label" for="publications-search">Search</label>
      <input
        id="publications-search"
        class="publications-search-input"
        type="search"
        placeholder="Title or author"
        autocomplete="off"
      >

      <div class="publication-chip-group" role="group" aria-label="Quick filters">
        <button type="button" class="publication-chip is-active" data-publication-chip="all">All</button>
        <button type="button" class="publication-chip" data-publication-chip="first-author">First-author</button>
      </div>

      <p class="publications-filter-label">Year</p>
      <nav id="publications-years" class="publications-years-nav" aria-label="Publication years"></nav>
      <p id="publications-results" class="publications-results-count"></p>
    </div>
  </aside>

  <section class="publications-main">
    <div class="publications" id="publications-list">
      {% bibliography %}
    </div>
  </section>
</div>

<script defer src="{{ '/assets/js/publications-filters.js' | relative_url | bust_file_cache }}"></script>
