import { watch } from 'node:fs';
import { spawn } from 'node:child_process';

// Keep the embedded browser assets current alongside TypeScript's Node output.
const compiler = spawn('tsc', ['--watch'], { stdio: 'inherit', shell: true });
let timer;
let active = false;
let pending = false;
function rebuild() {
  if (active) {
    pending = true;
    return;
  }
  active = true;
  const child = spawn(process.execPath, ['scripts/build-report-client.mjs', '--copy-dist'], {
    stdio: 'inherit',
  });
  child.on('exit', () => {
    active = false;
    if (pending) {
      pending = false;
      rebuild();
    }
  });
}
const watcher = watch('src/formatters/html', { recursive: true }, (_event, filename) => {
  if (!filename?.endsWith('.ts') || filename.includes('generated')) return;
  clearTimeout(timer);
  timer = setTimeout(rebuild, 100);
});
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    watcher.close();
    clearTimeout(timer);
    compiler.kill(signal);
    process.exit(0);
  });
