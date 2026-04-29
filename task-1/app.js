(function initLeaderboardApp() {
  const state = {
    year: 'all',
    quarter: 'all',
    category: 'all',
    query: '',
    expandedId: null,
  };

  const nodes = {
    dropdowns: {
      year: document.querySelector('[data-filter="year"]'),
      quarter: document.querySelector('[data-filter="quarter"]'),
      category: document.querySelector('[data-filter="category"]'),
    },
    searchInput: document.querySelector('#employee-search'),
    podium: document.querySelector('#podium'),
    list: document.querySelector('#leaderboard-list'),
  };

  const dropdownRegistry = {};

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

  const iconEducation = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4 2 9l10 5 8-4v5h2V9L12 4Z" fill="none" stroke="currentColor" stroke-width="2"></path>
      <path d="M6 12v4c0 1.8 2.7 3 6 3s6-1.2 6-3v-4" fill="none" stroke="currentColor" stroke-width="2"></path>
    </svg>
  `;

  const iconPartnership = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="7" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="2"></circle>
      <circle cx="17" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="2"></circle>
      <path d="M4 18v-1c0-2.2 1.8-4 4-4h2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
      <path d="M20 18v-1c0-2.2-1.8-4-4-4h-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
      <path d="M9.5 17h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
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

  function registerDropdowns() {
    Object.entries(nodes.dropdowns).forEach(([filterKey, root]) => {
      if (!root) {
        return;
      }

      const trigger = root.querySelector('.filter-trigger');
      const valueNode = root.querySelector('.filter-trigger-value');
      const panel = root.querySelector('.filter-options');

      if (!trigger || !valueNode || !panel) {
        return;
      }

      dropdownRegistry[filterKey] = {
        root,
        trigger,
        valueNode,
        panel,
        stateKey: root.dataset.stateKey,
        options: [],
      };
    });
  }

  function closeDropdown(filterKey) {
    const dropdown = dropdownRegistry[filterKey];

    if (!dropdown) {
      return;
    }

    dropdown.root.classList.remove('is-open');
    dropdown.trigger.setAttribute('aria-expanded', 'false');
  }

  function closeAllDropdowns(exceptKey = null) {
    Object.keys(dropdownRegistry).forEach((filterKey) => {
      if (filterKey === exceptKey) {
        return;
      }

      closeDropdown(filterKey);
    });
  }

  function focusDropdownOption(filterKey, index) {
    const dropdown = dropdownRegistry[filterKey];

    if (!dropdown) {
      return;
    }

    const optionNodes = [...dropdown.panel.querySelectorAll('.filter-option')];

    if (!optionNodes.length) {
      return;
    }

    const safeIndex = Math.max(0, Math.min(optionNodes.length - 1, index));
    optionNodes[safeIndex].focus();
  }

  function focusSelectedDropdownOption(filterKey) {
    const dropdown = dropdownRegistry[filterKey];

    if (!dropdown) {
      return;
    }

    const selectedIndex = dropdown.options.findIndex(
      (option) => option.value === state[dropdown.stateKey],
    );

    focusDropdownOption(filterKey, selectedIndex >= 0 ? selectedIndex : 0);
  }

  function moveDropdownOptionFocus(filterKey, step) {
    const dropdown = dropdownRegistry[filterKey];

    if (!dropdown) {
      return;
    }

    const optionNodes = [...dropdown.panel.querySelectorAll('.filter-option')];

    if (!optionNodes.length) {
      return;
    }

    const currentIndex = optionNodes.indexOf(document.activeElement);
    const baseIndex = currentIndex === -1 ? 0 : currentIndex;
    const nextIndex =
      (baseIndex + step + optionNodes.length) % optionNodes.length;

    optionNodes[nextIndex].focus();
  }

  function openDropdown(filterKey, focusSelected = false) {
    const dropdown = dropdownRegistry[filterKey];

    if (!dropdown) {
      return;
    }

    closeAllDropdowns(filterKey);
    dropdown.root.classList.add('is-open');
    dropdown.trigger.setAttribute('aria-expanded', 'true');

    if (focusSelected) {
      focusSelectedDropdownOption(filterKey);
    }
  }

  function setDropdownSelection(filterKey, value, shouldRender = true) {
    const dropdown = dropdownRegistry[filterKey];

    if (!dropdown) {
      return;
    }

    const selected =
      dropdown.options.find((option) => option.value === String(value)) ||
      dropdown.options[0];

    if (!selected) {
      return;
    }

    state[dropdown.stateKey] = selected.value;
    dropdown.valueNode.textContent = selected.label;

    dropdown.panel.querySelectorAll('.filter-option').forEach((optionNode) => {
      const isSelected = optionNode.dataset.value === selected.value;
      optionNode.setAttribute('aria-selected', String(isSelected));
    });

    if (shouldRender) {
      render();
    }
  }

  function populateDropdownOptions(filterKey, options) {
    const dropdown = dropdownRegistry[filterKey];

    if (!dropdown) {
      return;
    }

    dropdown.options = options.map((option) => ({
      value: String(option.value),
      label: String(option.label),
    }));

    dropdown.panel.innerHTML = dropdown.options
      .map(
        (option) => `
          <button
            type="button"
            class="filter-option"
            role="option"
            data-value="${escapeHtml(option.value)}"
            aria-selected="false"
          >
            ${escapeHtml(option.label)}
          </button>
        `,
      )
      .join('');

    setDropdownSelection(filterKey, state[dropdown.stateKey], false);
  }

  function populateFilters(dataset) {
    const years = [...new Set(dataset.map((entry) => entry.year))].sort(
      (a, b) => b - a,
    );

    populateDropdownOptions('year', [
      { value: 'all', label: 'All Years' },
      ...years.map((year) => ({ value: String(year), label: String(year) })),
    ]);

    populateDropdownOptions('quarter', [
      { value: 'all', label: 'All Quarters' },
      ...['Q1', 'Q2', 'Q3', 'Q4'].map((quarter) => ({
        value: quarter,
        label: quarter,
      })),
    ]);

    populateDropdownOptions('category', [
      { value: 'all', label: 'All Categories' },
      ...['Education', 'Public Speaking', 'University Partnership'].map(
        (category) => ({
          value: category,
          label: category,
        }),
      ),
    ]);
  }

  function getFilteredData() {
    return window.LEADERBOARD_DATA.filter((entry) => {
      const yearMatch =
        state.year === 'all' || String(entry.year) === state.year;
      const quarterMatch =
        state.quarter === 'all' || entry.quarter === state.quarter;
      const categoryMatch =
        state.category === 'all' ||
        (state.category === 'Education' && entry.categoryStats.education > 0) ||
        (state.category === 'Public Speaking' &&
          entry.categoryStats.publicSpeaking > 0) ||
        (state.category === 'University Partnership' &&
          entry.categoryStats.universityPartnership > 0);
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

        if (entry.categoryStats.education > 0) {
          metrics.push(`
            <div class="metric">
              ${iconEducation}
              <strong>${entry.categoryStats.education}</strong>
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

        if (entry.categoryStats.universityPartnership > 0) {
          metrics.push(`
            <div class="metric">
              ${iconPartnership}
              <strong>${entry.categoryStats.universityPartnership}</strong>
            </div>
          `);
        }

        return `
          <article class="rank-card ${isExpanded ? 'expanded' : ''}" data-id="${entry.id}">
            <div class="rank-main">
              <div class="rank-value">${index + 1}</div>
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
    Object.entries(dropdownRegistry).forEach(([filterKey, dropdown]) => {
      dropdown.trigger.addEventListener('click', () => {
        if (dropdown.root.classList.contains('is-open')) {
          closeDropdown(filterKey);
          return;
        }

        openDropdown(filterKey);
      });

      dropdown.trigger.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();

          if (dropdown.root.classList.contains('is-open')) {
            closeDropdown(filterKey);
            return;
          }

          openDropdown(filterKey, true);
        }

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          openDropdown(filterKey, true);
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          openDropdown(filterKey, true);
        }
      });

      dropdown.panel.addEventListener('click', (event) => {
        const optionNode = event.target.closest('.filter-option');

        if (!optionNode) {
          return;
        }

        setDropdownSelection(filterKey, optionNode.dataset.value);
        closeDropdown(filterKey);
        dropdown.trigger.focus();
      });

      dropdown.panel.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeDropdown(filterKey);
          dropdown.trigger.focus();
          return;
        }

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          moveDropdownOptionFocus(filterKey, 1);
          return;
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          moveDropdownOptionFocus(filterKey, -1);
          return;
        }

        if (event.key === 'Home') {
          event.preventDefault();
          focusDropdownOption(filterKey, 0);
          return;
        }

        if (event.key === 'End') {
          event.preventDefault();
          const optionCount =
            dropdown.panel.querySelectorAll('.filter-option').length;
          focusDropdownOption(filterKey, optionCount - 1);
          return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
          const focusedOption = event.target.closest('.filter-option');

          if (!focusedOption) {
            return;
          }

          event.preventDefault();
          setDropdownSelection(filterKey, focusedOption.dataset.value);
          closeDropdown(filterKey);
          dropdown.trigger.focus();
        }
      });
    });

    document.addEventListener('click', (event) => {
      const clickedInsideDropdown = Object.values(dropdownRegistry).some(
        (dropdown) => dropdown.root.contains(event.target),
      );

      if (!clickedInsideDropdown) {
        closeAllDropdowns();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeAllDropdowns();
      }
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
    registerDropdowns();
    populateFilters(window.LEADERBOARD_DATA);
    bindEvents();
    render();
  }

  bootstrap();
})();
