let charts = {};

const teamColors = {
  "Mumbai Indians": "#6fa9ec",
  "Chennai Super Kings": "#FFFF3C",
  "Royal Challengers Bengaluru": "#EC1C24",
  "Kolkata Knight Riders": "#3A225D",
  "Delhi Capitals": "#17449B",
  "Punjab Kings": "#fe6b72",
  "Rajasthan Royals": "#ff00a2",
  "Sunrisers Hyderabad": "#FF822A",
  "Gujarat Titans": "#035570",
  "Lucknow Super Giants": "#A72056",
};

Chart.defaults.color = "#94a3b8";
Chart.defaults.borderColor = "#2d3548";

async function loadData() {
  const response = await fetch("data.json");
  return await response.json();
}

function renderHeadlineStats(data) {
  const before = data.era_summary.before;
  const after = data.era_summary.after;
  const runsIncrease = (
    (after.avg_runs_inn1 + after.avg_runs_inn2) / 2 -
    (before.avg_runs_inn1 + before.avg_runs_inn2) / 2
  ).toFixed(1);
  const boundaryIncrease = (
    (after.boundary_pct_inn1 + after.boundary_pct_inn2) / 2 -
    (before.boundary_pct_inn1 + before.boundary_pct_inn2) / 2
  ).toFixed(1);
  const wicketsChange = (
    (after.avg_wickets_inn1 + after.avg_wickets_inn2) / 2 -
    (before.avg_wickets_inn1 + before.avg_wickets_inn2) / 2
  ).toFixed(2);
  document.getElementById("stat-runs").textContent = "+" + runsIncrease;
  document.getElementById("stat-boundary").textContent =
    "+" + boundaryIncrease + "%";
  document.getElementById("stat-wickets").textContent = "+" + wicketsChange;
}

function renderExtraStats(data) {
  const s = data.extra_stats;
  document.getElementById("stat-200plus").textContent =
    s.pct_200_plus.before + "% → " + s.pct_200_plus.after + "%";
  document.getElementById("stat-sixes").textContent =
    "+" +
    (s.avg_sixes_per_match.after - s.avg_sixes_per_match.before).toFixed(1);
  document.getElementById("stat-field").textContent =
    s.toss_field_pct.before + "% → " + s.toss_field_pct.after + "%";
}

function renderSeasonChart(data) {
  if (charts.season) charts.season.destroy();
  charts.season = new Chart(document.getElementById("seasonChart"), {
    type: "line",
    data: {
      labels: data.season_trend.map((d) => d.season),
      datasets: [
        {
          label: "Innings 1",
          data: data.season_trend.map((d) => d.total_runs_inn1),
          borderColor: "#2563eb",
          tension: 0.2,
        },
        {
          label: "Innings 2",
          data: data.season_trend.map((d) => d.total_runs_inn2),
          borderColor: "#f97316",
          tension: 0.2,
        },
      ],
    },
  });
}

function renderPhaseChart(data) {
  if (charts.phase) charts.phase.destroy();
  charts.phase = new Chart(document.getElementById("phaseChart"), {
    type: "line",
    data: {
      labels: data.phase_trend.map((d) => d.season),
      datasets: [
        {
          label: "Powerplay",
          data: data.phase_trend.map((d) => d.pp_runs_inn1),
          borderColor: "#16a34a",
          tension: 0.2,
        },
        {
          label: "Middle Overs",
          data: data.phase_trend.map((d) => d.mid_runs_inn1),
          borderColor: "#9333ea",
          tension: 0.2,
        },
        {
          label: "Death Overs",
          data: data.phase_trend.map((d) => d.death_runs_inn1),
          borderColor: "#dc2626",
          tension: 0.2,
        },
      ],
    },
  });
}

function renderRoleChart(data) {
  if (charts.role) charts.role.destroy();
  const roles = ["opener", "middle_order", "lower_order"];
  const before = roles.map(
    (r) =>
      data.role_summary.find((d) => !d.has_impact_player_rule && d.role === r)
        .strike_rate,
  );
  const after = roles.map(
    (r) =>
      data.role_summary.find((d) => d.has_impact_player_rule && d.role === r)
        .strike_rate,
  );
  charts.role = new Chart(document.getElementById("roleChart"), {
    type: "bar",
    data: {
      labels: ["Opener", "Middle Order", "Lower Order"],
      datasets: [
        { label: "Before Rule", data: before, backgroundColor: "#94a3b8" },
        { label: "After Rule", data: after, backgroundColor: "#2563eb" },
      ],
    },
  });
}

function renderTeamChart(data) {
  if (charts.team) charts.team.destroy();
  const teams = data.team_era_avg
    .filter((d) => d.increase !== null)
    .sort((a, b) => b.increase - a.increase);
  charts.team = new Chart(document.getElementById("teamChart"), {
    type: "bar",
    data: {
      labels: teams.map((d) => d.team),
      datasets: [
        {
          label: "Run Increase",
          data: teams.map((d) => d.increase),
          backgroundColor: teams.map((d) => teamColors[d.team] || "#94a3b8"),
        },
      ],
    },
    options: { indexAxis: "y", plugins: { legend: { display: false } } },
  });
}

