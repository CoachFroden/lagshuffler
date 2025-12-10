// generator.js
// Laggeneratoren for LagShuffler

function generateTeams(selectedPlayers, numberOfTeams, settings) {
    
    // SETTINGS MED STANDARDVERDIER
    const allowSameTeamKeepers = settings.allowSameTeamKeepers ?? false;
    const weightFoot = settings.weightFoot ?? 0.15;
    const weightCohort = settings.weightCohort ?? 0.4;

    // KLARGJØR LAGSTRUKTUR
    let teams = Array.from({ length: numberOfTeams }, () => ({
        players: [],
        score: 0,
        keepers: 0,
        yearCount: {},  // For kullbalanse
        positionCount: {} // For posisjonsbalanse
    }));
    // Beregn tillatte lagstørrelser
    const totalPlayers = selectedPlayers.length;
    const minSize = Math.floor(totalPlayers / numberOfTeams);
    const maxSize = minSize + 1;


    /* -----------------------------------------------------
       1. SORTÉR SPILLERE ETTER VIKTIGHET (KEEPER → NIVÅ)
    ----------------------------------------------------- */
    const keepers = selectedPlayers.filter(p => p.positions.includes("Keeper"));
    const fieldPlayers = selectedPlayers.filter(p => !p.positions.includes("Keeper"));

    // Sorter etter nivå (best først)
    fieldPlayers.sort((a, b) => b.level - a.level);


    /* -----------------------------------------------------
       2. FORDEL KEEPERE (HØY PRIORITET)
    ----------------------------------------------------- */
    if (!allowSameTeamKeepers && keepers.length > 1) {
        // Plasser keepere i hvert sitt lag i sirkel
        keepers.forEach((keeper, i) => {
            let targetTeam = i % numberOfTeams;
            teams[targetTeam].players.push(keeper);
            teams[targetTeam].keepers += 1;
        });
    } else {
        // Alle i første lag eller der det er plass
        keepers.forEach(k => {
            teams[0].players.push(k);
            teams[0].keepers += 1;
        });
    }


    /* -----------------------------------------------------
       3. GRUNNLEGGENDE FORDELING AV FELTSPLILLERE
          (STERKE SPILLER FØRST, ROUND ROBIN)
    ----------------------------------------------------- */
    let teamIndex = 0;
    fieldPlayers.forEach(player => {
        teams[teamIndex].players.push(player);
        teamIndex = (teamIndex + 1) % numberOfTeams;
    });


    /* -----------------------------------------------------
       4. SCORELØSNING FOR SPILLERE (NIVÅ + POSISJON + FOT)
    ----------------------------------------------------- */
    function calculatePlayerScore(p) {
        let base = p.level;

        // Fotpreferanse (svak vekt)
        if (p.foot === "Venstre") base += weightFoot;
        if (p.foot === "Begge") base += weightFoot * 0.5;

        return base;
    }


    /* -----------------------------------------------------
       5. BEREGN LAGPOENG OG STATISTIKK
    ----------------------------------------------------- */
    function updateTeamStats(team) {
        team.score = 0;
        team.yearCount = {};
        team.positionCount = {};

        team.players.forEach(p => {
            // Score
            team.score += calculatePlayerScore(p);

            // Kullbalanse
            team.yearCount[p.year] = (team.yearCount[p.year] || 0) + 1;

            // Posisjonsbalanse
            p.positions.forEach(pos => {
                team.positionCount[pos] = (team.positionCount[pos] || 0) + 1;
            });
        });
    }


    // Oppdater alle lag ved start
    teams.forEach(updateTeamStats);


    /* -----------------------------------------------------
       6. OPTIMALISERING – PRØV Å BYTTE SPILLERE
          FOR Å JEVNE UT SCORE OG KULLBALANSE
    ----------------------------------------------------- */

    function getTeamBalanceCost(team) {
        let cost = 0;

        // Score-påvirkning (jo høyere, jo verre)
        cost += Math.abs(team.score);

        // Kullbalanse – høy vekt
        const years = Object.values(team.yearCount);
        if (years.length > 1) {
            cost += weightCohort * Math.abs(years[0] - years[1]);
        }

        return cost;
    }

    function totalBalanceCost(teams) {
        return teams.reduce((sum, t) => sum + getTeamBalanceCost(t), 0);
    }

    let bestCost = totalBalanceCost(teams);
    let iterations = 300; // Antall optimaliseringsforsøk

    while (iterations-- > 0) {
        // Velg to tilfeldige lag
        let t1 = Math.floor(Math.random() * numberOfTeams);
        let t2 = Math.floor(Math.random() * numberOfTeams);
        if (t1 === t2) continue;

        // Velg spillere å bytte
        let p1 = teams[t1].players[Math.floor(Math.random() * teams[t1].players.length)];
        let p2 = teams[t2].players[Math.floor(Math.random() * teams[t2].players.length)];
		
		// Sjekk lagstørrelser før bytte
        if (teams[t1].players.length <= minSize && teams[t2].players.length >= maxSize) continue;
        if (teams[t2].players.length <= minSize && teams[t1].players.length >= maxSize) continue;


        // Ikke bytt keeper med ikke-keeper (stabilitet)
        if (p1.positions.includes("Keeper") && !p2.positions.includes("Keeper")) continue;
        if (p2.positions.includes("Keeper") && !p1.positions.includes("Keeper")) continue;

        // Gjør bytte
        teams[t1].players = teams[t1].players.filter(p => p !== p1);
        teams[t2].players = teams[t2].players.filter(p => p !== p2);
        teams[t1].players.push(p2);
        teams[t2].players.push(p1);

        // Oppdater
        teams.forEach(updateTeamStats);
		
		// Avbryt hvis lagstørrelser brytes
        if (teams[t1].players.length > maxSize || teams[t2].players.length > maxSize) {

        // Reverser bytte
        teams[t1].players = teams[t1].players.filter(p => p !== p2);
        teams[t2].players = teams[t2].players.filter(p => p !== p1);
        teams[t1].players.push(p1);
        teams[t2].players.push(p2);

        teams.forEach(updateTeamStats);
        continue;
}


        let newCost = totalBalanceCost(teams);

        if (newCost < bestCost) {
            bestCost = newCost;
        } else {
            // Reverser bytte
            teams[t1].players = teams[t1].players.filter(p => p !== p2);
            teams[t2].players = teams[t2].players.filter(p => p !== p1);
            teams[t1].players.push(p1);
            teams[t2].players.push(p2);

            teams.forEach(updateTeamStats);
        }
    }


    /* -----------------------------------------------------
       7. RETURNER FERDIGE LAG
    ----------------------------------------------------- */

    return teams.map((team, index) => ({
        teamNumber: index + 1,
        score: team.score.toFixed(2),
        players: team.players
    }));
}
