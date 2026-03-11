/**
 * render.ts — One-call visualizer launcher.
 *
 * Usage:
 *   import { render } from "./render";
 *   const states = evolve(space, eqn, T, dt);
 *   render(states, {
 *     bodies: [
 *       { name: "Sun",   color: "#FDB813", radius: 0.7 },
 *       { name: "Earth", color: "#4B7BE5", radius: 0.22 },
 *     ]
 *   });
 *
 * What it does:
 *   1. Writes the state-vector frames to frontend/simulationData.json
 *   2. Writes optional body config to frontend/simulationConfig.json
 *   3. Starts a Bun static file server on port 3000
 *   4. Auto-opens the browser
 */

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = resolve(__dirname, "../../frontend");
const DATA_PATH = resolve(FRONTEND_DIR, "simulationData.json");
const CONFIG_PATH = resolve(FRONTEND_DIR, "simulationConfig.json");
const PORT = 3000;

export interface BodyConfig {
    name: string;
    color: string;   // hex color e.g. "#FDB813"
    radius: number;  // scene-unit sphere radius
}

export interface RenderOptions {
    bodies?: BodyConfig[];
}

export function render(states: number[][], options: RenderOptions = {}): void {
    // 1. Write data
    writeFileSync(DATA_PATH, JSON.stringify(states));
    console.log(`✔ Wrote ${states.length} frames → ${DATA_PATH}`);

    // 2. Write config (if body metadata provided)
    if (options.bodies) {
        writeFileSync(CONFIG_PATH, JSON.stringify(options));
        console.log(`✔ Wrote body config → ${CONFIG_PATH}`);
    }

    // 3. Start Bun static file server
    Bun.serve({
        port: PORT,
        async fetch(req: Request) {
            const url = new URL(req.url);
            let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
            const fullPath = resolve(FRONTEND_DIR + filePath);

            // Security: don't serve files outside frontend/
            if (!fullPath.startsWith(FRONTEND_DIR)) {
                return new Response("Forbidden", { status: 403 });
            }

            const file = Bun.file(fullPath);
            if (await file.exists()) {
                return new Response(file);
            }
            return new Response("Not found", { status: 404 });
        },
    });

    console.log(`✔ Server running → http://localhost:${PORT}`);

    // 4. Open browser (macOS)
    Bun.spawn(["open", `http://localhost:${PORT}`]);
    console.log(`✔ Browser opened`);
    console.log(`\n  Press Ctrl+C to stop the server.\n`);
}
