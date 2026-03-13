import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
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
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02040a); // Darker space background
scene.fog = new THREE.FogExp2(0x02040a, 0.005);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 15, 20);

const orbitControls = new OrbitControls(camera, canvas);
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.05;
orbitControls.minDistance = 2;
orbitControls.maxDistance = 300;
orbitControls.autoRotate = true; // Slowly rotate the camera
orbitControls.autoRotateSpeed = 0.2;

/* ─── Post-processing (Bloom) ─── */
const renderScene = new RenderPass(scene, camera);
// Increase the threshold significantly so only true emissive objects (like the Sun) bloom.
// This prevents brightly colored ring particles from glowing blindingly white.
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0.95; // Only bloom very bright objects
bloomPass.strength = 1.8;  // Keep the strength high so actual suns still look intense
bloomPass.radius = 0.8;

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

/* ─── Lighting ─── */
scene.add(new THREE.AmbientLight(0xffffff, 0.2)); // Very faint ambient light everywhere
const pointLight = new THREE.PointLight(0xffffff, 2.5, 300); // Central star light
pointLight.position.set(0, 0, 0); // Put light at the center of the system
scene.add(pointLight);

// Add a strong directional light to illuminate non-sun central bodies (like Saturn)
const mainDirLight = new THREE.DirectionalLight(0xfffaed, 2.5);
mainDirLight.position.set(100, 50, 100);
scene.add(mainDirLight);

// Add a subtle directional light from the opposite side to simulate distant star light and fill shadows
const fillLight = new THREE.DirectionalLight(0x404060, 0.8);
fillLight.position.set(-100, -30, -100);
scene.add(fillLight);

/* ─── Grid + Axes ─── */
const grid = new THREE.GridHelper(40, 40, 0x1a2040, 0x111830);
grid.material.opacity = 0.4;
grid.material.transparent = true;
scene.add(grid);

const axes = new THREE.AxesHelper(4);
axes.material.opacity = 0.4;
axes.material.transparent = true;
scene.add(axes);

