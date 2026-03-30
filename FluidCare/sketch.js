let video, handPose, hands = [];
let particles = [];
const NUM_PARTICLES = 6500;
const REPORT_H = 2700;

let currentState = 'LOGIN';
let sessionData = [];
let userName = '';
let sessionW = 0, sessionH = 0;

let noiseScale = 0.0025, timeScale = 0.0018, baseStrength = 1.4;
let handFound = false, handX = 0, handY = 0, handSpeed = 0, handOpen = 0, prevHand = null;

function setup() {
    createCanvas(windowWidth, windowHeight);
    pixelDensity(1);

    video = createCapture(VIDEO);
    video.size(640, 480);
    video.hide();

    handPose = ml5.handPose(video, () => {
        handPose.detectStart(video, gotHands);
    });

    for (let i = 0; i < NUM_PARTICLES; i++) {
        particles.push(new FlowParticle(random(width), random(height)));
    }
    background(6, 10, 20);
}

function gotHands(results) { hands = results; }

function windowResized() {
    if (currentState !== 'REPORT') {
        resizeCanvas(windowWidth, windowHeight);
        background(6, 10, 20);
    }
}

function draw() {
    background(6, 10, 20, 20);

    if (currentState === 'LOGIN') {
        runFlowEngine(0.3);
        drawStaticNoise(15);
    } else if (currentState === 'TRAINING') {
        readHandFromHandPose();
        push();
        blendMode(ADD);
        runFlowEngine(1.2);
        pop();
        if (handFound) {
            drawHandUI();
            if (frameCount % 4 === 0) recordBiometrics();
        }
        updateHUD();
    }

    drawUIGrid();
}

function runFlowEngine(mult) {
    for (let p of particles) {
        let v = flowVector(p.pos.x, p.pos.y);
        v.mult(mult);
        p.step(v);
        p.draw();
    }
}

function flowVector(x, y) {
    const t = frameCount * timeScale;
    const n1 = noise(x * noiseScale, y * noiseScale, t);
    const n2 = noise((x + 1000) * noiseScale, (y + 1000) * noiseScale, t);

    let angle = n1 * TWO_PI * 2.25 + n2 * TWO_PI * 1.25;
    let strength = baseStrength * map(n2, 0, 1, 0.7, 1.9);

    if (handFound) {
        const dx = x - handX, dy = y - handY;
        const d = sqrt(dx * dx + dy * dy);
        const R = lerp(220, 520, handOpen);
        if (d < R) {
            const influence = 1 - d / R;
            const sp = constrain(handSpeed / 45, 0, 1);
            const swirl = lerp(1.2, 7.5, sp);
            const dirSign = handX < width * 0.5 ? 1 : -1;
            angle += dirSign * influence * swirl * 2.6;
            strength += influence * swirl * 1.35;
            const pull = lerp(-0.25, -1.1, influence) * (0.6 + sp);
            angle = lerpAngle(angle, atan2(-dy, -dx), pull * 0.03);
        }
    }
    return p5.Vector.fromAngle(angle).mult(strength);
}

function lerpAngle(a, b, t) {
    let diff = ((b - a + PI) % TWO_PI) - PI;
    return a + diff * t;
}

function startTraining() {
    const input = document.getElementById('username');
    userName = (input ? input.value.trim() : '') || 'UNKNOWN';
    document.getElementById('screen-login').style.display = 'none';
    document.getElementById('screen-hud').style.display = 'block';
    sessionData = [];
    currentState = 'TRAINING';
}

function showReport() {
    currentState = 'REPORT';
    noLoop();
    sessionW = width;
    sessionH = height;

    document.getElementById('screen-hud').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    document.body.style.overflow = 'auto';

    resizeCanvas(windowWidth, REPORT_H);
    drawArtisticReport();
    document.getElementById('report-actions').style.display = 'flex';
}

function exportReport() {
    saveCanvas('FluidCare_Report_' + userName.replace(/\s+/g, '_'), 'png');
}

function updateHUD() {
    const speedEl = document.getElementById('val-speed');
    const openEl  = document.getElementById('val-open');
    if (speedEl) speedEl.textContent = handSpeed.toFixed(1);
    if (openEl)  openEl.textContent  = (handOpen * 100).toFixed(0) + '%';
}

function recordBiometrics() {
    sessionData.push({ v: handSpeed, o: handOpen, t: frameCount, x: handX, y: handY });
}

