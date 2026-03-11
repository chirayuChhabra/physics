import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { sampleFrames } from './sampleData.js';

const TARGET_POS_RANGE = 8;   // normalise positions into ±8 scene units
const TARGET_VEL_RANGE = 2;   // normalise velocity arrows into ±2 scene units
const MIN_BODY_SEPARATION = 1.5; // minimum visual distance between any two bodies

/**
 * Scan all frames, find peak |position| and |velocity| per component,
 * then scale every value so positions fit in TARGET_POS_RANGE and
 * velocities fit in TARGET_VEL_RANGE.
 * Then enforce minimum visual separation between all body pairs.
 */
function normalizeFrames(raw) {
  if (!raw.length) return raw;
  const numBodies = Math.floor(raw[0].length / 6);

  // Step 1: find global maxima
  let maxPos = 0;
  let maxVel = 0;
  for (const sv of raw) {
    for (let i = 0; i < sv.length; i += 6) {
      maxPos = Math.max(maxPos, Math.abs(sv[i]), Math.abs(sv[i+1]), Math.abs(sv[i+2]));
      maxVel = Math.max(maxVel, Math.abs(sv[i+3]), Math.abs(sv[i+4]), Math.abs(sv[i+5]));
    }
  }
  const posScale = maxPos > 0 ? TARGET_POS_RANGE / maxPos : 1;
  const velScale = maxVel > 0 ? TARGET_VEL_RANGE / maxVel : 1;
  console.log(`Auto-scale — maxPos: ${maxPos.toExponential(2)}, maxVel: ${maxVel.toExponential(2)}, posScale: ${posScale.toExponential(2)}, velScale: ${velScale.toExponential(2)}`);

  // Step 2: uniform scale + enforce minimum separation
  return raw.map(sv => {
    const out = new Array(sv.length);
    // Apply uniform scaling
    for (let i = 0; i < sv.length; i += 6) {
      out[i]   = sv[i]   * posScale;
      out[i+1] = sv[i+1] * posScale;
      out[i+2] = sv[i+2] * posScale;
      out[i+3] = sv[i+3] * velScale;
      out[i+4] = sv[i+4] * velScale;
      out[i+5] = sv[i+5] * velScale;
    }

    // Enforce minimum separation between all body pairs
    // Always push the higher-index body (b) away from the lower-index one (a)
    for (let a = 0; a < numBodies; a++) {
      for (let b = a + 1; b < numBodies; b++) {
        const ax = a * 6, bx = b * 6;
        const dx = out[bx] - out[ax];
        const dy = out[bx+1] - out[ax+1];
        const dz = out[bx+2] - out[ax+2];
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (dist < MIN_BODY_SEPARATION && dist > 1e-10) {
          const scale = MIN_BODY_SEPARATION / dist;
          // Push body b away from body a (consistent direction every frame)
          out[bx]   = out[ax] + dx * scale;
          out[bx+1] = out[ax+1] + dy * scale;
          out[bx+2] = out[ax+2] + dz * scale;
        }
      }
    }

    return out;
  });
}

/* ════════════════════════════════════════════════════════════
   Config
   ════════════════════════════════════════════════════════════ */
const BODY_COLORS = [
  0x6c8cff, // blue
  0xf472b6, // pink
  0x34d399, // green
  0xfbbf24, // amber
  0xa78bfa, // violet
  0x38bdf8, // sky
  0xfb7185, // rose
  0x4ade80, // emerald
  0xe879f9, // fuchsia
  0x22d3ee, // cyan
];

// Descending sphere sizes so bodies are visually distinct (Sun > Earth > Moon > …)
const SPHERE_RADII = [0.55, 0.32, 0.18, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25];
const ARROW_SCALE = 0.6;       // visual multiplier for velocity arrows
const TRAIL_LENGTH = 200;      // long trails to show orbital arcs

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
scene.fog = new THREE.FogExp2(0x0a0e17, 0.012);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(12, 8, 12);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 3;
controls.maxDistance = 100;

/* ─── Lighting ─── */
const ambientLight = new THREE.AmbientLight(0x404060, 1.2);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 1.5, 100);
pointLight.position.set(10, 15, 10);
scene.add(pointLight);

const fillLight = new THREE.PointLight(0x6c8cff, 0.6, 80);
fillLight.position.set(-10, -5, -10);
scene.add(fillLight);

/* ─── Grid + Axes ─── */
const grid = new THREE.GridHelper(40, 40, 0x1a2040, 0x111830);
grid.material.opacity = 0.5;
grid.material.transparent = true;
scene.add(grid);

const axes = new THREE.AxesHelper(6);
axes.material.opacity = 0.6;
axes.material.transparent = true;
scene.add(axes);

