let modelData = null;
let charts = {};

const TEAMS = [
  "Mumbai Indians",
  "Chennai Super Kings",
  "Royal Challengers Bengaluru",
  "Kolkata Knight Riders",
  "Delhi Capitals",
  "Punjab Kings",
  "Rajasthan Royals",
  "Sunrisers Hyderabad",
  "Gujarat Titans",
  "Lucknow Super Giants",
];

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
  const response = await fetch("model_data.json");
  modelData = await response.json();
  return modelData;
}

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

function dotProduct(features, coefficients) {
  return features.reduce((sum, val, i) => sum + val * coefficients[i], 0);
}

function predict(team1, team2, venue, tossDecision, season, ppRuns, ppWickets) {
  const hasPP = ppRuns !== null && ppWickets !== null;
  const winnerModel = hasPP ? modelData.winner_pp : modelData.winner_pre;
  const scoreModel = hasPP ? modelData.score_pp : modelData.score_pre;
  const means = hasPP
    ? modelData.feature_means_pp
    : modelData.feature_means_pre;

  // look up historical stats
  const h2hKey = team1 + "|" + team2;
  const h2hRate = modelData.h2h_stats[h2hKey] ?? 0.5;
  const venueAvg =
    modelData.venue_stats[venue] ?? means["venue_avg_score"] ?? 165;
  const venueToss =
    modelData.venue_toss[venue] ?? means["venue_toss_win_rate"] ?? 0.5;
  const team1IsHome = modelData.home_venues[team1] === venue ? 1 : 0;
  const team2IsHome = modelData.home_venues[team2] === venue ? 1 : 0;
  const hasImpact = season >= 2023 ? 1 : 0;
  const tossEnc = tossDecision === "bat" ? 1 : 0;

  // all possible feature values — use means for anything we can't compute live
  const featureValues = {
    toss_decision_enc: tossEnc,
    team1_form_runs_scored: means["team1_form_runs_scored"] ?? 165,
    team1_form_runs_conceded: means["team1_form_runs_conceded"] ?? 160,
    team1_form_win_rate: means["team1_form_win_rate"] ?? 0.5,
    team2_form_runs_scored: means["team2_form_runs_scored"] ?? 165,
    team2_form_runs_conceded: means["team2_form_runs_conceded"] ?? 160,
    team2_form_win_rate: means["team2_form_win_rate"] ?? 0.5,
    team1_h2h_win_rate: h2hRate,
    venue_avg_score: venueAvg,
    venue_toss_win_rate: venueToss,
    team1_is_home: team1IsHome,
    team2_is_home: team2IsHome,
    has_impact_player_rule: hasImpact,
    season: season,
    // V2 new features — use means as defaults
    team1_season_win_rate: means["team1_season_win_rate"] ?? 0.5,
    team2_season_win_rate: means["team2_season_win_rate"] ?? 0.5,
    team1_venue_avg: venueAvg, // best proxy without live data
    team1_bowling_strength: means["team1_bowling_strength"] ?? 8.0,
    team2_bowling_strength: means["team2_bowling_strength"] ?? 8.0,
    team1_sr_vs_spin: means["team1_sr_vs_spin"] ?? 130,
    team1_sr_vs_pace: means["team1_sr_vs_pace"] ?? 130,
  };

  if (hasPP) {
    featureValues["pp_runs_inn1"] = ppRuns;
    featureValues["pp_wickets_inn1"] = ppWickets;
    featureValues["pp_run_rate_inn1"] = parseFloat((ppRuns / 6).toFixed(2));
  }

  // build feature vectors in the exact order the model expects
  const winnerVec = winnerModel.features.map(
    (f) => featureValues[f] ?? means[f] ?? 0,
  );
  const scoreVec = scoreModel.features.map(
    (f) => featureValues[f] ?? means[f] ?? 0,
  );

  const logit =
    dotProduct(winnerVec, winnerModel.coefficients) + winnerModel.intercept;
  const winProb = sigmoid(logit);
  const predictedScore = Math.round(
    dotProduct(scoreVec, scoreModel.coefficients) + scoreModel.intercept,
  );

  return {
    team1WinProb: winProb,
    predictedWinner: winProb >= 0.5 ? team1 : team2,
    predictedScore,
    mode: hasPP ? "Post-Powerplay Prediction" : "Pre-Match Prediction",
  };
}

