// generator.js – fullstendig korrigert og balansert versjon

function generateTeams(selectedPlayers, numberOfTeams, settings) {

    const teams = Array.from({ length: numberOfTeams }, () => ({
        players: [],
        score: 0,
        yearCount: {},
        positionCount: {},
        keepers: 0
    }));

    // Hent keepere og utespillere
    // Alle spillere fordeles jevnt – keeper er bare en posisjon
    const fieldPlayers = selectedPlayers; 


    // Beregn min og maks lagstørrelse
    const totalPlayers = selectedPlayers.length;
    const minSize = Math.floor(totalPlayers / numberOfTeams);
    const maxSize = minSize + 1;

    // -----------------------------------------------------
    // 1) FORDEL ALLE UTESPILLERE HELT JEVNT
    // -----------------------------------------------------
    let teamIndex = 0;
    fieldPlayers.forEach(player => {
        teams[teamIndex].players.push(player);
        teamIndex = (teamIndex + 1) % numberOfTeams;
    });

    // -----------------------------------------------------
    // 3) OPPDATER TELLERE
    // -----------------------------------------------------

    function updateTeamStats(team) {
        team.yearCount = {};
        team.positionCount = {};
        team.keepers = 0;

        team.players.forEach(p => {
            if (p.year) {
                team.yearCount[p.year] = (team.yearCount[p.year] || 0) + 1;
            }

            if (p.positions) {
                p.positions.forEach(pos => {
                    team.positionCount[pos] = (team.positionCount[pos] || 0) + 1;
                });
            }

            if (p.isKeeper) {
                team.keepers++;
            }
        });
    }

    teams.forEach(updateTeamStats);

    // -----------------------------------------------------
    // 4) BEREGN LAGBALANSE (COST)
    // -----------------------------------------------------

    function totalBalanceCost(teams) {
        let cost = 0;

        // nivåbalanse
        const avgLevels = teams.map(t =>
            t.players.reduce((a, b) => a + (b.level || 0), 0) / t.players.length
        );
        const maxLevel = Math.max(...avgLevels);
        const minLevel = Math.min(...avgLevels);
        cost += Math.abs(maxLevel - minLevel) * 10;

        // kullbalanse
        if (settings.weightCohort > 0) {
            const avgYears = teams.map(t =>
                t.players.reduce((a, b) => a + (b.year || 0), 0) / t.players.length
            );
            const maxYear = Math.max(...avgYears);
            const minYear = Math.min(...avgYears);
            cost += Math.abs(maxYear - minYear) * settings.weightCohort;
        }

        return cost;
    }

    let currentCost = totalBalanceCost(teams);

    // -----------------------------------------------------
    // 5) OPTIMALISERINGSMOTOR (MED FULL BALANSEKONTROLL)
    // -----------------------------------------------------

    const MAX_ITERATIONS = 4000;
    let iterations = 0;

    while (iterations < MAX_ITERATIONS) {
        iterations++;

        let t1 = Math.floor(Math.random() * numberOfTeams);
        let t2 = Math.floor(Math.random() * numberOfTeams);
        if (t1 === t2) continue;

        if (teams[t1].players.length === 0) continue;
        if (teams[t2].players.length === 0) continue;

        let p1 = teams[t1].players[Math.floor(Math.random() * teams[t1].players.length)];
        let p2 = teams[t2].players[Math.floor(Math.random() * teams[t2].players.length)];

        // LØPENDE KAPASITETSKONTROLL (før bytte)
        if (teams[t1].players.length - 1 < minSize) continue;
        if (teams[t2].players.length - 1 < minSize) continue;
        if (teams[t1].players.length + 1 > maxSize) continue;
        if (teams[t2].players.length + 1 > maxSize) continue;

        // -------------------------------------------------
        // UTFØR BYTTE
        // -------------------------------------------------

        teams[t1].players = teams[t1].players.filter(p => p !== p1);
        teams[t2].players = teams[t2].players.filter(p => p !== p2);
        teams[t1].players.push(p2);
        teams[t2].players.push(p1);

        teams.forEach(updateTeamStats);

        // Sjekk maksSize for trygghet
        if (teams[t1].players.length > maxSize || teams[t2].players.length > maxSize) {

            // Reverser
            teams[t1].players = teams[t1].players.filter(p => p !== p2);
            teams[t2].players = teams[t2].players.filter(p => p !== p1);

            teams[t1].players.push(p1);
            teams[t2].players.push(p2);

            teams.forEach(updateTeamStats);
            continue;
        }

        // ABSOLUTT KAPASITETSKONTROLL – ALLTID JEVNT
        let invalid = false;
        for (let t = 0; t < numberOfTeams; t++) {
            if (teams[t].players.length < minSize || teams[t].players.length > maxSize) {
                invalid = true;
                break;
            }
        }

        if (invalid) {
            // Reverser bytte
            teams[t1].players = teams[t1].players.filter(p => p !== p2);
            teams[t2].players = teams[t2].players.filter(p => p !== p1);
            teams[t1].players.push(p1);
            teams[t2].players.push(p2);

            teams.forEach(updateTeamStats);
            continue;
        }

        // -------------------------------------------------
        // VURDÉR FORBEDRING
        // -------------------------------------------------

        let newCost = totalBalanceCost(teams);
        if (newCost <= currentCost) {
            currentCost = newCost;
        } else {
            // Reverser bytte
            teams[t1].players = teams[t1].players.filter(p => p !== p2);
            teams[t2].players = teams[t2].players.filter(p => p !== p1);
            teams[t1].players.push(p1);
            teams[t2].players.push(p2);

            teams.forEach(updateTeamStats);
        }
    }

    // -----------------------------------------------------
    // 6) RETURNER RESULTAT
    // -----------------------------------------------------

    return teams.map((t, i) => ({
        teamNumber: i + 1,
        players: t.players,
        score: totalBalanceCost([t])
    }));
}
