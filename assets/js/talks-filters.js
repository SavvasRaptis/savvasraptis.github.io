(() => {
  const talksList = document.getElementById("talks-list");
  if (!talksList) {
    return;
  }

  const talkCards = Array.from(talksList.querySelectorAll(".talk-card"));
  if (!talkCards.length) {
    return;
  }

  const searchInput = document.getElementById("talks-search");
  const yearsNav = document.getElementById("talks-years");
  const resultsCount = document.getElementById("talks-results");

  const state = {
    year: "all",
    query: "",
  };

  function parseYearFromHash(hash) {
    const cleanHash = hash.replace(/^#/, "");
    if (!cleanHash) {
      return "all";
    }
    const yearMatch = cleanHash.match(/(?:year-)?(\d{4})/);
    return yearMatch ? yearMatch[1] : "all";
  }

  function updateHash(year) {
    const nextHash = year === "all" ? "" : `#year-${year}`;
    const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`;
    history.replaceState(null, "", nextUrl);
  }

  function yearCounts(cards) {
    const counts = {};
    cards.forEach((card) => {
      const year = card.dataset.year;
      if (year) {
        counts[year] = (counts[year] || 0) + 1;
      }
    });
    return counts;
  }

  function sortedYears(counts) {
    return Object.keys(counts).sort((a, b) => Number(b) - Number(a));
  }

  function renderYearLinks(years, counts, totalCount) {
    if (!yearsNav) {
      return;
    }

    const links = [
      `<button type="button" class="publications-year-link is-active" data-talk-year="all">All years (${totalCount})</button>`,
    ];

    years.forEach((year) => {
      const yearCount = counts[year] || 0;
      links.push(
        `<button type="button" class="publications-year-link" data-talk-year="${year}">${year} (${yearCount})</button>`,
      );
    });

    yearsNav.innerHTML = links.join("");

    yearsNav.querySelectorAll("[data-talk-year]").forEach((button) => {
      button.addEventListener("click", () => {
        state.year = button.dataset.talkYear || "all";
        updateHash(state.year);
        applyFilters();
      });
    });
  }

  function updateActiveYearUi() {
    if (!yearsNav) {
      return;
    }

    yearsNav.querySelectorAll("[data-talk-year]").forEach((button) => {
      const year = button.dataset.talkYear || "all";
      button.classList.toggle("is-active", year === state.year);
    });
  }

  function cardMatches(card) {
    const cardYear = card.dataset.year || "";
    const title = card.dataset.title || "";
    const venue = card.dataset.venue || "";
    const venueCanonical = card.dataset.venueCanonical || "";
    const venueAliases = card.dataset.venueAliases || "";
    const location = card.dataset.location || "";

    if (state.year !== "all" && cardYear !== state.year) {
      return false;
    }

    if (state.query) {
      const haystack = `${title} ${venue} ${venueCanonical} ${venueAliases} ${location}`;
      if (!haystack.includes(state.query)) {
        return false;
      }
    }

    return true;
  }

  function updateYearSectionVisibility() {
    const yearSections = Array.from(talksList.querySelectorAll(".talk-year-section"));
    yearSections.forEach((section) => {
      const hasVisibleCards = Array.from(section.querySelectorAll(".talk-card")).some((card) => card.style.display !== "none");
      section.style.display = hasVisibleCards ? "" : "none";
    });
  }

  function applyFilters() {
    let visibleCount = 0;

    talkCards.forEach((card) => {
      const visible = cardMatches(card);
      card.style.display = visible ? "" : "none";
      if (visible) {
        visibleCount += 1;
      }
    });

    updateYearSectionVisibility();
    updateActiveYearUi();

    if (resultsCount) {
      const suffix = visibleCount === 1 ? "result" : "results";
      resultsCount.textContent = `${visibleCount} ${suffix}`;
    }
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      state.query = searchInput.value.trim().toLowerCase();
      applyFilters();
    });
  }

  const counts = yearCounts(talkCards);
  const years = sortedYears(counts);
  renderYearLinks(years, counts, talkCards.length);

  const hashYear = parseYearFromHash(window.location.hash);
  if (hashYear !== "all" && years.includes(hashYear)) {
    state.year = hashYear;
  } else {
    updateHash("all");
  }

  applyFilters();
})();
