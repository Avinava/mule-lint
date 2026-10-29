import type { ClientReport } from '../reportData';
import { startReport } from './redesign';
import { element } from './dom';
startReport(JSON.parse(element('report-data').textContent) as ClientReport);
