# Task 1 Report: Leaderboard Recreation

## Goal

Recreate the leaderboard from reference screenshots with high visual and behavioral parity while using only synthetic data.

## Implementation Approach

I implemented the solution as a static web app in task-1 using plain HTML, CSS, and JavaScript.

1. Structure

- Built semantic page sections for header, filter panel, top-3 podium, and expandable ranked list.
- Kept markup intentionally close to screenshot structure so spacing and alignment could be tuned precisely.

2. Styling and visual matching

- Used a tokenized CSS palette to control neutral backgrounds, card borders, blue action color, and podium highlight colors.
- Matched major visual primitives from the screenshots:
  - filter card with three selects and one search input
  - podium with emphasized center champion, rank badges, and ranked blocks
  - rounded leaderboard cards with rank, avatar, details, category counters, total points, and expand controls
  - expanded recent-activity table with category pills and point accents
- Added responsive breakpoints to preserve desktop composition and gracefully adapt on smaller screens.

3. Functional parity

- Implemented all requested interactions from the reference:
  - year filter
  - quarter filter
  - category filter
  - name search
  - combined filtering logic
  - expandable row details per employee
- Ensured stable ranking behavior and deterministic rendering for consistent outputs.

## Data Replacement Strategy

No original leaderboard data is included.

1. Synthetic dataset generation

- Generated a deterministic fake dataset in JavaScript with seeded pseudo-random logic.
- Produced 170 entries to match long-list behavior from the screenshots.

2. Fake identity fields

- Names are procedurally composed from custom fictional first and last name pools.
- Job titles are fictional role labels.
- Department identifiers follow a fabricated code format for realism without reusing real org data.

3. Fake activity history

- Activity entries are synthetically composed from fictional event and topic pools.
- Dates, category labels, counts, and points are generated and sorted chronologically.

4. Compliance safeguards

- Explicitly avoided real names, real titles, and real department names from the source screenshots.
- Re-validated files after edits to ensure source identifiers were not present.

## Tools and Techniques

1. Core technologies

- HTML5
- CSS3
- Vanilla JavaScript

2. Development workflow

- Iterative visual tuning against screenshots
- Deterministic data generation for reproducibility
- Targeted code validation after each phase

## Deployment

Configured GitHub Pages deployment via GitHub Actions workflow.

- Workflow file: .github/workflows/static.yml
- Published artifact: repository root so task-1 is served at:
  - /task-1/

Expected public URL:
https://ramanlahutsin.github.io/Vention-AI-Challenge-2/task-1/
