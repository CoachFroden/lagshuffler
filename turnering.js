console.log("Turnering lastet");

/* =========================
   GLOBAL STATE
========================= */

let tournament = {
  phase: "series",
  teams: [],
  fixtures: [],
  currentMatch: null,
  table: {}
};

let loanRotation = [];

let timer = {
  duration: 180,      // default 3 minutter
  remaining: 180,
  interval: null,
  running: false
};

/* =========================
   INIT
========================= */

const savedTeams = JSON.parse(
  localStorage.getItem("lagshuffler_teams") || "null"
);

if (!savedTeams) {
  document.getElementById("tournamentContainer").innerHTML =
    "<p>Ingen lag funnet. Gå tilbake og generer lag først.</p>";
} else {
  initializeTournament(savedTeams);
}

function initializeTournament(teams) {
  tournament.teams = teams.map((t, i) => ({
    id: i,
    name: `Lag ${i + 1}`,
    players: t.players
  }));

  tournament.table = {};
  tournament.teams.forEach(team => {
    tournament.table[team.id] = {
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0
    };
  });

  renderOverview();
}

/* =========================
   OVERVIEW
========================= */

function renderOverview() {
  const container = document.getElementById("tournamentContainer");

  container.innerHTML = `
    <div class="controls">
      <button onclick="startSeries()">Start serie</button>
    </div>
  `;
}

/* =========================
   START SERIE
========================= */

function startSeries() {
  tournament.phase = "series";

  tournament.fixtures = generateRoundRobin(tournament.teams);
  tournament.fixtures = scheduleWithNoBackToBack(tournament.fixtures);
  
  tournament.totalSeriesMatches = tournament.fixtures.length;
  tournament.seriesMatchIndex = 0;

  initializeLoanRotation();   // <-- legg til denne
  loadNextMatch();

}

/* =========================
   GENERER ALLE MØTER ALLE
========================= */

function generateRoundRobin(teams) {
  const matches = [];

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matches.push({
        home: teams[i].id,
        away: teams[j].id
      });
    }
  }

  return matches;
}

/* =========================
   SHUFFLE
========================= */

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* =========================
   UNNGÅ BACK-TO-BACK
========================= */

function scheduleWithNoBackToBack(matches) {
  const pool = shuffle(matches);
  const result = [];
  let lastTeams = [];

  while (pool.length) {
    let index = pool.findIndex(m =>
      !lastTeams.includes(m.home) &&
      !lastTeams.includes(m.away)
    );

    if (index === -1) index = 0;

    const next = pool.splice(index, 1)[0];
    result.push(next);
    lastTeams = [next.home, next.away];
  }

  return result;
}

/* =========================
   LAST NESTE KAMP
========================= */

function loadNextMatch() {
if (tournament.fixtures.length === 0) {

  if (tournament.phase === "series") {
    startFinals();
    return;
  }

if (tournament.phase === "finals") {
  showWinnerScreen();
  return;
}

  return;
}

  const match = tournament.fixtures.shift();

if (tournament.phase === "series") {
  tournament.seriesMatchIndex++;
}

  tournament.currentMatch = {
    ...match,
    homeGoals: 0,
    awayGoals: 0,
	finished: true
  };
  
  tournament.currentMatch.loan = assignLoanPlayer(tournament.currentMatch);
  
  timer.remaining = timer.duration;
timer.running = false;
clearInterval(timer.interval);

  renderCurrentMatch();
}

/* =========================
   RENDER AKTIV KAMP
========================= */

