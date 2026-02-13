---
layout: page
permalink: /presentations/
title: presentations
description: Talks, invited seminars, and conference presentations.
nav: true
nav_order: 3
---
{% assign talks_by_year = site.talks | sort: 'date' | reverse | group_by_exp: 'talk', "talk.date | date: '%Y'" %}

<div class="talks-page talks-page-with-filters">
  <aside class="publications-sidebar talks-sidebar" aria-label="Presentation filters">
    <div class="publications-sidebar-inner">
      <label class="publications-filter-label" for="talks-search">Search</label>
      <input
        id="talks-search"
        class="publications-search-input"
        type="search"
        placeholder="Meeting title, talk title, or location"
        autocomplete="off"
      >

      <p class="publications-filter-label">Year</p>
      <nav id="talks-years" class="publications-years-nav" aria-label="Presentation years"></nav>
      <p id="talks-results" class="publications-results-count"></p>
    </div>
  </aside>

  <section class="talks-main" id="talks-list">
    {% for year in talks_by_year %}
      {% if year.items.size > 0 %}
        <section class="talk-year-section" data-year="{{ year.name }}">
          <h2 class="talk-year">{{ year.name }}</h2>
          <div class="talk-grid">
            {% for talk in year.items %}
              {% assign talk_year = talk.date | date: '%Y' %}
              {% assign venue_raw = talk.venue | default: '' %}
              {% assign venue_normalized = venue_raw | downcase %}
              {% assign venue_display = venue_raw %}
              {% assign venue_aliases = venue_normalized %}

              {% if venue_normalized contains 'european geophysical union' or venue_normalized contains 'european geosciences union' or venue_normalized == 'egu 2025' or venue_normalized contains 'egu ' %}
                {% assign venue_display = 'EGU ' | append: talk_year %}
                {% assign venue_aliases = venue_aliases | append: ' | egu | european geophysical union | european geosciences union' %}
              {% elsif venue_normalized contains 'agu' %}
                {% assign venue_display = 'AGU ' | append: talk_year | append: ' Fall Meeting' %}
                {% assign venue_aliases = venue_aliases | append: ' | agu | american geophysical union | fall meeting' %}
              {% elsif venue_normalized contains 'geospace environment modeling' or venue_normalized contains 'gem' %}
                {% assign venue_display = 'GEM ' | append: talk_year %}
                {% assign venue_aliases = venue_aliases | append: ' | gem | geospace environment modeling' %}
              {% elsif venue_normalized contains 'iugg/iaga' or venue_normalized contains 'iaga' %}
                {% assign venue_display = 'IAGA ' | append: talk_year %}
                {% assign venue_aliases = venue_aliases | append: ' | iaga | iugg/iaga | international association of geomagnetism and aeronomy' %}
              {% elsif venue_normalized contains 'cospar' %}
                {% assign venue_display = 'COSPAR ' | append: talk_year %}
                {% assign venue_aliases = venue_aliases | append: ' | cospar | committee on space research' %}
              {% endif %}

              {% assign abstract_url = talk.abstract %}
              {% assign slides_url = talk.paperurl %}
              {% assign ppt_url = talk.ppt %}
              {% assign picture_url = talk.picture %}
              {% assign video_url = talk.video %}
              {% assign youtube_url = talk.youtubelink %}

              {% assign show_abstract = false %}
              {% if abstract_url %}
                {% if abstract_url contains '://' %}
                  {% assign show_abstract = true %}
                {% else %}
                  {% assign abstract_file = abstract_url | split: '?' | first %}
                  {% assign abstract_matches = site.static_files | where: 'path', abstract_file %}
                  {% if abstract_matches.size > 0 %}
                    {% assign show_abstract = true %}
                  {% endif %}
                {% endif %}
              {% endif %}

              {% assign show_slides = false %}
              {% if slides_url %}
                {% if slides_url contains '://' %}
                  {% assign show_slides = true %}
                {% else %}
                  {% assign slides_file = slides_url | split: '?' | first %}
                  {% assign slides_matches = site.static_files | where: 'path', slides_file %}
                  {% if slides_matches.size > 0 %}
                    {% assign show_slides = true %}
                  {% endif %}
                {% endif %}
              {% endif %}

              {% assign show_ppt = false %}
              {% if ppt_url %}
                {% if ppt_url contains '://' %}
                  {% assign show_ppt = true %}
                {% else %}
                  {% assign ppt_file = ppt_url | split: '?' | first %}
                  {% assign ppt_matches = site.static_files | where: 'path', ppt_file %}
                  {% if ppt_matches.size > 0 %}
                    {% assign show_ppt = true %}
                  {% endif %}
                {% endif %}
              {% endif %}

              {% assign show_picture = false %}
              {% if picture_url %}
                {% if picture_url contains '://' %}
                  {% assign show_picture = true %}
                {% else %}
                  {% assign picture_file = picture_url | split: '?' | first %}
                  {% assign picture_matches = site.static_files | where: 'path', picture_file %}
                  {% if picture_matches.size > 0 %}
                    {% assign show_picture = true %}
                  {% endif %}
                {% endif %}
              {% endif %}

              {% assign show_video = false %}
              {% if video_url %}
                {% if video_url contains '://' %}
                  {% assign show_video = true %}
                {% else %}
                  {% assign video_file = video_url | split: '?' | first %}
                  {% assign video_matches = site.static_files | where: 'path', video_file %}
                  {% if video_matches.size > 0 %}
                    {% assign show_video = true %}
                  {% endif %}
                {% endif %}
              {% endif %}

              <article
                class="talk-card"
                data-year="{{ talk_year }}"
                data-title="{{ talk.title | default: '' | downcase | escape }}"
                data-venue="{{ venue_raw | default: '' | downcase | escape }}"
                data-venue-canonical="{{ venue_display | default: '' | downcase | escape }}"
                data-venue-aliases="{{ venue_aliases | default: '' | downcase | escape }}"
                data-location="{{ talk.location | default: '' | downcase | escape }}"
              >
                <div class="talk-heading">
                  <h3 class="talk-title">{{ talk.title }}</h3>
                  {% if talk.category == 'invited' %}
                    <span class="talk-badge invited">Invited</span>
                  {% elsif talk.category == 'seminar' %}
                    <span class="talk-badge seminar">Seminar</span>
                  {% endif %}
                </div>
                <p class="talk-meta"><em>{{ venue_display }}</em></p>
                <p class="talk-meta">
                  {% if talk.location %}{{ talk.location }} | {% endif %}{{ talk.date | date: '%d %b %Y' }}
                </p>
                <div class="talk-links">
                  {% if show_abstract %}
                    {% if abstract_url contains '://' %}
                      <a class="talk-link" href="{{ abstract_url | replace: ' ', '%20' }}" target="_blank" rel="noopener noreferrer">Abstract</a>
                    {% else %}
                      <a class="talk-link" href="{{ abstract_url | replace: ' ', '%20' | relative_url }}" target="_blank" rel="noopener noreferrer">Abstract</a>
                    {% endif %}
                  {% endif %}
                  {% if show_slides %}
                    {% if slides_url contains '://' %}
                      <a class="talk-link" href="{{ slides_url | replace: ' ', '%20' }}" target="_blank" rel="noopener noreferrer">Slides/PDF</a>
                    {% else %}
                      <a class="talk-link" href="{{ slides_url | replace: ' ', '%20' | relative_url }}" target="_blank" rel="noopener noreferrer">Slides/PDF</a>
                    {% endif %}
                  {% endif %}
                  {% if show_ppt %}
                    {% if ppt_url contains '://' %}
                      <a class="talk-link" href="{{ ppt_url | replace: ' ', '%20' }}" target="_blank" rel="noopener noreferrer">PPTX</a>
                    {% else %}
                      <a class="talk-link" href="{{ ppt_url | replace: ' ', '%20' | relative_url }}" target="_blank" rel="noopener noreferrer">PPTX</a>
                    {% endif %}
                  {% endif %}
                  {% if show_picture %}
                    {% if picture_url contains '://' %}
                      <a class="talk-link" href="{{ picture_url | replace: ' ', '%20' }}" target="_blank" rel="noopener noreferrer">Image</a>
                    {% else %}
                      <a class="talk-link" href="{{ picture_url | replace: ' ', '%20' | relative_url }}" target="_blank" rel="noopener noreferrer">Image</a>
                    {% endif %}
                  {% endif %}
                  {% if show_video %}
                    {% if video_url contains '://' %}
                      <a class="talk-link" href="{{ video_url | replace: ' ', '%20' }}" target="_blank" rel="noopener noreferrer">Video</a>
                    {% else %}
                      <a class="talk-link" href="{{ video_url | replace: ' ', '%20' | relative_url }}" target="_blank" rel="noopener noreferrer">Video</a>
                    {% endif %}
                  {% endif %}
                  {% if youtube_url %}
                    <a class="talk-link" href="{{ youtube_url }}" target="_blank" rel="noopener noreferrer">YouTube</a>
                  {% endif %}
                </div>
              </article>
            {% endfor %}
          </div>
        </section>
      {% endif %}
    {% endfor %}
  </section>
</div>

<script defer src="{{ '/assets/js/talks-filters.js' | relative_url | bust_file_cache }}"></script>
