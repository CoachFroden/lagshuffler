// player-overrides.js
// Lokal redigering av nivå og posisjoner for faste spillere.

(() => {
  const STORAGE_KEY = "lagshuffler_fixed_player_overrides_v1";
  const POSITIONS = ["Keeper", "Forsvar", "Midtbane", "Spiss"];

  const defaults = players.map(player => ({
    level: clampLevel(player.level),
    positions: cleanPositions(player.positions)
  }));

  let overrides = loadOverrides();
  applyAllOverrides();

  function clampLevel(level) {
    return Math.min(11, Math.max(1, Number(level) || 6));
  }

  function cleanPositions(positions) {
    if (!Array.isArray(positions)) return [];
    return [...new Set(positions.filter(position => POSITIONS.includes(position)))].slice(0, 2);
  }

  function loadOverrides() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

      const cleaned = {};
      Object.entries(parsed).forEach(([key, value]) => {
        const index = Number(key);
        if (!Number.isInteger(index) || index < 0 || index >= players.length || !value) return;

        cleaned[index] = {
          level: clampLevel(value.level),
          positions: cleanPositions(value.positions).length
            ? cleanPositions(value.positions)
            : [...defaults[index].positions]
        };
      });
      return cleaned;
    } catch (error) {
      console.warn("Kunne ikke lese lokale spillerendringer", error);
      return {};
    }
  }

  function persistOverrides() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  }

  function applyPlayer(index) {
    if (!players[index]) return;
    const source = overrides[index] || defaults[index];
    players[index].level = clampLevel(source.level);
    players[index].positions = [...source.positions];
  }

  function applyAllOverrides() {
    players.forEach((_, index) => applyPlayer(index));
  }

  function sameAsDefault(index, level, positions) {
    return clampLevel(level) === defaults[index].level &&
      JSON.stringify(cleanPositions(positions)) === JSON.stringify(defaults[index].positions);
  }

  function savePlayer(index, level, primary, secondary) {
    const positions = cleanPositions([primary, secondary].filter(Boolean));
    if (!positions.length) return;

    if (sameAsDefault(index, level, positions)) {
      delete overrides[index];
    } else {
      overrides[index] = { level: clampLevel(level), positions };
    }

    persistOverrides();
    applyPlayer(index);
    closeEditor();
    refreshPlayerList();
  }

  function resetPlayer(index) {
    delete overrides[index];
    persistOverrides();
    applyPlayer(index);
    closeEditor();
    refreshPlayerList();
  }

  function resetAllPlayers() {
    if (!Object.keys(overrides).length) return;
    overrides = {};
    persistOverrides();
    applyAllOverrides();
    closeEditor();
    refreshPlayerList();
  }

  function refreshPlayerList() {
    if (typeof renderPlayerList === "function") {
      renderPlayerList({ preserveSelection: true });
    }
    if (typeof clearGeneratedTeams === "function") clearGeneratedTeams();
    updateResetAllButton();
  }

  function positionOptions(selected, allowEmpty = false) {
    const options = allowEmpty ? '<option value="">Ingen</option>' : "";
    return options + POSITIONS.map(position =>
      `<option value="${position}" ${position === selected ? "selected" : ""}>${position}</option>`
    ).join("");
  }

  function openEditor(index) {
    const player = players[index];
    if (!player) return;

    closeEditor();

    const modal = document.createElement("div");
    modal.id = "playerEditModal";
    modal.className = "player-edit-backdrop";
    modal.innerHTML = `
      <section class="player-edit-card" role="dialog" aria-modal="true" aria-labelledby="playerEditTitle">
        <div class="player-edit-heading">
          <div>
            <span class="player-edit-kicker">SPILLER</span>
            <h2 id="playerEditTitle">${escapeText(player.name)}</h2>
            <p>Nivå og posisjon brukes direkte når lagene balanseres.</p>
          </div>
          <button type="button" class="player-edit-close" aria-label="Lukk">×</button>
        </div>

        <div class="player-edit-level">
          <span>Nivå</span>
          <div class="level-stepper">
            <button type="button" data-level-minus aria-label="Senk nivå">−</button>
            <strong id="editPlayerLevel">${clampLevel(player.level)}</strong>
            <button type="button" data-level-plus aria-label="Øk nivå">＋</button>
          </div>
          <small>1 = svakest · 11 = sterkest</small>
        </div>

        <div class="player-edit-fields">
          <label>
            <span>Hovedposisjon</span>
            <select id="editPrimaryPosition">${positionOptions(player.positions?.[0] || "Midtbane")}</select>
          </label>
          <label>
            <span>Sekundærposisjon</span>
            <select id="editSecondaryPosition">${positionOptions(player.positions?.[1] || "", true)}</select>
          </label>
        </div>

        <p class="player-edit-note">Hovedposisjonen teller mer enn sekundærposisjonen i lagbalansen.</p>

        <div class="player-edit-actions">
          <button type="button" class="player-edit-save">Lagre endringer</button>
          ${overrides[index] ? '<button type="button" class="player-edit-default">Tilbake til standard</button>' : ""}
        </div>
      </section>
    `;

    document.body.appendChild(modal);
    document.body.classList.add("player-editor-open");

    const levelEl = modal.querySelector("#editPlayerLevel");
    let level = clampLevel(player.level);

    modal.querySelector("[data-level-minus]").addEventListener("click", () => {
      level = Math.max(1, level - 1);
      levelEl.textContent = level;
    });

    modal.querySelector("[data-level-plus]").addEventListener("click", () => {
      level = Math.min(11, level + 1);
      levelEl.textContent = level;
    });

    modal.querySelector(".player-edit-close").addEventListener("click", closeEditor);
    modal.addEventListener("click", event => {
      if (event.target === modal) closeEditor();
    });

    modal.querySelector(".player-edit-save").addEventListener("click", () => {
      const primary = modal.querySelector("#editPrimaryPosition").value;
      let secondary = modal.querySelector("#editSecondaryPosition").value;
      if (secondary === primary) secondary = "";
      savePlayer(index, level, primary, secondary);
    });

    modal.querySelector(".player-edit-default")?.addEventListener("click", () => resetPlayer(index));
  }

  function closeEditor() {
    document.getElementById("playerEditModal")?.remove();
    document.body.classList.remove("player-editor-open");
  }

  function escapeText(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function decoratePlayerRows() {
    const list = document.getElementById("playerList");
    if (!list) return;

    list.querySelectorAll(".player-row").forEach(row => {
      const input = row.querySelector("input[data-player-id^='fixed-']");
      if (!input) return;

      const index = Number(input.dataset.playerId.replace("fixed-", ""));
      if (!Number.isInteger(index) || !players[index]) return;

      if (overrides[index] && !row.querySelector(".edited-player-badge")) {
        const main = row.querySelector(".player-main");
        const badge = document.createElement("span");
        badge.className = "edited-player-badge";
        badge.textContent = "Endret";
        main?.insertBefore(badge, main.querySelector("small"));
      }

      if (row.querySelector(".edit-fixed-player")) return;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "edit-fixed-player";
      button.setAttribute("aria-label", `Rediger ${players[index].name}`);
      button.innerHTML = "✎";
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        openEditor(index);
      });
      button.addEventListener("pointerdown", event => event.stopPropagation());

      row.appendChild(button);
    });

    updateResetAllButton();
  }

  function ensureResetAllButton() {
    const list = document.getElementById("playerList");
    if (!list || document.getElementById("resetFixedPlayersBtn")) return;

    const button = document.createElement("button");
    button.id = "resetFixedPlayersBtn";
    button.type = "button";
    button.className = "reset-fixed-players";
    button.textContent = "Tilbakestill alle nivåer og posisjoner";
    button.addEventListener("click", resetAllPlayers);
    list.insertAdjacentElement("afterend", button);
    updateResetAllButton();
  }

  function updateResetAllButton() {
    const button = document.getElementById("resetFixedPlayersBtn");
    if (button) button.hidden = Object.keys(overrides).length === 0;
  }

  function injectStyles() {
    if (document.getElementById("playerOverrideStyles")) return;

    const style = document.createElement("style");
    style.id = "playerOverrideStyles";
    style.textContent = `
      .player-row { grid-template-columns:auto 1fr auto auto; }
      .edit-fixed-player { display:grid; place-items:center; width:31px; height:31px; padding:0; border:1px solid var(--border); border-radius:10px; background:rgba(83,199,255,.08); color:var(--cyan); font-size:.95rem; font-weight:900; }
      .edited-player-badge { padding:2px 7px; border-radius:999px; background:rgba(83,199,255,.11); color:var(--cyan); font-size:.59rem; font-weight:850; letter-spacing:.05em; text-transform:uppercase; }
      .reset-fixed-players { width:100%; margin-top:9px; min-height:43px; border:1px solid rgba(255,107,120,.16); border-radius:13px; background:rgba(255,107,120,.06); color:var(--danger); font-size:.76rem; font-weight:800; }
      .player-editor-open { overflow:hidden; }
      .player-edit-backdrop { position:fixed; inset:0; z-index:9999; display:grid; align-items:end; justify-items:center; padding:18px max(12px, env(safe-area-inset-right)) max(18px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)); background:rgba(0,5,12,.74); backdrop-filter:blur(9px); }
      .player-edit-card { width:min(100%,520px); max-height:min(86vh,680px); overflow:auto; padding:20px; border:1px solid rgba(83,199,255,.2); border-radius:24px; background:linear-gradient(155deg,#11243a,#071421); box-shadow:0 28px 90px rgba(0,0,0,.55); }
      .player-edit-heading { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; }
      .player-edit-kicker { color:var(--cyan); font-size:.65rem; font-weight:850; letter-spacing:.14em; }
      .player-edit-heading h2 { margin:3px 0 4px; font-size:1.55rem; }
      .player-edit-heading p { margin:0; color:var(--muted); font-size:.78rem; line-height:1.4; }
      .player-edit-close { flex:0 0 auto; display:grid; place-items:center; width:36px; height:36px; padding:0; border-radius:12px; background:rgba(255,255,255,.06); color:var(--muted); font-size:1.35rem; }
      .player-edit-level { margin-top:18px; padding:15px; border:1px solid var(--border); border-radius:17px; background:rgba(255,255,255,.025); }
      .player-edit-level > span { display:block; margin-bottom:10px; color:var(--muted); font-size:.72rem; font-weight:750; text-transform:uppercase; letter-spacing:.07em; }
      .level-stepper { display:grid; grid-template-columns:52px 1fr 52px; gap:10px; align-items:center; }
      .level-stepper button { height:48px; border-radius:14px; background:var(--surface); color:var(--text); font-size:1.35rem; font-weight:800; }
      .level-stepper strong { text-align:center; color:var(--primary); font-size:2rem; font-variant-numeric:tabular-nums; }
      .player-edit-level small { display:block; margin-top:8px; text-align:center; color:var(--muted); font-size:.66rem; }
      .player-edit-fields { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:12px; }
      .player-edit-fields label { display:grid; gap:6px; color:var(--muted); font-size:.72rem; font-weight:700; }
      .player-edit-fields select { min-height:48px; }
      .player-edit-note { margin:10px 1px 0; color:var(--muted); font-size:.69rem; }
      .player-edit-actions { display:grid; grid-template-columns:1fr auto; gap:9px; margin-top:18px; }
      .player-edit-actions button { min-height:49px; padding:0 14px; border-radius:14px; font-weight:850; }
      .player-edit-save { background:linear-gradient(135deg,var(--primary),#35cfff); color:#04120d; }
      .player-edit-default { border:1px solid rgba(255,107,120,.16); background:rgba(255,107,120,.07); color:var(--danger); }
      @media (min-width:700px) { .player-edit-backdrop { align-items:center; } }
      @media (max-width:480px) {
        .player-edit-card { padding:17px; border-radius:22px; }
        .player-edit-fields { grid-template-columns:1fr; }
        .player-edit-actions { grid-template-columns:1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectStyles();
    ensureResetAllButton();

    const list = document.getElementById("playerList");
    if (!list) return;

    const observer = new MutationObserver(() => decoratePlayerRows());
    observer.observe(list, { childList: true, subtree: true });
    decoratePlayerRows();
  });
})();