/* ─── High Quality Starfield ─── */
{
  const starGeo = new THREE.BufferGeometry();
  const numStars = 5000;
  const positions = new Float32Array(numStars * 3);
  const colors = new Float32Array(numStars * 3);

  const color1 = new THREE.Color(0xffffff);
  const color2 = new THREE.Color(0xa78bfa); // faint purple
  const color3 = new THREE.Color(0x38bdf8); // faint blue

  for (let i = 0; i < numStars; i++) {
    // Generate spherical coordinates for deep space feel
    const r = 100 + Math.random() * 400; // Far away
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);

    positions[i*3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i*3+2] = r * Math.cos(phi);

    // Mix colors slightly
    const mix = Math.random();
    let c = color1;
    if (mix > 0.8) c = color2;
    else if (mix > 0.6) c = color3;

    colors[i*3] = c.r * (0.5 + Math.random() * 0.5);
    colors[i*3+1] = c.g * (0.5 + Math.random() * 0.5);
    colors[i*3+2] = c.b * (0.5 + Math.random() * 0.5);
  }

  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // Custom shader for twinkle effect if wanted, or just standard points
  const starMat = new THREE.PointsMaterial({
    size: 0.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending
  });

  scene.add(new THREE.Points(starGeo, starMat));
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
    // Using high detail spheres
    const geo = new THREE.SphereGeometry(radius, 64, 64);

    // Add noise bump mapping or standard clean look based on whether it's sun or planet
    const isSun = name ? (name.toLowerCase().includes('sun') || name.toLowerCase().includes('star')) : false;

    const isSaturn = name && name.toLowerCase().includes('saturn');

    const mat = new THREE.MeshPhysicalMaterial({
      color,
      emissive: isSun ? color : new THREE.Color(0x000000),
      emissiveIntensity: isSun ? 2.5 : 0.0,
      metalness: isSun ? 0.0 : (isSaturn ? 0.1 : 0.2),
      roughness: isSun ? 1.0 : (isSaturn ? 0.9 : 0.6),
      clearcoat: isSun ? 0.0 : (isSaturn ? 0.1 : 0.3),
      clearcoatRoughness: 0.4,
    });

    if (isSaturn) {
      mat.onBeforeCompile = (shader) => {
        // Pass position to fragment shader
        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          `#include <common>
           varying vec3 vWorldPosition;
          `
        );
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          `
        );

        // Modify fragment shader
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>',
          `#include <common>
           varying vec3 vWorldPosition;

           // Simple 3D noise function
           float hash(vec3 p) {
             p  = fract( p*0.3183099+.1 );
             p *= 17.0;
             return fract( p.x*p.y*p.z*(p.x+p.y+p.z) );
           }

           float noise(vec3 x) {
             vec3 p = floor(x);
             vec3 f = fract(x);
             f = f*f*(3.0-2.0*f);

             return mix(mix(mix(hash(p+vec3(0,0,0)), hash(p+vec3(1,0,0)),f.x),
                            mix(hash(p+vec3(0,1,0)), hash(p+vec3(1,1,0)),f.x),f.y),
                        mix(mix(hash(p+vec3(0,0,1)), hash(p+vec3(1,0,1)),f.x),
                            mix(hash(p+vec3(0,1,1)), hash(p+vec3(1,1,1)),f.x),f.y),f.z);
           }

           // Hexagon distance function
           float sdHexagon( vec2 p, float r ) {
               const vec3 k = vec3(-0.866025404,0.5,0.577350269);
               p = abs(p);
               p -= 2.0*min(dot(k.xy,p),0.0)*k.xy;
               p -= vec2(clamp(p.x, -k.z*r, k.z*r), r);
               return length(p)*sign(p.y);
           }
          `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          `#include <color_fragment>

           // Calculate local position by normalizing vWorldPosition (assuming planet is at origin roughly)
           vec3 localPos = normalize(vWorldPosition);

           // Latitudinal gas bands
           float lat = localPos.y;

           // Perturb latitude slightly with noise for stormy look
           float n = noise(localPos * 10.0) * 0.05;
           float band = sin((lat + n) * 40.0) * 0.5 + 0.5;

           // Subtle color shift based on bands
           vec3 bandColor1 = diffuseColor.rgb * 1.1; // Lighter
           vec3 bandColor2 = diffuseColor.rgb * 0.8; // Darker
           vec3 finalColor = mix(bandColor2, bandColor1, band);

           // Add the great hexagon at the north pole (and south pole for symmetry)
           if (abs(lat) > 0.8) {
               // Map polar coordinates onto a 2D plane
               vec2 polarPos = vec2(localPos.x, localPos.z);

               // Hexagon pattern
               float hexDist = sdHexagon(polarPos * 10.0, 3.0);
               float hexPattern = smoothstep(0.1, 0.2, abs(sin(hexDist * 2.0)));

               // Swirling storms inside the hexagon
               float stormNoise = noise(localPos * 20.0);

               vec3 hexColor = mix(finalColor * 0.7, finalColor * 1.2, hexPattern);
               finalColor = mix(finalColor, hexColor, smoothstep(0.8, 0.9, abs(lat)) * stormNoise);
           }

           diffuseColor.rgb = finalColor;
          `
        );
      };
    }

    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    spheres.push(mesh);

    // ─── Atmosphere / Glow ───
    if (isSun) {
      // Stronger glow for the sun
      const glowGeo = new THREE.SphereGeometry(radius * 1.4, 32, 32);
      const glowMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide
      });
      mesh.add(new THREE.Mesh(glowGeo, glowMat));
    } else if (name) {
      // Atmosphere ring for named planets only (don't add to tiny unnamed particles)
      const ringGeo = new THREE.RingGeometry(radius * 1.05, radius * 1.25, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      // Ensure the ring always faces the camera in the render loop
      ringMesh.userData.isAtmosphereRing = true;
      mesh.add(ringMesh);
    }

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
    // Using a better looking material for the trail
    const trailMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      blending: THREE.NormalBlending, // Avoid AdditiveBlending which stacks and blows out to white
      depthWrite: false, // Ensures lines render over the background cleanly
    });
    const trailLine = new THREE.Line(new THREE.BufferGeometry(), trailMat);
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

  // Rotate atmosphere rings to face camera
  spheres.forEach(s => {
    s.children.forEach(child => {
      if (child.userData.isAtmosphereRing) {
        child.lookAt(camera.position);
      }
    });
  });

  // Slowly rotate sun's geometry itself? Or keep simple.

  orbitControls.update();
  composer.render(); // Use effect composer instead of plain renderer
}

/* ─── Resize ─── */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
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
