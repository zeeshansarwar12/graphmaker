import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const distRoot = join(projectRoot, 'dist');
const mimeTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

export default async function startTestServer() {
  // Refuse missing homepage output before running browser assertions.
  await stat(join(distRoot, 'index.html'));
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
      const relativePath = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
      const filePath = resolve(distRoot, `.${relativePath}`);

      if (filePath !== distRoot && !filePath.startsWith(`${distRoot}${sep}`)) {
        response.writeHead(403).end('Forbidden');
        return;
      }

      const fileStats = await stat(filePath);
      if (!fileStats.isFile()) throw new Error('Not a file');

      response.writeHead(200, {
        'Content-Type': mimeTypes[extname(filePath)] ?? 'application/octet-stream',
      });
      createReadStream(filePath).pipe(response);
    } catch {
      try {
        const notFoundPath = join(distRoot, '404.html');
        await stat(notFoundPath);
        response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        createReadStream(notFoundPath).pipe(response);
      } catch {
        response.writeHead(404).end('Not found');
      }
    }
  });

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(4321, '127.0.0.1', resolveListen);
  });

  return async () => {
    server.closeAllConnections();
    await new Promise<void>((resolveClose, rejectClose) => {
      server.close((error) => error ? rejectClose(error) : resolveClose());
    });
  };
}