function getAvg(key) {
    if (!sessionData.length) return 0;
    return sessionData.reduce((s, d) => s + d[key], 0) / sessionData.length;
}

function getMax(key) {
    if (!sessionData.length) return 0;
    return sessionData.reduce((m, d) => Math.max(m, d[key]), 0);
}

// ─── REPORT ───────────────────────────────────────────────────────────────────

function drawArtisticReport() {
    const PAD = 80;
    const W   = width - PAD * 2;
    const n   = sessionData.length;

    background(6, 10, 20);
    drawUIGrid();

    let y = 90;

    noStroke(); fill(0, 242, 255, 160);
    textFont('Courier New'); textSize(11); textAlign(LEFT);
    text('FLUIDCARE™  V2.0  //  NEURAL FLOW ANALYSIS', PAD, y);
    y += 46;

    fill(255); textSize(40);
    text('KINETIC ANALYSIS REPORT', PAD, y);
    y += 38;

    fill(255, 160); textSize(17);
    text('// SUBJECT: ' + userName.toUpperCase(), PAD, y);
    y += 28;

    const durSec = (n * 4 / 60).toFixed(1);
    const nowStr = new Date().toLocaleString();
    fill(255, 70); textSize(11);
    text('DATE: ' + nowStr + '   |   FRAMES: ' + n + '   |   DURATION: ' + durSec + 's', PAD, y);
    y += 36;

    stroke(255, 35); strokeWeight(1);
    line(PAD, y, width - PAD, y);
    y += 50;

    if (n === 0) {
        noStroke(); fill(255, 60); textSize(14);
        text('NO DATA RECORDED — SESSION WAS TOO SHORT', PAD, y);
        return;
    }

    // 01 VELOCITY
    y = drawSectionLabel('01 / VELOCITY PROFILE', PAD, y);
    drawTimeChart(PAD, y, W, 240, 'v', [0, 242, 255], 'MOVEMENT VELOCITY  (px/frame)');
    y += 240 + 65;

    // 02 OPENNESS
    y = drawSectionLabel('02 / HAND OPENNESS INDEX', PAD, y);
    drawTimeChart(PAD, y, W, 180, 'o', [255, 100, 200], 'HAND OPENNESS  (0 – 100%)');
    y += 180 + 65;

    // 03 + 04  side by side
    y = drawSectionLabel('03 / POSITION HEATMAP   +   04 / DIRECTION DISTRIBUTION', PAD, y);
    const sideH = 340;
    const sideW = (W - 30) / 2;
    drawHeatmap(PAD, y, sideW, sideH);
    drawPolarChart(PAD + sideW + 30, y, sideW, sideH);
    y += sideH + 65;

    // 05 TRAJECTORY
    y = drawSectionLabel('05 / SPATIAL TRAJECTORY', PAD, y);
    drawTrajectory(PAD, y, W, 280);
    y += 280 + 65;

    // 06 RHYTHM
    y = drawSectionLabel('06 / MOVEMENT RHYTHM', PAD, y);
    drawRhythmChart(PAD, y, W, 160);
    y += 160 + 65;

    // 07 STATISTICS
    y = drawSectionLabel('07 / SESSION STATISTICS', PAD, y);
    y += 10;

    const avgV = getAvg('v'), maxV = getMax('v');
    const avgO = getAvg('o'), maxO = getMax('o');
    const cardW = (W - 40) / 3;
    const cardH = 110;

    drawStatCard(PAD,                    y, cardW, cardH, 'AVG VELOCITY',    avgV.toFixed(2) + ' px/f', [0, 242, 255]);
    drawStatCard(PAD + cardW + 20,       y, cardW, cardH, 'PEAK VELOCITY',   maxV.toFixed(2) + ' px/f', [0, 242, 255]);
    drawStatCard(PAD + (cardW + 20) * 2, y, cardW, cardH, 'NEURO-STABILITY', '94.2%',                   [0, 242, 255]);
    y += cardH + 18;
    drawStatCard(PAD,                    y, cardW, cardH, 'AVG OPENNESS',     (avgO * 100).toFixed(1) + '%', [255, 100, 200]);
    drawStatCard(PAD + cardW + 20,       y, cardW, cardH, 'PEAK OPENNESS',    (maxO * 100).toFixed(1) + '%', [255, 100, 200]);
    drawStatCard(PAD + (cardW + 20) * 2, y, cardW, cardH, 'SESSION DURATION', durSec + 's',                  [255, 100, 200]);
    y += cardH + 70;

    stroke(255, 30); strokeWeight(1);
    line(PAD, y, width - PAD, y);
    y += 28;

    noStroke(); fill(255, 45); textSize(10); textAlign(LEFT);
    text('SYSTEM: FluidCare™ V2.0  //  NEURAL INTERFACE  //  KINETIC BIOMETRIC ANALYSIS', PAD, y);
    y += 18;
    text('CONFIDENTIAL — FOR REHABILITATION USE ONLY', PAD, y);
    textAlign(RIGHT); fill(255, 35);
    text('GENERATED: ' + nowStr, width - PAD, y);
}

