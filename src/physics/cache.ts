import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = resolve(__dirname, "../../.cache");

// Ensure cache directory exists
if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
}

export function runCachedSimulation(name: string, computeFn: () => number[][]): number[][] {
    const cacheFile = resolve(CACHE_DIR, `${name}.json`);
    const forceRecompute = process.argv.includes("--recompute") || process.argv.includes("--force");

    if (!forceRecompute && existsSync(cacheFile)) {
        console.log(`\n📦 Loading cached simulation data for '${name}'...`);
        console.log(`   (Use --recompute to force a fresh calculation)\n`);

        try {
            const data = readFileSync(cacheFile, "utf-8");
            return JSON.parse(data);
        } catch (e) {
            console.warn(`Failed to read cache file, recomputing...`);
        }
    }

    console.log(`\n⚙️ Computing simulation data for '${name}'...`);
    const startTime = performance.now();

    const states = computeFn();

    const endTime = performance.now();
    console.log(`✔ Computation took ${((endTime - startTime) / 1000).toFixed(2)}s`);

    try {
        writeFileSync(cacheFile, JSON.stringify(states));
        console.log(`✔ Saved to cache → ${cacheFile}\n`);
    } catch (e) {
        console.warn(`Failed to save cache file: ${e}`);
    }

    return states;
}
