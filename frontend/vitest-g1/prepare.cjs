// Generate the G1 overlay for a disposable copy of the approved frontend.
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

assert.ok(process.argv.length === 3 || process.argv.length === 4,
  'Usage: node prepare.cjs <empty overlay directory> [note|checkout-money|operation-recovery|pos-state-persistence|pos-durable-recovery|pos-cart-revalidation|pos-complementary|auth-jwt|electronic-documents-http|billing-series]');
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

const batch = process.argv[3] ?? 'note';
const sales = 'src/app/features/sales/';
const batches = new Map([
  ['note', {
    suites: ['internal-note/note.vitest.ts', 'internal-note/note-presentation.vitest.ts'],
    helpers: [],
  }],
  ['checkout-money', {
    suites: [
      'pos-checkout-confirmation.vitest.ts',
      'components/pos-checkout-modal.component.vitest.ts',
      'pos-page.component.vitest.ts',
      'utils/pos-calculations.vitest.ts',
      'pos-money-precision-repro.vitest.ts',
    ],
    helpers: ['testing/sale-operation-double.vitest.ts'],
  }],
  ['operation-recovery', {
    suites: [
      'data/sale-operations.service.vitest.ts',
      'components/sale-operation-recovery.component.vitest.ts',
    ],
    helpers: ['testing/sale-operation-double.vitest.ts'],
  }],
  ['pos-state-persistence', {
    suites: ['data/pos-state.service.vitest.ts'],
    helpers: [],
  }],
  ['pos-durable-recovery', {
    suites: ['pos-durable-recovery.vitest.ts'],
    helpers: ['testing/sale-operation-double.vitest.ts'],
  }],
  ['pos-cart-revalidation', {
    suites: ['pos-cart-revalidation.vitest.ts'],
    helpers: ['testing/sale-operation-double.vitest.ts'],
  }],
  ['pos-complementary', {
    suites: ['pos-presentation.vitest.ts', 'data/pos.service.vitest.ts'],
    helpers: ['testing/sale-operation-double.vitest.ts'],
  }],
  ['auth-jwt', {
    base: 'src/app/core/',
    suites: ['auth/auth.service.vitest.ts', 'interceptors/jwt.interceptor.vitest.ts'],
    helpers: [],
  }],
  ['electronic-documents-http', {
    base: 'src/app/features/billing/',
    suites: ['data/electronic-document.service.vitest.ts'],
    helpers: [],
  }],
  ['billing-series', {
    base: 'src/app/features/billing/',
    suites: ['data/billing-series.service.vitest.ts', 'billing-series-page.component.vitest.ts'],
    helpers: [],
  }],
]);
const selected = batches.get(batch);
assert.ok(selected, 'Unknown Vitest batch');
const suites = selected.suites.map(suite => (selected.base ?? sales) + suite);
const testTsConfig = 'tsconfig.vitest-' + batch + '.json';
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
targets['test-vitest-' + batch] = {
  builder: '@angular/build:unit-test',
  options: {
    runner: 'vitest',
    buildTarget: project + ':build-vitest-pilot:development',
    tsConfig: testTsConfig,
    include: suites,
    browsers: ['ChromiumHeadless'],
    watch: false,
    runnerConfig: 'vitest-pilot.config.mts',
  },
};
writeJson('angular.json', angular);
writeJson(testTsConfig, {
  extends: './tsconfig.json',
  compilerOptions: { outDir: './out-tsc/vitest-' + batch, types: ['vitest/globals'] },
  include: [...suites, 'src/**/*.d.ts'],
});
fs.copyFileSync(path.join(__dirname, 'vitest-pilot.config.mts'), path.join(destination, 'vitest-pilot.config.mts'));
for (const file of [...suites, ...selected.helpers.map(helper => sales + helper)]) {
  const output = path.join(destination, file);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.copyFileSync(path.join(source, file), output);
}
