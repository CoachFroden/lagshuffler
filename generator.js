const MAX_TRIES = 5000;

const POSITION_WEIGHTS = {
  Keeper: 12,
  Forsvar: 4,
  Midtbane: 3,
  Spiss: 4
};

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

function hasPosition(player, position) {
  return Array.isArray(player.positions) && player.positions.includes(position);
}

/* =========================
   POSISJONER (2 LAG)
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
    Object.keys(countPositions(team)).forEach(pos => allPositions.add(pos));
  });

  for (const pos of allPositions) {
    const counts = teams.map(t => countPositions(t)[pos] || 0);
    if (Math.max(...counts) - Math.min(...counts) > 1) {
      return false;
    }
  }

  return true;
}

/* =========================
   3+ LAG: SMART BALANSERING
========================= */

function positionContribution(player, position) {
  if (!Array.isArray(player.positions)) return 0;
  const index = player.positions.indexOf(position);
  if (index === 0) return 1;
  if (index > 0) return 0.55;
  return 0;
}

function weightedPositionCount(team, position) {
  return team.players.reduce(
    (sum, player) => sum + positionContribution(player, position),
    0
  );
}

function createMultiTeamStats(players, numberOfTeams) {
  const positions = [...new Set(
    players.flatMap(player => Array.isArray(player.positions) ? player.positions : [])
  )];

  const totalLevel = players.reduce((sum, player) => sum + (player.level || 0), 0);
  const avgLevel = players.length ? totalLevel / players.length : 0;

  const positionTotals = {};
  positions.forEach(position => {
    positionTotals[position] = players.reduce(
      (sum, player) => sum + positionContribution(player, position),
      0
    );
  });

  return {
    positions,
    positionTotals,
    totalLevel,
    avgLevel,
    totalPlayers: players.length,
    numberOfTeams,
    keeperCount: players.filter(player => hasPosition(player, "Keeper")).length
  };
}

function createCapacities(playerCount, numberOfTeams) {
  const baseSize = Math.floor(playerCount / numberOfTeams);
  const extra = playerCount % numberOfTeams;

  return shuffle(
    Array.from({ length: numberOfTeams }, (_, index) =>
      baseSize + (index < extra ? 1 : 0)
    )
  );
}

function playerPriority(player, stats) {
  const primaryPosition = player.positions?.[0] || "";
  const primaryTotal = stats.positionTotals[primaryPosition] || stats.totalPlayers || 1;
  const scarcityBonus = 8 / primaryTotal;
  const levelBonus = Math.abs((player.level || 0) - stats.avgLevel) * 1.8;
  const keeperBonus = hasPosition(player, "Keeper") ? 100 : 0;

  return keeperBonus + scarcityBonus + levelBonus + Math.random() * 4;
}

function placementScore(team, player, capacity, stats) {
  const remainingSlots = Math.max(1, capacity - team.players.length);
  const targetLevel = stats.avgLevel * capacity;
  const idealNextLevel = (targetLevel - team.levelSum) / remainingSlots;
  const levelScore = Math.abs((player.level || 0) - idealNextLevel) * 3.5;

  const projectedSize = team.players.length + 1;
  let positionScore = 0;

  stats.positions.forEach(position => {
    const projectedCount =
      weightedPositionCount(team, position) + positionContribution(player, position);
    const expectedCount =
      (stats.positionTotals[position] / stats.totalPlayers) * projectedSize;
    const diff = projectedCount - expectedCount;
    const weight = POSITION_WEIGHTS[position] || 2.5;

    positionScore += diff * diff * weight;
  });

  let keeperScore = 0;
  if (hasPosition(player, "Keeper")) {
    const keepersAlready = team.players.filter(p => hasPosition(p, "Keeper")).length;
    if (keepersAlready > 0) {
      keeperScore = stats.keeperCount <= stats.numberOfTeams ? 160 : 90;
    }
  }

  return levelScore + positionScore * 2.2 + keeperScore + Math.random() * 0.25;
}