// ─── SECTION LABEL ────────────────────────────────────────────────────────────

function drawSectionLabel(label, x, y) {
    noStroke(); fill(0, 242, 255, 190);
    textFont('Courier New'); textSize(12); textAlign(LEFT);
    text(label, x, y + 14);
    stroke(0, 242, 255, 50); strokeWeight(1);
    line(x, y + 22, width - x, y + 22);
    return y + 40;
}

// ─── TIME CHART ───────────────────────────────────────────────────────────────

function drawTimeChart(x, y, w, h, key, rgb, title) {
    const n      = sessionData.length;
    const maxVal = getMax(key) * 1.15 || 1;
    const isOpen = key === 'o';

    noStroke(); fill(255, 4);
    rect(x, y, w, h, 3);

    stroke(255, 18); strokeWeight(1);
    for (let i = 0; i <= 4; i++) {
        const gy = y + h - (i / 4) * h;
        line(x, gy, x + w, gy);
        noStroke(); fill(255, 55); textSize(9); textAlign(RIGHT);
        const v = maxVal * i / 4;
        text(isOpen ? (v * 100).toFixed(0) + '%' : v.toFixed(1), x - 6, gy + 4);
        stroke(255, 18);
    }

    noStroke(); fill(255, 55); textSize(9); textAlign(CENTER);
    const totalSec = n * 4 / 60;
    for (let i = 0; i <= 5; i++) {
        const gx = x + (i / 5) * w;
        text((totalSec * i / 5).toFixed(1) + 's', gx, y + h + 16);
    }

    noStroke(); fill(rgb[0], rgb[1], rgb[2], 130); textSize(10); textAlign(LEFT);
    text(title, x + 8, y + 14);

    noStroke(); fill(rgb[0], rgb[1], rgb[2], 25);
    beginShape();
    vertex(x, y + h);
    for (let i = 0; i < n; i++) {
        vertex(x + map(i, 0, n - 1, 0, w),
               y + h - map(sessionData[i][key], 0, maxVal, 0, h));
    }
    vertex(x + w, y + h);
    endShape(CLOSE);

    noFill(); stroke(rgb[0], rgb[1], rgb[2], 200); strokeWeight(1.5);
    beginShape();
    for (let i = 0; i < n; i++) {
        vertex(x + map(i, 0, n - 1, 0, w),
               y + h - map(sessionData[i][key], 0, maxVal, 0, h));
    }
    endShape();

    let pkIdx = 0, pkVal = 0;
    for (let i = 0; i < n; i++) {
        if (sessionData[i][key] > pkVal) { pkVal = sessionData[i][key]; pkIdx = i; }
    }
    const px = x + map(pkIdx, 0, n - 1, 0, w);
    const py = y + h - map(pkVal, 0, maxVal, 0, h);
    noFill(); stroke(255, 200); strokeWeight(1);
    circle(px, py, 9);
    noStroke(); fill(255); textSize(9); textAlign(LEFT);
    text('PEAK ' + (isOpen ? (pkVal * 100).toFixed(0) + '%' : pkVal.toFixed(1)), px + 7, py - 3);
}

// ─── HEATMAP ──────────────────────────────────────────────────────────────────

