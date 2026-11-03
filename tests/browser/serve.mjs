import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// Serve the production build for tests; this is not an Astro development server.
const directory = resolve(dirname(fileURLToPath(import.meta.url)), "../../dist");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon" };

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const path = resolve(directory, `.${pathname === "/" ? "/index.html" : pathname}`);
    if (!path.startsWith(directory + sep) || !(await stat(path)).isFile()) throw new Error("Not found");
    response.writeHead(200, { "Content-Type": types[extname(path)] ?? "application/octet-stream", "Cache-Control": "no-store" });
    createReadStream(path).pipe(response);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}).listen(Number(process.env.PORTFOLIO_TEST_PORT ?? 4357), "127.0.0.1");