/* ─── Starfield (subtle background particles) ─── */
{
  const starGeo = new THREE.BufferGeometry();
  const starCount = 1200;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 200;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.6 });
  scene.add(new THREE.Points(starGeo, starMat));
}

/* ════════════════════════════════════════════════════════════
   Load simulation frames
   ════════════════════════════════════════════════════════════ */
let frames = [];
let numBodies = 0;
let spheres = [];
let arrows = [];
let trails = [];       // array of arrays of THREE.Vector3
let trailLines = [];   // THREE.Line per body

/**
 * Main public entry — call with your array-of-arrays.
 * Each inner array is a full system state vector.
 */
function loadFrames(data) {
  frames = data;
  if (!frames.length) return;
  numBodies = Math.floor(frames[0].length / 6);

  // Clean previous objects
  spheres.forEach(s => scene.remove(s));
  arrows.forEach(a => scene.remove(a));
  trailLines.forEach(t => scene.remove(t));
  spheres = [];
  arrows = [];
  trails = [];
  trailLines = [];

  // Create spheres, arrows, trails
  for (let i = 0; i < numBodies; i++) {
    const color = new THREE.Color(BODY_COLORS[i % BODY_COLORS.length]);

    // Sphere (variable size per body)
    const radius = SPHERE_RADII[i % SPHERE_RADII.length];
    const geo = new THREE.SphereGeometry(radius, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.35,
      metalness: 0.3,
      roughness: 0.4,
    });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    spheres.push(mesh);

    // Glow ring (subtle)
    const ringGeo = new THREE.RingGeometry(radius * 1.3, radius * 1.8, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.lookAt(camera.position);
    mesh.add(ring);

    // Arrow
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(),
      1,
      color.getHex(),
      0.2,
      0.12
    );
    scene.add(arrow);
    arrows.push(arrow);

    // Trail
    const trailPositions = [];
    trails.push(trailPositions);
    const trailGeo = new THREE.BufferGeometry();
    const trailMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.4,
      linewidth: 1,
    });
    const trailLine = new THREE.Line(trailGeo, trailMat);
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
    const c = BODY_COLORS[i % BODY_COLORS.length];
    const div = document.createElement('div');
    div.className = 'legend-item';
    div.innerHTML = `<span class="legend-dot" style="background:#${c.toString(16).padStart(6, '0')};color:#${c.toString(16).padStart(6, '0')};"></span> Body ${i}`;
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

    // Position sphere
    spheres[i].position.set(x, y, z);

    // Velocity arrow
    const vel = new THREE.Vector3(vx, vy, vz);
    const speed = vel.length();
    if (speed > 1e-6) {
      arrows[i].position.set(x, y, z);
      arrows[i].setDirection(vel.clone().normalize());
      arrows[i].setLength(speed * ARROW_SCALE, speed * ARROW_SCALE * 0.25, speed * ARROW_SCALE * 0.12);
      arrows[i].visible = true;
    } else {
      arrows[i].visible = false;
    }

    // Trail
    trails[i].push(new THREE.Vector3(x, y, z));
    if (trails[i].length > TRAIL_LENGTH) trails[i].shift();
    const trailGeo = new THREE.BufferGeometry().setFromPoints(trails[i]);
    trailLines[i].geometry.dispose();
    trailLines[i].geometry = trailGeo;
  }

  // UI
  document.getElementById('frame-display').textContent = `${currentFrame} / ${frames.length - 1}`;
  document.getElementById('frame-slider').value = currentFrame;
}

/* ════════════════════════════════════════════════════════════
   Playback controls
   ════════════════════════════════════════════════════════════ */
let playing = true;
let speed = 10;          // frames per second
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
  // Clear trails
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

  // Cap dt so tab-unfocus or hiccups never cause big frame bursts
  if (dt > 0.1) dt = 0.1;

  if (playing && frames.length) {
    accumulator += dt;
    const frameInterval = 1 / speed;
    // Advance at most 3 frames per render tick to prevent visual jumps
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
    // If still overflowing, just discard the excess time
    if (accumulator > frameInterval * 3) {
      accumulator = 0;
    }
  }

  // Make glow rings face camera
  spheres.forEach(s => {
    if (s.children[0]) s.children[0].lookAt(camera.position);
  });

  controls.update();
  renderer.render(scene, camera);
}

/* ─── Resize handling ─── */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ─── Boot ─── */
async function boot() {
  let data = sampleFrames; // fallback
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
  // Reset timing so the async fetch delay doesn't cause a burst of skipped frames
  lastTime = 0;
  accumulator = 0;
  requestAnimationFrame(animate);
}

boot();

// Expose loadFrames globally so users can call it from the console
window.loadFrames = (raw) => loadFrames(normalizeFrames(raw));