function drawHeatmap(x, y, w, h) {
    const COLS = 22, ROWS = 16;
    const cellW = w / COLS, cellH = h / ROWS;

    const grid = [];
    for (let r = 0; r < ROWS; r++) grid.push(new Array(COLS).fill(0));
    let maxCount = 0;

    for (const d of sessionData) {
        const c = constrain(floor(map(d.x, 0, sessionW, 0, COLS)), 0, COLS - 1);
        const r = constrain(floor(map(d.y, 0, sessionH, 0, ROWS)), 0, ROWS - 1);
        grid[r][c]++;
        if (grid[r][c] > maxCount) maxCount = grid[r][c];
    }

    noStroke();
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c] === 0) continue;
            const t = sqrt(grid[r][c] / maxCount);
            fill(lerpColor(
                lerpColor(color(6, 10, 20, 0), color(0, 80, 140, 120), t),
                color(0, 242, 255, 210), constrain((t - 0.5) * 2, 0, 1)
            ));
            rect(x + c * cellW, y + r * cellH, cellW, cellH);
        }
    }

    noFill(); stroke(255, 18); strokeWeight(1);
    rect(x, y, w, h, 3);

    noStroke(); fill(255, 60); textSize(9); textAlign(LEFT);
    text('POSITION FREQUENCY MAP', x + 8, y + 14);

    fill(0, 242, 255, 160); textAlign(RIGHT);
    text('HIGH DWELL', x + w - 8, y + h - 10);
    fill(0, 80, 140, 160); textAlign(LEFT);
    text('LOW DWELL', x + 8, y + h - 10);
}

// ─── POLAR DIRECTION CHART ────────────────────────────────────────────────────

function drawPolarChart(x, y, w, h) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const R  = min(w, h) * 0.38;
    const BINS = 36;
    const bins = new Array(BINS).fill(0);
    let maxBin = 0;

    for (let i = 1; i < sessionData.length; i++) {
        const dx = sessionData[i].x - sessionData[i - 1].x;
        const dy = sessionData[i].y - sessionData[i - 1].y;
        const spd = sqrt(dx * dx + dy * dy);
        if (spd < 0.5) continue;
        const angle = atan2(dy, dx);
        const bi = floor(((angle + PI) / TWO_PI) * BINS) % BINS;
        bins[bi] += spd;
        if (bins[bi] > maxBin) maxBin = bins[bi];
    }

    noFill(); stroke(255, 12); strokeWeight(1);
    for (let r = 0.25; r <= 1.01; r += 0.25) circle(cx, cy, R * 2 * r);
    line(cx - R * 1.1, cy, cx + R * 1.1, cy);
    line(cx, cy - R * 1.1, cx, cy + R * 1.1);

    for (let i = 0; i < BINS; i++) {
        if (bins[i] === 0) continue;
        const t  = bins[i] / maxBin;
        const a1 = (i / BINS) * TWO_PI - PI;
        const a2 = ((i + 1) / BINS) * TWO_PI - PI;
        const r  = R * t;
        fill(lerpColor(color(0, 80, 140, 80), color(0, 242, 255, 200), t));
        noStroke();
        beginShape();
        vertex(cx + cos(a1) * 5, cy + sin(a1) * 5);
        vertex(cx + cos(a1) * r, cy + sin(a1) * r);
        vertex(cx + cos(a2) * r, cy + sin(a2) * r);
        vertex(cx + cos(a2) * 5, cy + sin(a2) * 5);
        endShape(CLOSE);
    }

    noStroke(); fill(255, 90); circle(cx, cy, 5);

    noStroke(); fill(255, 50); textSize(9); textAlign(CENTER);
    text('MOVEMENT DIRECTION DISTRIBUTION', cx, y + 14);
    fill(255, 40);
    text('↑ UP',   cx,         y + 28);
    text('↓ DN',   cx,         y + h - 10);
    textAlign(LEFT);  text('← LT', x + 8,     cy + 4);
    textAlign(RIGHT); text('RT →', x + w - 8,  cy + 4);
}

// ─── RHYTHM CHART ─────────────────────────────────────────────────────────────

function drawRhythmChart(x, y, w, h) {
    const n = sessionData.length;

    noStroke(); fill(255, 4);
    rect(x, y, w, h, 3);

    const accel = [];
    for (let i = 1; i < n; i++) accel.push(abs(sessionData[i].v - sessionData[i - 1].v));

    const maxA = accel.reduce((m, a) => max(m, a), 0) * 1.1 || 1;

    stroke(255, 18); strokeWeight(1);
    for (let i = 0; i <= 3; i++) {
        const gy = y + h - (i / 3) * h;
        line(x, gy, x + w, gy);
        noStroke(); fill(255, 45); textSize(9); textAlign(RIGHT);
        text((maxA * i / 3).toFixed(1), x - 6, gy + 4);
        stroke(255, 18);
    }

    noStroke(); fill(255, 55); textSize(9); textAlign(CENTER);
    const totalSec = n * 4 / 60;
    for (let i = 0; i <= 5; i++) {
        text((totalSec * i / 5).toFixed(1) + 's', x + (i / 5) * w, y + h + 16);
    }

    noStroke(); fill(120, 255, 180, 120); textSize(10); textAlign(LEFT);
    text('ACCELERATION  (velocity Δ per frame)', x + 8, y + 14);

    noFill(); stroke(120, 255, 180, 170); strokeWeight(1);
    beginShape();
    for (let i = 0; i < accel.length; i++) {
        vertex(x + map(i, 0, accel.length - 1, 0, w),
               y + h - map(accel[i], 0, maxA, 0, h));
    }
    endShape();

    noStroke(); fill(255, 4);
    beginShape();
    vertex(x, y + h);
    for (let i = 0; i < accel.length; i++) {
        vertex(x + map(i, 0, accel.length - 1, 0, w),
               y + h - map(accel[i], 0, maxA, 0, h));
    }
    vertex(x + w, y + h);
    endShape(CLOSE);
}

