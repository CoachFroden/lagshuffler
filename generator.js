// Ny forbedret generator.js
// Posisjon > Nivå > Kull
// Primærposisjon sterkest, sekundærposisjon fallback

function generateTeams(selectedPlayers) {

    // To lag (fast)
    const teams = [
        { players: [], posCount: { Keeper: 0, Forsvar: 0, Midtbane: 0, Spiss: 0 }, level: 0 },
        { players: [], posCount: { Keeper: 0, Forsvar: 0, Midtbane: 0, Spiss: 0 }, level: 0 }
    ];

    // Høyere vekter (nivå nesten like viktig som posisjon)
    const weightPosition = 30;
    const weightLevel = 25;
    const weightCohort = 5;

    // Shuffle spillere for naturlig variasjon
    const shuffled = [...selectedPlayers].sort(() => Math.random() - 0.5);

    // Finn posisjonsforskjell mellom lag
    function posDiff(teamIndex, pos, teamAdjust = 0) {
        const tA = teamIndex;
        const tB = 1 - teamIndex;
        return Math.abs((teams[tA].posCount[pos] + teamAdjust) - teams[tB].posCount[pos]);
    }

    // Kan en spiller plasseres på dette laget?
    function canPlace(player, teamIndex) {
        const team = teams[teamIndex];
        const pos1 = player.posisjon[0];
        const pos2 = player.posisjon[1];

        // Test primærposisjon
        if (posDiff(teamIndex, pos1, +1) <= 1) return pos1;

        // Test sekundærposisjon hvis finnes
        if (pos2 && posDiff(teamIndex, pos2, +1) <= 1) return pos2;

        return null;
    }

    // Hovedfordeling
    for (const player of shuffled) {

        // Først: prøv lag 1
        let pos = canPlace(player, 0);
        if (pos) {
            teams[0].players.push(player);
            teams[0].posCount[pos]++;
            teams[0].level += player.level;
            continue;
        }

        // Deretter: prøv lag 2
        pos = canPlace(player, 1);
        if (pos) {
            teams[1].players.push(player);
            teams[1].posCount[pos]++;
            teams[1].level += player.level;
            continue;
        }

        // Siste utvei: legg til laget med færrest spillere
        const t = teams[0].players.length <= teams[1].players.length ? 0 : 1;
        const fallback = player.posisjon[0];
        teams[t].players.push(player);
        teams[t].posCount[fallback]++;
        teams[t].level += player.level;
    }

    // Etterfordeling: balanser nivå med en lett swap-runde
    for (let i = 0; i < 2000; i++) {
        const t1 = Math.random() < 0.5 ? 0 : 1;
        const t2 = 1 - t1;

        if (teams[t1].players.length === 0 || teams[t2].players.length === 0) continue;

        const p1 = teams[t1].players[Math.floor(Math.random() * teams[t1].players.length)];
        const p2 = teams[t2].players[Math.floor(Math.random() * teams[t2].players.length)];

        // Test at posisjon ikke brytes
        const pos1A = p1.posisjon[0];
        const pos2A = p2.posisjon[0];

        // Swap konsekvens
        if (posDiff(t1, pos1A, -1) > 1) continue;
        if (posDiff(t2, pos2A, -1) > 1) continue;
        if (posDiff(t1, pos2A, +1) > 1) continue;
        if (posDiff(t2, pos1A, +1) > 1) continue;

        // Utfør swap
        teams[t1].players.splice(teams[t1].players.indexOf(p1), 1);
        teams[t2].players.splice(teams[t2].players.indexOf(p2), 1);
        teams[t1].players.push(p2);
        teams[t2].players.push(p1);

        // Oppdater nivå
        teams[t1].level = teams[t1].players.reduce((a, b) => a + b.level, 0);
        teams[t2].level = teams[t2].players.reduce((a, b) => a + b.level, 0);

        // Kun behold swaps som gir bedre nivåbalanse
        const diffBefore = Math.abs((teams[t1].level + p1.level - p2.level) -
                                    (teams[t2].level + p2.level - p1.level));
        const diffAfter  = Math.abs(teams[t1].level - teams[t2].level);

        if (diffAfter > diffBefore) {
            // Reverser om det ble verre
            teams[t1].players.splice(teams[t1].players.indexOf(p2), 1);
            teams[t2].players.splice(teams[t2].players.indexOf(p1), 1);
            teams[t1].players.push(p1);
            teams[t2].players.push(p2);

            teams[t1].level = teams[t1].players.reduce((a, b) => a + b.level, 0);
            teams[t2].level = teams[t2].players.reduce((a, b) => a + b.level, 0);
        }
    }

    return teams;
}
