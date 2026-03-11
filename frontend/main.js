import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { sampleFrames } from './sampleData.js';

const TARGET_POS_RANGE = 8;   // normalise positions into ±8 scene units
const TARGET_VEL_RANGE = 2;   // normalise velocity arrows into ±2 scene units

/**
 * Normalize frames using radial square-root scaling.
 *
 * Why sqrt? Linear scaling crammed inner planets together when outer planets
 * are 30× farther. sqrt(r) compresses large distances and expands small ones:
 *   Mercury 0.39 AU → 0.62 → ~1.4 units
 *   Earth   1.0 AU  → 1.0  → ~2.3 units
 *   Neptune 30  AU  → 5.48 → ~8.0 units
 * All planets get visible breathing room without any artificial separation hack.
 */
function normalizeFrames(raw) {
  if (!raw.length) return raw;

  // Step 1: find max sqrt(radius) and max velocity across all frames
  let maxSqrtR = 0;
  let maxVel = 0;
  for (const sv of raw) {
    for (let i = 0; i < sv.length; i += 6) {
      const r = Math.sqrt(sv[i]*sv[i] + sv[i+1]*sv[i+1] + sv[i+2]*sv[i+2]);
      maxSqrtR = Math.max(maxSqrtR, Math.sqrt(r));
      maxVel = Math.max(maxVel, Math.abs(sv[i+3]), Math.abs(sv[i+4]), Math.abs(sv[i+5]));
    }
  }
  const posScale = maxSqrtR > 0 ? TARGET_POS_RANGE / maxSqrtR : 1;
  const velScale = maxVel > 0 ? TARGET_VEL_RANGE / maxVel : 1;
  console.log(`Auto-scale — maxSqrtR: ${maxSqrtR.toExponential(2)}, posScale: ${posScale.toExponential(2)}`);

  // Step 2: apply sqrt-radial scaling (preserves direction, spreads orbits)
  return raw.map(sv => {
    const out = new Array(sv.length);
    for (let i = 0; i < sv.length; i += 6) {
      const x = sv[i], y = sv[i+1], z = sv[i+2];
      const r = Math.sqrt(x*x + y*y + z*z);

      if (r > 1e-10) {
        const sqrtR = Math.sqrt(r);
        const factor = (sqrtR * posScale) / r; // maps r → sqrt(r) * posScale
        out[i]   = x * factor;
        out[i+1] = y * factor;
        out[i+2] = z * factor;
      } else {
        out[i] = 0; out[i+1] = 0; out[i+2] = 0;
      }

      out[i+3] = sv[i+3] * velScale;
      out[i+4] = sv[i+4] * velScale;
      out[i+5] = sv[i+5] * velScale;
    }
    return out;
  });
}

/* ════════════════════════════════════════════════════════════
   Default Config (used when no simulationConfig.json exists)
   ════════════════════════════════════════════════════════════ */
const DEFAULT_COLORS = [
  '#6c8cff', '#f472b6', '#34d399', '#fbbf24', '#a78bfa',
  '#38bdf8', '#fb7185', '#4ade80', '#e879f9', '#22d3ee',
];
const DEFAULT_RADIUS = 0.25;

let bodyConfig = null; // will be set from simulationConfig.json

/* ════════════════════════════════════════════════════════════
   Scene bootstrap
   ════════════════════════════════════════════════════════════ */
const canvas = document.getElementById('scene-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e17);
scene.fog = new THREE.FogExp2(0x0a0e17, 0.008);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 14, 16);

const orbitControls = new OrbitControls(camera, canvas);
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.08;
orbitControls.minDistance = 3;
orbitControls.maxDistance = 100;

/* ─── Lighting ─── */
scene.add(new THREE.AmbientLight(0x404060, 1.2));
const pointLight = new THREE.PointLight(0xffffff, 1.5, 100);
pointLight.position.set(10, 15, 10);
scene.add(pointLight);
scene.add(new THREE.PointLight(0x6c8cff, 0.6, 80).translateX(-10).translateY(-5));

/* ─── Grid + Axes ─── */
const grid = new THREE.GridHelper(40, 40, 0x1a2040, 0x111830);
grid.material.opacity = 0.4;
grid.material.transparent = true;
scene.add(grid);

const axes = new THREE.AxesHelper(4);
axes.material.opacity = 0.4;
axes.material.transparent = true;
scene.add(axes);

