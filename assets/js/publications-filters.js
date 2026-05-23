(() => {
  const publicationsList = document.getElementById("publications-list");
  if (!publicationsList) {
    return;
  }

  const publicationRows = Array.from(publicationsList.querySelectorAll(".publication-row"));
  if (!publicationRows.length) {
    return;
  }

  const searchInput = document.getElementById("publications-search");
  const yearsNav = document.getElementById("publications-years");
  const resultsCount = document.getElementById("publications-results");
  const chipButtons = Array.from(document.querySelectorAll("[data-publication-chip]"));

  const state = {
    year: "all",
    chip: "all",
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

  function yearCounts(rows) {
    const counts = {};
    rows.forEach((row) => {
      const year = row.dataset.year;
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
      `<button type="button" class="publications-year-link is-active" data-publication-year="all">All years (${totalCount})</button>`,
    ];

    years.forEach((year) => {
      const yearCount = counts[year] || 0;
      links.push(
        `<button type="button" class="publications-year-link" data-publication-year="${year}">${year} (${yearCount})</button>`,
      );
    });

    yearsNav.innerHTML = links.join("");

    yearsNav.querySelectorAll("[data-publication-year]").forEach((button) => {
      button.addEventListener("click", () => {
        state.year = button.dataset.publicationYear || "all";
        updateHash(state.year);
        applyFilters();
      });
    });
  }

  function updateActiveFiltersUi() {
    chipButtons.forEach((button) => {
      const chip = button.dataset.publicationChip || "all";
      button.classList.toggle("is-active", chip === state.chip);
    });

    if (yearsNav) {
      yearsNav.querySelectorAll("[data-publication-year]").forEach((button) => {
        const year = button.dataset.publicationYear || "all";
        button.classList.toggle("is-active", year === state.year);
      });
    }
  }

  function rowMatchesCurrentNonYearFilters(row) {
    const rowFirstAuthor = row.dataset.firstAuthor === "true";
    const title = row.dataset.title || "";
    const authors = row.dataset.authors || "";

    if (state.chip === "first-author" && !rowFirstAuthor) {
      return false;
    }

    if (state.query) {
      const haystack = `${title} ${authors}`;
      if (!haystack.includes(state.query)) {
        return false;
      }
    }

    return true;
  }

  function rowMatches(row) {
    const rowYear = row.dataset.year || "";

    if (!rowMatchesCurrentNonYearFilters(row)) {
      return false;
    }

    if (state.year !== "all" && rowYear !== state.year) {
      return false;
    }

    return true;
  }

  function updateYearGroupsVisibility() {
    const yearBlocks = Array.from(publicationsList.querySelectorAll("ol.bibliography"));
    yearBlocks.forEach((yearBlock) => {
      const hasVisibleEntries = Array.from(yearBlock.querySelectorAll("li")).some((item) => item.style.display !== "none");
      yearBlock.style.display = hasVisibleEntries ? "" : "none";

      const heading = yearBlock.previousElementSibling;
      if (heading && heading.matches("h2.bibliography")) {
        heading.style.display = hasVisibleEntries ? "" : "none";
      }
    });
  }

  function applyFilters() {
    const countableRows = publicationRows.filter(rowMatchesCurrentNonYearFilters);
    const counts = yearCounts(countableRows);
    const years = sortedYears(counts);

    if (state.year !== "all" && !years.includes(state.year)) {
      state.year = "all";
      updateHash("all");
    }

    renderYearLinks(years, counts, countableRows.length);

    let visibleCount = 0;

    publicationRows.forEach((row) => {
      const item = row.closest("li") || row;
      const visible = rowMatches(row);
      item.style.display = visible ? "" : "none";
      if (visible) {
        visibleCount += 1;
      }
    });

    updateYearGroupsVisibility();
    updateActiveFiltersUi();

    if (resultsCount) {
      const suffix = visibleCount === 1 ? "result" : "results";
      resultsCount.textContent = `${visibleCount} ${suffix}`;
    }
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "readonly");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }

  function setupCitationControls() {
    publicationsList.addEventListener("click", async (event) => {
      const citeButton = event.target.closest(".links .cite");
      if (citeButton) {
        event.preventDefault();
        const container = citeButton.closest(".publication-row") || citeButton.closest(".row");
        if (!container) {
          return;
        }

        const citationBlock = container.querySelector(".citation.hidden");
        const abstractBlock = container.querySelector(".abstract.hidden.open");
        const awardBlock = container.querySelector(".award.hidden.open");
        const bibtexBlock = container.querySelector(".bibtex.hidden.open");

        if (abstractBlock) {
          abstractBlock.classList.remove("open");
        }
        if (awardBlock) {
          awardBlock.classList.remove("open");
        }
        if (bibtexBlock) {
          bibtexBlock.classList.remove("open");
        }

        if (citationBlock) {
          citationBlock.classList.toggle("open");
          citeButton.setAttribute("aria-expanded", citationBlock.classList.contains("open") ? "true" : "false");
        }
        return;
      }

      const copyButton = event.target.closest(".copy-citation");
      if (!copyButton) {
        return;
      }

      event.preventDefault();
      const targetId = copyButton.dataset.copyTarget;
      if (!targetId) {
        return;
      }

      const targetEl = document.getElementById(targetId);
      if (!targetEl) {
        return;
      }

      const text = targetEl.textContent ? targetEl.textContent.trim() : "";
      if (!text) {
        return;
      }

      try {
        await copyToClipboard(text);
        const feedback = copyButton.closest(".citation")?.querySelector(".copy-feedback");
        if (feedback) {
          const label = copyButton.dataset.copyLabel || "Citation";
          feedback.textContent = `${label} copied`;
          window.setTimeout(() => {
            feedback.textContent = "";
          }, 1800);
        }
      } catch (_error) {
        const feedback = copyButton.closest(".citation")?.querySelector(".copy-feedback");
        if (feedback) {
          feedback.textContent = "Copy failed";
          window.setTimeout(() => {
            feedback.textContent = "";
          }, 1800);
        }
      }
    });
  }

  chipButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.chip = button.dataset.publicationChip || "all";
      applyFilters();
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      state.query = searchInput.value.trim().toLowerCase();
      applyFilters();
    });
  }

  const years = sortedYears(yearCounts(publicationRows));

  const hashYear = parseYearFromHash(window.location.hash);
  if (hashYear !== "all" && years.includes(hashYear)) {
    state.year = hashYear;
  } else {
    updateHash("all");
  }

  setupCitationControls();
  applyFilters();
})();
