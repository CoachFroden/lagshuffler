// generator.js – ENDLIG KORREKT STABIL VERSJON
// Ingen duplikater – alltid korrekt balanse – kun første posisjon teller

// IDEAL 7v7-FORMASJON: 3–2–1 + keeper
const IDEAL = {
    "Keeper": 1,
    "Forsvar": 3,
    "Midtbane": 2,
    "Spiss": 1
};

function generateTeams(selectedPlayers, numberOfTeams, settings) {

    // ---- VEKTER ----
    settings = Object.assign({
        weightPosition: 25,
        weightLevel: 35,
        weightCohort: 15
    }, settings || {});

    // ---- OPPRETT LAG ----
    const teams = Array.from({ length: numberOfTeams }, () => ({
        players: [],
        positionCount: {},
        yearCount: {},
        levelSum: 0
    }));

    // ---- LAGSTØRRELSE ----
    const totalPlayers = selectedPlayers.length;
    const minSize = Math.floor(totalPlayers / numberOfTeams);
    const maxSize = minSize;

    // ---- ALLTID START MED TOMME LAG ----
    teams.forEach(t => t.players = []);

    // ----------------------------------------------------
    // 1. FORDEL SPILLERE KUN BASERT PÅ FØRSTE POSISJON
    // ----------------------------------------------------
    const posGroups = {
        "Keeper": [],
        "Forsvar": [],
        "Midtbane": [],
        "Spiss": []
    };

    selectedPlayers.forEach(p => {
        const mainPos = p.positions[0];   // KUN FØRSTE POSISJON
        posGroups[mainPos].push(p);
    });

    // Formasjonsrekkefølge
const order = ["Keeper", "Forsvar", "Midtbane", "Spiss"];

function distribute(group) {
    let ti = 0;

    group.forEach(player => {
        // Finn første lag som IKKE er fullt
        while (teams[ti].players.length >= maxSize) {
            ti = (ti + 1) % numberOfTeams;
        }

        // Legg spiller i lag ti
        teams[ti].players.push(player);

        // Gå til neste lag
        ti = (ti + 1) % numberOfTeams;
    });
}


    order.forEach(pos => distribute(posGroups[pos]));

    // ----------------------------------------------------
    // 2. OPPDATER STATISTIKK
    // ----------------------------------------------------
    function updateStats(team) {
        team.positionCount = {};
        team.yearCount = {};
        team.levelSum = 0;

        team.players.forEach(p => {
            const pos = p.positions[0]; // første posisjon
            team.positionCount[pos] = (team.positionCount[pos] || 0) + 1;

            team.yearCount[p.year] = (team.yearCount[p.year] || 0) + 1;
            team.levelSum += p.level;
        });
    }

    teams.forEach(updateStats);

    // ----------------------------------------------------
    // 3. COST-FUNKSJON
    // ----------------------------------------------------
    function totalCost(teams) {
        let cost = 0;

        // Posisjonsbalanse (viktigst)
        Object.keys(IDEAL).forEach(pos => {
            const counts = teams.map(t => t.positionCount[pos] || 0);
            const diff = Math.max(...counts) - Math.min(...counts);
            cost += diff * settings.weightPosition;
        });

        // Nivåbalanse
        const avgs = teams.map(t => t.levelSum / t.players.length);
        cost += (Math.max(...avgs) - Math.min(...avgs)) * settings.weightLevel;

        // Kullbalanse
        const yearAvg = teams.map(t =>
            t.players.reduce((a, b) => a + b.year, 0) / t.players.length
        );
        cost += (Math.max(...yearAvg) - Math.min(...yearAvg)) * settings.weightCohort;

        return cost;
    }

    let bestCost = totalCost(teams);

    // ----------------------------------------------------
    // 4. OPTIMALISERING (SWAPS)
    // ----------------------------------------------------
    const MAX_ITER = 4000;

    for (let i = 0; i < MAX_ITER; i++) {

        const t1 = Math.floor(Math.random() * numberOfTeams);
        const t2 = Math.floor(Math.random() * numberOfTeams);
        if (t1 === t2) continue;

        if (teams[t1].players.length === 0 || teams[t2].players.length === 0) continue;

        const p1 = teams[t1].players[Math.floor(Math.random() * teams[t1].players.length)];
        const p2 = teams[t2].players[Math.floor(Math.random() * teams[t2].players.length)];

        // Kapasitetsregler
        if (teams[t1].players.length - 1 < minSize) continue;
        if (teams[t2].players.length - 1 < minSize) continue;
        if (teams[t1].players.length + 1 > maxSize) continue;
        if (teams[t2].players.length + 1 > maxSize) continue;

        // Utfør bytte
        teams[t1].players = teams[t1].players.filter(x => x !== p1);
        teams[t2].players = teams[t2].players.filter(x => x !== p2);
        teams[t1].players.push(p2);
        teams[t2].players.push(p1);

        teams.forEach(updateStats);

        const newCost = totalCost(teams);

        if (newCost <= bestCost) {
            bestCost = newCost;
        } else {
            // Reverser
            teams[t1].players = teams[t1].players.filter(x => x !== p2);
            teams[t2].players = teams[t2].players.filter(x => x !== p1);
            teams[t1].players.push(p1);
            teams[t2].players.push(p2);
            teams.forEach(updateStats);
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
