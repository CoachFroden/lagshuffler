// generator-fix.js
// Streng 2-lagsfordeling: hovedposisjoner fordeles jevnt før nivå/sekundærposisjon vurderes.

(() => {
  const POSITION_STRENGTH_WEIGHTS = {
    Keeper: 2,
    Forsvar: 8,
    Midtbane: 7,
    Spiss: 8
  };

  const POSITION_COUNT_WEIGHTS = {
    Keeper: 12,
    Forsvar: 4,
    Midtbane: 3,
    Spiss: 4
  };

  const localShuffle = input => {
    const arr = [...input];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const primaryPosition = player => player?.positions?.[0] || "Valgfri";

  const contribution = (player, position) => {
    if (!Array.isArray(player?.positions)) return 0;
    const index = player.positions.indexOf(position);
    if (index === 0) return 1;
    if (index > 0) return 0.55;
    return 0;
  };

  const weightedPositionCount = (team, position) =>
    team.players.reduce((sum, player) => sum + contribution(player, position), 0);

  const weightedPositionAverage = (team, position) => {
    let count = 0;
    let levelTotal = 0;

    team.players.forEach(player => {
      const weight = contribution(player, position);
      if (!weight) return;
      count += weight;
      levelTotal += weight * (Number(player.level) || 0);
    });

    return count > 0 ? levelTotal / count : null;
  };

  const primaryCountsBalanced = teams => {
    const positions = new Set(
      teams.flatMap(team => team.players.map(primaryPosition))
    );

    for (const position of positions) {
      const counts = teams.map(team =>
        team.players.filter(player => primaryPosition(player) === position).length
      );
      if (Math.abs(counts[0] - counts[1]) > 1) return false;
    }

    return true;
  };

  const strictScore = teams => {
    const totalLevels = teams.map(team =>
      team.players.reduce((sum, player) => sum + (Number(player.level) || 0), 0)
    );

    let score = Math.abs(totalLevels[0] - totalLevels[1]) * 24;
    const positions = ["Keeper", "Forsvar", "Midtbane", "Spiss"];

    positions.forEach(position => {
      const avgA = weightedPositionAverage(teams[0], position);
      const avgB = weightedPositionAverage(teams[1], position);
      const strengthWeight = POSITION_STRENGTH_WEIGHTS[position] || 5;
      const countWeight = POSITION_COUNT_WEIGHTS[position] || 2.5;

      if (avgA !== null && avgB !== null) {
        score += Math.abs(avgA - avgB) * strengthWeight * 9;
      } else if (avgA !== avgB) {
        // Hvis bare ett lag har dekning på en posisjon, er det svært uønsket.
        score += countWeight * 500;
      }

      const countDiff = Math.abs(
        weightedPositionCount(teams[0], position) -
        weightedPositionCount(teams[1], position)
      );
      score += countDiff * countWeight * 8;
    });

    return score;
  };

  function makeStrictCandidate(players) {
    const groups = new Map();

    players.forEach(player => {
      const position = primaryPosition(player);
      if (!groups.has(position)) groups.set(position, []);
      groups.get(position).push(player);
    });

    const teams = [
      { players: [], levelSum: 0 },
      { players: [], levelSum: 0 }
    ];

    // Varier rekkefølgen på posisjonsgruppene slik at oddetall ikke alltid havner likt.
    const shuffledGroups = localShuffle([...groups.values()]);

    shuffledGroups.forEach(group => {
      const shuffled = localShuffle(group);

      while (shuffled.length >= 2) {
        const first = shuffled.pop();
        const second = shuffled.pop();

        if (Math.random() < 0.5) {
          teams[0].players.push(first);
          teams[1].players.push(second);
        } else {
          teams[0].players.push(second);
          teams[1].players.push(first);
        }
      }

      if (shuffled.length === 1) {
        const player = shuffled.pop();
        let target = 0;

        if (teams[1].players.length < teams[0].players.length) target = 1;
        else if (teams[1].players.length === teams[0].players.length) target = Math.random() < 0.5 ? 0 : 1;

        teams[target].players.push(player);
      }
    });

    teams.forEach(team => {
      team.levelSum = team.players.reduce(
        (sum, player) => sum + (Number(player.level) || 0),
        0
      );
    });

    return teams;
  }

  function generateStrictTwoTeams(selectedPlayers) {
    let best = null;
    let bestScore = Infinity;

    for (let i = 0; i < 5000; i++) {
      const teams = makeStrictCandidate(selectedPlayers);
      if (!primaryCountsBalanced(teams)) continue;
      if (Math.abs(teams[0].players.length - teams[1].players.length) > 1) continue;

      const score = strictScore(teams);
      if (score < bestScore) {
        bestScore = score;
        best = teams;
      }
    }

    return best || makeStrictCandidate(selectedPlayers);
  }

  const originalGenerateTeams = window.generateTeams;

  window.generateTeams = function(selectedPlayers, numberOfTeams = 2, maxDiff = 0) {
    if (Number(numberOfTeams) === 2) {
      return generateStrictTwoTeams(selectedPlayers);
    }

    return originalGenerateTeams(selectedPlayers, numberOfTeams, maxDiff);
  };
})();
