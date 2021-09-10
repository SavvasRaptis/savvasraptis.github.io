---
layout: archive
title: "Outreach"
permalink: /outreach/
author_profile: true
header:
  og_image: "NN_preview.png"
---

Below you can find a list of articles I have written that fall in the broader category of outreach and popular science domain.

<nbsp>

{% include base_path %}

{% assign ordered_pages = site.outreach | sort:"order_number" %}

{% for post in ordered_pages %}
  {% include archive-single.html type="grid" %}
{% endfor %}
