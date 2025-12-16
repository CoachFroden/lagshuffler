const MAX_TRIES = 3000;

/* =========================
   Hjelpefunksjoner
========================= */

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function teamLevel(team) {
  return team.players.reduce(
    (sum, p) => sum + (p.level || 0),
    0
  );
}

function teamLevels(teams) {
  return teams.map(teamLevel);
}

function maxDeviationFromAverage(levels) {
  const avg =
    levels.reduce((a, b) => a + b, 0) / levels.length;

  return Math.max(
    ...levels.map(lvl => Math.abs(lvl - avg))
  );
}

function countPositions(team) {
  const counts = {};
  team.players.forEach(p => {
    if (!Array.isArray(p.positions)) return;
    p.positions.forEach(pos => {
      counts[pos] = (counts[pos] || 0) + 1;
    });
  });
  return counts;
}

function positionsBalanced(teams) {
  const allPositions = new Set();

  teams.forEach(team => {
    Object.keys(countPositions(team)).forEach(pos =>
      allPositions.add(pos)
    );
  });

  for (const pos of allPositions) {
    const counts = teams.map(
      t => countPositions(t)[pos] || 0
    );

    if (Math.max(...counts) - Math.min(...counts) > 1) {
      return false;
    }
  }

  return true;
}

/* =========================
   HOVEDFUNKSJON
========================= */

function generateTeams(
  selectedPlayers,
  numberOfTeams = 2,
  maxDiff = 0
) {
  let best = null;
  let bestScore = Infinity;

  for (let i = 0; i < MAX_TRIES; i++) {
    const teams = generateTeamsOnce(
      selectedPlayers,
      numberOfTeams
    );

    const levels = teamLevels(teams);
    const score =
      numberOfTeams === 2
        ? Math.abs(levels[0] - levels[1])
        : maxDeviationFromAverage(levels);

    // ❌ nivåregel
    if (score > maxDiff) continue;

    // ❌ posisjonsregel
    if (!positionsBalanced(teams)) continue;

    // ✔ gyldig løsning
    return teams;
  }

  // fallback: beste vi fant
  for (let i = 0; i < MAX_TRIES; i++) {
    const teams = generateTeamsOnce(
      selectedPlayers,
      numberOfTeams
    );

    const levels = teamLevels(teams);
    const score =
      numberOfTeams === 2
        ? Math.abs(levels[0] - levels[1])
        : maxDeviationFromAverage(levels);

    if (score < bestScore) {
      bestScore = score;
      best = teams;
    }
  }

  return best;
}

/* =========================
   ÉN GENERERING
========================= */

function generateTeamsOnce(playersInput, numberOfTeams) {
  let players = [...playersInput];

  const teams = Array.from(
    { length: numberOfTeams },
    () => ({ players: [] })
  );

  // Keeper-lås (kun 2 lag)
  if (numberOfTeams === 2) {
    const keepers = players.filter(
      p =>
        Array.isArray(p.positions) &&
        p.positions.includes("Keeper")
    );

    if (keepers.length >= 2) {
      teams[0].players.push(keepers[0]);
      teams[1].players.push(keepers[1]);
      players = players.filter(p => !keepers.includes(p));
    }
  }

  shuffle(players).forEach((p, idx) => {
    teams[idx % numberOfTeams].players.push(p);
  });

  return teams;
}

/* =========================
   Global eksport
========================= */

window.generateTeams = generateTeams;
