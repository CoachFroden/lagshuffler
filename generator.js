// generator.js – korrigert versjon – ingen duplikater, posisjon viktigst,
// multiposisjon starter alltid i første posisjon, formasjon 3–2–1 + keeper

const IDEAL_FORMATION = {
    "Keeper": 1,
    "Forsvar": 3,
    "Midtbane": 2,
    "Spiss": 1
};

function generateTeams(selectedPlayers, numberOfTeams, settings) {

    settings = Object.assign({
        weightPosition: 30,
        weightLevel: 10,
        weightCohort: 5
    }, settings || {});

    const teams = Array.from({ length: numberOfTeams }, () => ({
        players: [],
        positionCount: {},
        yearCount: {},
        levelSum: 0
    }));

    const totalPlayers = selectedPlayers.length;
    const minSize = Math.floor(totalPlayers / numberOfTeams);
    const maxSize = minSize + 1;

    // ---------------------------------------------------
    // 1. DEL OPP SPILLERE I:
    //    - singlePos (kun én posisjon)
    //    - multiPos (flere posisjoner)
    // ---------------------------------------------------

    const singlePos = selectedPlayers.filter(p => p.positions.length === 1);
    const multiPos = selectedPlayers.filter(p => p.positions.length > 1);

    // Sorter singlePos etter posisjon (Forsvar → Midtbane → Spiss → Keeper)
    const order = ["Forsvar", "Midtbane", "Spiss", "Keeper"];
    const singleSorted = [];

    order.forEach(pos => {
        singleSorted.push(...singlePos.filter(p => p.positions[0] === pos));
    });

    // ---------------------------------------------------
    // 2. FORDEL KUN ÉN-POSISJON SSPILLERE FØRST
    // ---------------------------------------------------

    function distribute(group) {
        let ti = 0;
        group.forEach(player => {
            teams[ti].players.push(player);
            ti = (ti + 1) % numberOfTeams;
        });
    }

    distribute(singleSorted);

    // ---------------------------------------------------
    // 3. OPPDATER STATS NÅR SINGLEPOS ER PLASSERT
    // ---------------------------------------------------

    function updateTeamStats(team) {
        team.positionCount = {};
        team.yearCount = {};
        team.levelSum = 0;

        team.players.forEach(p => {
            // nivå
            team.levelSum += p.level || 0;

            // posisjonscount
            const mainPos = p.positions[0]; // alltid første posisjon
            team.positionCount[mainPos] = (team.positionCount[mainPos] || 0) + 1;

            // kull
            team.yearCount[p.year] = (team.yearCount[p.year] || 0) + 1;
        });
    }

    teams.forEach(updateTeamStats);

    // ---------------------------------------------------
    // 4. PLASSER MULTIPOSSPILLERE (kun én gang)
    //    – i første posisjon de har
    //    – valgt lag = laget som har størst behov for posisjonen
    // ---------------------------------------------------

    function positionNeed(team, pos) {
        const actual = team.positionCount[pos] || 0;
        const ideal = IDEAL_FORMATION[pos] || 0;
        return Math.max(0, ideal - actual);
    }

    multiPos.forEach(player => {
        const mainPos = player.positions[0];

        // finn laget med størst behov for denne posisjonen
        let bestTeam = 0;
        let bestNeed = -9999;

        teams.forEach((team, i) => {
            const need = positionNeed(team, mainPos);
            if (need > bestNeed && team.players.length < maxSize) {
                bestNeed = need;
                bestTeam = i;
            }
        });

        teams[bestTeam].players.push(player);
        updateTeamStats(teams[bestTeam]);
    });

    // ---------------------------------------------------
    // 5. OPTIMALISERING (SWAPS)
    // ---------------------------------------------------

    function totalCost(teams) {
        let cost = 0;

        // posisjon først
        Object.keys(IDEAL_FORMATION).forEach(pos => {
            const counts = teams.map(t => t.positionCount[pos] || 0);
            cost += (Math.max(...counts) - Math.min(...counts)) * settings.weightPosition;
        });

        // nivå
        const avgLevels = teams.map(t => t.levelSum / t.players.length);
        cost += (Math.max(...avgLevels) - Math.min(...avgLevels)) * settings.weightLevel;

        // kull
        const avgYears = teams.map(t =>
            t.players.reduce((a, b) => a + (b.year || 0), 0) / t.players.length
        );
        cost += (Math.max(...avgYears) - Math.min(...avgYears)) * settings.weightCohort;

        return cost;
    }

    let currentCost = totalCost(teams);

    const MAX_IT = 4000;
    for (let i = 0; i < MAX_IT; i++) {

        const t1 = Math.random() * numberOfTeams | 0;
        const t2 = Math.random() * numberOfTeams | 0;
        if (t1 === t2) continue;

        if (teams[t1].players.length === 0 || teams[t2].players.length === 0) continue;

        const p1 = teams[t1].players[Math.random() * teams[t1].players.length | 0];
        const p2 = teams[t2].players[Math.random() * teams[t2].players.length | 0];

        // kapasitet
        if (teams[t1].players.length - 1 < minSize) continue;
        if (teams[t2].players.length - 1 < minSize) continue;
        if (teams[t1].players.length + 1 > maxSize) continue;
        if (teams[t2].players.length + 1 > maxSize) continue;

        // bytt
        teams[t1].players = teams[t1].players.filter(p => p !== p1);
        teams[t2].players = teams[t2].players.filter(p => p !== p2);
        teams[t1].players.push(p2);
        teams[t2].players.push(p1);

        teams.forEach(updateTeamStats);

        const newCost = totalCost(teams);
        if (newCost > currentCost) {
            // reverser
            teams[t1].players = teams[t1].players.filter(p => p !== p2);
            teams[t2].players = teams[t2].players.filter(p => p !== p1);
            teams[t1].players.push(p1);
            teams[t2].players.push(p2);
            teams.forEach(updateTeamStats);
        } else {
            currentCost = newCost;
        }
    }

    return teams.map((team, i) => ({
        teamNumber: i + 1,
        players: team.players,
        score: totalCost([team])
    }));
}
