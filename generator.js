// generator.js – ferdig versjon med posisjonsbalanse + nivåbalanse + kullbalanse

function generateTeams(selectedPlayers, numberOfTeams, settings) {

    // Standard-innstillinger hvis ikke sendt inn
    settings = Object.assign({
        weightLevel: 10,
        weightCohort: 5,
        weightPosition: 10
    }, settings || {});

    // Opprett tomme lag
    const teams = Array.from({ length: numberOfTeams }, () => ({
        players: [],
        yearCount: {},
        positionCount: {},
        levelSum: 0,
        keepers: 0
    }));

    const totalPlayers = selectedPlayers.length;
    const minSize = Math.floor(totalPlayers / numberOfTeams);
    const maxSize = minSize + 1;

    // -------------------------------------------------------
    // 1) POSISJONSBASERT INITIAL FORDELING
    // -------------------------------------------------------

    const keepers = selectedPlayers.filter(p => p.positions.includes("Keeper"));
    const defenders = selectedPlayers.filter(p => p.positions.includes("Forsvar"));
    const midfielders = selectedPlayers.filter(p => p.positions.includes("Midtbane"));
    const forwards = selectedPlayers.filter(p => p.positions.includes("Spiss"));

    function distributeGroup(group) {
        let ti = 0;
        group.forEach(player => {
            teams[ti].players.push(player);
            ti = (ti + 1) % numberOfTeams;
        });
    }

    distributeGroup(keepers);
    distributeGroup(defenders);
    distributeGroup(midfielders);
    distributeGroup(forwards);

    // -------------------------------------------------------
    // 2) OPPDATER LAGSTATISTIKK
    // -------------------------------------------------------

    function updateTeamStats(team) {
        team.yearCount = {};
        team.positionCount = {};
        team.levelSum = 0;
        team.keepers = 0;

        team.players.forEach(p => {
            // Kull
            if (p.year) {
                team.yearCount[p.year] = (team.yearCount[p.year] || 0) + 1;
            }
            // Posisjoner
            if (p.positions) {
                p.positions.forEach(pos => {
                    team.positionCount[pos] = (team.positionCount[pos] || 0) + 1;
                });
            }
            // Nivå
            team.levelSum += p.level || 0;

            // Keeperantall
            if (p.positions.includes("Keeper")) {
                team.keepers++;
            }
        });
    }

    teams.forEach(updateTeamStats);

    // -------------------------------------------------------
    // 3) BALANSEKOST (COST FUNCTION)
    // -------------------------------------------------------

    function totalCost(teams) {
        let cost = 0;

        // NIVÅBALANSE
        const avgLevels = teams.map(t => t.levelSum / t.players.length);
        cost += (Math.max(...avgLevels) - Math.min(...avgLevels)) * settings.weightLevel;

        // KULLBALANSE
        const avgYears = teams.map(t =>
            t.players.reduce((a, b) => a + (b.year || 0), 0) / t.players.length
        );
        cost += (Math.max(...avgYears) - Math.min(...avgYears)) * settings.weightCohort;

        // POSISJONSBALANSE
        const posTypes = ["Keeper", "Forsvar", "Midtbane", "Spiss"];
        posTypes.forEach(pos => {
            const counts = teams.map(t => t.positionCount[pos] || 0);
            cost += (Math.max(...counts) - Math.min(...counts)) * settings.weightPosition;
        });

        return cost;
    }

    let currentCost = totalCost(teams);

    // -------------------------------------------------------
    // 4) OPTIMALISERINGSMOTOR (SWAPS)
    // -------------------------------------------------------

    const MAX_ITERATIONS = 4000;
    for (let i = 0; i < MAX_ITERATIONS; i++) {
        let t1 = Math.floor(Math.random() * numberOfTeams);
        let t2 = Math.floor(Math.random() * numberOfTeams);
        if (t1 === t2) continue;

        if (teams[t1].players.length === 0) continue;
        if (teams[t2].players.length === 0) continue;

        let p1 = teams[t1].players[Math.floor(Math.random() * teams[t1].players.length)];
        let p2 = teams[t2].players[Math.floor(Math.random() * teams[t2].players.length)];

        // KAPASITETSSPERRE
        if (teams[t1].players.length - 1 < minSize) continue;
        if (teams[t2].players.length - 1 < minSize) continue;
        if (teams[t1].players.length + 1 > maxSize) continue;
        if (teams[t2].players.length + 1 > maxSize) continue;

        // Utfør bytte
        teams[t1].players = teams[t1].players.filter(p => p !== p1);
        teams[t2].players = teams[t2].players.filter(p => p !== p2);

        teams[t1].players.push(p2);
        teams[t2].players.push(p1);

        teams.forEach(updateTeamStats);

        // Avvis om kapasiteten ryker
        let bad = false;
        for (let t = 0; t < numberOfTeams; t++) {
            if (teams[t].players.length < minSize || teams[t].players.length > maxSize)
                bad = true;
        }
        if (bad) {
            // reverser
            teams[t1].players = teams[t1].players.filter(p => p !== p2);
            teams[t2].players = teams[t2].players.filter(p => p !== p1);
            teams[t1].players.push(p1);
            teams[t2].players.push(p2);
            teams.forEach(updateTeamStats);
            continue;
        }

        // Evaluer kost
        const newCost = totalCost(teams);
        if (newCost <= currentCost) {
            currentCost = newCost; // aksepter forbedring
        } else {
            // reverser hvis det ble dårligere
            teams[t1].players = teams[t1].players.filter(p => p !== p2);
            teams[t2].players = teams[t2].players.filter(p => p !== p1);
            teams[t1].players.push(p1);
            teams[t2].players.push(p2);
            teams.forEach(updateTeamStats);
        }
    }

    // -------------------------------------------------------
    // 5) RETURNER RESULTAT
    // -------------------------------------------------------

    return teams.map((team, index) => ({
        teamNumber: index + 1,
        players: team.players,
        score: totalCost([team])
    }));
}
