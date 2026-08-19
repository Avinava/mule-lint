import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Content, ResourceLoaderFactory, type ResourceLoader } from 'amf-client-js';

function inside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
  );
}

function toPath(resource: string): string | undefined {
  if (resource.startsWith('file:')) return fileURLToPath(resource);
  if (/^[a-z][a-z\d+.-]*:/i.test(resource)) return undefined;
  return path.resolve(resource);
}

export function createSafeResourceLoader(allowedRoots: string[]): ResourceLoader {
  const roots = allowedRoots.map((root) => fs.realpathSync(path.resolve(root)));
  return ResourceLoaderFactory.create({
    accepts(resource: string): boolean {
      const candidate = toPath(resource);
      if (!candidate || !fs.existsSync(candidate)) return false;
      const real = fs.realpathSync(candidate);
      return roots.some((root) => inside(root, real));
    },
    fetch(resource: string): Promise<Content> {
      const candidate = toPath(resource);
      if (!candidate || !fs.existsSync(candidate)) {
        throw new Error(`Remote or missing API dependency is not allowed: ${resource}`);
      }
      const real = fs.realpathSync(candidate);
      if (!roots.some((root) => inside(root, real))) {
        throw new Error(`API dependency resolves outside allowed roots: ${resource}`);
      }
      return Promise.resolve(new Content(fs.readFileSync(real, 'utf8'), resource));
    },
  }) as ResourceLoader;
}
