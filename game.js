(() => {
  'use strict';

  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const chapterPanel = document.querySelector('#chapterPanel');
  const chapterOneButton = document.querySelector('#chapterOneButton');
  const chapterTwoButton = document.querySelector('#chapterTwoButton');
  const chapterTwoStatus = document.querySelector('#chapterTwoStatus');
  const chapterNotice = document.querySelector('#chapterNotice');
  const checkpointPanel = document.querySelector('#checkpointPanel');
  const chapterReturnButton = document.querySelector('#chapterReturnButton');
  const deathPanel = document.querySelector('#deathPanel');
  const deathReason = document.querySelector('#deathReason');
  const levelLabel = document.querySelector('#levelLabel');
  const deathCount = document.querySelector('#deathCount');
  const finalDeaths = document.querySelector('#finalDeaths');
  const message = document.querySelector('#message');
  const soundIcon = document.querySelector('#soundIcon');
  const levelSelect = document.querySelector('#levelSelect');

  const W = 960;
  const H = 540;
  const GRAVITY = 2100;
  const MOVE_SPEED = 260;
  const JUMP_SPEED = 700;
  const PLAYER_SIZE = 28;
  const FLOOR_Y = 460;
  const colors = { bg: '#151512', grid: '#22221d', solid: '#e9e5da', edge: '#77746c', acid: '#d8ff55', danger: '#ff5b45', ink: '#11110f' };

  const keys = { left: false, right: false, jump: false };
  let started = false;
  let levelIndex = 0;
  let deaths = 0;
  let lastTime = 0;
  let elapsed = 0;
  let levelTime = 0;
  let state = null;
  let player = null;
  let particles = [];
  let soundOn = true;
  let audio = null;
  let messageTimer = 0;
  let messageQueue = [];
  let transitionTimer = null;
  let cameraX = 0;
  let activeCheckpoint = null;
  const levelMemory = new Map();
  const seenStory = new Set();
  const chapterProgressKey = 'dont-trust-this-level:chapter-1';
  let chapterOneComplete = loadChapterProgress();

  const platform = (x, y, w, h = 24, extra = {}) => ({ x, y, w, h, active: true, ...extra });
  const spike = (x, y, w = 34, h = 28, extra = {}) => ({ x, y, w, h, active: true, ...extra });

  const levelFactories = window.createGameLevels({
    W,
    FLOOR_Y,
    platform,
    spike,
    getPlayer: () => player,
    getLevelTime: () => levelTime,
    say,
    sayStory,
    tone,
    die,
    completeLevel,
    hit,
    updateCrumble,
    setLevelLabel: text => { levelLabel.textContent = text; }
  });

  levelFactories.forEach((factory, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `1-${index + 1}`;
    levelSelect.append(option);
  });

  function initLevel(index, preserveMessage = false, spawnOverride = null) {
    clearTimeout(transitionTimer);
    transitionTimer = null;
    deathPanel.hidden = true;
    if (!preserveMessage) {
      messageQueue = [];
      messageTimer = 0;
      message.classList.remove('visible');
    }
    state = levelFactories[index]();
    if (!state?.id || !state?.goal || !Array.isArray(state.platforms) || !Array.isArray(state.spikes)) {
      throw new Error(`Invalid level definition at index ${index}`);
    }
    if (!levelMemory.has(state.id)) levelMemory.set(state.id, {});
    state.memory = levelMemory.get(state.id);
    state.restoreMemory?.(state, state.memory);
    const spawn = spawnOverride ? [spawnOverride.x, spawnOverride.y] : state.spawn;
    activeCheckpoint = spawnOverride;
    state.checkpoints?.forEach(checkpoint => { checkpoint.active = checkpoint.id === spawnOverride?.id; });
    player = {
      x: spawn[0], y: spawn[1], w: PLAYER_SIZE, h: PLAYER_SIZE,
      vx: 0, vy: 0, grounded: false, jumpHeld: keys.jump, jumps: 0,
      dead: false
    };
    levelTime = 0;
    particles = [];
    cameraX = Math.max(0, Math.min((state.width || W) - W, spawn[0] - W * .28));
    levelLabel.textContent = `第一章 · ${index + 1}/${levelFactories.length} · ${state.title}`;
    levelSelect.value = String(index);
    if (!preserveMessage) say(state.hint);
  }

  function updateCrumble(s, dt) {
    s.platforms.forEach(p => {
      if (!p.crumble || !p.active) return;
      if (p.triggered) { p.timer -= dt; if (p.timer <= 0) { p.active = false; tone(90, .08); } }
      if (player.grounded && player.x + player.w > p.x && player.x < p.x + p.w && Math.abs(player.y + player.h - p.y) < 4 && !p.triggered) {
        p.triggered = true; p.timer = .38;
        if (!s.crumbleWarned) { s.crumbleWarned = true; say('這塊地板正在消失。'); }
      }
    });
  }

  function update(dt) {
    particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 800 * dt; p.life -= dt; });
    particles = particles.filter(p => p.life > 0);
    updateMessage(dt);
    if (!started || player.dead || checkpointPanel.hidden === false) return;
    levelTime += dt;

    updateMovingPlatforms(dt);
    updateGravityZones();

    const direction = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);

    const target = direction * MOVE_SPEED;
    player.vx += (target - player.vx) * Math.min(1, dt * (player.grounded ? 15 : 7));
    if (!direction && Math.abs(player.vx) < 2) player.vx = 0;

    if (keys.jump && player.grounded && !player.jumpHeld) {
      player.vy = -JUMP_SPEED; player.grounded = false; player.jumpHeld = true; player.jumps += 1; tone(440, .06);
    }
    if (!keys.jump) player.jumpHeld = false;
    const gravity = GRAVITY * (state.gravityScale || 1);
    if (!keys.jump && player.vy < -240) player.vy += gravity * dt * 1.5;
    player.vy += gravity * dt;
    movePlayer(player.vx * dt, player.vy * dt);
    state.update?.(state, dt);
    updateCamera(dt);
    if (player.dead) return;
    updateCollectibles();

    for (const sp of state.spikes) {
      if (!sp.active || sp.hidden) continue;
      const dangerBox = { x: sp.x + 5, y: sp.y + 5, w: sp.w - 10, h: sp.h - 5 };
      if (hit(player, dangerBox)) die(state.spikeDeath || '碰到尖刺了。');
    }

    if (player.y > H + 80 || player.x < -100 || player.x > (state.width || W) + 100) die('你離開了關卡範圍。');
    if (player.dead) return;
    updateCheckpoints();
    if (!state.manualGoal && state.goal.active !== false && !state.goal.locked && !state.goal.hidden && hit(player, state.goal)) completeLevel();
  }

  function updateMovingPlatforms(dt) {
    for (const p of state.platforms) {
      if (!p.active || !p.moving) continue;
      const motion = p.moving;
      const axis = motion.axis || 'x';
      motion.direction ||= 1;
      const standing = player.grounded && player.x + player.w > p.x && player.x < p.x + p.w && Math.abs(player.y + player.h - p.y) < 5;
      const previous = p[axis];
      let next = previous + motion.speed * motion.direction * dt;
      if (next >= motion.to) { next = motion.to; motion.direction = -1; }
      if (next <= motion.from) { next = motion.from; motion.direction = 1; }
      p[axis] = next;
      if (standing) {
        if (axis === 'x') player.x += next - previous;
        else player.y += next - previous;
      }
    }
  }

  function updateGravityZones() {
    state.gravityScale = 1;
    const center = player.x + player.w / 2;
    for (const zone of state.gravityZones || []) {
      if (center >= zone.x && center <= zone.x + zone.w) state.gravityScale = zone.scale;
    }
  }

  function updateCheckpoints() {
    for (const checkpoint of state.checkpoints || []) {
      if (checkpoint.active || !hit(player, checkpoint)) continue;
      state.checkpoints.forEach(item => { item.active = false; });
      checkpoint.active = true;
      activeCheckpoint = { id: checkpoint.id, x: checkpoint.spawn[0], y: checkpoint.spawn[1] };
      say('檢查點已記錄。');
      tone(620, .1);
    }
  }

  function updateCollectibles() {
    for (const item of state.collectibles || []) {
      if (!item.active || !hit(player, item)) continue;
      item.active = false;
      state.collectedCount = (state.collectedCount || 0) + (item.value ?? 1);
      tone(820, .07);
      state.onCollect?.(state, state.collectedCount, item);
    }
  }

  function updateCamera(dt) {
    const maxCamera = Math.max(0, (state.width || W) - W);
    const target = Math.max(0, Math.min(maxCamera, player.x - W * .38));
    cameraX += (target - cameraX) * (1 - Math.exp(-7 * dt));
  }

  function movePlayer(dx, dy) {
    player.x += dx;
    for (const p of state.platforms) {
      if (!p.active || p.solid === false || !hit(player, p)) continue;
      if (dx > 0) player.x = p.x - player.w;
      else if (dx < 0) player.x = p.x + p.w;
      player.vx = 0;
    }
    player.y += dy;
    player.grounded = false;
    for (const p of state.platforms) {
      if (!p.active || p.solid === false || !hit(player, p)) continue;
      if (dy > 0 && player.y + player.h - dy <= p.y + 8) {
        player.y = p.y - player.h;
        if (p.bounce) {
          player.vy = -p.bounce;
          player.grounded = false;
          tone(560, .07);
        } else {
          player.vy = 0;
          player.grounded = true;
        }
      }
      else if (dy < 0) { player.y = p.y + p.h; player.vy = 40; }
    }
  }

  function hit(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

  function die(reason) {
    if (player.dead) return;
    state.memory.deaths = (state.memory.deaths || 0) + 1;
    const taunt = state.memory.deaths > 5 && !state.memory.tauntShown ? state.taunt : null;
    if (taunt) state.memory.tauntShown = true;
    player.dead = true;
    deaths += 1;
    deathCount.textContent = deaths;
    messageQueue = [];
    messageTimer = 0;
    message.classList.remove('visible');
    seenStory.clear();
    deathReason.textContent = reason;
    deathPanel.hidden = false;
    tone(70, .22);
    for (let i = 0; i < 14; i++) particles.push({ x: player.x + 14, y: player.y + 14, vx: (Math.random() - .5) * 380, vy: -Math.random() * 330, life: .65 + Math.random() * .3 });
    const respawn = activeCheckpoint ? { ...activeCheckpoint } : null;
    transitionTimer = setTimeout(() => {
      initLevel(levelIndex, false, respawn);
      if (taunt) say(`提示：${taunt}`);
    }, 900);
  }

  function completeLevel() {
    if (player.dead) return;
    player.dead = true; tone(660, .08); setTimeout(() => tone(880, .12), 90);
    if (levelIndex === levelFactories.length - 1) {
      chapterOneComplete = true;
      saveChapterProgress();
      updateChapterLocks();
      transitionTimer = setTimeout(() => { finalDeaths.textContent = deaths; checkpointPanel.hidden = false; }, 500);
    } else {
      levelIndex += 1; transitionTimer = setTimeout(() => initLevel(levelIndex), 450);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = colors.bg; ctx.fillRect(0, 0, W, H);
    if (!state) return;

    ctx.save();
    const shake = state.screenShake || 0;
    const shakeX = Math.sin(elapsed * 92) * shake * 14;
    const shakeY = Math.cos(elapsed * 108) * shake * 10;
    ctx.translate(-Math.round(cameraX) + shakeX, shakeY);
    drawGrid(state.width || W);
    (state.gravityZones || []).forEach(drawGravityZone);
    state.platforms.forEach(drawPlatform);
    state.spikes.forEach(drawSpikes);
    if (state.laser?.active) drawLaser(state.laser);
    if (state.zone && state.zone.active !== false) drawZone(state.zone);
    if (state.switch?.active) drawSwitch(state.switch);
    (state.checkpoints || []).forEach(drawCheckpoint);
    (state.collectibles || []).forEach(drawCollectible);
    drawGoal(state.goal);
    if (state.trueGoal?.active) drawGoal(state.trueGoal);
    if (state.crusher?.active) drawCrusher(state.crusher);
    if (state.shadow?.active) drawShadow(state.shadow);

    particles.forEach(p => { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = colors.danger; ctx.fillRect(p.x, p.y, 8, 8); });
    ctx.globalAlpha = 1;
    if (!player.dead) drawPlayer();
    ctx.restore();

    if (state.signal) drawSignal(state.signal);
    if (state.wind) drawWind(state.wind);
    if (state.collectibles?.length) drawCollectibleCounter();
  }

  function drawGrid(worldWidth) {
    ctx.strokeStyle = colors.grid; ctx.lineWidth = 1;
    for (let x = 0; x <= worldWidth; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 20; y <= H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(worldWidth, y); ctx.stroke(); }
  }

  function drawPlatform(p) {
    if (!p.active || p.invisible) return;
    if (p.invisibleVisual) {
      if (p.hintOutline) {
        ctx.save();
        ctx.globalAlpha = .28;
        ctx.strokeStyle = colors.solid;
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 7]);
        ctx.strokeRect(p.x, p.y, p.w, p.h);
        ctx.restore();
      }
      return;
    }
    ctx.fillStyle = p.trapTell ? colors.acid : p.triggered && p.timer < .2 ? colors.danger : colors.solid;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = colors.edge; ctx.fillRect(p.x, p.y, p.w, 5);
    if ((p.crumble && !p.hideCracks) || p.cracked) {
      ctx.strokeStyle = colors.ink; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(p.x + p.w * .35, p.y); ctx.lineTo(p.x + p.w * .48, p.y + p.h); ctx.moveTo(p.x + p.w * .7, p.y); ctx.lineTo(p.x + p.w * .62, p.y + p.h); ctx.stroke();
    }
    if (p.sinking) {
      ctx.fillStyle = colors.danger;
      ctx.fillRect(p.x + p.w / 2 - 14, p.y + 10, 28, 3);
      ctx.fillRect(p.x + p.w / 2 - 8, p.y + 16, 16, 3);
    }
    if (p.heavy) {
      ctx.fillStyle = colors.danger;
      const center = p.x + p.w / 2;
      ctx.fillRect(center - 14, p.y + 9, 28, 3);
      ctx.fillRect(center - 9, p.y + 15, 18, 3);
      ctx.fillRect(center - 4, p.y + 21, 8, 3);
    }
    if (p.pressure) {
      ctx.fillStyle = colors.danger;
      ctx.fillRect(p.x + 12, p.y + 10, p.w - 24, 3);
      ctx.fillRect(p.x + 20, p.y + 17, p.w - 40, 3);
    }
    if (p.moving || p.runner) {
      ctx.fillStyle = colors.acid;
      ctx.fillRect(p.x + 8, p.y + p.h - 5, p.w - 16, 3);
    }
    if (p.bounce && !p.hideBounceMarker) {
      ctx.fillStyle = colors.acid;
      ctx.fillRect(p.x, p.y, p.w, 7);
      ctx.fillStyle = colors.ink;
      ctx.font = '800 18px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('↑', p.x + p.w / 2, p.y + 21);
    }
  }

  function drawSpikes(sp) {
    if (!sp.active || sp.hidden) return;
    const count = Math.max(1, Math.round(sp.w / 28));
    const sw = sp.w / count;
    ctx.fillStyle = colors.danger;
    for (let i = 0; i < count; i++) {
      ctx.beginPath();
      if (sp.upside) { ctx.moveTo(sp.x + i * sw, sp.y); ctx.lineTo(sp.x + (i + .5) * sw, sp.y + sp.h); ctx.lineTo(sp.x + (i + 1) * sw, sp.y); }
      else { ctx.moveTo(sp.x + i * sw, sp.y + sp.h); ctx.lineTo(sp.x + (i + .5) * sw, sp.y); ctx.lineTo(sp.x + (i + 1) * sw, sp.y + sp.h); }
      ctx.closePath(); ctx.fill();
    }
  }

  function drawGoal(g) {
    if (g.hidden || g.active === false) return;
    ctx.fillStyle = g.locked ? colors.danger : colors.acid; ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.fillStyle = colors.ink; ctx.fillRect(g.x + 8, g.y + 10, g.w - 16, g.h - 10);
    ctx.fillStyle = g.locked ? colors.danger : colors.acid; ctx.fillRect(g.x + g.w - 15, g.y + 38, 5, 5);
    if (g.fake) { ctx.fillStyle = colors.ink; ctx.font = '800 18px system-ui'; ctx.fillText('?', g.x + 17, g.y - 10); }
  }

  function drawCrusher(c) {
    ctx.fillStyle = colors.danger; ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = colors.ink;
    for (let y = c.y + 14; y < c.y + c.h; y += 36) ctx.fillRect(c.x + 10, y, c.w - 20, 8);
  }

  function drawZone(zone) {
    ctx.save();
    ctx.strokeStyle = colors.solid;
    ctx.lineWidth = 4;
    if (zone.mode === 'air') ctx.setLineDash([8, 7]);
    ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);
    if (zone.mode === 'fast') {
      ctx.lineWidth = 2;
      ctx.strokeRect(zone.x + 6, zone.y + 6, zone.w - 12, zone.h - 12);
    }
    ctx.fillStyle = 'rgba(233, 229, 218, .08)';
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
    ctx.restore();
  }

  function drawSwitch(button) {
    ctx.fillStyle = button.pressed ? colors.edge : colors.acid;
    ctx.fillRect(button.x, button.y, button.w, button.h);
    ctx.fillStyle = colors.ink;
    ctx.fillRect(button.x + 5, button.y + 5, button.w - 10, button.h - 5);
  }

  function drawSignal(signal) {
    const active = signal.color === 'red' ? colors.danger : signal.color === 'yellow' ? '#ffd84d' : colors.acid;
    ctx.fillStyle = colors.solid;
    ctx.fillRect(842, 50, 68, 68);
    ctx.fillStyle = colors.ink;
    ctx.fillRect(849, 57, 54, 54);
    ctx.beginPath();
    ctx.arc(876, 84, 17, 0, Math.PI * 2);
    ctx.fillStyle = active;
    ctx.fill();
  }

  function drawShadow(shadow) {
    ctx.save();
    ctx.globalAlpha = shadow.anomaly ? .7 : .28;
    ctx.fillStyle = shadow.anomaly ? colors.danger : colors.solid;
    ctx.fillRect(shadow.x, shadow.y, shadow.w, shadow.h);
    ctx.fillStyle = colors.ink;
    ctx.fillRect(shadow.x + 17, shadow.y + 7, 4, 6);
    ctx.restore();
  }

  function drawWind(wind) {
    ctx.save();
    ctx.fillStyle = colors.acid;
    ctx.font = '800 42px system-ui';
    ctx.textAlign = 'center';
    const shownDirection = wind.displayDirection ?? wind.direction;
    ctx.fillText(shownDirection > 0 ? '→' : '←', 480, 88);
    ctx.restore();
  }

  function drawLaser(laser) {
    ctx.save();
    ctx.globalAlpha = .82;
    ctx.fillStyle = colors.danger;
    ctx.fillRect(laser.x, laser.y, laser.w, laser.h);
    ctx.globalAlpha = .25;
    ctx.fillRect(laser.x, laser.y - 4, laser.w, laser.h + 8);
    ctx.restore();
  }

  function drawCheckpoint(checkpoint) {
    ctx.fillStyle = checkpoint.active ? colors.acid : colors.solid;
    ctx.fillRect(checkpoint.x, checkpoint.y, 5, checkpoint.h);
    ctx.beginPath();
    ctx.moveTo(checkpoint.x + 5, checkpoint.y);
    ctx.lineTo(checkpoint.x + 27, checkpoint.y + 9);
    ctx.lineTo(checkpoint.x + 5, checkpoint.y + 18);
    ctx.closePath();
    ctx.fill();
  }

  function drawCollectible(item) {
    if (!item.active) return;
    const cx = item.x + item.w / 2;
    const cy = item.y + item.h / 2;
    ctx.fillStyle = colors.acid;
    ctx.beginPath();
    ctx.moveTo(cx, item.y);
    ctx.lineTo(item.x + item.w, cy);
    ctx.lineTo(cx, item.y + item.h);
    ctx.lineTo(item.x, cy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = colors.ink;
    ctx.fillRect(cx - 2, cy - 2, 4, 4);
  }

  function drawCollectibleCounter() {
    ctx.fillStyle = colors.solid;
    ctx.font = '800 16px system-ui';
    ctx.textAlign = 'left';
    const target = state.displayCollectibles || state.requiredCollectibles || state.collectibles.length;
    ctx.fillText(`◆ ${state.collectedCount || 0}/${target}`, 28, H - 28);
  }

  function drawGravityZone(zone) {
    ctx.save();
    ctx.globalAlpha = .09;
    ctx.fillStyle = zone.scale < 1 ? colors.acid : colors.danger;
    ctx.fillRect(zone.x, 0, zone.w, H);
    ctx.globalAlpha = .32;
    ctx.font = '800 32px system-ui';
    ctx.textAlign = 'center';
    const symbol = zone.scale < 1 ? '↑' : '↓';
    for (let x = zone.x + 55; x < zone.x + zone.w; x += 110) ctx.fillText(symbol, x, 96);
    ctx.restore();
  }

  function drawPlayer() {
    const weightSquash = player.grounded ? (state.weight || 0) * 10 : 0;
    const squash = player.grounded ? Math.min(7, Math.abs(player.vx) / 100 + weightSquash) : 0;
    ctx.fillStyle = colors.acid; ctx.fillRect(player.x - squash / 2, player.y + squash, player.w + squash, player.h - squash);
    const facing = player.vx < -2 ? -1 : 1;
    ctx.fillStyle = colors.ink;
    const eyeX = facing > 0 ? player.x + 18 : player.x + 7;
    ctx.fillRect(eyeX, player.y + 7, 4, 6);
    ctx.fillRect(eyeX, player.y + 18, facing * 6, 3);
  }

  function say(text, duration = 0, priority = false) {
    if (!text) return;
    const readingTime = Math.min(6500, 1800 + [...text].length * 110);
    const entry = { text, duration: Math.max(duration, readingTime) };
    if (priority) {
      messageQueue = [];
      showMessage(entry);
      return;
    }
    if (messageTimer > 0) {
      if (message.textContent !== text && !messageQueue.some(item => item.text === text)) messageQueue.push(entry);
      return;
    }
    showMessage(entry);
  }

  function showMessage(entry) {
    message.textContent = entry.text;
    message.classList.add('visible');
    messageTimer = entry.duration;
  }

  function updateMessage(dt) {
    if (messageTimer <= 0) return;
    messageTimer -= dt * 1000;
    if (messageTimer > 0) return;
    const next = messageQueue.shift();
    if (next) showMessage(next);
    else message.classList.remove('visible');
  }

  function sayStory(id, text, duration = 1600) {
    if (seenStory.has(id)) return;
    seenStory.add(id);
    say(text, duration);
  }

  function tone(freq, duration) {
    if (!soundOn) return;
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const osc = audio.createOscillator(); const gain = audio.createGain();
    osc.type = 'square'; osc.frequency.value = freq; gain.gain.setValueAtTime(.035, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
    osc.connect(gain); gain.connect(audio.destination); osc.start(); osc.stop(audio.currentTime + duration);
  }

  function loop(time) {
    const dt = Math.min(.025, (time - lastTime) / 1000 || 0); lastTime = time; elapsed += dt;
    update(dt); draw(); requestAnimationFrame(loop);
  }

  function loadChapterProgress() {
    try {
      return window.localStorage?.getItem(chapterProgressKey) === 'complete';
    } catch {
      return false;
    }
  }

  function saveChapterProgress() {
    try {
      window.localStorage?.setItem(chapterProgressKey, 'complete');
    } catch {
      // Progress remains available for the current session.
    }
  }

  function updateChapterLocks() {
    chapterTwoButton.disabled = !chapterOneComplete;
    chapterTwoButton.classList.remove('chapter-button-active');
    if (chapterOneComplete) chapterTwoButton.classList.add('chapter-button-active');
    chapterTwoStatus.textContent = chapterOneComplete ? '下一章' : 'LOCKED';
    chapterNotice.textContent = chapterOneComplete
      ? '第二章已解鎖，關卡正在製作中。'
      : '完成第一章後，其他章節才會開放。';
  }

  function startChapterOne() {
    levelIndex = 0;
    deaths = 0;
    levelMemory.clear();
    seenStory.clear();
    deathCount.textContent = '0';
    chapterNotice.textContent = '';
    started = true;
    chapterPanel.hidden = true;
    checkpointPanel.hidden = true;
    Object.keys(keys).forEach(key => { keys[key] = false; });
    initLevel(0);
    audio?.resume();
  }

  function showChapterSelect() {
    clearTimeout(transitionTimer);
    transitionTimer = null;
    started = false;
    checkpointPanel.hidden = true;
    chapterPanel.hidden = false;
    updateChapterLocks();
  }

  function jumpToLevel(index) {
    levelIndex = Math.max(0, Math.min(levelFactories.length - 1, index));
    started = true;
    chapterPanel.hidden = true;
    checkpointPanel.hidden = true;
    Object.keys(keys).forEach(key => { keys[key] = false; });
    initLevel(levelIndex);
    audio?.resume();
  }

  const keyMap = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'jump', w: 'jump', W: 'jump', ' ': 'jump' };
  addEventListener('keydown', e => {
    if (keyMap[e.key]) { keys[keyMap[e.key]] = true; e.preventDefault(); }
    if ((e.key === 'r' || e.key === 'R') && started) initLevel(levelIndex);
    if (/^[1-9]$/.test(e.key) && !e.repeat) { jumpToLevel(Number(e.key) - 1); e.preventDefault(); }
    if (e.key === '[' && !e.repeat) { jumpToLevel(levelIndex - 1); e.preventDefault(); }
    if (e.key === ']' && !e.repeat) { jumpToLevel(levelIndex + 1); e.preventDefault(); }
  });
  addEventListener('keyup', e => { if (keyMap[e.key]) { keys[keyMap[e.key]] = false; e.preventDefault(); } });
  addEventListener('blur', () => Object.keys(keys).forEach(k => keys[k] = false));

  document.querySelectorAll('[data-control]').forEach(button => {
    const control = button.dataset.control;
    const press = e => { e.preventDefault(); keys[control] = true; button.classList.add('pressed'); };
    const release = e => { e.preventDefault(); keys[control] = false; button.classList.remove('pressed'); };
    button.addEventListener('pointerdown', press); button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('pointerleave', release);
  });

  chapterOneButton.addEventListener('click', startChapterOne);
  chapterTwoButton.addEventListener('click', () => {
    if (chapterOneComplete) chapterNotice.textContent = '第二章仍是？？？，關卡正在製作中。';
  });
  document.querySelector('#againButton').addEventListener('click', startChapterOne);
  chapterReturnButton.addEventListener('click', showChapterSelect);
  document.querySelector('#restartButton').addEventListener('click', () => { if (started) initLevel(levelIndex); });
  document.querySelector('#soundButton').addEventListener('click', () => { soundOn = !soundOn; soundIcon.textContent = soundOn ? '♪' : '×'; });
  levelSelect.addEventListener('change', () => jumpToLevel(Number(levelSelect.value)));
  initLevel(0);
  updateChapterLocks();
  requestAnimationFrame(loop);
})();
