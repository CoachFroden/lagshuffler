// app.js
// Kobler sammen UI, datasett og laggeneratoren for LagShuffler

/* ---------------------------------------------------------
   GLOBAL STATE
--------------------------------------------------------- */

let state = {
    selectedPlayers: [],
    settings: {
        allowSameTeamKeepers: false,
        weightFoot: 0.15,
        weightCohort: 0.4
    },
    history: []
};

// Last inn lagrede data fra LocalStorage
loadLocalData();


/* ---------------------------------------------------------
   NAVIGASJON I TOPPMENY
--------------------------------------------------------- */

const navItems = document.querySelectorAll("header.top-nav li");
const sections = document.querySelectorAll(".app-section");

navItems.forEach(item => {
    item.addEventListener("click", () => {
        const target = item.getAttribute("data-section");

        navItems.forEach(i => i.classList.remove("active"));
        item.classList.add("active");

        sections.forEach(sec => sec.classList.add("hidden"));
        document.getElementById(target).classList.remove("hidden");
    });
});

// Dashboard-knapp som leder til lagseksjonen
document.getElementById("goToTeams").addEventListener("click", () => {
    document.querySelector("li[data-section='teams']").click();
});


/* ---------------------------------------------------------
   GENERER SPILLERLISTE
--------------------------------------------------------- */

function renderPlayerList() {
    const container = document.getElementById("playerList");
    container.innerHTML = "";

    players.forEach(p => {
        const div = document.createElement("div");
        div.className = "player-entry";

        div.innerHTML = `
            <div class="player-info">
                <strong>${p.name}</strong>
                <span class="stat">${p.positions.join(", ")}</span>
                <span class="stat">${p.year} • ${p.foot} • nivå ${p.level}</span>
            </div>
        `;

        container.appendChild(div);
    });
}

renderPlayerList();


/* ---------------------------------------------------------
   DELTAKERVELGER (checkboxer)
--------------------------------------------------------- */

function renderParticipantList() {
    const container = document.getElementById("participantList");
    container.innerHTML = "";

    players.forEach(p => {
        const id = "check_" + p.name.replace(/\s+/g, "_");

        const div = document.createElement("div");
        div.className = "participant-entry";

        div.innerHTML = `
            <label>
                <input type="checkbox" id="${id}" class="player-checkbox">
                ${p.name} – nivå ${p.level} – ${p.positions.join("/")}
            </label>
        `;

        container.appendChild(div);
    });
}

renderParticipantList();


/* ---------------------------------------------------------
   HENT VALGTE SPILLERE
--------------------------------------------------------- */

function getSelectedPlayers() {
    const selected = [];

    players.forEach(p => {
        const id = "check_" + p.name.replace(/\s+/g, "_");
        const box = document.getElementById(id);

        if (box && box.checked) {
            selected.push(p);
        }
    });

    return selected;
}


/* ---------------------------------------------------------
   GENERER LAG
--------------------------------------------------------- */

document.getElementById("generateTeamsBtn").addEventListener("click", () => {
    const numberOfTeams = parseInt(document.getElementById("teamCount").value);
    const selected = getSelectedPlayers();

    if (selected.length < numberOfTeams) {
        alert("Du må velge minst én spiller per lag.");
        return;
    }

    state.selectedPlayers = selected;

    const result = generateTeams(
        selected,
        numberOfTeams,
        state.settings
    );

    renderGeneratedTeams(result);
    addHistoryEntry(result);
    saveLocalData();
});


/* ---------------------------------------------------------
   VIS GENERATED LAG
--------------------------------------------------------- */

function renderGeneratedTeams(teams) {
    const container = document.getElementById("generatedTeams");
    container.innerHTML = "";

    teams.forEach((team, index) => {
        const div = document.createElement("div");
        div.className = `team-block team-${index + 1}`;

        div.innerHTML = `
            <div class="team-title">${team.teamName}</div>
            <div class="stat">Score: ${team.score}</div>
            <div class="team-players">
                ${team.players
                    .map(p => `<div class="team-player">${p.name} (${p.positions.join("/")})</div>`)
                    .join("")}
            </div>
        `;

        container.appendChild(div);
    });
}



/* ---------------------------------------------------------
   INNSTILLINGER
--------------------------------------------------------- */

// Keepere-regel
document.getElementById("allowSameTeamKeepers").addEventListener("change", (e) => {
    state.settings.allowSameTeamKeepers = e.target.checked;
    saveLocalData();
});

// Vekt fotpreferanse
document.getElementById("weightFoot").addEventListener("input", (e) => {
    state.settings.weightFoot = parseFloat(e.target.value);
    saveLocalData();
});

// Vekt kullbalanse
document.getElementById("weightCohort").addEventListener("input", (e) => {
    state.settings.weightCohort = parseFloat(e.target.value);
    saveLocalData();
});


/* ---------------------------------------------------------
   HISTORIKK
--------------------------------------------------------- */

function addHistoryEntry(result) {
    const entry = {
        timestamp: new Date().toLocaleString(),
        teams: result
    };

    state.history.push(entry);
    renderHistory();
}

function renderHistory() {
    const container = document.getElementById("historyList");
    container.innerHTML = "";

    state.history.forEach(h => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
            <strong>${h.timestamp}</strong>
            ${h.teams
                .map(t => `
                    <div class="stat">
                        ${t.teamName} – ${t.players.length} spillere – score ${t.score}
                    </div>
                `).join("")}
        `;

        container.appendChild(div);
    });
}



/* ---------------------------------------------------------
   LOCAL STORAGE (lagring av innstillinger + historikk)
--------------------------------------------------------- */

function saveLocalData() {
    localStorage.setItem("lagshuffler_state", JSON.stringify(state));
}

function loadLocalData() {
    const saved = localStorage.getItem("lagshuffler_state");
    if (!saved) return;

    state = JSON.parse(saved);
}

renderHistory();


/* ---------------------------------------------------------
   NULLSTILL DATA
--------------------------------------------------------- */

document.getElementById("resetDataBtn").addEventListener("click", () => {
    if (!confirm("Er du sikker på at du vil nullstille alle appdata?")) return;

    localStorage.removeItem("lagshuffler_state");
    location.reload();
});
