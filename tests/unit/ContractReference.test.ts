import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { reportSchema } from '../../src/core/ReportContract';

describe('Generated public contract reference', () => {
  it('matches the exported runtime schema without a second hand-maintained contract', () => {
    const documented: unknown = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../../docs/generated/report-v1.schema.json'), 'utf8'),
    );
    expect(documented).toEqual(z.toJSONSchema(reportSchema, { io: 'input' }));
  });
});