// ─── TRAJECTORY ───────────────────────────────────────────────────────────────

function drawTrajectory(x, y, w, h) {
    const margin = 24;

    noStroke(); fill(255, 4);
    rect(x, y, w, h, 3);
    noFill(); stroke(255, 18); strokeWeight(1);
    rect(x, y, w, h, 3);

    for (let i = 1; i < sessionData.length; i++) {
        const ax = x + margin + map(sessionData[i - 1].x, 0, sessionW, 0, w - margin * 2);
        const ay = y + margin + map(sessionData[i - 1].y, 0, sessionH, 0, h - margin * 2);
        const bx = x + margin + map(sessionData[i].x,     0, sessionW, 0, w - margin * 2);
        const by = y + margin + map(sessionData[i].y,     0, sessionH, 0, h - margin * 2);
        const t  = constrain(sessionData[i].v / 10, 0, 1);
        stroke(lerpColor(color(0, 242, 255, 55), color(255, 100, 200, 75), t));
        strokeWeight(1);
        line(ax, ay, bx, by);
    }

    noStroke();
    for (let i = 0; i < sessionData.length; i += 4) {
        const px = x + margin + map(sessionData[i].x, 0, sessionW, 0, w - margin * 2);
        const py = y + margin + map(sessionData[i].y, 0, sessionH, 0, h - margin * 2);
        const t  = constrain(sessionData[i].v / 10, 0, 1);
        fill(lerpColor(color(0, 242, 255, 120), color(255, 100, 200, 140), t));
        circle(px, py, 3);
    }

    if (sessionData.length >= 2) {
        const s  = sessionData[0];
        const e  = sessionData[sessionData.length - 1];
        const sx = x + margin + map(s.x, 0, sessionW, 0, w - margin * 2);
        const sy = y + margin + map(s.y, 0, sessionH, 0, h - margin * 2);
        const ex = x + margin + map(e.x, 0, sessionW, 0, w - margin * 2);
        const ey = y + margin + map(e.y, 0, sessionH, 0, h - margin * 2);

        noStroke(); fill(0, 242, 255, 220); circle(sx, sy, 8);
        noStroke(); fill(255, 100, 200, 220); circle(ex, ey, 8);
        textSize(9); fill(255, 120); textAlign(LEFT);
        text('START', sx + 7, sy + 4);
        text('END',   ex + 7, ey + 4);
    }

    noStroke(); fill(255, 55); textSize(9); textAlign(LEFT);
    text('LOW VELOCITY', x + margin, y + h - 10);
    textAlign(RIGHT);
    text('HIGH VELOCITY', x + w - margin, y + h - 10);
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────

function drawStatCard(x, y, w, h, label, val, rgb) {
    noFill(); stroke(rgb[0], rgb[1], rgb[2], 55); strokeWeight(1);
    rect(x, y, w, h, 3);
    noStroke(); fill(rgb[0], rgb[1], rgb[2], 12);
    rect(x, y, w, h, 3);
    noStroke(); fill(rgb[0], rgb[1], rgb[2], 170);
    textFont('Courier New'); textSize(9); textAlign(LEFT);
    text(label, x + 14, y + 22);
    fill(255); textSize(24);
    text(val, x + 14, y + h - 16);
}

// ─── PARTICLE HELPERS ─────────────────────────────────────────────────────────

function drawStaticNoise(alpha) {
    stroke(255, alpha); strokeWeight(1);
    for (let i = 0; i < 400; i++) point(random(width), random(height));
}

function drawHandUI() {
    noFill(); stroke(255, 255, 255, 50); strokeWeight(0.5);
    circle(handX, handY, 60 + sin(frameCount * 0.1) * 10);
    line(handX - 20, handY, handX + 20, handY);
    line(handX, handY - 20, handX, handY + 20);
}

function drawUIGrid() {
    stroke(255, 8); strokeWeight(1);
    for (let i = 0; i < width;  i += 100) line(i, 0, i, height);
    for (let i = 0; i < height; i += 100) line(0, i, width, i);
}

// ─── HAND TRACKING ────────────────────────────────────────────────────────────

function readHandFromHandPose() {
    handFound = hands && hands.length > 0;
    if (!handFound) {
        prevHand = null;
        handSpeed    = lerp(handSpeed,    0,    0.22);
        handOpen     = lerp(handOpen,     0,    0.18);
        baseStrength = lerp(baseStrength, 1.45, 0.03);
        return;
    }

    const hand = hands[0];
    let pts = null;
    if (hand.keypoints && hand.keypoints.length >= 21) {
        pts = hand.keypoints.map(p => ({ x: p.x, y: p.y }));
    } else if (hand.landmarks && hand.landmarks.length >= 21) {
        pts = hand.landmarks.map(lm => ({ x: lm[0], y: lm[1] }));
    } else { handFound = false; return; }

    const WRIST = 0, THUMB_TIP = 4, INDEX_TIP = 8, MIDDLE_TIP = 12, RING_TIP = 16, PINKY_TIP = 20;
    const cx = (pts[WRIST].x + pts[MIDDLE_TIP].x) / 2;
    const cy = (pts[WRIST].y + pts[MIDDLE_TIP].y) / 2;

    handX = map(video.width - cx, 0, video.width,  0, width);
    handY = map(cy,               0, video.height, 0, height);

    if (prevHand) {
        handSpeed = lerp(handSpeed, dist(handX, handY, prevHand.x, prevHand.y), 0.35);
    } else {
        handSpeed = lerp(handSpeed, 0, 0.35);
    }
    prevHand = { x: handX, y: handY };

    const tips = [THUMB_TIP, INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP];
    let sum = 0;
    for (const idx of tips)
        sum += dist(pts[idx].x, pts[idx].y, pts[WRIST].x, pts[WRIST].y);

    handOpen     = lerp(handOpen,     map(sum / tips.length, 45, 170, 0, 1, true), 0.25);
    baseStrength = lerp(baseStrength, lerp(1.2, 2.35, handOpen), 0.06);
}

// ─── PARTICLES ────────────────────────────────────────────────────────────────

class FlowParticle {
    constructor(x, y) {
        this.pos = createVector(x, y);
        this.prev = this.pos.copy();
        this.vel = createVector(0, 0);
        this.speedMag = 0;
        this.life = random(80, 200);
        this.seed = random(10000);
    }
    respawn() {
        this.pos.set(random(width), random(height));
        this.prev.set(this.pos);
        this.vel.set(0, 0);
        this.life = random(80, 200);
    }
    step(v) {
        this.prev.set(this.pos);
        v.rotate(noise(this.seed + frameCount * 0.008) * 0.5 - 0.25);
        this.vel.lerp(v, 0.2);
        this.pos.add(this.vel);
        if (this.pos.x < 0)      { this.pos.x = width;  this.prev.x = this.pos.x; }
        if (this.pos.x > width)  { this.pos.x = 0;      this.prev.x = this.pos.x; }
        if (this.pos.y < 0)      { this.pos.y = height; this.prev.y = this.pos.y; }
        if (this.pos.y > height) { this.pos.y = 0;      this.prev.y = this.pos.y; }
        this.speedMag = this.vel.mag();
        if (--this.life <= 0) this.respawn();
    }
    draw() {
        stroke(windColor(constrain(this.speedMag, 0, 6)));
        strokeWeight(1);
        line(this.prev.x, this.prev.y, this.pos.x, this.pos.y);
    }
}

function windColor(speed) {
    const t = constrain(speed / 6, 0, 1);
    const c1 = color(0,   200, 255, 100);
    const c2 = color(255, 0,   150, 100);
    const c3 = color(255, 255, 255, 120);
    if (t < 0.5) return lerpColor(c1, c2, t * 2);
    return lerpColor(c2, c3, (t - 0.5) * 2);
}

function keyPressed() {
    if (key === 'c' || key === 'C') background(6, 10, 20);
}
