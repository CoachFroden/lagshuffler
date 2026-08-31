// app.js
// UI + kobling mot spillerdata og generator.

const POSITION_ORDER = {
  Keeper: 1,
  Forsvar: 2,
  Midtbane: 3,
  Spiss: 4,
  "": 99
};

const GUEST_STORAGE_KEY = "lagshuffler_guest_players_v1";
let guestPlayers = loadGuestPlayers();

function loadGuestPlayers() {
  try {
    const stored = sessionStorage.getItem(GUEST_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(player => player && typeof player.name === "string")
      .map(player => ({
        id: String(player.id || `guest-${Date.now()}-${Math.random()}`),
        name: player.name.trim().slice(0, 40),
        level: Math.min(11, Math.max(1, Number(player.level) || 6)),
        positions: Array.isArray(player.positions) ? player.positions.filter(Boolean).slice(0, 1) : [],
        temporary: true
      }))
      .filter(player => player.name);
  } catch (error) {
    console.warn("Kunne ikke lese lånespillere fra økten", error);
    return [];
  }
}

function saveGuestPlayers() {
  sessionStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestPlayers));
}

function getAllPlayers() {
  const fixedPlayers = players.map((player, index) => ({
    ...player,
    id: `fixed-${index}`,
    temporary: false
  }));

  return [...fixedPlayers, ...guestPlayers];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSelectedIds() {
  return new Set(
    [...document.querySelectorAll("#playerList input[type='checkbox']:checked")]
      .map(input => input.dataset.playerId)
      .filter(Boolean)
  );
}

function getSelectedPlayers() {
  const selectedIds = getSelectedIds();
  return getAllPlayers().filter(player => selectedIds.has(player.id));
}

function getPrimaryPosition(player) {
  return player.positions?.[0] || "";
}

function positionLabel(player) {
  return player.positions?.length ? player.positions.join("/") : "Valgfri";
}

function sortPlayers(a, b) {
  const positionDifference =
    (POSITION_ORDER[getPrimaryPosition(a)] || 99) -
    (POSITION_ORDER[getPrimaryPosition(b)] || 99);

  if (positionDifference !== 0) return positionDifference;
  if (a.temporary !== b.temporary) return a.temporary ? 1 : -1;
  return a.name.localeCompare(b.name, "no");
}

function updateSummary() {
  const selected = getSelectedPlayers().length;
  const total = getAllPlayers().length;
  const teamCount = Number(document.getElementById("teamCount")?.value || 2);

  document.getElementById("selectedStat").textContent = selected;
  document.getElementById("guestStat").textContent = guestPlayers.length;
  document.getElementById("teamStat").textContent = teamCount;

  const meta = document.getElementById("playerToggleMeta");
  if (meta) meta.textContent = `${selected} av ${total} valgt`;
}

function updateTeamCountOptions() {
  const select = document.getElementById("teamCount");
  if (!select) return;

  const previousValue = Number(select.value || 2);
  const selectedPlayers = getSelectedPlayers();
  const maxTeams = Math.floor(selectedPlayers.length / 2);

  select.innerHTML = "";

  if (maxTeams < 2) {
    const option = document.createElement("option");
    option.value = "2";
    option.textContent = "2 lag – velg flere spillere";
    select.appendChild(option);
    updateSummary();
    return;
  }

  for (let count = 2; count <= maxTeams; count++) {
    const option = document.createElement("option");
    option.value = String(count);
    option.textContent = `${count} lag`;
    select.appendChild(option);
  }

  select.value = String(Math.min(Math.max(previousValue, 2), maxTeams));
  updateSummary();
}

function renderPlayerList({ preserveSelection = false } = {}) {
  const container = document.getElementById("playerList");
  if (!container) return;

  const selectedIds = preserveSelection ? getSelectedIds() : null;
  const allPlayers = getAllPlayers().sort(sortPlayers);

  container.innerHTML = allPlayers.map(player => {
    const primaryPosition = getPrimaryPosition(player);
    const checked = selectedIds ? selectedIds.has(player.id) : true;
    const guestBadge = player.temporary ? '<span class="guest-badge">Lån</span>' : "";

    return `
      <label class="player-row ${player.temporary ? "is-guest" : ""}">
        <input
          type="checkbox"
          data-player-id="${escapeHtml(player.id)}"
          ${checked ? "checked" : ""}
        />
        <span class="player-main">
          <span class="player-name pos-${escapeHtml(primaryPosition || "Any")}">${escapeHtml(player.name)}</span>
          ${guestBadge}
          <small>${escapeHtml(positionLabel(player))}</small>
        </span>
        <span class="level-pill" title="Nivå">${Number(player.level) || 0}</span>
      </label>
    `;
  }).join("");

  container.querySelectorAll("input[type='checkbox']").forEach(input => {
    input.addEventListener("change", () => {
      updateTeamCountOptions();
      clearGeneratedTeams();
    });
  });

  updateTeamCountOptions();
}

function renderGuestRoster() {
  const container = document.getElementById("guestRoster");
  const clearButton = document.getElementById("clearGuestsBtn");
  if (!container || !clearButton) return;

  clearButton.hidden = guestPlayers.length === 0;

  if (guestPlayers.length === 0) {
    container.className = "guest-roster empty-state";
    container.textContent = "Ingen lånespillere lagt til ennå.";
    return;
  }

  container.className = "guest-roster";
  container.innerHTML = guestPlayers.map(player => `
    <div class="guest-chip">
      <span>
        <strong>${escapeHtml(player.name)}</strong>
        <small>Nivå ${player.level}${player.positions?.[0] ? ` • ${escapeHtml(player.positions[0])}` : " • Valgfri"}</small>
      </span>
      <button class="guest-remove" type="button" data-remove-guest="${escapeHtml(player.id)}" aria-label="Fjern ${escapeHtml(player.name)}">×</button>
    </div>
  `).join("");

  container.querySelectorAll("[data-remove-guest]").forEach(button => {
    button.addEventListener("click", () => removeGuestPlayer(button.dataset.removeGuest));
  });
}

function addGuestPlayer(name, level, position) {
  const cleanName = name.trim();
  if (!cleanName) return;

  guestPlayers.push({
    id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: cleanName.slice(0, 40),
    level: Math.min(11, Math.max(1, Number(level) || 6)),
    positions: position ? [position] : [],
    temporary: true
  });

  saveGuestPlayers();
  renderPlayerList({ preserveSelection: true });

  const newestGuest = guestPlayers[guestPlayers.length - 1];
  const newestCheckbox = document.querySelector(`[data-player-id="${CSS.escape(newestGuest.id)}"]`);
  if (newestCheckbox) newestCheckbox.checked = true;

  renderGuestRoster();
  updateTeamCountOptions();
  clearGeneratedTeams();
}

function removeGuestPlayer(id) {
  guestPlayers = guestPlayers.filter(player => player.id !== id);
  saveGuestPlayers();
  renderPlayerList({ preserveSelection: true });
  renderGuestRoster();
  clearGeneratedTeams();
}

function clearGuestPlayers() {
  if (!guestPlayers.length) return;
  guestPlayers = [];
  saveGuestPlayers();
  renderPlayerList({ preserveSelection: true });
  renderGuestRoster();
  clearGeneratedTeams();
}

function clearGeneratedTeams() {
  const output = document.getElementById("generatedTeams");
  if (output) output.innerHTML = "";
  window.generatedTeams = null;

  const tournamentButton = document.getElementById("startTournamentBtn");
  if (tournamentButton) tournamentButton.hidden = true;
}

function handleReset() {
  renderPlayerList();
  clearGeneratedTeams();

  const playerList = document.getElementById("playerList");
  const playerToggle = document.getElementById("playerToggle");
  if (playerList && playerToggle) {
    playerList.classList.remove("open");
    playerToggle.setAttribute("aria-expanded", "false");
  }
}

function handleGenerateTeams() {
  const selectedPlayers = getSelectedPlayers();

  if (selectedPlayers.length < 2) {
    alert("Velg minst 2 spillere.");
    return;
  }

  const teamCount = Number(document.getElementById("teamCount").value);
  const teams = generateTeams(selectedPlayers, teamCount);

  renderTeams(teams);
  window.generatedTeams = teams;

  const tournamentButton = document.getElementById("startTournamentBtn");
  if (tournamentButton) tournamentButton.hidden = false;

  const playerList = document.getElementById("playerList");
  const playerToggle = document.getElementById("playerToggle");
  if (playerList && playerToggle) {
    playerList.classList.remove("open");
    playerToggle.setAttribute("aria-expanded", "false");
  }

  requestAnimationFrame(() => {
    document.getElementById("generatedTeams")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function renderTeams(teams) {
  const container = document.getElementById("generatedTeams");
  if (!container) return;

  const teamLevels = teams.map(team =>
    team.players.reduce((sum, player) => sum + (Number(player.level) || 0), 0)
  );

  const averageTeamLevel = teamLevels.reduce((sum, level) => sum + level, 0) / teamLevels.length;
  const spread = Math.max(...teamLevels) - Math.min(...teamLevels);

  const summaryText = teams.length === 2
    ? `Nivåforskjell ${spread}`
    : `Spredning ${spread} • snitt ${averageTeamLevel.toFixed(1)}`;

  const cards = teams.map((team, index) => {
    const sortedTeam = [...team.players].sort(sortPlayers);
    const averagePlayerLevel = team.players.length ? teamLevels[index] / team.players.length : 0;

    const playerItems = sortedTeam.map(player => {
      const primaryPosition = getPrimaryPosition(player);
      return `
        <li class="team-player ${player.temporary ? "is-guest" : ""}">
          <span class="position-dot pos-bg-${escapeHtml(primaryPosition || "Any")}" aria-hidden="true"></span>
          <span class="team-player-copy">
            <strong>${escapeHtml(player.name)}</strong>
            <small>${escapeHtml(positionLabel(player))}${player.temporary ? " • Lån" : ""}</small>
          </span>
        </li>
      `;
    }).join("");

    return `
      <article class="team-card team-${(index % 4) + 1}">
        <div class="team-card-header">
          <div>
            <span class="team-kicker">LAG ${index + 1}</span>
            <h2>Lag ${index + 1}</h2>
          </div>
          <span class="team-score">${teamLevels[index]}</span>
        </div>
        <div class="team-meta">
          <span>${team.players.length} spillere</span>
          <span>Snitt ${averagePlayerLevel.toFixed(1)}</span>
        </div>
        <ul>${playerItems}</ul>
      </article>
    `;
  }).join("");

  container.innerHTML = `
    <div class="teams-summary">
      <span class="summary-icon">✓</span>
      <span><strong>Lagene er klare</strong><small>${summaryText}</small></span>
      <button id="reshuffleBtn" class="text-button" type="button">Shuffle igjen</button>
    </div>
    ${cards}
  `;

  document.getElementById("reshuffleBtn")?.addEventListener("click", handleGenerateTeams);
}

function setupGuestForm() {
  const form = document.getElementById("guestPlayerForm");
  const levelInput = document.getElementById("guestLevel");
  const levelValue = document.getElementById("guestLevelValue");

  levelInput?.addEventListener("input", () => {
    if (levelValue) levelValue.textContent = levelInput.value;
  });

  form?.addEventListener("submit", event => {
    event.preventDefault();

    const name = document.getElementById("guestName").value;
    const level = document.getElementById("guestLevel").value;
    const position = document.getElementById("guestPosition").value;

    addGuestPlayer(name, level, position);
    form.reset();
    document.getElementById("guestLevel").value = "6";
    if (levelValue) levelValue.textContent = "6";
    document.getElementById("guestName").focus();
  });

  document.getElementById("clearGuestsBtn")?.addEventListener("click", clearGuestPlayers);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(error => {
      console.warn("Service worker kunne ikke registreres", error);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderPlayerList();
  renderGuestRoster();
  setupGuestForm();
  updateSummary();

  document.getElementById("generateBtn")?.addEventListener("click", handleGenerateTeams);
  document.getElementById("resetBtn")?.addEventListener("click", handleReset);

  document.getElementById("teamCount")?.addEventListener("change", () => {
    updateSummary();
    clearGeneratedTeams();
  });

  const playerToggle = document.getElementById("playerToggle");
  const playerList = document.getElementById("playerList");

  playerToggle?.addEventListener("click", () => {
    const isOpen = playerList.classList.toggle("open");
    playerToggle.setAttribute("aria-expanded", String(isOpen));
  });

  document.getElementById("startTournamentBtn")?.addEventListener("click", () => {
    if (!window.generatedTeams) {
      alert("Du må generere lag først.");
      return;
    }

    localStorage.setItem("lagshuffler_teams", JSON.stringify(window.generatedTeams));
    window.location.href = "turnering.html";
  });
});

registerServiceWorker();
