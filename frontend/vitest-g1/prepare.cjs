// Generate the G1 overlay for a disposable copy of the approved frontend.
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

assert.equal(process.argv.length, 3, 'Usage: node prepare.cjs <empty overlay directory>');
const source = path.resolve(__dirname, '..');
const destination = fs.realpathSync(process.argv[2]);
const worktrees = execFileSync('git', ['worktree', 'list', '--porcelain', '-z'], {
  cwd: source, encoding: 'utf8',
}).split('\0').filter(record => record.startsWith('worktree '));
assert.ok(worktrees.length);
for (const record of worktrees) {
  const relative = path.relative(fs.realpathSync(record.slice(9)), destination);
  assert.ok(path.isAbsolute(relative) || relative.startsWith('..' + path.sep), 'Use an overlay directory outside the Git worktrees');
}
assert.equal(fs.readdirSync(destination).length, 0, 'Use an empty overlay directory');

const note = 'src/app/features/sales/internal-note';
const suites = [note + '/note.vitest.ts', note + '/note-presentation.vitest.ts'];
const readJson = name => JSON.parse(fs.readFileSync(path.join(source, name), 'utf8'));
const writeJson = (name, content) => fs.writeFileSync(path.join(destination, name), JSON.stringify(content, null, 2) + '\n');
const lock = fs.readFileSync(path.join(__dirname, 'pnpm-lock.yaml'), 'utf8').replaceAll('\r\n', '\n');
assert.equal(createHash('sha256').update(lock).digest('hex'), '9f333726173f4f9ea6e57d7052724fecea0bcdd3b9ceafc85bea7f65424247ab');

const manifest = readJson('package.json');
Object.assign(manifest.devDependencies, {
  '@angular/build': '21.2.29',
  '@vitest/browser-playwright': '4.1.12',
  '@vitest/coverage-v8': '4.1.12',
  playwright: '1.61.1',
  vite: '7.3.8',
  vitest: '4.1.12',
});
writeJson('package.json', manifest);
fs.writeFileSync(path.join(destination, 'pnpm-lock.yaml'), lock);

const angular = readJson('angular.json');
const project = 'erp-pos-frontend';
const targets = angular.projects[project].architect;
targets['build-vitest-pilot'] = { ...targets.build, builder: '@angular/build:application' };
targets['test-vitest-note'] = {
  builder: '@angular/build:unit-test',
  options: {
    runner: 'vitest',
    buildTarget: project + ':build-vitest-pilot:development',
    tsConfig: 'tsconfig.vitest-note.json',
    include: suites,
    browsers: ['ChromiumHeadless'],
    watch: false,
    runnerConfig: 'vitest-pilot.config.mts',
  },
};
writeJson('angular.json', angular);
writeJson('tsconfig.vitest-note.json', {
  extends: './tsconfig.json',
  compilerOptions: { outDir: './out-tsc/vitest-note', types: ['vitest/globals'] },
  include: [...suites, 'src/**/*.d.ts'],
});
fs.copyFileSync(path.join(__dirname, 'vitest-pilot.config.mts'), path.join(destination, 'vitest-pilot.config.mts'));
fs.mkdirSync(path.join(destination, note), { recursive: true });
for (const suite of suites) fs.copyFileSync(path.join(source, suite), path.join(destination, suite));
