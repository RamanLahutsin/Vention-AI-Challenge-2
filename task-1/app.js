(function initLeaderboardApp() {
  const state = {
    year: 'all',
    quarter: 'all',
    category: 'all',
    query: '',
    expandedId: null,
  };

  const nodes = {
    yearFilter: document.querySelector('#year-filter'),
    quarterFilter: document.querySelector('#quarter-filter'),
    categoryFilter: document.querySelector('#category-filter'),
    searchInput: document.querySelector('#employee-search'),
    podium: document.querySelector('#podium'),
    list: document.querySelector('#leaderboard-list'),
  };

  const iconStar = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 2.9l2.78 5.63 6.22.91-4.5 4.39 1.06 6.2L12 17.1l-5.56 2.93 1.06-6.2-4.5-4.39 6.22-.91L12 2.9Z" fill="currentColor"></path>
    </svg>
  `;

  const iconChevron = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <polyline points="6 9 12 15 18 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline>
    </svg>
  `;

  const iconSpeaking = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h16v10H4z" fill="none" stroke="currentColor" stroke-width="2"></path>
      <path d="M10 15v3m4-3v3m-6 2h8" fill="none" stroke="currentColor" stroke-width="2"></path>
    </svg>
  `;

  const iconLearning = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4 2 9l10 5 8-4v5h2V9L12 4Z" fill="none" stroke="currentColor" stroke-width="2"></path>
      <path d="M6 12v4c0 1.8 2.7 3 6 3s6-1.2 6-3v-4" fill="none" stroke="currentColor" stroke-width="2"></path>
    </svg>
  `;

  function escapeHtml(raw) {
    return raw
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function populateFilters(dataset) {
    const years = [...new Set(dataset.map((entry) => entry.year))].sort(
      (a, b) => b - a,
    );

    years.forEach((year) => {
      const option = document.createElement('option');
      option.value = String(year);
      option.textContent = String(year);
      nodes.yearFilter.append(option);
    });

    ['Q1', 'Q2', 'Q3', 'Q4'].forEach((quarter) => {
      const option = document.createElement('option');
      option.value = quarter;
      option.textContent = quarter;
      nodes.quarterFilter.append(option);
    });

    ['Public Speaking', 'Learning'].forEach((category) => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      nodes.categoryFilter.append(option);
    });
  }

  function getFilteredData() {
    return window.LEADERBOARD_DATA.filter((entry) => {
      const yearMatch =
        state.year === 'all' || String(entry.year) === state.year;
      const quarterMatch =
        state.quarter === 'all' || entry.quarter === state.quarter;
      const categoryMatch =
        state.category === 'all' ||
        (state.category === 'Public Speaking' &&
          entry.categoryStats.publicSpeaking > 0) ||
        (state.category === 'Learning' && entry.categoryStats.learning > 0);
      const queryMatch = entry.name
        .toLowerCase()
        .includes(state.query.toLowerCase());

      return yearMatch && quarterMatch && categoryMatch && queryMatch;
    }).sort((a, b) => b.totalPoints - a.totalPoints || a.rank - b.rank);
  }

  function renderPodium(filteredData) {
    const topThree = filteredData.slice(0, 3);

    if (!topThree.length) {
      nodes.podium.innerHTML = '';
      return;
    }

    const left = topThree[1];
    const center = topThree[0];
    const right = topThree[2];

    function renderPodiumCard(entry, visualRank) {
      if (!entry) {
        return '<div class="podium-slot podium-empty"></div>';
      }

      const isChampion = visualRank === 1;

      return `
        <article class="podium-slot podium-rank-${visualRank}">
          <div class="podium-person">
            <div class="podium-avatar-wrap">
              <img class="podium-avatar" src="${escapeHtml(entry.avatarUrl)}" alt="${escapeHtml(entry.name)}" loading="lazy" />
              <span class="podium-badge">${visualRank}</span>
            </div>
            <h3 class="podium-name">${escapeHtml(entry.name)}</h3>
            <p class="podium-role">${escapeHtml(entry.title)} (${escapeHtml(entry.departmentCode)})</p>
            <p class="podium-total ${isChampion ? 'podium-total-gold' : 'podium-total-blue'}">
              <span class="score-star">${iconStar}</span>
              <span>${entry.totalPoints}</span>
            </p>
          </div>
          <div class="podium-block">
            <span class="podium-block-rank">${visualRank}</span>
          </div>
        </article>
      `;
    }

    nodes.podium.innerHTML = `
      <div class="podium-grid">
        ${renderPodiumCard(left, 2)}
        ${renderPodiumCard(center, 1)}
        ${renderPodiumCard(right, 3)}
      </div>
    `;
  }

  function renderActivities(entry) {
    return `
      <div class="activities">
        <p class="activities-title">RECENT ACTIVITY</p>
        <table class="activity-table" role="table">
          <thead>
            <tr>
              <th>ACTIVITY</th>
              <th>CATEGORY</th>
              <th>DATE</th>
              <th>POINTS</th>
            </tr>
          </thead>
          <tbody>
            ${entry.activities
              .map(
                (item) => `
                  <tr>
                    <td>${escapeHtml(item.activity)}</td>
                    <td><span class="badge">${escapeHtml(item.category)}</span></td>
                    <td>${escapeHtml(item.date)}</td>
                    <td class="points-cell">+${item.points}</td>
                  </tr>
                `,
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderList(filteredData) {
    if (!filteredData.length) {
      nodes.list.innerHTML =
        '<div class="empty-state">No employees found for the current filters.</div>';
      return;
    }

    nodes.list.innerHTML = filteredData
      .map((entry, index) => {
        const isExpanded = state.expandedId === entry.id;
        const metrics = [];

        if (entry.categoryStats.learning > 0) {
          metrics.push(`
            <div class="metric">
              ${iconLearning}
              <strong>${entry.categoryStats.learning}</strong>
            </div>
          `);
        }

        if (entry.categoryStats.publicSpeaking > 0) {
          metrics.push(`
            <div class="metric">
              ${iconSpeaking}
              <strong>${entry.categoryStats.publicSpeaking}</strong>
            </div>
          `);
        }

        return `
          <article class="rank-card ${isExpanded ? 'expanded' : ''}" data-id="${entry.id}">
            <div class="rank-main">
              <div class="rank-value">${entry.rank}</div>
              <img class="avatar" src="${escapeHtml(entry.avatarUrl)}" alt="${escapeHtml(entry.name)}" loading="lazy" />
              <div>
                <h3 class="person-name">${escapeHtml(entry.name)}</h3>
                <p class="person-role">${escapeHtml(entry.title)} (${escapeHtml(entry.departmentCode)})</p>
              </div>
              <div class="metric-stack">
                ${metrics.join('')}
              </div>
              <div class="score">
                <p class="score-label">TOTAL</p>
                <p class="score-value"><span class="score-star">${iconStar}</span><span>${entry.totalPoints}</span></p>
              </div>
              <button class="toggle-row ${isExpanded ? 'is-open' : ''}" type="button" aria-label="Toggle recent activity" aria-expanded="${isExpanded}" data-toggle="${entry.id}">
                ${iconChevron}
              </button>
            </div>
            ${isExpanded ? renderActivities(entry) : ''}
          </article>
        `;
      })
      .join('');
  }

  function render() {
    const filtered = getFilteredData();

    if (
      state.expandedId &&
      !filtered.some((entry) => entry.id === state.expandedId)
    ) {
      state.expandedId = null;
    }

    renderPodium(filtered);
    renderList(filtered);
  }

  function bindEvents() {
    nodes.yearFilter.addEventListener('change', (event) => {
      state.year = event.target.value;
      render();
    });

    nodes.quarterFilter.addEventListener('change', (event) => {
      state.quarter = event.target.value;
      render();
    });

    nodes.categoryFilter.addEventListener('change', (event) => {
      state.category = event.target.value;
      render();
    });

    nodes.searchInput.addEventListener('input', (event) => {
      state.query = event.target.value.trim();
      render();
    });

    nodes.list.addEventListener('click', (event) => {
      const target = event.target.closest('[data-toggle]');

      if (!target) {
        return;
      }

      const nextId = target.getAttribute('data-toggle');
      state.expandedId = state.expandedId === nextId ? null : nextId;
      render();
    });
  }

  function bootstrap() {
    populateFilters(window.LEADERBOARD_DATA);
    bindEvents();
    render();
  }

  bootstrap();
})();
