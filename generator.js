const MAX_TRIES = 5000;

/* =========================
   GENERELLE HJELPERE
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
  return team.players.reduce((sum, p) => sum + (p.level || 0), 0);
}

function teamLevels(teams) {
  return teams.map(teamLevel);
}

function maxDeviationFromAverage(levels) {
  const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
  return Math.max(...levels.map(lvl => Math.abs(lvl - avg)));
}

/* =========================
   POSISJONER (KUN 2 LAG)
========================= */

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
   3+ LAG: NIVÅ + LIK STØRRELSE
========================= */

function distributeByLevel(players, numberOfTeams) {
  const n = players.length;
  const baseSize = Math.floor(n / numberOfTeams);
  const extra = n % numberOfTeams;

  // Kapasitet per lag (maks 1 forskjell)
  const capacities = Array.from({ length: numberOfTeams }, (_, i) =>
    baseSize + (i < extra ? 1 : 0)
  );

  const teams = Array.from(
    { length: numberOfTeams },
    () => ({ players: [], levelSum: 0 })
  );

  players.forEach(p => {
    let bestIdx = -1;
    let bestSum = Infinity;

    for (let i = 0; i < numberOfTeams; i++) {
      if (teams[i].players.length >= capacities[i]) continue;

      const sum = teams[i].levelSum;

      if (sum < bestSum) {
        bestSum = sum;
        bestIdx = i;
      } else if (sum === bestSum && Math.random() < 0.5) {
        bestIdx = i;
      }
    }

    if (bestIdx === -1) bestIdx = 0;

    teams[bestIdx].players.push(p);
    teams[bestIdx].levelSum += p.level || 0;
  });

  return teams;
}

function generateTeamsMultiLevel(
  selectedPlayers,
  numberOfTeams,
  maxDiff
) {
  let best = null;
  let bestScore = Infinity;

  const base = [...selectedPlayers].sort(
    (a, b) => (b.level || 0) - (a.level || 0)
  );

  for (let i = 0; i < MAX_TRIES; i++) {
    const shuffled = shuffle(base);
    const teams = distributeByLevel(
      shuffled,
      numberOfTeams
    );

const maxSize = Math.max(...teams.map(t => t.players.length));

// Finn snittnivå per spiller i fulle lag
const fullTeams = teams.filter(t => t.players.length === maxSize);

const totalLevelFull = fullTeams.reduce((sum, t) => sum + t.levelSum, 0);
const totalPlayersFull = fullTeams.reduce((sum, t) => sum + t.players.length, 0);

const avgLevelPerPlayerFull = totalLevelFull / totalPlayersFull;

// Justert nivå
const levels = teams.map(t => {
  const missing = maxSize - t.players.length;
  return t.levelSum + (missing * avgLevelPerPlayerFull);
});

    const score = maxDeviationFromAverage(levels);

    if (score < bestScore) {
      bestScore = score;
      best = teams;
    }

   
  }

  return best;
}

/* =========================
   2 LAG: EKSISTERENDE LOGIKK
========================= */

function generateTeamsOnce(playersInput, numberOfTeams) {
  let players = [...playersInput];

  const teams = Array.from(
    { length: numberOfTeams },
    () => ({ players: [] })
  );

  // Tving keeper på hvert sitt lag (kun 2 lag)
  if (numberOfTeams === 2) {
    const keepers = players.filter(
      p =>
        Array.isArray(p.positions) &&
        p.positions.includes("Keeper")
    );

    if (keepers.length >= 2) {
      teams[0].players.push(keepers[0]);
      teams[1].players.push(keepers[1]);
      players = players.filter(
        p => p !== keepers[0] && p !== keepers[1]
      );
    }
  }

  shuffle(players).forEach((p, idx) => {
    teams[idx % numberOfTeams].players.push(p);
  });

  return teams;
}

/* =========================
   HOVEDFUNKSJON
========================= */

function generateTeams(
  selectedPlayers,
  numberOfTeams = 2,
  maxDiff = 0
) {
  // 🔹 3+ lag: nivå + lik størrelse
  if (numberOfTeams > 2) {
    return generateTeamsMultiLevel(
      selectedPlayers,
      numberOfTeams,
      maxDiff
    );
  }

  // 🔹 2 lag: eksisterende streng logikk
let best = null;
let bestScore = Infinity;

for (let i = 0; i < MAX_TRIES; i++) {
  const teams = generateTeamsOnce(
    selectedPlayers,
    numberOfTeams
  );

  if (!positionsBalanced(teams)) continue;

  const levels = teamLevels(teams);
  const score = Math.abs(levels[0] - levels[1]);

  if (score < bestScore) {
    bestScore = score;
    best = teams;
  }
}

// fallback hvis ingen klarer posisjonskrav
if (!best) {
  return generateTeamsOnce(selectedPlayers, numberOfTeams);
}

return best;
}
/* =========================
   GLOBAL EKSPORT
========================= */

window.generateTeams = generateTeams;
