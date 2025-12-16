// players.js
// Kun spillerdata – ingen logikk

const players = [
  { name: "Theodor", positions: ["Keeper"], level: 7 },
  { name: "Thage", positions: ["Keeper"], level: 7 },
  { name: "Gabriel", positions: ["Forsvar"], level: 4 },
  { name: "Ask", positions: ["Forsvar"], level: 10 },
  { name: "Brage", positions: ["Forsvar"], level: 5 },

  { name: "Sverre", positions: ["Midtbane"], level: 6 },
  { name: "Snorre", positions: ["Midtbane", "Forsvar"], level: 7 },
  { name: "Torvald", positions: ["Midtbane", "Forsvar"], level: 4 },
  { name: "Lars", positions: ["Midtbane", "Forsvar"], level: 7 },
  { name: "William", positions: ["Midtbane"], level: 6 },

  { name: "Noah", positions: ["Midtbane", "Spiss"], level: 7 },
  { name: "Nico", positions: ["Midtbane", "Spiss"], level: 12 },
  { name: "Nytveit", positions: ["Spiss"], level: 2 },
  { name: "Lukas", positions: ["Midtbane"], level: 4 },

  { name: "Oliver", positions: ["Spiss"], level: 3 },
  { name: "Liam", positions: ["Spiss"], level: 10 },
  { name: "Sondre", positions: ["Forsvar"], level: 5 },
  { name: "Martin", positions: ["Forsvar"], level: 6 },
];

window.players = players;