function renderHomeVenueChart(data) {
  if (charts.homeVenue) charts.homeVenue.destroy();
  const venues = [...data.home_venue_trend].sort((a, b) => {
    if (a.increase === null) return 1;
    if (b.increase === null) return -1;
    return b.increase - a.increase;
  });
  charts.homeVenue = new Chart(document.getElementById("homeVenueChart"), {
    type: "bar",
    data: {
      labels: venues.map(
        (d) => d.home_team + " (n=" + d.before_n + "→" + d.after_n + ")",
      ),
      datasets: [
        {
          label: "Before",
          data: venues.map((d) => d.before),
          backgroundColor: venues.map(
            (d) => teamColors[d.home_team] || "#94a3b8",
          ),
          barThickness: 14,
        },
        {
          label: "After",
          data: venues.map((d) => d.after),
          backgroundColor: "#f1f5f9",
          barThickness: 14,
        },
      ],
    },
    options: { indexAxis: "y", maintainAspectRatio: false },
  });
}

function renderBowlingPhaseChart(data) {
  if (charts.bowlingPhase) charts.bowlingPhase.destroy();
  const phases = ["powerplay", "middle", "death"];
  const labels = ["Powerplay", "Middle Overs", "Death Overs"];
  const before = phases.map(
    (p) =>
      data.bowling_phase.find((d) => !d.has_impact_player_rule && d.phase === p)
        .economy,
  );
  const after = phases.map(
    (p) =>
      data.bowling_phase.find((d) => d.has_impact_player_rule && d.phase === p)
        .economy,
  );
  charts.bowlingPhase = new Chart(
    document.getElementById("bowlingPhaseChart"),
    {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          { label: "Before Rule", data: before, backgroundColor: "#94a3b8" },
          { label: "After Rule", data: after, backgroundColor: "#dc2626" },
        ],
      },
      options: {
        scales: {
          y: { title: { display: true, text: "Economy Rate (runs/over)" } },
        },
      },
    },
  );
}

function renderBowlingTypeChart(data) {
  if (charts.bowlingType) charts.bowlingType.destroy();
  const types = ["pace", "spin"];
  const labels = ["Pace", "Spin"];
  const beforeEcon = types.map(
    (t) =>
      data.bowling_type.find(
        (d) => !d.has_impact_player_rule && d.bowl_type === t,
      ).economy,
  );
  const afterEcon = types.map(
    (t) =>
      data.bowling_type.find(
        (d) => d.has_impact_player_rule && d.bowl_type === t,
      ).economy,
  );
  const beforeBPW = types.map(
    (t) =>
      data.bowling_type.find(
        (d) => !d.has_impact_player_rule && d.bowl_type === t,
      ).balls_per_wicket,
  );
  const afterBPW = types.map(
    (t) =>
      data.bowling_type.find(
        (d) => d.has_impact_player_rule && d.bowl_type === t,
      ).balls_per_wicket,
  );
  charts.bowlingType = new Chart(document.getElementById("bowlingTypeChart"), {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Economy Before",
          data: beforeEcon,
          backgroundColor: "#94a3b8",
        },
        { label: "Economy After", data: afterEcon, backgroundColor: "#dc2626" },
        {
          label: "Balls/Wicket Before",
          data: beforeBPW,
          backgroundColor: "#60a5fa",
          hidden: true,
        },
        {
          label: "Balls/Wicket After",
          data: afterBPW,
          backgroundColor: "#2563eb",
          hidden: true,
        },
      ],
    },
    options: {
      plugins: { legend: { display: true }, tooltip: { mode: "index" } },
    },
  });
}

function renderWinPctChart(data) {
  if (charts.winPct) charts.winPct.destroy();
  const labels = data.win_pct.map((d) =>
    d.has_impact_player_rule ? "After Rule (2023+)" : "Before Rule",
  );
  charts.winPct = new Chart(document.getElementById("winPctChart"), {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Bat First Win %",
          data: data.win_pct.map((d) => d.bat_first_win_pct),
          backgroundColor: "#2563eb",
        },
        {
          label: "Bat Second Win %",
          data: data.win_pct.map((d) => d.bat_second_win_pct),
          backgroundColor: "#f97316",
        },
      ],
    },
    options: {
      scales: {
        x: { stacked: true },
        y: { stacked: true, max: 100, title: { display: true, text: "Win %" } },
      },
    },
  });
}

function renderTeamStyleChart(data) {
  if (charts.teamStyle) charts.teamStyle.destroy();
  const teams = [...data.team_style].sort(
    (a, b) => b.boundary_increase - a.boundary_increase,
  );
  charts.teamStyle = new Chart(document.getElementById("teamStyleChart"), {
    type: "bar",
    data: {
      labels: teams.map((d) => d.team),
      datasets: [
        {
          label: "Boundary % Increase",
          data: teams.map((d) => d.boundary_increase),
          backgroundColor: teams.map((d) => teamColors[d.team] || "#94a3b8"),
        },
        {
          label: "Dot Ball % Decrease",
          data: teams.map((d) => d.dot_decrease),
          backgroundColor: teams.map(
            (d) => (teamColors[d.team] || "#94a3b8") + "88",
          ),
        },
      ],
    },
    options: { indexAxis: "y", plugins: { legend: { display: true } } },
  });
}

loadData().then((data) => {
  renderHeadlineStats(data);
  renderExtraStats(data);
  renderSeasonChart(data);
  renderPhaseChart(data);
  renderRoleChart(data);
  renderTeamChart(data);
  renderHomeVenueChart(data);
  renderBowlingPhaseChart(data);
  renderBowlingTypeChart(data);
  renderWinPctChart(data);
  renderTeamStyleChart(data);
});