/* ─── Starfield ─── */
{
  const starGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(1500 * 3);
  for (let i = 0; i < positions.length; i++) positions[i] = (Math.random() - 0.5) * 200;
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.5 })));
}

/* ════════════════════════════════════════════════════════════
   Body helpers
   ════════════════════════════════════════════════════════════ */
function getBodyColor(i) {
  if (bodyConfig && bodyConfig[i]) return new THREE.Color(bodyConfig[i].color);
  return new THREE.Color(DEFAULT_COLORS[i % DEFAULT_COLORS.length]);
}

function getBodyRadius(i) {
  if (bodyConfig && bodyConfig[i]) return bodyConfig[i].radius;
  return DEFAULT_RADIUS;
}

function getBodyName(i) {
  if (bodyConfig && bodyConfig[i]) {
    // Return explicit empty string or the provided name. Fallback only if undefined.
    return bodyConfig[i].name !== undefined ? bodyConfig[i].name : `Body ${i}`;
  }
  return `Body ${i}`;
}

/* ─── Text labels (sprite-based) ─── */
function makeLabel(text, color) {
  const canvas2d = document.createElement('canvas');
  canvas2d.width = 256;
  canvas2d.height = 64;
  const ctx = canvas2d.getContext('2d');
  ctx.font = 'bold 28px Inter, system-ui, sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);
  const texture = new THREE.CanvasTexture(canvas2d);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.85 });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.0, 0.5, 1);
  return sprite;
}

/* ════════════════════════════════════════════════════════════
   Load simulation frames
   ════════════════════════════════════════════════════════════ */
let frames = [];
let numBodies = 0;
let spheres = [];
let arrows = [];
let labels = [];
let trails = [];
let trailLines = [];
const ARROW_SCALE = 0.5;
const TRAIL_LENGTH = 250;

function loadFrames(data) {
  frames = data;
  if (!frames.length) return;
  numBodies = Math.floor(frames[0].length / 6);

  // Clean previous objects
  spheres.forEach(s => scene.remove(s));
  arrows.forEach(a => scene.remove(a));
  labels.forEach(l => scene.remove(l));
  trailLines.forEach(t => scene.remove(t));
  spheres = []; arrows = []; labels = []; trails = []; trailLines = [];

  for (let i = 0; i < numBodies; i++) {
    const color = getBodyColor(i);
    const radius = getBodyRadius(i);
    const name = getBodyName(i);

    // ─── Sphere ───
    const geo = new THREE.SphereGeometry(radius, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.3,
      metalness: 0.2, roughness: 0.5,
    });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    spheres.push(mesh);

    // ─── Glow ring ───
    const ringGeo = new THREE.RingGeometry(radius * 1.2, radius * 1.6, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.1, side: THREE.DoubleSide,
    });
    mesh.add(new THREE.Mesh(ringGeo, ringMat));

    // ─── Name label ───
    if (name) {
      const label = makeLabel(name, '#' + color.getHexString());
      scene.add(label);
      labels.push(label);
    } else {
      labels.push(null);
    }

    // ─── Arrow ───
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1,
      color.getHex(), 0.15, 0.08,
    );
    scene.add(arrow);
    arrows.push(arrow);

    // ─── Trail ───
    trails.push([]);
    const trailLine = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 }),
    );
    scene.add(trailLine);
    trailLines.push(trailLine);
  }

  // Update UI
  document.getElementById('body-count').textContent = numBodies;
  document.getElementById('frame-total').textContent = frames.length;
  document.getElementById('frame-slider').max = frames.length - 1;

  // Build legend
  const legendContainer = document.getElementById('legend-items');
  legendContainer.innerHTML = '';
  for (let i = 0; i < numBodies; i++) {
    const hex = getBodyColor(i).getHexString();
    const div = document.createElement('div');
    div.className = 'legend-item';
    div.innerHTML = `<span class="legend-dot" style="background:#${hex};color:#${hex};"></span> ${getBodyName(i)}`;
    legendContainer.appendChild(div);
  }

  setFrame(0);
}

/* ════════════════════════════════════════════════════════════
   Frame rendering
   ════════════════════════════════════════════════════════════ */
let currentFrame = 0;

