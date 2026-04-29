(function bootstrapFakeLeaderboardData() {
  function mulberry32(seed) {
    return function random() {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const random = mulberry32(20260429);

  const firstNameParts = [
    'Aren',
    'Bexa',
    'Calen',
    'Dorin',
    'Elya',
    'Faren',
    'Galen',
    'Hiren',
    'Ivara',
    'Joren',
    'Kaela',
    'Lior',
    'Maren',
    'Nexa',
    'Orin',
    'Pavel',
    'Quira',
    'Riven',
    'Soren',
    'Talia',
    'Ulan',
    'Varen',
    'Wexa',
    'Xyra',
    'Yoren',
    'Zalen',
  ];

  const lastNameParts = [
    'Ardell',
    'Brenik',
    'Corvan',
    'Daskin',
    'Eldran',
    'Falcon',
    'Garnet',
    'Halver',
    'Istran',
    'Jasker',
    'Kellor',
    'Lunet',
    'Mavric',
    'Nerith',
    'Orvane',
    'Prism',
    'Quorra',
    'Raskel',
    'Sivren',
    'Torven',
    'Ulric',
    'Voss',
    'Warden',
    'Xandor',
    'Yarrow',
    'Zerik',
  ];

  const rolePool = [
    'Platform Pathfinder',
    'Delivery Catalyst',
    'Quality Navigator',
    'Systems Alchemist',
    'Product Signal Lead',
    'Engineering Orbit Lead',
    'Experience Architect',
    'Flow Reliability Lead',
    'Integration Strategist',
    'Automation Trailblazer',
  ];

  const unitPool = [
    'AX',
    'BR',
    'CY',
    'DN',
    'EV',
    'FX',
    'GL',
    'HN',
    'IR',
    'JT',
    'KV',
    'LM',
    'NX',
    'OP',
    'QZ',
    'RU',
    'SV',
    'TW',
    'UZ',
    'VX',
    'WY',
    'ZX',
  ];

  const activityTitlePool = [
    'Insight Forum',
    'Tech Exchange',
    'Design Huddle',
    'Demo Capsule',
    'Innovation Brief',
    'Cross-Team Sprint Review',
    'Learning Lab',
    'Enablement Jam',
    'Mentorship Sync',
    'Architecture Storyline',
  ];

  const activityTopicPool = [
    'Prompt Workflows',
    'Adaptive Testing',
    'Incident Readiness',
    'Service Blueprint',
    'Developer Onboarding',
    'Data Storytelling',
    'Quality Signals',
    'Collaboration Patterns',
    'Platform Governance',
    'Tooling Acceleration',
  ];

  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  function pick(list) {
    return list[Math.floor(random() * list.length)];
  }

  function makeName(index) {
    const first = firstNameParts[index % firstNameParts.length];
    const last = lastNameParts[(index * 7 + 3) % lastNameParts.length];
    return `${first} ${last}`;
  }

  function makeDepartment(index) {
    const unit = unitPool[index % unitPool.length];
    const u = 1 + (index % 2);
    const d = 1 + (index % 5);
    const g = 1 + ((index * 3) % 4);
    const t = 1 + ((index * 5) % 3);
    return `${unit}.U${u}.D${d}.G${g}.T${t}`;
  }

  function scoreForRank(rank) {
    if (rank === 1) {
      return 548;
    }

    if (rank === 2) {
      return 347;
    }

    if (rank === 3) {
      return 334;
    }

    if (rank === 4) {
      return 329;
    }

    const base = 324 - Math.floor((rank - 4) * 1.73);
    const noise = Math.floor(random() * 4) - 1;
    return Math.max(44, base + noise);
  }

  function formatDate(date) {
    const day = `${date.getDate()}`.padStart(2, '0');
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  function buildRecentActivities(score, year, quarter) {
    const quarterStartMonth = (quarter - 1) * 3;
    const activityCount = Math.max(2, Math.min(5, Math.round(score / 100)));
    const activities = [];

    for (let i = 0; i < activityCount; i += 1) {
      const category = random() > 0.35 ? 'Public Speaking' : 'Learning';
      const points = Math.max(
        8,
        Math.round((score / activityCount) * (0.3 + random() * 0.5)),
      );
      const title = `[${category === 'Public Speaking' ? 'SPK' : 'EDU'}] ${pick(activityTitlePool)}: ${pick(activityTopicPool)}`;
      const day = 1 + Math.floor(random() * 27);
      const monthOffset = Math.floor(random() * 3);
      const activityDate = new Date(year, quarterStartMonth + monthOffset, day);

      activities.push({
        activity: title,
        category,
        date: formatDate(activityDate),
        timestamp: activityDate.getTime(),
        points,
      });
    }

    return activities
      .sort((a, b) => b.timestamp - a.timestamp)
      .map(({ timestamp, ...activity }) => activity);
  }

  const years = [2024, 2025, 2026];
  const quarters = [1, 2, 3, 4];
  const employees = [];

  for (let rank = 1; rank <= 170; rank += 1) {
    const year = years[(rank + 1) % years.length];
    const quarter = quarters[(rank + 2) % quarters.length];
    const totalPoints = scoreForRank(rank);

    const categoryUnits = Math.max(1, Math.round(totalPoints / 32));
    const learningCount = Math.floor(random() * Math.max(2, categoryUnits));
    const publicSpeakingCount = Math.max(0, categoryUnits - learningCount);

    const employee = {
      id: `emp-${rank}`,
      name: makeName(rank),
      title: pick(rolePool),
      departmentCode: makeDepartment(rank),
      avatarUrl: `https://i.pravatar.cc/240?img=${(rank % 70) + 1}`,
      year,
      quarter: `Q${quarter}`,
      totalPoints,
      categoryStats: {
        publicSpeaking: publicSpeakingCount,
        learning: learningCount,
      },
      activities: buildRecentActivities(totalPoints, year, quarter),
    };

    employees.push(employee);
  }

  employees.sort((a, b) => b.totalPoints - a.totalPoints);
  employees.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  window.LEADERBOARD_DATA = employees;
})();
