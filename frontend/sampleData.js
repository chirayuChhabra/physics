/**
 * Sample simulation data — a 3-body figure-8 style orbit.
 *
 * Format:
 *   frames[i] = [ x0,y0,z0, vx0,vy0,vz0,  x1,y1,z1, vx1,vy1,vz1, … ]
 *
 * Every 6 consecutive values describe one body:
 *   (x, y, z, ẋ, ẏ, ż)
 */

function generateSampleFrames() {
  const totalFrames = 300;
  const dt = 0.04;
  const frames = [];

  // 3 bodies with initial conditions (loosely inspired by a figure-8 orbit)
  const bodies = [
    { x: 4, y: 0, z: 0, vx: 0, vy: 1.2, vz: 0.3 },
    { x: -2, y: 3.5, z: 1, vx: -0.6, vy: -0.8, vz: 0.2 },
    { x: -2, y: -3.5, z: -1, vx: 0.6, vy: -0.4, vz: -0.5 },
  ];

  const G = 2.0;
  const masses = [1, 1, 1];

  for (let f = 0; f < totalFrames; f++) {
    // Record current state
    const stateVec = [];
    for (const b of bodies) {
      stateVec.push(b.x, b.y, b.z, b.vx, b.vy, b.vz);
    }
    frames.push(stateVec);

    // Compute accelerations (gravitational N-body)
    const accels = bodies.map(() => ({ ax: 0, ay: 0, az: 0 }));
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const dx = bodies[j].x - bodies[i].x;
        const dy = bodies[j].y - bodies[i].y;
        const dz = bodies[j].z - bodies[i].z;
        const distSq = dx * dx + dy * dy + dz * dz + 0.1; // softening
        const dist = Math.sqrt(distSq);
        const force = G / distSq;

        accels[i].ax += force * dx / dist * masses[j];
        accels[i].ay += force * dy / dist * masses[j];
        accels[i].az += force * dz / dist * masses[j];
        accels[j].ax -= force * dx / dist * masses[i];
        accels[j].ay -= force * dy / dist * masses[i];
        accels[j].az -= force * dz / dist * masses[i];
      }
    }

    // Integrate (symplectic Euler)
    for (let i = 0; i < bodies.length; i++) {
      bodies[i].vx += accels[i].ax * dt;
      bodies[i].vy += accels[i].ay * dt;
      bodies[i].vz += accels[i].az * dt;
      bodies[i].x += bodies[i].vx * dt;
      bodies[i].y += bodies[i].vy * dt;
      bodies[i].z += bodies[i].vz * dt;
    }
  }

  return frames;
}

export const sampleFrames = generateSampleFrames();
