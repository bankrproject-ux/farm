(function () {
  "use strict";

  const TILE = 32;
  const ROWS = 9, COLS = 13;
  const canvas = document.getElementById("farm-canvas");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const CROPS = [
    { id: "carrot", name: "Wortel", cost: 5, sell: 12, grow: 9000, unlock: 1 },
    { id: "tomato", name: "Tomat", cost: 9, sell: 23, grow: 16000, unlock: 1 },
    { id: "corn", name: "Jagung", cost: 16, sell: 40, grow: 26000, unlock: 2 },
    { id: "pumpkin", name: "Labu", cost: 28, sell: 70, grow: 38000, unlock: 3 },
  ];

  // 'G' grass, 'D' dirt, 'T' tree, 'Ts' stump, 'R' rock, 'Rs' rock-mined, 'W' water, 'F' fence
  const map = [];
  for (let r = 0; r < ROWS; r++) map.push(new Array(COLS).fill("G"));
  for (let c = 0; c < COLS; c++) { map[0][c] = "F"; map[ROWS-1][c] = "F"; }
  for (let r = 0; r < ROWS; r++) { map[r][0] = "F"; map[r][COLS-1] = "F"; }

  [[1,1],[1,11],[7,1],[2,9]].forEach(([r,c]) => map[r][c] = "T");
  [[4,1],[4,11],[1,6]].forEach(([r,c]) => map[r][c] = "R");
  [[6,10],[6,11],[7,10],[7,11]].forEach(([r,c]) => map[r][c] = "W");
  for (let r = 3; r <= 5; r++) for (let c = 5; c <= 9; c++) map[r][c] = "D";

  const regrow = {};
  const crops = {};
  let gold = 40, wood = 0, stone = 0, xp = 0;
  const player = {
    col: 2, row: 2, path: [], pathIndex: 0,
    facing: "down", moving: false, pending: null,
  };

  function level() { return Math.floor(xp / 50) + 1; }

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

  function tileCenter(col, row) { return { x: col*TILE + TILE/2, y: row*TILE + TILE/2 }; }
  function screenToTile(x, y) { return { col: Math.floor(x/TILE), row: Math.floor(y/TILE) }; }
  function inBounds(r,c){ return r>=0 && r<ROWS && c>=0 && c<COLS; }
  function walkable(r,c){ if(!inBounds(r,c)) return false; const t=map[r][c]; return t!=="T" && t!=="R" && t!=="W" && t!=="F"; }

  const DIRS4 = [[-1,0],[1,0],[0,-1],[0,1]];
  function bfsPath(startR,startC,goalR,goalC){
    if (!walkable(goalR,goalC)){
      let best=null, bestDist=Infinity;
      for (const [dr,dc] of DIRS4){
        const nr=goalR+dr, nc=goalC+dc;
        if (walkable(nr,nc)){ const d=Math.abs(nr-startR)+Math.abs(nc-startC); if(d<bestDist){bestDist=d; best=[nr,nc];} }
      }
      if(!best) return [];
      goalR=best[0]; goalC=best[1];
    }
    if (startR===goalR && startC===goalC) return [{row:startR,col:startC}];
    const visited=new Set([startR+","+startC]);
    const prev={};
    const queue=[[startR,startC]];
    let qi=0, found=false;
    while(qi<queue.length){
      const [r,c]=queue[qi++];
      if(r===goalR && c===goalC){ found=true; break; }
      for(const [dr,dc] of DIRS4){
        const nr=r+dr,nc=c+dc,key=nr+","+nc;
        if(walkable(nr,nc) && !visited.has(key)){ visited.add(key); prev[key]=r+","+c; queue.push([nr,nc]); }
      }
    }
    if(!found) return [];
    const path=[]; let curKey=goalR+","+goalC;
    while(curKey){ const [r,c]=curKey.split(",").map(Number); path.push({row:r,col:c}); curKey=prev[curKey]; }
    path.reverse();
    return path;
  }

  function hash(r,c,salt){
    let h = (r*928371 + c*123457 + salt*51) >>> 0;
    h = (h ^ (h>>>15)) * 2246822519;
    h = (h ^ (h>>>13)) * 3266489917;
    h = (h ^ (h>>>16)) >>> 0;
    return h / 4294967295;
  }

  const particles = [];
  function spawnBurst(x,y,color,count){
    for(let i=0;i<count;i++) particles.push({ x, y, vx:(Math.random()-0.5)*30, vy:-Math.random()*35-10, life:1, color });
  }
  function updateParticles(dt){
    for(let i=particles.length-1;i>=0;i--){
      const p=particles[i];
      p.vy += 45*dt; p.x += p.vx*dt; p.y += p.vy*dt; p.life -= dt*1.1;
      if(p.life<=0) particles.splice(i,1);
    }
  }
  function drawParticles(){
    particles.forEach(p=>{
      ctx.globalAlpha = Math.max(0,p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x-1), Math.round(p.y-1), 2, 2);
      ctx.globalAlpha = 1;
    });
  }

  function drawGround(row,col,now){
    const x = col*TILE, y = row*TILE;
    const type = map[row][col];
    const checker = (row+col)%2===0;

    if (type==="F"){
      ctx.fillStyle = "#6FA050";
      ctx.fillRect(x,y,TILE,TILE);
      ctx.fillStyle = "#8A5A34";
      ctx.fillRect(x+4,y+4,5,TILE-8);
      ctx.fillRect(x+TILE-9,y+4,5,TILE-8);
      ctx.fillStyle = "#6B4423";
      ctx.fillRect(x+2,y+10,TILE-4,4);
      ctx.strokeStyle = "#3D2410"; ctx.lineWidth=1;
      ctx.strokeRect(x+4,y+4,5,TILE-8);
      ctx.strokeRect(x+TILE-9,y+4,5,TILE-8);
      return;
    }
    if (type==="W"){
      ctx.fillStyle = checker ? "#4E93B7" : "#457FA0";
      ctx.fillRect(x,y,TILE,TILE);
      const blink = Math.floor(now/600)%2===0;
      ctx.fillStyle = blink ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.12)";
      ctx.fillRect(x+8,y+10,8,2); ctx.fillRect(x+18,y+20,8,2);
      return;
    }
    if (type==="D"){
      ctx.fillStyle = checker ? "#8B5E3C" : "#7C5334";
      ctx.fillRect(x,y,TILE,TILE);
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      for (let i=0;i<4;i++){
        const rx = hash(row,col,i)*TILE;
        const ry = hash(row,col,i+9)*TILE;
        ctx.fillRect(x+rx,y+ry,2,2);
      }
      return;
    }
    ctx.fillStyle = checker ? "#7BAE5C" : "#6FA050";
    ctx.fillRect(x,y,TILE,TILE);
    ctx.fillStyle = "rgba(0,50,0,0.12)";
    for (let i=0;i<3;i++){
      const rx = hash(row,col,i+3)*TILE;
      const ry = hash(row,col,i+13)*TILE;
      ctx.fillRect(x+rx,y+ry,2,2);
    }
  }

  function cropStage(entry){
    const crop = CROPS.find(c=>c.id===entry.id);
    const pct = Math.min(1, (performance.now()-entry.plantedAt)/crop.grow);
    let stage="seed";
    if(pct>=1) stage="ready";
    else if(pct>=0.6) stage="growing";
    else if(pct>=0.25) stage="sprout";
    return {stage,pct,crop};
  }

  function drawSeedIcon(x,y){
    ctx.fillStyle="#6B4423"; ctx.beginPath(); ctx.arc(x,y,2.5,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="#3D2410"; ctx.lineWidth=1; ctx.stroke();
  }
  function drawSproutIcon(x,y){
    ctx.strokeStyle="#2E5A22"; ctx.lineWidth=1; ctx.fillStyle="#5FAE4A";
    ctx.beginPath(); ctx.ellipse(x-2,y-2,3,2,0.6,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x+2,y-2,3,2,-0.6,0,Math.PI*2); ctx.fill(); ctx.stroke();
  }
  function drawGrowingIcon(x,y){
    ctx.strokeStyle="#2E5A22"; ctx.lineWidth=1; ctx.fillStyle="#4C8A3D";
    ctx.fillRect(x-1,y-8,2,10); ctx.strokeRect(x-1,y-8,2,10);
    ctx.beginPath(); ctx.ellipse(x-4,y-4,3,2,0.4,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x+4,y-6,3,2,-0.4,0,Math.PI*2); ctx.fill(); ctx.stroke();
  }
  function drawCarrotIcon(x,y){
    ctx.fillStyle="#2E7D32";
    ctx.fillRect(x-1,y-10,2,4); ctx.fillRect(x-3,y-9,2,4); ctx.fillRect(x+1,y-9,2,4);
    ctx.beginPath(); ctx.moveTo(x-4,y-6); ctx.lineTo(x+4,y-6); ctx.lineTo(x,y+7); ctx.closePath();
    ctx.fillStyle="#E8935B"; ctx.fill();
    ctx.strokeStyle="#3D2410"; ctx.lineWidth=1; ctx.stroke();
  }
  function drawTomatoIcon(x,y){
    ctx.fillStyle="#D64545"; ctx.beginPath(); ctx.arc(x,y,6,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="#5A1F1F"; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle="#3E7A34"; ctx.fillRect(x-2,y-8,4,3);
  }
  function drawCornIcon(x,y){
    ctx.fillStyle="#E4C13A"; ctx.beginPath(); ctx.ellipse(x,y,4,8,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="#7A5A10"; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle="#4C8A3D"; ctx.fillRect(x-6,y-4,3,10); ctx.fillRect(x+3,y-4,3,10);
  }
  function drawPumpkinIcon(x,y){
    ctx.fillStyle="#E07B2A"; ctx.beginPath(); ctx.arc(x,y,7,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="#7A3D0F"; ctx.lineWidth=1; ctx.stroke();
    ctx.strokeStyle="rgba(0,0,0,0.3)";
    ctx.beginPath(); ctx.moveTo(x,y-7); ctx.lineTo(x,y+7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x-5,y-5); ctx.lineTo(x-5,y+5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+5,y-5); ctx.lineTo(x+5,y+5); ctx.stroke();
    ctx.fillStyle="#4C7A2E"; ctx.fillRect(x-1,y-10,2,3);
  }
  const STAGE_ICON = { seed:drawSeedIcon, sprout:drawSproutIcon, growing:drawGrowingIcon };
  const CROP_ICON = { carrot:drawCarrotIcon, tomato:drawTomatoIcon, corn:drawCornIcon, pumpkin:drawPumpkinIcon };

  function drawCropDecor(row,col){
    const key = row+","+col;
    if (!crops[key]) return;
    const {x,y} = tileCenter(col,row);
    const info = cropStage(crops[key]);
    const bob = info.stage==="ready" ? Math.sin(performance.now()/200)*1.5 : 0;
    if (info.stage==="ready") CROP_ICON[info.crop.id](x, y-2+bob);
    else STAGE_ICON[info.stage](x, y-2);
    if (info.stage!=="ready"){
      ctx.fillStyle="rgba(0,0,0,0.25)"; ctx.fillRect(x-8,y+10,16,2);
      ctx.fillStyle="#FFD873"; ctx.fillRect(x-8,y+10,16*info.pct,2);
    }
  }

  function drawTreeDecor(row,col){
    const {x,y} = tileCenter(col,row);
    const type = map[row][col];
    if (type==="T"){
      ctx.fillStyle="rgba(0,0,0,0.18)";
      ctx.beginPath(); ctx.ellipse(x,y+8,10,3,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#6B4423"; ctx.fillRect(x-2,y-2,4,10);
      ctx.strokeStyle="#3D2410"; ctx.lineWidth=1; ctx.strokeRect(x-2,y-2,4,10);
      ctx.fillStyle="#3E6B31"; ctx.beginPath(); ctx.arc(x,y-9,11,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="#274D1E"; ctx.stroke();
      ctx.fillStyle="#5FA84C"; ctx.beginPath(); ctx.arc(x-3,y-12,6,0,Math.PI*2); ctx.fill();
    } else if (type==="Ts"){
      ctx.fillStyle="#6B4423"; ctx.beginPath(); ctx.ellipse(x,y+5,5,3,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="#3D2410"; ctx.lineWidth=1; ctx.stroke();
      ctx.fillStyle="#8A5A34"; ctx.beginPath(); ctx.ellipse(x,y+4,3,2,0,0,Math.PI*2); ctx.fill();
    }
  }

  function drawRockDecor(row,col){
    const {x,y} = tileCenter(col,row);
    const type = map[row][col];
    if (type==="R"){
      ctx.fillStyle="rgba(0,0,0,0.18)";
      ctx.beginPath(); ctx.ellipse(x,y+8,9,3,0,0,Math.PI*2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x-7,y+3); ctx.lineTo(x-4,y-4); ctx.lineTo(x+3,y-4);
      ctx.lineTo(x+7,y+3); ctx.lineTo(x+4,y+7); ctx.lineTo(x-4,y+7);
      ctx.closePath();
      ctx.fillStyle="#A6A6A6"; ctx.fill();
      ctx.strokeStyle="#4A4A4A"; ctx.lineWidth=1; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x-4,y-4); ctx.lineTo(x+3,y-4); ctx.lineTo(x+1,y); ctx.lineTo(x-3,y);
      ctx.closePath(); ctx.fillStyle="#CFCFCF"; ctx.fill();
    } else if (type==="Rs"){
      ctx.fillStyle="#8A8272"; ctx.beginPath(); ctx.ellipse(x,y+5,6,3,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="#4A4A4A"; ctx.lineWidth=1; ctx.stroke();
    }
  }

  function drawPlayerDecor(){
    const {x,y} = tileCenter(player.col, player.row);
    const walkCycle = player.moving ? Math.sin(performance.now()/90) : 0;
    const legOffset = walkCycle * 3;

    ctx.save();
    ctx.fillStyle="rgba(0,0,0,0.2)";
    ctx.beginPath(); ctx.ellipse(x,y+11,7,3,0,0,Math.PI*2); ctx.fill();

    const flip = player.facing === "left";
    if (flip) { ctx.translate(x,0); ctx.scale(-1,1); ctx.translate(-x,0); }

    ctx.strokeStyle="#2A2018"; ctx.lineWidth=1;

    // legs
    ctx.fillStyle="#3D5233";
    ctx.fillRect(x-3, y+2+Math.max(0,legOffset), 3, 6-Math.max(0,legOffset));
    ctx.strokeRect(x-3, y+2+Math.max(0,legOffset), 3, 6-Math.max(0,legOffset));
    ctx.fillRect(x+0, y+2+Math.max(0,-legOffset), 3, 6-Math.max(0,-legOffset));
    ctx.strokeRect(x+0, y+2+Math.max(0,-legOffset), 3, 6-Math.max(0,-legOffset));

    // body
    ctx.fillStyle="#DB7E44";
    ctx.fillRect(x-4,y-7,8,10); ctx.strokeRect(x-4,y-7,8,10);

    if (player.facing === "up") {
      // back view: hat only, no face
      ctx.fillStyle="#F2C9A0";
      ctx.beginPath(); ctx.arc(x,y-11,5,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle="#6B4423";
      ctx.beginPath(); ctx.ellipse(x,y-14,5.5,2,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillRect(x-3.5,y-17,7,4); ctx.strokeRect(x-3.5,y-17,7,4);
    } else {
      // front / side view
      ctx.fillStyle="#F2C9A0";
      ctx.beginPath(); ctx.arc(x,y-11,5,0,Math.PI*2); ctx.fill(); ctx.stroke();
      if (player.facing === "down") {
        ctx.fillStyle="#2A2018";
        ctx.fillRect(x-2.5,y-11,1.5,1.5); ctx.fillRect(x+1,y-11,1.5,1.5);
      } else {
        ctx.fillStyle="#2A2018";
        ctx.fillRect(x+1.5,y-11,1.5,1.5);
      }
      ctx.fillStyle="#6B4423";
      ctx.beginPath(); ctx.ellipse(x,y-15,5.5,2,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillRect(x-3.5,y-18,7,4); ctx.strokeRect(x-3.5,y-18,7,4);
    }
    ctx.restore();
  }

  function interact(row,col){
    const type = map[row][col];
    const {x,y} = tileCenter(col,row);
    if (type==="T"){
      wood+=2; toast("+2 Kayu"); spawnBurst(x,y-6,"#8B5E3C",6);
      map[row][col]="Ts"; regrow[row+","+col]=performance.now()+8000;
    } else if (type==="R"){
      stone+=2; toast("+2 Batu"); spawnBurst(x,y-3,"#B4B4B4",6);
      map[row][col]="Rs"; regrow[row+","+col]=performance.now()+8000;
    } else if (type==="Ts" || type==="Rs"){
      toast("Masih perlu waktu buat pulih");
    } else if (type==="D"){
      const key=row+","+col;
      if (crops[key]){
        const info=cropStage(crops[key]);
        if (info.stage==="ready"){
          gold+=info.crop.sell; xp+=Math.round(info.crop.sell/2);
          toast("+"+info.crop.sell+" koin dari "+info.crop.name+"!");
          spawnBurst(x,y-3,"#FFD873",8);
          delete crops[key];
        } else toast("Belum siap panen");
      } else openSeedMenu(row,col);
    } else if (type==="W"){
      toast("Airnya tenang... (fitur mancing nyusul)");
    }
    updateHud();
  }

  function openSeedMenu(row,col){
    const menu = document.getElementById("farm-seedmenu");
    const {x,y} = tileCenter(col,row);
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width/canvas.width, scaleY = rect.height/canvas.height;
    menu.style.left = (x*scaleX-85)+"px";
    menu.style.top = (y*scaleY-10)+"px";
    menu.innerHTML="";
    CROPS.forEach(crop=>{
      const locked = level()<crop.unlock;
      const btn = document.createElement("button");
      btn.disabled = locked;
      btn.innerHTML = "<span>"+crop.name+"</span><span>"+(locked?"Lv"+crop.unlock:crop.cost+"🪙")+"</span>";
      btn.onclick=(e)=>{
        e.stopPropagation();
        if (gold<crop.cost){ toast("Koin kurang"); return; }
        gold-=crop.cost;
        crops[row+","+col]={id:crop.id, plantedAt:performance.now()};
        updateHud(); menu.style.display="none";
      };
      menu.appendChild(btn);
    });
    menu.style.display="block";
  }
  document.addEventListener("click",(e)=>{
    const menu=document.getElementById("farm-seedmenu");
    if (menu.style.display==="block" && !menu.contains(e.target) && e.target!==canvas) menu.style.display="none";
  });

  canvas.addEventListener("click",(e)=>{
    document.getElementById("farm-seedmenu").style.display="none";
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX-rect.left)*(canvas.width/rect.width);
    const my = (e.clientY-rect.top)*(canvas.height/rect.height);
    let {col,row} = screenToTile(mx,my);
    col = Math.max(0, Math.min(COLS-1,col));
    row = Math.max(0, Math.min(ROWS-1,row));
    const startR = Math.round(player.row), startC = Math.round(player.col);
    const path = bfsPath(startR,startC,row,col);
    if (path.length===0){ toast("Nggak ada jalan ke situ"); return; }
    player.path = path; player.pathIndex = 1;
    player.pending = {row,col}; player.moving = path.length>1;
    if (path.length<=1) interact(row,col);
  });

  let last = performance.now();
  function tick(now){
    const dt = Math.min(0.05,(now-last)/1000);
    last = now;
    if (player.path.length>0 && player.pathIndex<player.path.length){
      const target = player.path[player.pathIndex];
      const dc = target.col-player.col, dr = target.row-player.row;
      const dist = Math.hypot(dc,dr);
      const speed = 3.4;
      if (Math.abs(dc)>Math.abs(dr)) player.facing = dc>0 ? "right" : "left";
      else if (Math.abs(dr)>0.01) player.facing = dr>0 ? "down" : "up";
      if (dist>0.04){
        const step = Math.min(dist, speed*dt);
        player.col += (dc/dist)*step; player.row += (dr/dist)*step;
      } else {
        player.col=target.col; player.row=target.row; player.pathIndex++;
        if (player.pathIndex>=player.path.length){
          player.moving=false;
          if (player.pending){ interact(player.pending.row, player.pending.col); player.pending=null; }
          player.path=[];
        }
      }
    }
    for (const key in regrow){
      if (now>=regrow[key]){
        const [r,c]=key.split(",").map(Number);
        map[r][c] = map[r][c]==="Ts" ? "T" : "R";
        delete regrow[key];
      }
    }
    updateParticles(dt);
    render(now);
    requestAnimationFrame(tick);
  }

  function render(now){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) drawGround(r,c,now);

    const decor=[];
    for (let r=0;r<ROWS;r++){
      for (let c=0;c<COLS;c++){
        const t=map[r][c];
        if (t==="T"||t==="Ts") decor.push({depth:r, draw:()=>drawTreeDecor(r,c)});
        if (t==="R"||t==="Rs") decor.push({depth:r, draw:()=>drawRockDecor(r,c)});
        if (t==="D") decor.push({depth:r-0.1, draw:()=>drawCropDecor(r,c)});
      }
    }
    decor.push({depth:player.row, draw:drawPlayerDecor});
    decor.sort((a,b)=>a.depth-b.depth);
    decor.forEach(d=>d.draw());
    drawParticles();
  }

  updateHud();
  requestAnimationFrame(tick);
})();
