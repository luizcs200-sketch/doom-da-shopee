const cv = document.getElementById('c'), ctx = cv.getContext('2d'), ov = document.getElementById('ov');
const W = 256, H = 160, FOV = Math.PI / 3;
const MAP = ["1111111111111111", "1000000000000001", "1000000220000001", "1000000000000001", "1002200000033001", "1000000000000001", "1000000000000001", "1110011000011001", "1000000000000001", "1000000000200001", "1033000000000001", "1000000011000001", "1000220000000001", "1000000000000301", "1000000000000001", "1111111111111111"];
const G = MAP.map(r => [...r].map(Number));
const COL = { 1: [150, 120, 100], 2: [170, 50, 40], 3: [60, 130, 70] };
const mk = f => { const c = document.createElement('canvas'); c.width = c.height = 64; f(c.getContext('2d')); return c };
const S = {
    demon: mk(g => {
        g.fillStyle = '#a31d12'; g.fillRect(16, 22, 32, 42); g.fillRect(8, 28, 10, 26); g.fillRect(46, 28, 10, 26);
        g.fillStyle = '#c9301f'; g.beginPath(); g.arc(32, 18, 13, 0, 7); g.fill();
        g.fillStyle = '#e8d8b0'; g.fillRect(17, 2, 4, 10); g.fillRect(43, 2, 4, 10);
        g.fillStyle = '#ffe34d'; g.fillRect(25, 14, 5, 4); g.fillRect(36, 14, 5, 4);
        g.fillStyle = '#200'; g.fillRect(26, 23, 12, 5); g.fillStyle = '#fff'; g.fillRect(28, 23, 2, 3); g.fillRect(34, 23, 2, 3); g.fillStyle = '#6a0f08'; g.fillRect(22, 36, 20, 3); g.fillRect(24, 42, 16, 3); g.fillStyle = '#ffe34d'; g.fillRect(9, 52, 3, 5); g.fillRect(14, 52, 3, 5); g.fillRect(47, 52, 3, 5); g.fillRect(52, 52, 3, 5)
    }),
    boss: mk(g => { g.fillStyle = '#4b1a7a'; g.fillRect(12, 20, 40, 44); g.fillRect(4, 24, 10, 30); g.fillRect(50, 24, 10, 30); g.fillStyle = '#6a2aa8'; g.beginPath(); g.arc(32, 16, 14, 0, 7); g.fill(); g.fillStyle = '#ddd'; g.fillRect(14, 0, 5, 12); g.fillRect(45, 0, 5, 12); g.fillStyle = '#3f3'; g.fillRect(24, 11, 6, 5); g.fillRect(35, 11, 6, 5); g.fillStyle = '#111'; g.fillRect(24, 22, 16, 6); g.fillStyle = '#f33'; g.fillRect(28, 36, 8, 8) }),
    hp: mk(g => { g.fillStyle = '#eee'; g.fillRect(18, 34, 28, 24); g.fillStyle = '#d11'; g.fillRect(30, 38, 4, 16); g.fillRect(24, 44, 16, 4) }),
    ammo: mk(g => { g.fillStyle = '#b8860b'; g.fillRect(16, 40, 32, 18); g.fillStyle = '#ddd'; for (let i = 0; i < 4; i++)g.fillRect(20 + i * 7, 34, 4, 8) })
};
function brick(g, b, m) { g.fillStyle = m; g.fillRect(0, 0, 64, 64); for (let r = 0; r < 8; r++)for (let c = -1; c < 4; c++) { const x = c * 16 + (r % 2) * 8; g.fillStyle = b; g.fillRect(x + 1, r * 8 + 1, 14, 6); g.fillStyle = 'rgba(' + (Math.random() < .5 ? '0,0,0' : '255,255,255') + ',' + Math.random() * .22 + ')'; g.fillRect(x + 1, r * 8 + 1, 14, 6); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + 1, r * 8 + 1, 14, 1) } }
const T = { 1: mk(g => brick(g, '#8a7a6a', '#2e2822')), 2: mk(g => brick(g, '#b03a2a', '#240c08')), 3: mk(g => { g.fillStyle = '#2f6a3a'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#1a3f22'; for (let i = 0; i < 4; i++) { g.fillRect(0, i * 16, 64, 2); g.fillRect(i * 16, 0, 2, 64) } g.fillStyle = '#9d9'; for (let i = 0; i < 4; i++)for (let j = 0; j < 4; j++)g.fillRect(5 + j * 16, 5 + i * 16, 2, 2); g.fillStyle = 'rgba(120,255,120,.15)'; g.fillRect(0, 0, 64, 10) }) };
let bob = 0, P = [];
let px, py, pa, hp, mhp, ammo, kills, total, state, en, items, zb = new Float32Array(W), flash = 0, hurt = 0, recoil = 0, keys = {}, cd = 0, wave, lives, wt = 0, wep = 0, fire = false;
const WP = [{ n: 'PISTOLA', c: 1, cd: 14, u: 1 }, { n: 'SHOTGUN', c: 2, cd: 34, u: 3 }];
function free() { for (let i = 0; i < 99; i++) { const x = 1 + Math.random() * 14, y = 1 + Math.random() * 14; if (!wall(x, y) && Math.hypot(x - px, y - py) > 5) return [x, y] } return [8.5, 8.5] }
function spawn(boss) { const p = free(), h = boss ? 60 + wave * 6 : 4 + Math.floor(wave * .6); return { x: p[0], y: p[1], hp: h, mx: h, t: 0, big: boss ? 1.8 : 1, boss, v: boss ? .014 : .014 + wave * .0005, rt: 100 } }
function startWave() {
    const boss = wave % 5 === 0; en = []; const n = boss ? 3 + (wave >> 2) : Math.min(4 + wave, 16); if (boss) en.push(spawn(true)); for (let i = 0; i < n; i++)en.push(spawn(false));
    for (let i = 0; i < 2; i++) { const p = free(); items.push({ x: p[0], y: p[1], k: 'hp' }) } for (let i = 0; i < 3; i++) { const p = free(); items.push({ x: p[0], y: p[1], k: 'ammo' }) }
    WP.forEach((w, i) => { if (w.u === wave && wave > 1) wep = i }); ammo += 10; hp = Math.min(mhp, hp + 25); wt = 150; total = en.length; kills = 0
}
function reset() { px = 2.5; py = 2.5; pa = 0.6; wave = 1; lives = 2; mhp = 100; hp = 100; ammo = 50; wep = 0; flash = hurt = recoil = 0; items = []; state = 'play'; startWave() }
function cast(a) {
    let dx = Math.cos(a) || 1e-9, dy = Math.sin(a) || 1e-9, mx = px | 0, my = py | 0, ddx = Math.abs(1 / dx), ddy = Math.abs(1 / dy), sx, sy, sdx, sdy, side = 0, t = 0;
    if (dx < 0) { sx = -1; sdx = (px - mx) * ddx } else { sx = 1; sdx = (mx + 1 - px) * ddx }
    if (dy < 0) { sy = -1; sdy = (py - my) * ddy } else { sy = 1; sdy = (my + 1 - py) * ddy }
    for (let i = 0; i < 40; i++) {
        if (sdx < sdy) { t = sdx; sdx += ddx; mx += sx; side = 0 } else { t = sdy; sdy += ddy; my += sy; side = 1 }
        if (G[my] && G[my][mx]) return [t, side, G[my][mx], side ? px + t * dx : py + t * dy]
    } return [40, 0, 1, 0]
}
const wall = (x, y) => !G[y | 0] || G[y | 0][x | 0];
function move(dx, dy) { const r = .22; if (!wall(px + dx + Math.sign(dx) * r, py)) px += dx; if (!wall(px, py + dy + Math.sign(dy) * r)) py += dy }
let ac; function beep(f, d, v = .1) { try { ac = ac || new AudioContext(); const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, ac.currentTime); o.frequency.exponentialRampToValueAtTime(40, ac.currentTime + d); g.gain.setValueAtTime(v, ac.currentTime); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + d); o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + d) } catch (e) { } }
function shoot() {
    if (state !== 'play' || cd > 0 || wt > 0) return; const w = WP[wep]; if (ammo < w.c) { beep(120, .05); return }
    ammo -= w.c; cd = w.cd; flash = 4; recoil = wep == 1 ? 14 : 8; beep(wep == 1 ? 160 : 300, .2, .15);
    if (wep == 1) for (let i = 0; i < 8; i++)hit((Math.random() - .5) * .22, 2); else hit(0, 3)
}
function hit(off, dmg) {
    let best = null, bd = 99;
    for (const e of en) {
        const dx = e.x - px, dy = e.y - py, d = Math.hypot(dx, dy); let da = Math.atan2(dy, dx) - pa - off; da = Math.atan2(Math.sin(da), Math.cos(da));
        if (Math.abs(da) < Math.atan(.4 / d) + .02 && d < bd && d < cast(pa + off + da)[0]) { best = e; bd = d }
    }
    if (best) { best.hp -= bd < 4 ? dmg : Math.max(1, dmg * .6); best.pain = 4; for (let i = 0; i < 5; i++)P.push({ x: W / 2, y: H / 2 - 6, vx: (Math.random() - .5) * 3, vy: -Math.random() * 2.5, l: 18 }); beep(90, .1, .08); if (best.hp <= 0) { en.splice(en.indexOf(best), 1); kills++; if (Math.random() < .3) items.push({ x: best.x, y: best.y, k: 'ammo' }); if (en.length === 0) { if (wave >= 30) { state = 'win'; show('VITÓRIA!', 'Você sobreviveu às 30 ondas!') } else { if (wave % 5 === 0) lives++; wave++; mhp += 4; startWave() } } } }
}
function show(t, s) { ov.innerHTML = '<h1>' + t + '</h1><p>' + s + '</p><p><b>Clique para jogar de novo</b></p>'; ov.style.display = 'flex'; document.exitPointerLock && document.exitPointerLock() }
function update() {
    if (cd > 0) cd--; if (wt > 0) wt--; if (flash > 0) flash--; if (hurt > 0) hurt--; if (recoil > 0) recoil--;
    const sp = .06; let f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0), s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    move((Math.cos(pa) * f - Math.sin(pa) * s) * sp, (Math.sin(pa) * f + Math.cos(pa) * s) * sp);
    pa += ((keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0)) * .05;
    if (f || s) bob += .18; if (keys.Space || fire) shoot();
    for (const e of en) {
        if (e.pain > 0) e.pain--; const dx = px - e.x, dy = py - e.y, d = Math.hypot(dx, dy);
        if (d < (e.boss ? 14 : 9) && d > .8) { const v = e.v; const mx = dx / d * v, my = dy / d * v; if (!wall(e.x + mx * 8, e.y)) e.x += mx; if (!wall(e.x, e.y + my * 8)) e.y += my }
        if (d <= (e.boss ? 1.4 : .9)) { if (--e.t <= 0) { e.t = 50; hp -= e.boss ? 20 : 8 + (wave >> 2); hurt = 10; beep(70, .2, .2) } } else e.t = Math.min(e.t, 20);
        if (e.boss && d > 2 && d < 8 && --e.rt <= 0) { e.rt = 110; if (d < cast(Math.atan2(dy, dx))[0]) { hp -= 12; hurt = 12; beep(200, .25, .2) } }
    }
    items = items.filter(i => { if (Math.hypot(i.x - px, i.y - py) < .6) { if (i.k === 'hp') { if (hp >= mhp) return true; hp = Math.min(mhp, hp + 25) } else ammo += 15; beep(600, .1, .08); return false } return true });
    if (hp <= 0) { if (--lives > 0) { hp = mhp; px = 2.5; py = 2.5; hurt = 30; en.forEach(e => { const p = free(); e.x = p[0]; e.y = p[1] }) } else { lives = 0; hp = 0; state = 'dead'; show('VOCÊ MORREU', 'Você chegou até a onda ' + wave + '.') } }
}
function render() {
    let g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a0c0c'); g.addColorStop(.5, '#3a1a14'); g.addColorStop(.5, '#2a2420'); g.addColorStop(1, '#0a0806');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; for (let k = 1; k < 24; k++) { const o = H / (2 * k); ctx.fillRect(0, H / 2 + o, W, 1); ctx.fillRect(0, H / 2 - o, W, 1) }
    for (let x = 0; x < W; x++) {
        const ra = pa - FOV / 2 + FOV * x / W, r = cast(ra), d = r[0] * Math.cos(ra - pa); zb[x] = d;
        const h = H / d, fr = r[3] - Math.floor(r[3]), sh = Math.min(1, 2.2 / (1 + d * .5)) * (r[1] ? .7 : 1);
        ctx.drawImage(T[r[2]], Math.floor(fr * 64), 0, 1, 64, x, (H - h) / 2, 1, h); ctx.fillStyle = 'rgba(25,0,0,' + (1 - sh).toFixed(2) + ')'; ctx.fillRect(x, (H - h) / 2, 1, h)
    }
    const sp = [...en.map(e => ({ o: e, s: e.boss ? S.boss : S.demon })), ...items.map(i => ({ o: i, s: S[i.k] }))];
    for (const q of sp) q.d = Math.hypot(q.o.x - px, q.o.y - py); sp.sort((a, b) => b.d - a.d);
    for (const q of sp) {
        let da = Math.atan2(q.o.y - py, q.o.x - px) - pa; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) > FOV) continue;
        const dd = q.d * Math.cos(da), size = H / dd * (q.o.big || 1), cx = (.5 + da / FOV) * W, x0 = cx - size / 2, y = q.o.mx ? H / 2 + H / dd / 2 - size : (H - size) / 2 + size * .15;
        ctx.globalAlpha = 1;
        for (let i = 0; i < size; i++) {
            const x = Math.floor(x0 + i); if (x < 0 || x >= W || zb[x] < dd) continue;
            ctx.drawImage(q.s, Math.floor(i / size * 64), 0, 1, 64, x, y, 1, size);
            if (q.o.pain > 0) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x, y, 1, size) }
        }
        if (q.o.mx) { const ci = Math.floor(cx); if (ci >= 0 && ci < W && zb[ci] >= dd) { const bw = Math.max(8, size * .6), bx = cx - bw / 2, by = y - 5, r = Math.max(0, q.o.hp / q.o.mx); ctx.fillStyle = '#000'; ctx.fillRect(bx - 1, by - 1, bw + 2, 5); ctx.fillStyle = '#600'; ctx.fillRect(bx, by, bw, 3); ctx.fillStyle = q.o.boss ? '#c3f' : r > .5 ? '#4d4' : r > .25 ? '#ed3' : '#e33'; ctx.fillRect(bx, by, bw * r, 3) } }
    }
    for (const p of P) { p.x += p.vx; p.y += p.vy; p.vy += .15; p.l--; ctx.fillStyle = p.l > 6 ? '#d00' : '#600'; ctx.fillRect(p.x, p.y, 2, 2) } P = P.filter(p => p.l > 0);
    // arma
    const gx = W / 2 + Math.sin(bob) * 5, gy = H - recoil + Math.abs(Math.cos(bob)) * 4; const wc = ['#333', '#5a3a1a'][wep], ww = [16, 22][wep]; ctx.fillStyle = wc; ctx.fillRect(gx - ww / 2, gy - 34, ww, 40); ctx.fillStyle = '#777'; ctx.fillRect(gx - ww / 2 + 3, gy - 38, ww - 6, 10); if (wep == 1) { ctx.fillRect(gx - 9, gy - 40, 6, 40); ctx.fillRect(gx + 3, gy - 40, 6, 40) } ctx.fillStyle = '#222'; ctx.fillRect(gx - 12, gy - 8, 24, 12);
    if (flash) { ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(gx, gy - 44, 10, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(gx, gy - 44, 5, 0, 7); ctx.fill() }
    // mira
    ctx.fillStyle = '#fff'; ctx.fillRect(W / 2 - 1, H / 2 - 4, 2, 3); ctx.fillRect(W / 2 - 1, H / 2 + 1, 2, 3); ctx.fillRect(W / 2 - 4, H / 2 - 1, 3, 2); ctx.fillRect(W / 2 + 1, H / 2 - 1, 3, 2);
    if (flash) { ctx.fillStyle = 'rgba(255,200,90,.12)'; ctx.fillRect(0, 0, W, H) }
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .95); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.7)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    if (hurt) { ctx.fillStyle = 'rgba(200,0,0,' + hurt * .04 + ')'; ctx.fillRect(0, 0, W, H) }
    // HUD
    ctx.fillStyle = 'rgba(20,5,5,.85)'; ctx.fillRect(0, H - 18, W, 18); ctx.font = 'bold 11px "Courier New",monospace'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#400'; ctx.fillRect(3, H - 15, 78, 12); ctx.fillStyle = hp > mhp * .3 ? '#2a2' : '#c22'; ctx.fillRect(3, H - 15, 78 * hp / mhp, 12); ctx.fillStyle = '#fff'; ctx.fillText('HP ' + Math.ceil(hp) + '/' + mhp, 6, H - 9); ctx.fillStyle = '#fd4'; ctx.fillText('MUN ' + ammo, 88, H - 9); ctx.fillStyle = '#f96'; ctx.fillText('ONDA ' + wave + '/30', 140, H - 9); ctx.fillStyle = '#f6a'; ctx.fillText('♥' + lives, 215, H - 9); ctx.fillStyle = '#9cf'; ctx.font = 'bold 9px "Courier New",monospace'; ctx.fillText(WP[wep].n, 245, H - 9);
    if (wt > 0) { ctx.textAlign = 'center'; ctx.font = 'bold 22px "Courier New",monospace'; ctx.fillStyle = wave % 5 ? '#fd4' : '#f33'; ctx.fillText(wave % 5 ? 'ONDA ' + wave : 'ONDA ' + wave + ' — CHEFE!', W / 2, 60); ctx.textAlign = 'left' }
    // minimapa
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(4, 4, 64, 64);
    for (let y = 0; y < 16; y++)for (let x = 0; x < 16; x++)if (G[y][x]) { ctx.fillStyle = '#777'; ctx.fillRect(4 + x * 4, 4 + y * 4, 4, 4) }
    ctx.fillStyle = '#f33'; for (const e of en) ctx.fillRect(4 + e.x * 4 - 1, 4 + e.y * 4 - 1, 3, 3);
    ctx.fillStyle = '#4f4'; ctx.fillRect(4 + px * 4 - 1, 4 + py * 4 - 1, 3, 3); ctx.strokeStyle = '#4f4'; ctx.beginPath(); ctx.moveTo(4 + px * 4, 4 + py * 4); ctx.lineTo(4 + px * 4 + Math.cos(pa) * 7, 4 + py * 4 + Math.sin(pa) * 7); ctx.stroke()
}
function loop() { if (state === 'play') update(); render(); requestAnimationFrame(loop) }
addEventListener('keydown', e => { keys[e.code] = true; const n = +e.key; if (n >= 1 && n <= 2 && WP[n - 1].u <= wave) wep = n - 1; if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault() });
addEventListener('keyup', e => keys[e.code] = false);
addEventListener('mousemove', e => { if (document.pointerLockElement === cv) pa += e.movementX * .003 });
cv.addEventListener('mousedown', () => { if (state === 'play') { if (document.pointerLockElement !== cv) cv.requestPointerLock && cv.requestPointerLock(); fire = true; shoot() } }); addEventListener('mouseup', () => fire = false);
ov.addEventListener('click', () => { ov.style.display = 'none'; reset(); try { cv.requestPointerLock() } catch (e) { } });
reset(); state = 'menu'; loop();
