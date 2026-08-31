const MAX_TRIES = 5000;

const POSITION_WEIGHTS = {
  Keeper: 12,
  Forsvar: 4,
  Midtbane: 3,
  Spiss: 4
};

const POSITION_STRENGTH_WEIGHTS = {
  Keeper: 2,
  Forsvar: 8,
  Midtbane: 7,
  Spiss: 8
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

function weightedPositionLevelTotal(team, position) {
  return team.players.reduce((sum, player) => {
    const contribution = positionContribution(player, position);
    return sum + contribution * (player.level || 0);
  }, 0);
}

function positionAverageLevel(team, position) {
  const count = weightedPositionCount(team, position);
  if (count <= 0) return null;
  return weightedPositionLevelTotal(team, position) / count;
}

function positionStrengthBalanceScore(teams, stats) {
  let score = 0;

  stats.positions.forEach(position => {
    const averages = teams
      .map(team => positionAverageLevel(team, position))
      .filter(value => value !== null);

    if (averages.length < 2) return;

    const avg = averages.reduce((sum, value) => sum + value, 0) / averages.length;
    const variance = averages.reduce(
      (sum, value) => sum + Math.pow(value - avg, 2),
      0
    );
    const range = Math.max(...averages) - Math.min(...averages);
    const weight = POSITION_STRENGTH_WEIGHTS[position] || 5;

    score += variance * weight * 6 + range * weight * 4;
  });

  return score;
}

/* =========================
   FELLES POSISJONSSTATISTIKK
========================= */

function createMultiTeamStats(players, numberOfTeams) {
  const positions = [...new Set(
    players.flatMap(player => Array.isArray(player.positions) ? player.positions : [])
  )];

  const totalLevel = players.reduce((sum, player) => sum + (player.level || 0), 0);
  const avgLevel = players.length ? totalLevel / players.length : 0;

  const positionTotals = {};
  const positionPlayerCounts = {};
  const positionLevelTotals = {};
  const positionAverageLevels = {};

  positions.forEach(position => {
    positionPlayerCounts[position] = players.filter(player => hasPosition(player, position)).length;

    positionTotals[position] = players.reduce(
      (sum, player) => sum + positionContribution(player, position),
      0
    );

    positionLevelTotals[position] = players.reduce((sum, player) => {
      const contribution = positionContribution(player, position);
      return sum + contribution * (player.level || 0);
    }, 0);

    positionAverageLevels[position] = positionTotals[position] > 0
      ? positionLevelTotals[position] / positionTotals[position]
      : avgLevel;
  });

  return {
    positions,
    positionTotals,
    positionPlayerCounts,
    positionLevelTotals,
    positionAverageLevels,
    totalLevel,
    avgLevel,
    totalPlayers: players.length,
    numberOfTeams,
    keeperCount: players.filter(player => hasPosition(player, "Keeper")).length
  };
}

/* =========================
   2 LAG: ANTALL + NIVÅ PER POSISJON
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

function twoTeamScore(teams, stats) {
  const levels = teamLevels(teams);
  const totalLevelDiff = Math.abs(levels[0] - levels[1]);

  // Totalnivå er viktig, men en skjev lagdel skal ikke kunne "kjøpes"
  // ved at forsvar på ett lag og angrep på det andre jevner ut totalsummen.
  let score = totalLevelDiff * 24;
  score += positionStrengthBalanceScore(teams, stats);

  // Litt ekstra straff for skjevhet i vektet posisjonsdekning.
  stats.positions.forEach(position => {
    const counts = teams.map(team => weightedPositionCount(team, position));
    const diff = Math.abs(counts[0] - counts[1]);
    const weight = POSITION_WEIGHTS[position] || 2.5;
    score += diff * weight * 8;
  });

  return score;
}

function generateTeamsOnce(playersInput, numberOfTeams) {
  let players = [...playersInput];

  const teams = Array.from(
    { length: numberOfTeams },
    () => ({ players: [] })
  );

  // Tving keeper på hvert sitt lag når vi har minst to keepere.
  if (numberOfTeams === 2) {
    const keepers = players.filter(p => hasPosition(p, "Keeper"));

    if (keepers.length >= 2) {
      const keeperPair = shuffle(keepers).slice(0, 2);
      teams[0].players.push(keeperPair[0]);
      teams[1].players.push(keeperPair[1]);
      players = players.filter(p => !keeperPair.includes(p));
    }
  }

  shuffle(players).forEach((p, idx) => {
    teams[idx % numberOfTeams].players.push(p);
  });

  return teams;
}

function generateTwoBalancedTeams(selectedPlayers) {
  const stats = createMultiTeamStats(selectedPlayers, 2);
  let best = null;
  let bestScore = Infinity;

  for (let i = 0; i < MAX_TRIES; i++) {
    const teams = generateTeamsOnce(selectedPlayers, 2);

    if (!positionsBalanced(teams)) continue;

    const score = twoTeamScore(teams, stats);
    if (score < bestScore) {
      bestScore = score;
      best = teams;
    }
  }

  return best || generateTeamsOnce(selectedPlayers, 2);
}

/* =========================
   3+ LAG: SMART BALANSERING
========================= */

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
  let positionStrengthScore = 0;

  stats.positions.forEach(position => {
    const contribution = positionContribution(player, position);
    const projectedCount = weightedPositionCount(team, position) + contribution;
    const expectedCount =
      (stats.positionTotals[position] / stats.totalPlayers) * projectedSize;
    const diff = projectedCount - expectedCount;
    const countWeight = POSITION_WEIGHTS[position] || 2.5;

    positionScore += diff * diff * countWeight;

    if (contribution > 0) {
      const currentCount = weightedPositionCount(team, position);
      const currentLevelTotal = weightedPositionLevelTotal(team, position);
      const projectedAverage =
        (currentLevelTotal + contribution * (player.level || 0)) /
        (currentCount + contribution);
      const targetAverage = stats.positionAverageLevels[position] || stats.avgLevel;
      const strengthDiff = projectedAverage - targetAverage;
      const strengthWeight = POSITION_STRENGTH_WEIGHTS[position] || 5;

      positionStrengthScore += strengthDiff * strengthDiff * strengthWeight;
    }
  });

  let keeperScore = 0;
  if (hasPosition(player, "Keeper")) {
    const keepersAlready = team.players.filter(p => hasPosition(p, "Keeper")).length;
    if (keepersAlready > 0) {
      keeperScore = stats.keeperCount <= stats.numberOfTeams ? 160 : 90;
    }
  }

  return (
    levelScore +
    positionScore * 2.2 +
    positionStrengthScore * 1.8 +
    keeperScore +
    Math.random() * 0.25
  );
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

    // Hvis spillergrunnlaget faktisk har nok spillere til at alle lag kan
    // dekke en posisjon, skal generatoren prioritere det svært høyt.
    if ((stats.positionPlayerCounts[position] || 0) >= teams.length) {
      const missingTeams = teams.filter(
        team => weightedPositionCount(team, position) < 0.5
      ).length;
      score += missingTeams * weight * 180;
    }
  });

  // Balanser også selve kvaliteten innen hver posisjon.
  // Dermed unngår vi at ett lag får alle de beste forsvarerne mens
  // et annet får de beste spissene, selv om totalnivået er likt.
  score += positionStrengthBalanceScore(teams, stats);

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
   HOVEDFUNKSJON
========================= */

function generateTeams(selectedPlayers, numberOfTeams = 2, maxDiff = 0) {
  if (numberOfTeams === 2) {
    return generateTwoBalancedTeams(selectedPlayers);
  }

  return generateTeamsMultiLevel(selectedPlayers, numberOfTeams, maxDiff);
}

/* =========================
   GLOBAL EKSPORT
========================= */

window.generateTeams = generateTeams;
