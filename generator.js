// generator.js – profesjonell versjon der posisjon er viktigst,
// basert på formasjonen 3–2–1 + keeper (defensiv balanse)

// IDEELL POSISJONSFORDELING FOR 7v7/8v8 (per lag)
const IDEAL_FORMATION = {
    "Keeper": 1,
    "Forsvar": 3,
    "Midtbane": 2,
    "Spiss": 1
};

function generateTeams(selectedPlayers, numberOfTeams, settings) {

    // Standardvekter – posisjon viktigst (du valgte D)
    settings = Object.assign({
        weightPosition: 30,
        weightLevel: 10,
        weightCohort: 5
    }, settings || {});

    // Opprett lagstrukturer
    const teams = Array.from({ length: numberOfTeams }, () => ({
        players: [],
        positionCount: {},
        yearCount: {},
        levelSum: 0
    }));

    const totalPlayers = selectedPlayers.length;
    const minSize = Math.floor(totalPlayers / numberOfTeams);
    const maxSize = minSize + 1;

    // -------------------------------------------------------
    // 1) GRUPPER SPILLERE ETTER POSISJON
    // -------------------------------------------------------

    const keepers = selectedPlayers.filter(p => p.positions.includes("Keeper"));
    const defenders = selectedPlayers.filter(p => p.positions.includes("Forsvar"));
    const midfielders = selectedPlayers.filter(p => p.positions.includes("Midtbane"));
    const forwards = selectedPlayers.filter(p => p.positions.includes("Spiss"));

    // multiposisjon – dynamisk behandling
    const multiPos = selectedPlayers.filter(p => p.positions.length > 1);

    // -------------------------------------------------------
    // 2) INITIAL FORDELING BASERT PÅ FORMASJON (3–2–1–1)
    //    Vi starter med forsvar → midtbane → spiss → keeper
    // -------------------------------------------------------

    function distributeGroup(group) {
        let ti = 0;
        group.forEach(player => {
            teams[ti].players.push(player);
            ti = (ti + 1) % numberOfTeams;
        });
    }

    distributeGroup(defenders);
    distributeGroup(midfielders);
    distributeGroup(forwards);
    distributeGroup(keepers);

    // -------------------------------------------------------
    // 3) OPPDATER LAGSSTATISTIKK
    // -------------------------------------------------------

    function updateTeamStats(team) {
        team.levelSum = 0;
        team.positionCount = {};
        team.yearCount = {};

        team.players.forEach(p => {
            // nivå
            team.levelSum += p.level || 0;

            // posisjoner
            p.positions.forEach(pos => {
                team.positionCount[pos] = (team.positionCount[pos] || 0) + 1;
            });

            // kull
            team.yearCount[p.year] = (team.yearCount[p.year] || 0) + 1;
        });
    }

    teams.forEach(updateTeamStats);

    // -------------------------------------------------------
    // 4) BEREGN POSISJONSMANGEL-FUNKSJON
    // -------------------------------------------------------

    function teamPositionNeed(team) {
        let need = 0;

        Object.keys(IDEAL_FORMATION).forEach(pos => {
            const actual = team.positionCount[pos] || 0;
            const ideal = IDEAL_FORMATION[pos];
            if (actual < ideal) need += (ideal - actual);
        });

        return need;
    }

    // -------------------------------------------------------
    // 5) COST-FUNKSJON (POSISJON → NIVÅ → KULL)
    // -------------------------------------------------------

    function totalCost(teams) {
        let cost = 0;

        // POSISJONSBALANSE
        Object.keys(IDEAL_FORMATION).forEach(pos => {
            const counts = teams.map(t => t.positionCount[pos] || 0);
            const diff = Math.max(...counts) - Math.min(...counts);
            cost += diff * settings.weightPosition;
        });

        // NIVÅBALANSE
        const avgLevels = teams.map(t => t.levelSum / t.players.length);
        cost += (Math.max(...avgLevels) - Math.min(...avgLevels)) * settings.weightLevel;

        // KULLBALANSE
        const avgYears = teams.map(t =>
            t.players.reduce((a, b) => a + (b.year || 0), 0) / t.players.length
        );
        cost += (Math.max(...avgYears) - Math.min(...avgYears)) * settings.weightCohort;

        return cost;
    }

    let currentCost = totalCost(teams);

    // -------------------------------------------------------
    // 6) OPTIMALISERING (SWAPS)
    // -------------------------------------------------------

    const MAX_ITERATIONS = 6000;
    for (let i = 0; i < MAX_ITERATIONS; i++) {

        const t1 = Math.floor(Math.random() * numberOfTeams);
        const t2 = Math.floor(Math.random() * numberOfTeams);
        if (t1 === t2) continue;

        if (teams[t1].players.length === 0) continue;
        if (teams[t2].players.length === 0) continue;

        const p1 = teams[t1].players[Math.floor(Math.random() * teams[t1].players.length)];
        const p2 = teams[t2].players[Math.floor(Math.random() * teams[t2].players.length)];

        // Størrelses-sperrer
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

        // Sjekk posisjonskritisk behov
        const beforeNeed = teamPositionNeed(teams[t1]) + teamPositionNeed(teams[t2]);
        const afterNeed = teamPositionNeed(teams[t1]) + teamPositionNeed(teams[t2]);

        // Hvis byttet gjør posisjonsbalansen verre → reverser
        if (afterNeed > beforeNeed) {
            teams[t1].players = teams[t1].players.filter(p => p !== p2);
            teams[t2].players = teams[t2].players.filter(p => p !== p1);
            teams[t1].players.push(p1);
            teams[t2].players.push(p2);
            teams.forEach(updateTeamStats);
            continue;
        }

        // KOSTBEREGNING
        const newCost = totalCost(teams);
        if (newCost <= currentCost) {
            currentCost = newCost;
        } else {
            // reverser
            teams[t1].players = teams[t1].players.filter(p => p !== p2);
            teams[t2].players = teams[t2].players.filter(p => p !== p1);
            teams[t1].players.push(p1);
            teams[t2].players.push(p2);
            teams.forEach(updateTeamStats);
        }
    }

    // -------------------------------------------------------
    // 7) RETURNER RESULTAT
    // -------------------------------------------------------

    return teams.map((team, index) => ({
        teamNumber: index + 1,
        players: team.players,
        score: totalCost([team])
    }));
}