function renderCurrentMatch() {
  const container = document.getElementById("tournamentContainer");
  const m = tournament.currentMatch;

  const home = tournament.teams.find(t => t.id === m.home);
  const away = tournament.teams.find(t => t.id === m.away);
  
  let homePlayersHtml = home.players.map(p => p.name).join(", ");
  let awayPlayersHtml = away.players.map(p => p.name).join(", ");

  
if (m.loan) {

  m.loan.home.forEach(player => {
    homePlayersHtml += `, <span style="color:#ef4444;">${player.name}</span>`;
  });

  m.loan.away.forEach(player => {
    awayPlayersHtml += `, <span style="color:#ef4444;">${player.name}</span>`;
  });
}
  
let matchInfo = "";

if (tournament.phase === "series") {
  matchInfo = `<h4 style="text-align:center; margin:0 0 8px;">
    Serie – Kamp ${tournament.seriesMatchIndex} av ${tournament.totalSeriesMatches}
  </h4>`;
}

  container.innerHTML = `




  ${matchInfo}
    <div class="controls">
	
	
    <div style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      font-size:13px;
      opacity:0.7;
      margin-bottom:6px;
    ">
      <span onclick="goHome()" style="cursor:pointer;">← Hjem</span>
      <span onclick="resetTournament()" style="cursor:pointer;">Nullstill</span>
    </div>

      <div style="text-align:center; margin-bottom:10px;">
        <h1 id="matchTimer">${formatTime(timer.remaining)}</h1>

        <div style="margin:6px 0;">
          <button onclick="changeDuration(-60)">-1 min</button>
          <button onclick="changeDuration(60)">+1 min</button>
        </div>

        <div>
          <button onclick="startTimer()">Start</button>
          <button onclick="pauseTimer()">Pause</button>
          <button onclick="resetTimer()">Reset</button>
        </div>
      </div>

      <div style="display:flex; justify-content:space-around; align-items:center; margin:20px 0;">

        <div style="text-align:center;">
  <h3>${home.name}</h3>
  <div style="font-size:12px; opacity:0.7; margin-bottom:6px;">
    ${homePlayersHtml}
  </div>
  <button class="goal-btn plus" onclick="addGoal('home')">+</button>
  <div class="score">${m.homeGoals}</div>
  <button class="goal-btn minus" onclick="removeGoal('home')">−</button>
</div>

        <div style="text-align:center; padding:0 10px;">
          <h2 style="margin:0;">
            ${
              m.type === "bronze" ? "🥉 BRONSEFINALE" :
              m.type === "final" ? "🥇 FINALE" :
              "Serie"
            }
          </h2>
        </div>

     <div style="text-align:center;">
  <h3>${away.name}</h3>
  <div style="font-size:12px; opacity:0.7; margin-bottom:6px;">
    ${awayPlayersHtml}
  </div>
  <button class="goal-btn plus" onclick="addGoal('away')">+</button>
  <div class="score">${m.awayGoals}</div>
  <button class="goal-btn minus" onclick="removeGoal('away')">−</button>
</div>

      </div>

      <button 
        onclick="confirmResult()" 
        ${tournament.currentMatch.finished ? "" : "disabled"}
      >
        Godkjenn resultat
      </button>

    </div>
	${renderUpcomingMatches()}

    ${renderTable()}
  `;
}


/* =========================
   MÅLKNAPPER
========================= */

function addGoal(team) {
  if (team === "home") {
    tournament.currentMatch.homeGoals++;
  } else {
    tournament.currentMatch.awayGoals++;
  }
  renderCurrentMatch();
}

function removeGoal(team) {
  if (team === "home" && tournament.currentMatch.homeGoals > 0) {
    tournament.currentMatch.homeGoals--;
  }

  if (team === "away" && tournament.currentMatch.awayGoals > 0) {
    tournament.currentMatch.awayGoals--;
  }

  renderCurrentMatch();
}

/* =========================
   GODKJENN RESULTAT
========================= */

function confirmResult() {
  const m = tournament.currentMatch;
  const table = tournament.table;

  table[m.home].played++;
  table[m.away].played++;

  table[m.home].goalsFor += m.homeGoals;
  table[m.home].goalsAgainst += m.awayGoals;

  table[m.away].goalsFor += m.awayGoals;
  table[m.away].goalsAgainst += m.homeGoals;

  if (m.homeGoals > m.awayGoals) {
    table[m.home].wins++;
    table[m.home].points += 3;
    table[m.away].losses++;
  } else if (m.homeGoals < m.awayGoals) {
    table[m.away].wins++;
    table[m.away].points += 3;
    table[m.home].losses++;
  } else {
    table[m.home].draws++;
    table[m.away].draws++;
    table[m.home].points++;
    table[m.away].points++;
  }
  
  renderTable();
  loadNextMatch();
}

function startFinals() {
  tournament.phase = "finals";

  const sorted = getSortedTable();

  if (sorted.length < 4) {
    startFreeplay();
    return;
  }

  tournament.fixtures = [
    { home: sorted[2].id, away: sorted[3].id, type: "bronze" },
    { home: sorted[0].id, away: sorted[1].id, type: "final" }
  ];

  loadNextMatch();
}

