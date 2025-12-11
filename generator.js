// Improved generator.js
// Compatible with players.js (positions: ["Midtbane","Forsvar"])
// Position > Level > Cohort
// Primary position strongest, secondary used if needed

function generateTeams(selectedPlayers) {

    const teams = [
        { players: [], posCount: { Keeper: 0, Forsvar: 0, Midtbane: 0, Spiss: 0 }, level: 0 },
        { players: [], posCount: { Keeper: 0, Forsvar: 0, Midtbane: 0, Spiss: 0 }, level: 0 }
    ];

    // Balancing weights
    const weightPosition = 30;
    const weightLevel = 25;
    const weightCohort = 5;

    // Randomize input
    const shuffled = [...selectedPlayers].sort(() => Math.random() - 0.5);

    // Reads primary and secondary positions safely
    function readPositions(player) {
        const pos1 = player.positions && player.positions.length > 0
            ? player.positions[0]
            : "Midtbane";

        const pos2 = player.positions && player.positions.length > 1
            ? player.positions[1]
            : null;

        return { pos1, pos2 };
    }

    // Count difference if a player is placed on a given team
    function posDiff(teamIndex, pos, adjust = 0) {
        const tA = teamIndex;
        const tB = 1 - teamIndex;
        return Math.abs((teams[tA].posCount[pos] + adjust) - teams[tB].posCount[pos]);
    }

    // Check if player can be placed on team
    function canPlace(player, teamIndex) {
        const { pos1, pos2 } = readPositions(player);

        // Try primary position
        if (posDiff(teamIndex, pos1, +1) <= 1) return pos1;

        // Try secondary position
        if (pos2 && posDiff(teamIndex, pos2, +1) <= 1) return pos2;

        // Reject if neither work
        return null;
    }

    //
    // --------- MAIN DISTRIBUTION ---------
    //
    for (const player of shuffled) {

        // Try team 1
        let pos = canPlace(player, 0);
        if (pos) {
            teams[0].players.push(player);
            teams[0].posCount[pos]++;
            teams[0].level += player.level;
            continue;
        }

        // Try team 2
        pos = canPlace(player, 1);
        if (pos) {
            teams[1].players.push(player);
            teams[1].posCount[pos]++;
            teams[1].level += player.level;
            continue;
        }

        // Last fallback: place on team with fewest players
        const fallbackTeam = teams[0].players.length <= teams[1].players.length ? 0 : 1;
        const { pos1 } = readPositions(player);

        teams[fallbackTeam].players.push(player);
        teams[fallbackTeam].posCount[pos1]++;
        teams[fallbackTeam].level += player.level;
    }

    //
    // --------- LEVEL BALANCING (SOFT SWAP) ---------
    //
    for (let i = 0; i < 2000; i++) {
        const t1 = Math.random() < 0.5 ? 0 : 1;
        const t2 = 1 - t1;

        if (teams[t1].players.length === 0 || teams[t2].players.length === 0) continue;

        const p1 = teams[t1].players[Math.floor(Math.random() * teams[t1].players.length)];
        const p2 = teams[t2].players[Math.floor(Math.random() * teams[t2].players.length)];

        const { pos1: pos1A } = readPositions(p1);
        const { pos1: pos2A } = readPositions(p2);

        // Check if swap breaks position balance
        if (posDiff(t1, pos1A, -1) > 1) continue;
        if (posDiff(t2, pos2A, -1) > 1) continue;
        if (posDiff(t1, pos2A, +1) > 1) continue;
        if (posDiff(t2, pos1A, +1) > 1) continue;

        // Store previous levels
        const oldL1 = teams[t1].level;
        const oldL2 = teams[t2].level;

        // Perform swap
        teams[t1].players.splice(teams[t1].players.indexOf(p1), 1);
        teams[t2].players.splice(teams[t2].players.indexOf(p2), 1);
        teams[t1].players.push(p2);
        teams[t2].players.push(p1);

        // Recalculate levels
        teams[t1].level = teams[t1].players.reduce((a, b) => a + b.level, 0);
        teams[t2].level = teams[t2].players.reduce((a, b) => a + b.level, 0);

        // If worse → undo swap
        const beforeDiff = Math.abs((oldL1) - (oldL2));
        const afterDiff = Math.abs(teams[t1].level - teams[t2].level);

        if (afterDiff > beforeDiff) {
            // Undo
            teams[t1].players.splice(teams[t1].players.indexOf(p2), 1);
            teams[t2].players.splice(teams[t2].players.indexOf(p1), 1);
            teams[t1].players.push(p1);
            teams[t2].players.push(p2);

            teams[t1].level = oldL1;
            teams[t2].level = oldL2;
        }
    }

    return teams;
}
