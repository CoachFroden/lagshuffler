// generator.js – stabil og korrekt versjon
// • Ingen duplikater
// • Bruker kun første posisjon ved grunnfordeling
// • Posisjon viktigst (3–2–1 formasjon)
// • Nivå og kull sekundært
// • Stabil lagstørrelse

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

    // ----------------------------------------------------
    // 1. GRUNNFORDELING – KUN FØRSTE POSISJON TELLER
    // ----------------------------------------------------

    const positionGroups = {
        "Keeper": [],
        "Forsvar": [],
        "Midtbane": [],
        "Spiss": []
    };

    selectedPlayers.forEach(p => {
        const mainPos = p.positions[0];   // kun første posisjon
        positionGroups[mainPos].push(p);
    });

    // Fordelingsrekkefølge i henhold til 3–2–1 + keeper
    const posOrder = ["Forsvar", "Midtbane", "Spiss", "Keeper"];

    // round-robin
    function distributeGroup(group) {
        let ti = 0;
        group.forEach(player => {
            teams[ti].players.push(player);
            ti = (ti + 1) % numberOfTeams;
        });
    }

    posOrder.forEach(pos => distributeGroup(positionGroups[pos]));

    // ----------------------------------------------------
    // 2. OPPDATER STATISTIKK
    // ----------------------------------------------------

    function updateTeamStats(team) {
        team.positionCount = {};
        team.yearCount = {};
        team.levelSum = 0;

        team.players.forEach(p => {
            const pos = p.positions[0]; // første posisjon
            team.positionCount[pos] = (team.positionCount[pos] || 0) + 1;
            team.yearCount[p.year] = (team.yearCount[p.year] || 0) + 1;
            team.levelSum += p.level || 0;
        });
    }

    teams.forEach(updateTeamStats);

    // ----------------------------------------------------
    // 3. COST-FUNKSJON (POSISJON VIKTIGST)
    // ----------------------------------------------------

    function totalCost(teams) {
        let cost = 0;

        // posisjon først
        Object.keys(IDEAL_FORMATION).forEach(pos => {
            const counts = teams.map(t => t.positionCount[pos] || 0);
            const diff = Math.max(...counts) - Math.min(...counts);
            cost += diff * settings.weightPosition;
        });

        // nivåbalanse
        const avgLevels = teams.map(t => t.levelSum / t.players.length);
        cost += (Math.max(...avgLevels) - Math.min(...avgLevels)) * settings.weightLevel;

        // kullbalanse
        const avgYears = teams.map(t =>
            t.players.reduce((a, b) => a + (b.year || 0), 0) / t.players.length
        );
        cost += (Math.max(...avgYears) - Math.min(...avgYears)) * settings.weightCohort;

        return cost;
    }

    let currentCost = totalCost(teams);

    // ----------------------------------------------------
    // 4. OPTIMALISERING – BYTTER BAG RUNDT
    // ----------------------------------------------------

    const MAX_ITER = 4500;

    for (let i = 0; i < MAX_ITER; i++) {

        const t1 = Math.floor(Math.random() * numberOfTeams);
        const t2 = Math.floor(Math.random() * numberOfTeams);
        if (t1 === t2) continue;

        if (teams[t1].players.length === 0 || teams[t2].players.length === 0) continue;

        const p1 = teams[t1].players[Math.floor(Math.random() * teams[t1].players.length)];
        const p2 = teams[t2].players[Math.floor(Math.random() * teams[t2].players.length)];

        // kapasitet
        if (teams[t1].players.length - 1 < minSize) continue;
        if (teams[t2].players.length - 1 < minSize) continue;
        if (teams[t1].players.length + 1 > maxSize) continue;
        if (teams[t2].players.length + 1 > maxSize) continue;

        // utfør bytte
        teams[t1].players = teams[t1].players.filter(p => p !== p1);
        teams[t2].players = teams[t2].players.filter(p => p !== p2);
        teams[t1].players.push(p2);
        teams[t2].players.push(p1);

        teams.forEach(updateTeamStats);

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

    // ----------------------------------------------------
    // 5. RETURNER
    // ----------------------------------------------------

    return teams.map((team, index) => ({
        teamNumber: index + 1,
        players: team.players,
        score: totalCost([team])
    }));
}
