(function () {
  "use strict";

  // ---------- Config ----------
  const TILE_W = 80, TILE_H = 40;
  const ROWS = 11, COLS = 11;
  const canvas = document.getElementById("farm-canvas");
  const ctx = canvas.getContext("2d");
  const origin = { x: canvas.width / 2, y: 110 };

  const CROPS = [
    { id: "carrot", name: "Wortel", emoji: "🥕", cost: 5, sell: 12, grow: 9000, unlock: 1 },
    { id: "tomato", name: "Tomat", emoji: "🍅", cost: 9, sell: 23, grow: 16000, unlock: 1 },
    { id: "corn", name: "Jagung", emoji: "🌽", cost: 16, sell: 40, grow: 26000, unlock: 2 },
    { id: "pumpkin", name: "Labu", emoji: "🎃", cost: 28, sell: 70, grow: 38000, unlock: 3 },
  ];

  // ---------- Map ----------
  // 'G' grass, 'D' dirt(tillable), 'T' tree, 'Ts' stump, 'R' rock, 'Rs' rock-mined, 'W' water
  const map = [];
  for (let r = 0; r < ROWS; r++) map.push(new Array(COLS).fill("G"));

  const WATER = [[0,9],[0,10],[1,9],[1,10],[2,10]];
  const TREES = [[0,0],[0,1],[1,0],[2,0],[0,5],[1,6],[9,0],[10,1],[9,9],[10,9],[10,10],[4,10],[5,10]];
  const ROCKS = [[3,1],[7,0],[9,2],[2,7],[7,10]];
  WATER.forEach(([r,c]) => map[r][c] = "W");
  TREES.forEach(([r,c]) => map[r][c] = "T");
  ROCKS.forEach(([r,c]) => map[r][c] = "R");
  for (let r = 4; r <= 6; r++) for (let c = 3; c <= 5; c++) map[r][c] = "D";
  [[3,6],[7,3],[6,6],[2,4]].forEach(([r,c]) => map[r][c] = "D");

  const regrow = {};
  const crops = {};

  // ---------- Player state ----------
  let gold = 40, wood = 0, stone = 0, xp = 0;
  const player = {
    col: 3, row: 3,
    path: [], pathIndex: 0,
    facing: 1,
    moving: false,
    pending: null,
  };

  function level() { return Math.floor(xp / 50) + 1; }

  // ---------- HUD ----------
  function updateHud() {
    document.getElementById("hud-gold").textContent = gold;
    document.getElementById("hud-wood").textContent = wood;
    document.getElementById("hud-stone").textContent = stone;
    document.getElementById("hud-level").textContent = level();
  }

  let toastTimer = null;
  function toast(msg) {
    const el = document.getElementById("farm-toast");
    el.textContent = msg;
    el.style.opacity = "1";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.style.opacity = "0"), 1500);
  }

  // ---------- Isometric math ----------
  function tileToScreen(col, row) {
    return {
      x: origin.x + (col - row) * (TILE_W / 2),
      y: origin.y + (col + row) * (TILE_H / 2),
    };
  }
  function screenToTile(x, y) {
    const dx = x - origin.x, dy = y - origin.y;
    const col = (dx / (TILE_W / 2) + dy / (TILE_H / 2)) / 2;
    const row = (dy / (TILE_H / 2) - dx / (TILE_W / 2)) / 2;
    return { col: Math.round(col), row: Math.round(row) };
  }

  function inBounds(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS; }
  function walkable(r, c) {
    if (!inBounds(r, c)) return false;
    const t = map[r][c];
    return t !== "T" && t !== "R" && t !== "W";
  }

  // deterministic pseudo-random per tile (stable speckle pattern, no re-randomizing each frame)
  function hash(r, c, salt) {
    let h = (r * 928371 + c * 123457 + salt * 51) >>> 0;
    h = (h ^ (h >>> 15)) * 2246822519;
    h = (h ^ (h >>> 13)) * 3266489917;
    h = (h ^ (h >>> 16)) >>> 0;
    return h / 4294967295;
  }

  // ---------- BFS pathfinding (8-directional) ----------
  const DIRS8 = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  function bfsPath(startR, startC, goalR, goalC) {
    if (!walkable(goalR, goalC)) {
      // find nearest walkable neighbor of the goal instead
      let best = null, bestDist = Infinity;
      for (const [dr,dc] of DIRS8) {
        const nr = goalR+dr, nc = goalC+dc;
        if (walkable(nr,nc)) {
          const d = Math.hypot(nr-startR, nc-startC);
          if (d < bestDist) { bestDist = d; best = [nr,nc]; }
        }
      }
      if (!best) return [];
      goalR = best[0]; goalC = best[1];
    }
    if (startR === goalR && startC === goalC) return [{row:startR,col:startC}];

    const visited = new Set([startR+","+startC]);
    const prev = {};
    const queue = [[startR,startC]];
    let qi = 0;
    let found = false;
    while (qi < queue.length) {
      const [r,c] = queue[qi++];
      if (r === goalR && c === goalC) { found = true; break; }
      for (const [dr,dc] of DIRS8) {
        const nr = r+dr, nc = c+dc;
        const key = nr+","+nc;
        if (walkable(nr,nc) && !visited.has(key)) {
          visited.add(key);
          prev[key] = r+","+c;
          queue.push([nr,nc]);
        }
      }
    }
    if (!found) return [];
    const path = [];
    let curKey = goalR+","+goalC;
    while (curKey) {
      const [r,c] = curKey.split(",").map(Number);
      path.push({row:r, col:c});
      curKey = prev[curKey];
    }
    path.reverse();
    return path;
  }

  // ---------- Particles ----------
  const particles = [];
  function spawnBurst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random()-0.5) * 60,
        vy: -Math.random()*70 - 20,
        life: 1,
        color,
      });
    }
  }
  function updateParticles(dt) {
    for (let i = particles.length-1; i >= 0; i--) {
      const p = particles[i];
      p.vy += 90*dt;
      p.x += p.vx*dt;
      p.y += p.vy*dt;
      p.life -= dt*1.1;
      if (p.life <= 0) particles.splice(i,1);
    }
  }
  function drawParticles() {
    particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  // ---------- Drawing: ground ----------
  function drawDiamond(x, y, fill) {
    ctx.beginPath();
    ctx.moveTo(x, y - TILE_H/2);
    ctx.lineTo(x + TILE_W/2, y);
    ctx.lineTo(x, y + TILE_H/2);
    ctx.lineTo(x - TILE_W/2, y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function drawGround(row, col, now) {
    const { x, y } = tileToScreen(col, row);
    const type = map[row][col];
    const checker = (row + col) % 2 === 0;

    if (type === "W") {
      const shimmer = Math.sin(now/500 + row + col) * 8;
      drawDiamond(x, y, checker ? "#5AA0C4" : "#4E93B7");
      ctx.strokeStyle = `rgba(255,255,255,${0.15 + shimmer/80})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 18, y);
      ctx.lineTo(x + 18, y - 4);
      ctx.stroke();
      return;
    }

    if (type === "D") {
      drawDiamond(x, y, checker ? "#8B5E3C" : "#7C5334");
      for (let i = 0; i < 5; i++) {
        const rx = (hash(row,col,i)-0.5) * TILE_W*0.6;
        const ry = (hash(row,col,i+10)-0.5) * TILE_H*0.5;
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        ctx.beginPath();
        ctx.arc(x+rx, y+ry, 1.6, 0, Math.PI*2);
        ctx.fill();
      }
      return;
    }

    // grass (used as base under grass/tree/rock/stump tiles too)
    drawDiamond(x, y, checker ? "#7BAE5C" : "#6FA050");
    for (let i = 0; i < 4; i++) {
      const rx = (hash(row,col,i)-0.5) * TILE_W*0.7;
      const ry = (hash(row,col,i+20)-0.5) * TILE_H*0.6;
      ctx.fillStyle = "rgba(0,60,0,0.10)";
      ctx.beginPath();
      ctx.ellipse(x+rx, y+ry, 2.2, 1.2, 0, 0, Math.PI*2);
      ctx.fill();
    }
  }

  // ---------- Drawing: crop on dirt (part of decor layer so it can be depth-sorted) ----------
  function cropStage(entry) {
    const crop = CROPS.find(c => c.id === entry.id);
    const pct = Math.min(1, (performance.now() - entry.plantedAt) / crop.grow);
    let stage = "seed";
    if (pct >= 1) stage = "ready";
    else if (pct >= 0.6) stage = "growing";
    else if (pct >= 0.25) stage = "sprout";
    return { stage, pct, crop };
  }
  const STAGE_EMOJI = { seed: "🌱", sprout: "🌿", growing: "🪴" };

  function drawCropDecor(row, col) {
    const key = row + "," + col;
    if (!crops[key]) return;
    const { x, y } = tileToScreen(col, row);
    const info = cropStage(crops[key]);
    const bob = info.stage === "ready" ? Math.sin(performance.now()/200)*2 : 0;
    ctx.font = "24px serif";
    ctx.textAlign = "center";
    ctx.fillText(info.stage === "ready" ? info.crop.emoji : STAGE_EMOJI[info.stage], x, y - 10 + bob);
    if (info.stage !== "ready") {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(x-15, y+9, 30, 4);
      ctx.fillStyle = "#FFD873";
      ctx.fillRect(x-15, y+9, 30*info.pct, 4);
    }
  }

  function drawTreeDecor(row, col) {
    const { x, y } = tileToScreen(col, row);
    const type = map[row][col];
    if (type === "T") {
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.beginPath(); ctx.ellipse(x, y+4, 16, 6, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#6B4423";
      ctx.fillRect(x-4, y-10, 8, 18);
      const grad = ctx.createRadialGradient(x-5,y-28,2, x,y-24,20);
      grad.addColorStop(0, "#6FBF56");
      grad.addColorStop(1, "#3E6B31");
      ctx.beginPath(); ctx.arc(x, y-24, 18, 0, Math.PI*2);
      ctx.fillStyle = grad; ctx.fill();
    } else if (type === "Ts") {
      ctx.fillStyle = "#6B4423";
      ctx.beginPath(); ctx.ellipse(x, y-2, 9, 6, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#8A5A34";
      ctx.beginPath(); ctx.ellipse(x, y-4, 6, 4, 0, 0, Math.PI*2); ctx.fill();
    }
  }

  function drawRockDecor(row, col) {
    const { x, y } = tileToScreen(col, row);
    const type = map[row][col];
    if (type === "R") {
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.beginPath(); ctx.ellipse(x, y+4, 15, 5, 0, 0, Math.PI*2); ctx.fill();
      const grad = ctx.createLinearGradient(x-14,y-16,x+14,y+4);
      grad.addColorStop(0, "#C4C4C4");
      grad.addColorStop(1, "#8C8C8C");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.ellipse(x, y-6, 15, 11, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath(); ctx.ellipse(x-5, y-10, 5, 3, 0, 0, Math.PI*2); ctx.fill();
    } else if (type === "Rs") {
      ctx.fillStyle = "#A8A090";
      ctx.beginPath(); ctx.ellipse(x, y-2, 9, 5, 0, 0, Math.PI*2); ctx.fill();
    }
  }

  function drawPlayerDecor() {
    const { x, y } = tileToScreen(player.col, player.row);
    const bob = player.moving ? Math.sin(performance.now()/110) * 3 : 0;
    const fy = y + bob;

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath(); ctx.ellipse(x, y+2, 12, 5, 0, 0, Math.PI*2); ctx.fill();

    ctx.translate(x, 0);
    ctx.scale(player.facing, 1);
    ctx.translate(-x, 0);

    // legs
    ctx.fillStyle = "#3D5233";
    ctx.fillRect(x-6, fy-6, 5, 10);
    ctx.fillRect(x+1, fy-6, 5, 10);
    // body
    const grad = ctx.createLinearGradient(x-8,fy-24,x+8,fy-4);
    grad.addColorStop(0, "#F0A468");
    grad.addColorStop(1, "#DB7E44");
    ctx.fillStyle = grad;
    ctx.fillRect(x-8, fy-24, 16, 20);
    // arms
    ctx.fillStyle = "#DB7E44";
    ctx.fillRect(x-11, fy-22, 4, 12);
    ctx.fillRect(x+7, fy-22, 4, 12);
    // head
    ctx.beginPath(); ctx.arc(x, fy-30, 10, 0, Math.PI*2);
    ctx.fillStyle = "#F2C9A0"; ctx.fill();
    // hat
    ctx.fillStyle = "#6B4423";
    ctx.beginPath(); ctx.ellipse(x, fy-38, 11, 4, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillRect(x-6, fy-44, 12, 8);

    ctx.restore();
  }

  // ---------- Interaction ----------
  function interact(row, col) {
    const type = map[row][col];
    const { x, y } = tileToScreen(col, row);

    if (type === "T") {
      wood += 2; toast("+2 Kayu");
      spawnBurst(x, y-20, "#8B5E3C", 6);
      map[row][col] = "Ts";
      regrow[row+","+col] = performance.now() + 8000;
    } else if (type === "R") {
      stone += 2; toast("+2 Batu");
      spawnBurst(x, y-10, "#B4B4B4", 6);
      map[row][col] = "Rs";
      regrow[row+","+col] = performance.now() + 8000;
    } else if (type === "Ts" || type === "Rs") {
      toast("Masih perlu waktu buat pulih");
    } else if (type === "D") {
      const key = row+","+col;
      if (crops[key]) {
        const info = cropStage(crops[key]);
        if (info.stage === "ready") {
          gold += info.crop.sell;
          xp += Math.round(info.crop.sell/2);
          toast("+" + info.crop.sell + " koin dari " + info.crop.name + "!");
          spawnBurst(x, y-10, "#FFD873", 8);
          delete crops[key];
        } else {
          toast("Belum siap panen");
        }
      } else {
        openSeedMenu(row, col);
      }
    } else if (type === "W") {
      toast("Airnya tenang... (fitur mancing nyusul)");
    }
    updateHud();
  }

  // ---------- Seed menu ----------
  function openSeedMenu(row, col) {
    const menu = document.getElementById("farm-seedmenu");
    const { x, y } = tileToScreen(col, row);
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    menu.style.left = (x*scaleX - 90) + "px";
    menu.style.top = (y*scaleY - 10) + "px";
    menu.innerHTML = "";
    CROPS.forEach(crop => {
      const locked = level() < crop.unlock;
      const btn = document.createElement("button");
      btn.disabled = locked;
      btn.innerHTML = "<span>" + crop.emoji + " " + crop.name + "</span><span>" +
        (locked ? "Lv" + crop.unlock : crop.cost + "🪙") + "</span>";
      btn.onclick = (e) => {
        e.stopPropagation();
        if (gold < crop.cost) { toast("Koin kurang"); return; }
        gold -= crop.cost;
        crops[row+","+col] = { id: crop.id, plantedAt: performance.now() };
        updateHud();
        menu.style.display = "none";
      };
      menu.appendChild(btn);
    });
    menu.style.display = "block";
  }
  document.addEventListener("click", (e) => {
    const menu = document.getElementById("farm-seedmenu");
    if (menu.style.display === "block" && !menu.contains(e.target) && e.target !== canvas) {
      menu.style.display = "none";
    }
  });

  // ---------- Click to move ----------
  canvas.addEventListener("click", (e) => {
    document.getElementById("farm-seedmenu").style.display = "none";
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    let { col, row } = screenToTile(mx, my);
    col = Math.max(0, Math.min(COLS-1, col));
    row = Math.max(0, Math.min(ROWS-1, row));

    const startR = Math.round(player.row), startC = Math.round(player.col);
    const path = bfsPath(startR, startC, row, col);

    if (path.length === 0) { toast("Nggak ada jalan ke situ"); return; }

    player.path = path;
    player.pathIndex = 1; // index 0 is current tile
    player.pending = { row, col };
    player.moving = path.length > 1;

    if (path.length <= 1) {
      interact(row, col);
    }
  });

  // ---------- Main loop ----------
  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // movement along path
    if (player.path.length > 0 && player.pathIndex < player.path.length) {
      const target = player.path[player.pathIndex];
      const dc = target.col - player.col, dr = target.row - player.row;
      const dist = Math.hypot(dc, dr);
      const speed = 3.2;
      if (Math.abs(dc) > 0.02) player.facing = dc > 0 ? 1 : -1;

      if (dist > 0.04) {
        const step = Math.min(dist, speed*dt);
        player.col += (dc/dist) * step;
        player.row += (dr/dist) * step;
      } else {
        player.col = target.col; player.row = target.row;
        player.pathIndex++;
        if (player.pathIndex >= player.path.length) {
          player.moving = false;
          if (player.pending) {
            interact(player.pending.row, player.pending.col);
            player.pending = null;
          }
          player.path = [];
        }
      }
    }

    // regrow timers
    for (const key in regrow) {
      if (now >= regrow[key]) {
        const [r,c] = key.split(",").map(Number);
        map[r][c] = map[r][c] === "Ts" ? "T" : "R";
        delete regrow[key];
      }
    }

    updateParticles(dt);
    render(now);
    requestAnimationFrame(tick);
  }

  function render(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ground layer, back to front
    const order = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) order.push([r,c]);
    order.sort((a,b) => (a[0]+a[1]) - (b[0]+b[1]));
    order.forEach(([r,c]) => drawGround(r, c, now));

    // decor + player layer, depth sorted together for correct occlusion
    const decor = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = map[r][c];
        if (t === "T" || t === "Ts") decor.push({ depth: r+c, draw: () => drawTreeDecor(r,c) });
        if (t === "R" || t === "Rs") decor.push({ depth: r+c, draw: () => drawRockDecor(r,c) });
        if (t === "D") decor.push({ depth: r+c-0.1, draw: () => drawCropDecor(r,c) });
      }
    }
    decor.push({ depth: player.row + player.col, draw: drawPlayerDecor });
    decor.sort((a,b) => a.depth - b.depth);
    decor.forEach(d => d.draw());

    drawParticles();
  }

  updateHud();
  requestAnimationFrame(tick);
})();