function distributeSmart(players, numberOfTeams, stats) {
  const capacities = createCapacities(players.length, numberOfTeams);
  const teams = Array.from({ length: numberOfTeams }, () => ({
    players: [],
    levelSum: 0
  }));

  const orderedPlayers = players
    .map(player => ({ player, priority: playerPriority(player, stats) }))
    .sort((a, b) => b.priority - a.priority)
    .map(item => item.player);

  orderedPlayers.forEach(player => {
    let bestIndex = -1;
    let bestScore = Infinity;

    for (let i = 0; i < teams.length; i++) {
      if (teams[i].players.length >= capacities[i]) continue;

      const score = placementScore(teams[i], player, capacities[i], stats);
      if (score < bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    if (bestIndex === -1) {
      bestIndex = teams.findIndex((team, i) => team.players.length < capacities[i]);
    }

    teams[bestIndex].players.push(player);
    teams[bestIndex].levelSum += player.level || 0;
  });

  return teams;
}

function multiTeamScore(teams, stats) {
  const maxSize = Math.max(...teams.map(team => team.players.length));
  const adjustedLevels = teams.map(team => {
    const missing = maxSize - team.players.length;
    return team.levelSum + missing * stats.avgLevel;
  });

  const levelDeviation = maxDeviationFromAverage(adjustedLevels);
  const levelRange = Math.max(...adjustedLevels) - Math.min(...adjustedLevels);
  let score = levelDeviation * 22 + levelRange * 5;

  stats.positions.forEach(position => {
    const counts = teams.map(team => weightedPositionCount(team, position));
    const avg = counts.reduce((sum, value) => sum + value, 0) / counts.length;
    const variance = counts.reduce(
      (sum, value) => sum + Math.pow(value - avg, 2),
      0
    );
    const range = Math.max(...counts) - Math.min(...counts);
    const weight = POSITION_WEIGHTS[position] || 2.5;

    score += variance * weight * 5 + range * weight * 2;
  });

  const keeperCounts = teams.map(
    team => team.players.filter(player => hasPosition(player, "Keeper")).length
  );

  if (stats.keeperCount > 0) {
    const duplicateKeepers = keeperCounts.reduce(
      (sum, count) => sum + Math.max(0, count - 1),
      0
    );

    if (stats.keeperCount <= stats.numberOfTeams) {
      score += duplicateKeepers * 300;
    } else {
      const keeperAvg = stats.keeperCount / stats.numberOfTeams;
      score += keeperCounts.reduce(
        (sum, count) => sum + Math.pow(count - keeperAvg, 2) * 80,
        0
      );
    }

    if (stats.keeperCount >= stats.numberOfTeams) {
      const teamsWithoutKeeper = keeperCounts.filter(count => count === 0).length;
      score += teamsWithoutKeeper * 500;
    }
  }

  return score;
}

function generateTeamsMultiLevel(selectedPlayers, numberOfTeams, maxDiff) {
  const stats = createMultiTeamStats(selectedPlayers, numberOfTeams);
  let best = null;
  let bestScore = Infinity;

  for (let i = 0; i < MAX_TRIES; i++) {
    const teams = distributeSmart(selectedPlayers, numberOfTeams, stats);
    const score = multiTeamScore(teams, stats);

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
    const keepers = players.filter(p => hasPosition(p, "Keeper"));

    if (keepers.length >= 2) {
      teams[0].players.push(keepers[0]);
      teams[1].players.push(keepers[1]);
      players = players.filter(p => p !== keepers[0] && p !== keepers[1]);
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

function generateTeams(selectedPlayers, numberOfTeams = 2, maxDiff = 0) {
  if (numberOfTeams > 2) {
    return generateTeamsMultiLevel(selectedPlayers, numberOfTeams, maxDiff);
  }

  let best = null;
  let bestScore = Infinity;

  for (let i = 0; i < MAX_TRIES; i++) {
    const teams = generateTeamsOnce(selectedPlayers, numberOfTeams);

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
