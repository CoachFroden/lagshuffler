// -----------------------------
// KONFIGURASJON
// -----------------------------

const POSITION_WEIGHT = 25;   // Posisjon viktigst
const SKILL_WEIGHT = 5;       // Nivå nesten like viktig
const BALANCE_WEIGHT = 4;     // Lik lagstørrelse viktig

// -----------------------------
// HJELPEFUNKSJONER
// -----------------------------

function calculateTeamScore(team) {
    return team.reduce((sum, p) => sum + (p.nivaa || 0), 0);
}

function countPosition(team, pos) {
    return team.filter(p => p.positions && p.positions.includes(pos)).length;
}

function positionScore(teamA, teamB) {
    const positions = ["Keeper", "Forsvar", "Midtbane", "Spiss"];
    let score = 0;

    for (const pos of positions) {
        const diff = Math.abs(countPosition(teamA, pos) - countPosition(teamB, pos));
        score += diff * POSITION_WEIGHT;
    }

    return score;
}

function skillScore(teamA, teamB) {
    const scoreA = calculateTeamScore(teamA);
    const scoreB = calculateTeamScore(teamB);
    return Math.abs(scoreA - scoreB) * SKILL_WEIGHT;
}

function sizeScore(teamA, teamB) {
    return Math.abs(teamA.length - teamB.length) * BALANCE_WEIGHT;
}

function totalScore(teamA, teamB) {
    return (
        positionScore(teamA, teamB) +
        skillScore(teamA, teamB) +
        sizeScore(teamA, teamB)
    );
}

// -----------------------------
// INITIAL TEAM GENERATION
// -----------------------------

function generateInitialTeams(players) {
    // Fordel keepere
    let keepers = players.filter(p => p.positions && p.positions.includes("Keeper"));
    let others = players.filter(p => !(p.positions && p.positions.includes("Keeper")));

    others = others.sort(() => Math.random() - 0.5);

    const mid = Math.ceil(players.length / 2);
    let teamA = [];
    let teamB = [];

    if (keepers.length === 1) {
        keepers[0].assignedKeeper = true;
        teamA.push(keepers[0]);
    } else if (keepers.length >= 2) {
        keepers[0].assignedKeeper = true;
        keepers[1].assignedKeeper = true;
        teamA.push(keepers[0]);
        teamB.push(keepers[1]);
    }

    // Fyll på resten
    for (const p of others) {
        if (teamA.length < mid) teamA.push(p);
        else teamB.push(p);
    }

    return { teamA, teamB };
}

// -----------------------------
// OPTIMIZATION ENGINE (SWAPS)
// -----------------------------

function optimizeTeams(teamA, teamB) {
    let improved = true;
    let safety = 0;

    while (improved && safety < 200) {
        improved = false;
        safety++;

        for (let i = 0; i < teamA.length; i++) {
            for (let j = 0; j < teamB.length; j++) {

                // Ikke bytt keepere
                if (teamA[i].assignedKeeper || teamB[j].assignedKeeper) continue;

                let newA = [...teamA];
                let newB = [...teamB];

                [newA[i], newB[j]] = [newB[j], newA[i]];

                if (totalScore(newA, newB) < totalScore(teamA, teamB)) {
                    teamA = newA;
                    teamB = newB;
                    improved = true;
                }
            }
        }
    }

    return { teamA, teamB };
}

// -----------------------------
// HOVEDFUNKSJON
// -----------------------------

function generateTeams(players) {
    let { teamA, teamB } = generateInitialTeams(players);
    let optimized = optimizeTeams(teamA, teamB);

    return {
        teamA: optimized.teamA,
        teamB: optimized.teamB,
        scoreA: calculateTeamScore(optimized.teamA),
        scoreB: calculateTeamScore(optimized.teamB)
    };
}

window.generateTeams = generateTeams;
