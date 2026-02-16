// app.js
// Ansvar: UI + kobling mot generator.js
// Avhenger av: players.js og generator.js

console.log("app.js lastet");

/* =========================
   KONFIG
========================= */

const POSITION_ORDER = {
  Keeper: 1,
  Forsvar: 2,
  Midtbane: 3,
  Spiss: 4
};

/* =========================
   HJELPEFUNKSJONER
========================= */

function getSelectedPlayers() {
  const checkboxes = document.querySelectorAll(
    "#playerList input[type='checkbox']"
  );

  const selected = [];
  checkboxes.forEach(cb => {
    if (cb.checked) {
      const index = Number(cb.dataset.index);
      selected.push(players[index]);
    }
  });

  return selected;
}

function updatePlayerToggleText() {
  const btn = document.getElementById("playerToggle");
  if (!btn) return;

  const total = players.length;
  const selected = getSelectedPlayers().length;

  btn.childNodes[0].nodeValue =
    `Velg spillere (${selected}/${total}) `;
}

function updateTeamCountOptions() {
  const select = document.getElementById("teamCount");
  const selectedPlayers = getSelectedPlayers();

  select.innerHTML = "";

  const maxTeams = Math.floor(selectedPlayers.length / 2);

  if (maxTeams < 2) {
    const option = document.createElement("option");
    option.value = 2;
    option.textContent = "2 lag (velg flere spillere)";
    select.appendChild(option);
    return;
  }

  for (let i = 2; i <= maxTeams; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `${i} lag`;
    select.appendChild(option);
  }
}

/* =========================
   HANDLERS
========================= */

function handleReset() {
  document
    .querySelectorAll("#playerList input[type='checkbox']")
    .forEach(cb => (cb.checked = true));

  const out = document.getElementById("generatedTeams");
  if (out) out.innerHTML = "";

  updateTeamCountOptions();
  updatePlayerToggleText();

  const slider = document.getElementById("levelDiffSlider");
  const value = document.getElementById("levelDiffValue");
  if (slider && value) {
    slider.value = "4";
    value.textContent = "4";
  }
}

function handleGenerateTeams() {
  const selectedPlayers = getSelectedPlayers();

  if (selectedPlayers.length < 2) {
    alert("Velg minst 2 spillere");
    return;
  }

  const teamCount = Number(
    document.getElementById("teamCount").value
  );

  const maxDiff = Number(
    document.getElementById("levelDiffSlider").value
  );

  const teams = generateTeams(
    selectedPlayers,
    teamCount,
    maxDiff
  );

  renderTeams(teams);
  window.generatedTeams = teams;

  
  const btn = document.getElementById("startTournamentBtn");
if (btn) btn.style.display = "inline-block";

  // auto-lukk spillerliste
  const playerList = document.getElementById("playerList");
  const playerToggle = document.getElementById("playerToggle");

  if (playerList && playerToggle) {
    playerList.classList.remove("open");
    playerToggle.setAttribute("aria-expanded", false);
  }
}

/* =========================
   RENDER LAG
========================= */

function renderTeams(teams) {
  const container = document.getElementById("generatedTeams");
  container.innerHTML = "";

  const teamLevels = teams.map(team =>
    team.players.reduce((sum, p) => sum + p.level, 0)
  );

  let infoText = "";

  if (teams.length === 2) {
    const diff = Math.abs(teamLevels[0] - teamLevels[1]);
    infoText = `Total nivåforskjell: ${diff}`;
  } else {
    const avg =
      teamLevels.reduce((a, b) => a + b, 0) / teamLevels.length;
    const maxDev = Math.max(
      ...teamLevels.map(lvl => Math.abs(lvl - avg))
    );
    infoText = `Største avvik fra snitt: ${Math.round(maxDev)}`;
  }

  const info = document.createElement("div");
  info.className = "teams-info";
  info.textContent = infoText;
  container.appendChild(info);

  teams.forEach((team, i) => {
    const div = document.createElement("div");
    div.className = "team";

    const playersHtml = [...team.players]
      .sort((a, b) => {
        const posA = a.positions?.[0] || "";
        const posB = b.positions?.[0] || "";
        return (
          (POSITION_ORDER[posA] || 99) -
          (POSITION_ORDER[posB] || 99)
        );
      })
      .map(p => {
        const primaryPos = p.positions?.[0] || "";
        return `
          <li>
            <span class="player-name pos-${primaryPos}">
              ${p.name}
            </span>
            <small>(${p.positions?.join("/") || ""})</small>
          </li>
        `;
      })
      .join("");

    div.innerHTML = `
      <h2>Lag ${i + 1}</h2>
      <p class="level"><strong>Total nivå:</strong> ${teamLevels[i]}</p>
      <ul>${playersHtml}</ul>
    `;

    container.appendChild(div);
  });
}

/* =========================
   RENDER SPILLERLISTE
========================= */

function renderPlayerList() {
  const container = document.getElementById("playerList");
  container.innerHTML = "";

  const sortedPlayers = [...players].sort((a, b) => {
    const posA = a.positions?.[0] || "";
    const posB = b.positions?.[0] || "";
    return (
      (POSITION_ORDER[posA] || 99) -
      (POSITION_ORDER[posB] || 99)
    );
  });

  sortedPlayers.forEach(player => {
    const index = players.indexOf(player);
    const primaryPos = player.positions?.[0] || "";

    const div = document.createElement("div");
    div.innerHTML = `
      <label class="player">
        <input
          type="checkbox"
          data-index="${index}"
          checked
          onchange="updateTeamCountOptions(); updatePlayerToggleText();"
        />
        <span class="player-name pos-${primaryPos}">
          ${player.name}
        </span>
        <small>(${player.positions?.join("/") || ""})</small>
      </label>
    `;
    container.appendChild(div);
  });
}

/* =========================
   INIT
========================= */

document.addEventListener("DOMContentLoaded", () => {
  renderPlayerList();
  updateTeamCountOptions();
  updatePlayerToggleText();

  document
    .getElementById("generateBtn")
    .addEventListener("click", handleGenerateTeams);

  document
    .getElementById("resetBtn")
    .addEventListener("click", handleReset);

  const slider = document.getElementById("levelDiffSlider");
  const value = document.getElementById("levelDiffValue");

  if (slider && value) {
    slider.addEventListener("input", () => {
      value.textContent = slider.value;
    });
  }

  // dropdown
  const playerToggle = document.getElementById("playerToggle");
  const playerList = document.getElementById("playerList");

  if (playerToggle && playerList) {
    playerToggle.addEventListener("click", () => {
      const isOpen = playerList.classList.toggle("open");
      playerToggle.setAttribute("aria-expanded", isOpen);
    });
  }
  
const startBtn = document.getElementById("startTournamentBtn");

if (startBtn) {
  startBtn.addEventListener("click", () => {

    if (!window.generatedTeams) {
      alert("Du må generere lag først.");
      return;
    }

    localStorage.setItem(
      "lagshuffler_teams",
      JSON.stringify(window.generatedTeams)
    );

    window.location.href = "turnering.html";
  });
}

  });