function setFrame(idx) {
  currentFrame = Math.max(0, Math.min(idx, frames.length - 1));
  const sv = frames[currentFrame];

  for (let i = 0; i < numBodies; i++) {
    const off = i * 6;
    const x = sv[off], y = sv[off + 1], z = sv[off + 2];
    const vx = sv[off + 3], vy = sv[off + 4], vz = sv[off + 5];
    const radius = getBodyRadius(i);

    spheres[i].position.set(x, y, z);

    // Label above sphere
    if (labels[i]) {
      labels[i].position.set(x, y + radius + 0.5, z);
    }

    // Velocity arrow
    const vel = new THREE.Vector3(vx, vy, vz);
    const speed = vel.length();
    if (speed > 1e-6) {
      arrows[i].position.set(x, y, z);
      arrows[i].setDirection(vel.clone().normalize());
      arrows[i].setLength(speed * ARROW_SCALE, speed * ARROW_SCALE * 0.2, speed * ARROW_SCALE * 0.1);
      arrows[i].visible = true;
    } else {
      arrows[i].visible = false;
    }

    // Trail
    trails[i].push(new THREE.Vector3(x, y, z));
    if (trails[i].length > TRAIL_LENGTH) trails[i].shift();
    const tGeo = new THREE.BufferGeometry().setFromPoints(trails[i]);
    trailLines[i].geometry.dispose();
    trailLines[i].geometry = tGeo;
  }

  document.getElementById('frame-display').textContent = `${currentFrame} / ${frames.length - 1}`;
  document.getElementById('frame-slider').value = currentFrame;
}

/* ════════════════════════════════════════════════════════════
   Playback controls
   ════════════════════════════════════════════════════════════ */
let playing = true;
let speed = 10;
let accumulator = 0;
let lastTime = 0;

const btnPlay = document.getElementById('btn-play');
const btnReset = document.getElementById('btn-reset');
const frameSlider = document.getElementById('frame-slider');
const speedSlider = document.getElementById('speed-slider');

btnPlay.addEventListener('click', () => {
  playing = !playing;
  btnPlay.textContent = playing ? '⏸' : '▶';
});

btnReset.addEventListener('click', () => {
  trails.forEach(t => t.length = 0);
  setFrame(0);
  playing = true;
  btnPlay.textContent = '⏸';
});

frameSlider.addEventListener('input', () => {
  trails.forEach(t => t.length = 0);
  setFrame(parseInt(frameSlider.value, 10));
});

speedSlider.addEventListener('input', () => {
  speed = parseInt(speedSlider.value, 10);
});

/* ════════════════════════════════════════════════════════════
   Render loop
   ════════════════════════════════════════════════════════════ */
function animate(time) {
  requestAnimationFrame(animate);

  let dt = lastTime ? (time - lastTime) / 1000 : 0;
  lastTime = time;
  if (dt > 0.1) dt = 0.1;

  if (playing && frames.length) {
    accumulator += dt;
    const frameInterval = 1 / speed;
    let stepped = 0;
    while (accumulator >= frameInterval && stepped < 3) {
      accumulator -= frameInterval;
      stepped++;
      if (currentFrame < frames.length - 1) {
        setFrame(currentFrame + 1);
      } else {
        playing = false;
        btnPlay.textContent = '▶';
        accumulator = 0;
        break;
      }
    }
    if (accumulator > frameInterval * 3) accumulator = 0;
  }

  // Glow rings face camera
  spheres.forEach(s => { if (s.children[0]) s.children[0].lookAt(camera.position); });
  // Labels face camera (sprites do this automatically)

  orbitControls.update();
  renderer.render(scene, camera);
}

/* ─── Resize ─── */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ─── Boot ─── */
async function boot() {
  // 1. Try to load body config
  try {
    const cfgRes = await fetch('./simulationConfig.json');
    if (cfgRes.ok) {
      const cfg = await cfgRes.json();
      if (cfg.bodies) {
        bodyConfig = cfg.bodies;
        console.log(`Loaded body config for ${bodyConfig.length} bodies`);
      }
    }
  } catch (e) { /* no config, use defaults */ }

  // 2. Load simulation data
  let data = sampleFrames;
  try {
    const res = await fetch('./simulationData.json');
    if (res.ok) {
      const raw = await res.json();
      console.log(`Loaded simulationData.json — ${raw.length} frames`);
      data = normalizeFrames(raw);
    }
  } catch (e) {
    console.warn('Could not load simulationData.json, using sample data:', e);
  }

  loadFrames(data);
  btnPlay.textContent = '⏸';
  lastTime = 0;
  accumulator = 0;
  requestAnimationFrame(animate);
}

boot();

window.loadFrames = (raw) => loadFrames(normalizeFrames(raw));