function getSortedTable() {
  return tournament.teams
    .map(team => ({
      id: team.id,
      name: team.name,
      ...tournament.table[team.id],
      goalDiff:
        tournament.table[team.id].goalsFor -
        tournament.table[team.id].goalsAgainst
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
      return b.goalsFor - a.goalsFor;
    });
}

function renderTable() {
  const sorted = getSortedTable();

  let html = `
    <div class="controls" style="margin-top:20px;">
      <h2>Tabell</h2>
      <table style="width:100%; text-align:center; border-collapse:collapse;">
        <tr>
          <th>Lag</th>
          <th>K</th>
          <th>MF</th>
          <th>P</th>
        </tr>
  `;

sorted.forEach(row => {
  html += `
    <tr data-team-name="${row.name}">
      <td>
        <span 
          style="cursor:pointer; font-weight:600;"
          onclick="toggleTeamDetails('${row.name}')"
        >
          ${row.name}
        </span>
      </td>
      <td>${row.played}</td>
      <td>${row.goalDiff}</td>
      <td><strong>${row.points}</strong></td>
    </tr>
  `;
});

  html += "</table></div>";

  return html;
}

function startTimer() {
  if (timer.running) return;

  timer.running = true;

  timer.interval = setInterval(() => {
    timer.remaining--;
    updateTimerDisplay();

    if (timer.remaining <= 0) {
      clearInterval(timer.interval);
      timer.running = false;
      tournament.currentMatch.finished = true;
      updateTimerDisplay();
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timer.interval);
  timer.running = false;
}

function resetTimer() {
  clearInterval(timer.interval);
  timer.running = false;
  timer.remaining = timer.duration;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const el = document.getElementById("matchTimer");
  if (!el) return;

  el.textContent = formatTime(timer.remaining);

  if (timer.remaining <= 0) {
    el.style.color = "#ef4444"; // rød
  } else {
    el.style.color = "#e5e7eb"; // normal
  }
}

function changeDuration(delta) {
  timer.duration += delta;

  if (timer.duration < 30) timer.duration = 30;
  if (timer.duration > 900) timer.duration = 900;

  timer.remaining = timer.duration;
  updateTimerDisplay();
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function startFreeplay() {
  tournament.phase = "freeplay";

  document.getElementById("tournamentContainer").innerHTML = `
    <div class="controls">
      <h2>🎉 Turnering ferdig</h2>
      <button onclick="startFreeMatch()">Ny kamp</button>
    </div>
    ${renderTable()}
  `;
}

function startFreeMatch() {
  const sortedByPlayed = [...tournament.teams]
    .sort((a, b) =>
      tournament.table[a.id].played -
      tournament.table[b.id].played
    );

  const home = sortedByPlayed[0];
  const away = sortedByPlayed[1];

  tournament.currentMatch = {
    home: home.id,
    away: away.id,
    homeGoals: 0,
    awayGoals: 0,
	finished: false
  };

  timer.remaining = timer.duration;
  timer.running = false;
  clearInterval(timer.interval);

  renderCurrentMatch();
}

function goHome() {
  window.location.href = "index.html";
}

function resetTournament() {
  if (!confirm("Er du sikker på at du vil nullstille turneringen?")) return;

  initializeTournament(
    JSON.parse(localStorage.getItem("lagshuffler_teams"))
  );
}

function showWinnerScreen() {
  const sorted = getSortedTable();
  const winner = sorted[0];

  const team = tournament.teams.find(t => t.id === winner.id);
  const playerNames = team.players.map(p => p.name).join(", ");

  document.getElementById("tournamentContainer").innerHTML = `
    <div class="controls" style="position:relative; overflow:hidden; text-align:center; padding:40px 20px;">
      
      <h1 style="font-size:42px; margin-bottom:10px;">
        🏆 VINNER
      </h1>

      <h2 style="font-size:36px; margin:10px 0;">
        ${team.name.toUpperCase()}
      </h2>

      <div style="opacity:0.8; margin-bottom:20px;">
        ${playerNames}
      </div>

   <canvas id="confettiCanvas"
  style="
    position:absolute;
    top:0;
    left:0;
    width:100%;
    height:100%;
    pointer-events:none;
  ">
</canvas>


      <div style="margin-top:30px;">
        <button onclick="startFreeplay()">Fortsett med frispill</button>
      </div>

    </div>

    ${renderTable()}
  `;

  startFireworks();
}

function startFireworks() {
  const canvas = document.getElementById("confettiCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  const pieces = [];
  const colors = ["#22c55e", "#06b6d4", "#facc15", "#ef4444", "#a855f7"];

  for (let i = 0; i < 120; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      size: Math.random() * 8 + 4,
      speedY: Math.random() * 3 + 2,
      speedX: Math.random() * 2 - 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360
    });
  }

  function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    pieces.forEach(p => {
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += 5;

      if (p.y > canvas.height) {
        p.y = -10;
        p.x = Math.random() * canvas.width;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
      ctx.restore();
    });

    requestAnimationFrame(update);
  }

  update();

  // Stopp etter 6 sekunder
  setTimeout(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, 6000);
}

function renderUpcomingMatches() {

  if (tournament.phase !== "series") return "";

  const next1 = tournament.fixtures[0];
  const next2 = tournament.fixtures[1];

  let html = `<div style="
      margin-top:14px;
      text-align:center;
    ">`;

  if (next1) {
    const teamA = tournament.teams.find(t => t.id === next1.home);
    const teamB = tournament.teams.find(t => t.id === next1.away);

    html += `
      <div style="
        font-size:15px;
        font-weight:600;
        color:#22c55e;
        margin-bottom:4px;
      ">
        Neste: ${teamA.name} vs ${teamB.name}
      </div>
    `;
  }

  if (next2) {
    const teamA = tournament.teams.find(t => t.id === next2.home);
    const teamB = tournament.teams.find(t => t.id === next2.away);

    html += `
      <div style="
        font-size:13px;
        opacity:0.6;
      ">
        Deretter: ${teamA.name} vs ${teamB.name}
      </div>
    `;
  }

  html += `</div>`;

  return html;
}

function initializeLoanRotation() {

  const sizeCount = {};
  tournament.teams.forEach(t => {
    const size = t.players.length;
    sizeCount[size] = (sizeCount[size] || 0) + 1;
  });

  let targetSize = null;
  let maxCount = 0;

  for (const size in sizeCount) {
    if (sizeCount[size] > maxCount) {
      maxCount = sizeCount[size];
      targetSize = parseInt(size, 10);
    }
  }

  loanRotation = [];

  tournament.teams.forEach(team => {
    if (team.players.length >= targetSize) {
      team.players.forEach(player => {
        loanRotation.push({
          player,
          fromTeamId: team.id
        });
      });
    }
  });

  loanRotation.sort(() => Math.random() - 0.5);
}

function pickLoanPlayer(excludedTeamIds) {

  for (let i = 0; i < loanRotation.length; i++) {
    const entry = loanRotation[i];

    if (!excludedTeamIds.includes(entry.fromTeamId)) {

      loanRotation.push(loanRotation.splice(i, 1)[0]);

      return entry.player;
    }
  }

  return null;
}

function assignLoanPlayer(match) {

  const home = tournament.teams.find(t => t.id === match.home);
  const away = tournament.teams.find(t => t.id === match.away);

  const sizeCount = {};
  tournament.teams.forEach(t => {
    const size = t.players.length;
    sizeCount[size] = (sizeCount[size] || 0) + 1;
  });

  let targetSize = null;
  let maxCount = 0;

  for (const size in sizeCount) {
    if (sizeCount[size] > maxCount) {
      maxCount = sizeCount[size];
      targetSize = parseInt(size, 10);
    }
  }

  const neededHome = Math.max(0, targetSize - home.players.length);
  const neededAway = Math.max(0, targetSize - away.players.length);

  const loans = { home: [], away: [] };

  const excluded = [home.id, away.id];

  for (let i = 0; i < neededHome; i++) {
    const p = pickLoanPlayer(excluded);
    if (p) loans.home.push(p);
  }

  for (let i = 0; i < neededAway; i++) {
    const p = pickLoanPlayer(excluded);
    if (p) loans.away.push(p);
  }

  return loans;
}

function toggleTeamDetails(teamName) {

  const existing = document.getElementById("team-details-" + teamName);

  if (existing) {
    existing.remove();
    return;
  }

  const team = tournament.teams.find(t => t.name === teamName);

  if (!team) return;

  const row = document.querySelector(
    `[data-team-name="${teamName}"]`
  );

  if (!row) return;

  const detailsRow = document.createElement("tr");
  detailsRow.id = "team-details-" + teamName;

  const td = document.createElement("td");
  td.colSpan = 4;

  td.style.padding = "8px";
  td.style.fontSize = "13px";
  td.style.opacity = "0.8";

  td.innerHTML = team.players.map(p => p.name).join(", ");

  detailsRow.appendChild(td);

  row.after(detailsRow);
}