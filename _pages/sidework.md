---
layout: archive
title: "Side Projects"
permalink: /sidework/
author_profile: true
---

Test

<nbsp>

{% include base_path %}

{% assign ordered_pages = site.sidework | sort:"order_number" %}

{% for post in ordered_pages %}
  {% include archive-single.html type="grid" %}
{% endfor %}
