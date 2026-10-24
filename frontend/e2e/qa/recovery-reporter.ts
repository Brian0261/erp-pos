import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { writeFileSync } from 'node:fs';

/** Incremental, synthetic-only evidence survives an interrupted QA run. */
export default class RecoveryReporter implements Reporter {
  private completed: object[] = [];
  onTestEnd(test: TestCase, result: TestResult): void {
    const redact = (message: string) => {
      for (const key of ['E2E_QA_PASSWORD', 'QA_DB_PASSWORD', 'QA_JWT_SECRET', 'QA_MARKER']) {
        const value = process.env[key]; if (value) message = message.replaceAll(value, '[redacted]');
      }
      return message.replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[redacted-jwt]').slice(0, 6000);
    };
    this.completed.push({title: test.title, status: result.status,
      errors: result.errors.map(error => redact(error.message ?? 'QA_TEST_ERROR'))});
    writeFileSync('/qa-run/progress.json', JSON.stringify(this.completed, null, 2), {mode: 0o600});
  }
}
