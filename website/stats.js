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
  const response = await fetch("stats_data.json");
  return await response.json();
}

function renderHeadlineStats(data) {
  const topOpener = data.top_openers[0];
  const topPP = data.top_pp_bowlers[0];
  const topDeath = data.top_death_bowlers[0];
  const topHome = [...data.home_away].sort(
    (a, b) => b.home_advantage - a.home_advantage,
  )[0];

  document.getElementById("stat-best-sr").textContent =
    topOpener.batter + " " + topOpener.strike_rate;
  document.getElementById("stat-best-pp").textContent =
    topPP.bowler + " " + topPP.economy;
  document.getElementById("stat-best-death").textContent =
    topDeath.bowler + " " + topDeath.economy;
  document.getElementById("stat-home-advantage").textContent =
    topHome.team + " +" + topHome.home_advantage + "%";
}

function renderOpenerChart(data) {
  if (charts.opener) charts.opener.destroy();
  const players = [...data.top_openers].sort(
    (a, b) => b.strike_rate - a.strike_rate,
  );

  charts.opener = new Chart(document.getElementById("openerChart"), {
    type: "bar",
    data: {
      labels: players.map((d) => d.batter),
      datasets: [
        {
          label: "Strike Rate",
          data: players.map((d) => d.strike_rate),
          backgroundColor: "#f97316",
        },
        {
          label: "Avg Runs",
          data: players.map((d) => d.avg_runs),
          backgroundColor: "#2563eb",
        },
      ],
    },
    options: {
      indexAxis: "y",
      plugins: { legend: { display: true } },
      scales: {
        x: { title: { display: true, text: "Strike Rate / Avg Runs" } },
      },
    },
  });
}

function renderPPBowlerChart(data) {
  if (charts.ppBowler) charts.ppBowler.destroy();
  const bowlers = [...data.top_pp_bowlers].sort(
    (a, b) => a.economy - b.economy,
  );

  charts.ppBowler = new Chart(document.getElementById("ppBowlerChart"), {
    type: "bar",
    data: {
      labels: bowlers.map((d) => d.bowler),
      datasets: [
        {
          label: "Economy",
          data: bowlers.map((d) => d.economy),
          backgroundColor: "#16a34a",
        },
      ],
    },
    options: {
      indexAxis: "y",
      plugins: { legend: { display: false } },
      scales: { x: { title: { display: true, text: "Economy Rate" }, min: 6 } },
    },
  });
}

function renderDeathBowlerChart(data) {
  if (charts.deathBowler) charts.deathBowler.destroy();
  const bowlers = [...data.top_death_bowlers].sort(
    (a, b) => a.economy - b.economy,
  );

  charts.deathBowler = new Chart(document.getElementById("deathBowlerChart"), {
    type: "bar",
    data: {
      labels: bowlers.map((d) => d.bowler),
      datasets: [
        {
          label: "Economy",
          data: bowlers.map((d) => d.economy),
          backgroundColor: "#dc2626",
        },
      ],
    },
    options: {
      indexAxis: "y",
      plugins: { legend: { display: false } },
      scales: { x: { title: { display: true, text: "Economy Rate" }, min: 6 } },
    },
  });
}

function renderHomeAwayChart(data) {
  if (charts.homeAway) charts.homeAway.destroy();
  const teams = [...data.home_away].sort(
    (a, b) => b.home_advantage - a.home_advantage,
  );

  charts.homeAway = new Chart(document.getElementById("homeAwayChart"), {
    type: "bar",
    data: {
      labels: teams.map((d) => d.team),
      datasets: [
        {
          label: "Home Win %",
          data: teams.map((d) => d.home_win_pct),
          backgroundColor: teams.map((d) => teamColors[d.team] || "#94a3b8"),
        },
        {
          label: "Away Win %",
          data: teams.map((d) => d.away_win_pct),
          backgroundColor: teams.map(
            (d) => (teamColors[d.team] || "#94a3b8") + "66",
          ),
        },
      ],
    },
    options: {
      indexAxis: "y",
      plugins: { legend: { display: true } },
      scales: {
        x: { title: { display: true, text: "Win %" }, min: 30, max: 75 },
      },
    },
  });
}

function renderTossVenueChart(data) {
  if (charts.tossVenue) charts.tossVenue.destroy();
  const venues = [...data.toss_by_venue].sort(
    (a, b) => b.toss_win_pct - a.toss_win_pct,
  );

  charts.tossVenue = new Chart(document.getElementById("tossVenueChart"), {
    type: "bar",
    data: {
      labels: venues.map((d) => d.venue),
      datasets: [
        {
          label: "Toss Win %",
          data: venues.map((d) => d.toss_win_pct),
          backgroundColor: venues.map((d) =>
            d.toss_win_pct > 55
              ? "#f97316"
              : d.toss_win_pct < 45
                ? "#2563eb"
                : "#94a3b8",
          ),
        },
      ],
    },
    options: {
      indexAxis: "y",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              ctx.raw + "% (" + venues[ctx.dataIndex].matches + " matches)",
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: "Toss Winner Win %" },
          min: 30,
          max: 75,
        },
      },
    },
  });
}

function renderBestVenueChart(data) {
  if (charts.bestVenue) charts.bestVenue.destroy();
  const teams = [...data.best_venues].sort((a, b) => b.win_pct - a.win_pct);

  charts.bestVenue = new Chart(document.getElementById("bestVenueChart"), {
    type: "bar",
    data: {
      labels: teams.map((d) => d.team),
      datasets: [
        {
          label: "Win % at Best Venue",
          data: teams.map((d) => d.win_pct),
          backgroundColor: teams.map((d) => teamColors[d.team] || "#94a3b8"),
        },
      ],
    },
    options: {
      indexAxis: "y",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const t = teams[ctx.dataIndex];
              return (
                t.win_pct +
                "% at " +
                t.best_venue +
                " (" +
                t.wins +
                "/" +
                t.matches +
                ")"
              );
            },
          },
        },
      },
      scales: {
        x: { title: { display: true, text: "Win %" }, min: 40, max: 100 },
      },
    },
  });
}

loadData().then((data) => {
  renderHeadlineStats(data);
  renderOpenerChart(data);
  renderPPBowlerChart(data);
  renderDeathBowlerChart(data);
  renderHomeAwayChart(data);
  renderTossVenueChart(data);
  renderBestVenueChart(data);
});