function renderHeadlineStats(data) {
  const r = data.model_results;
  document.getElementById("stat-pre-acc").textContent =
    (r.winner_pre_acc * 100).toFixed(1) + "%";
  document.getElementById("stat-pp-acc").textContent =
    (r.winner_pp_acc * 100).toFixed(1) + "%";
  document.getElementById("stat-pre-mae").textContent =
    "±" + r.score_pre_mae + " runs";
  document.getElementById("stat-pp-mae").textContent =
    "±" + r.score_pp_mae + " runs";
}

function populateDropdowns(data) {
  const team1Select = document.getElementById("team1");
  const team2Select = document.getElementById("team2");
  const venueSelect = document.getElementById("venue");

  TEAMS.forEach((team) => {
    team1Select.innerHTML += `<option value="${team}">${team}</option>`;
    team2Select.innerHTML += `<option value="${team}">${team}</option>`;
  });

  Object.keys(data.venue_stats)
    .sort()
    .forEach((v) => {
      venueSelect.innerHTML += `<option value="${v}">${v}</option>`;
    });
}

function renderFeatureChart(data) {
  if (charts.feature) charts.feature.destroy();

  const features = [...data.feature_importance].sort(
    (a, b) => Math.abs(a.coefficient) - Math.abs(b.coefficient),
  );

  charts.feature = new Chart(document.getElementById("featureChart"), {
    type: "bar",
    data: {
      labels: features.map((d) => d.feature),
      datasets: [
        {
          label: "Coefficient",
          data: features.map((d) => d.coefficient),
          backgroundColor: features.map((d) =>
            d.coefficient > 0 ? "#2563eb" : "#dc2626",
          ),
        },
      ],
    },
    options: {
      indexAxis: "y",
      plugins: { legend: { display: false } },
      scales: {
        x: {
          title: {
            display: true,
            text: "Coefficient (blue = helps bat first, red = helps bat second)",
          },
        },
      },
    },
  });
}

function renderModelCompChart(data) {
  if (charts.modelComp) charts.modelComp.destroy();
  const r = data.model_results;

  charts.modelComp = new Chart(document.getElementById("modelCompChart"), {
    type: "bar",
    data: {
      labels: ["Pre-Match", "Post-Powerplay"],
      datasets: [
        {
          label: "Winner Accuracy %",
          data: [r.winner_pre_acc * 100, r.winner_pp_acc * 100],
          backgroundColor: ["#94a3b8", "#f97316"],
          yAxisID: "y",
        },
        {
          label: "Score MAE (runs)",
          data: [r.score_pre_mae, r.score_pp_mae],
          backgroundColor: ["#60a5fa", "#2563eb"],
          yAxisID: "y2",
        },
      ],
    },
    options: {
      scales: {
        y: {
          title: { display: true, text: "Winner Accuracy %" },
          min: 40,
          max: 70,
        },
        y2: {
          position: "right",
          title: { display: true, text: "Score MAE (runs)" },
          min: 0,
          max: 40,
        },
      },
    },
  });
}

function setupPredictor() {
  document.getElementById("predict-btn").addEventListener("click", () => {
    const team1 = document.getElementById("team1").value;
    const team2 = document.getElementById("team2").value;
    const venue = document.getElementById("venue").value;
    const tossDecision = document.getElementById("toss-decision").value;
    const season = parseInt(document.getElementById("season").value);
    const ppRunsRaw = document.getElementById("pp-runs").value;
    const ppWicketsRaw = document.getElementById("pp-wickets").value;

    if (!team1 || !team2 || !venue) {
      alert("Please select both teams and a venue.");
      return;
    }
    if (team1 === team2) {
      alert("Please select two different teams.");
      return;
    }

    const ppRuns = ppRunsRaw !== "" ? parseFloat(ppRunsRaw) : null;
    const ppWickets = ppWicketsRaw !== "" ? parseFloat(ppWicketsRaw) : null;

    const result = predict(
      team1,
      team2,
      venue,
      tossDecision,
      season,
      ppRuns,
      ppWickets,
    );

    const winnerColor = teamColors[result.predictedWinner] || "#f97316";
    document.getElementById("pred-winner").textContent = result.predictedWinner;
    document.getElementById("pred-winner").style.color = winnerColor;
    document.getElementById("pred-win-prob").textContent =
      (result.team1WinProb * 100).toFixed(1) + "% chance for " + team1;
    document.getElementById("pred-score").textContent =
      result.predictedScore + " runs";
    document.getElementById("pred-mode").textContent = "⚡ " + result.mode;

    document.getElementById("prediction-result").classList.remove("hidden");
  });
}

loadData().then((data) => {
  renderHeadlineStats(data);
  populateDropdowns(data);
  renderFeatureChart(data);
  renderModelCompChart(data);
  setupPredictor();
});
