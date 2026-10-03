import type { ClientReport } from '../reportData';
import type { ReportRuntime } from './types';
import { createRouter } from './router';
import { createReportUi } from './reportUi';
import { createDialogFocus, createModal, createSidepanel } from './dialogs';
import { createRenderer } from './renderer';
/** Browser services share one state; construction never reads or mutates the DOM. */
export function createReportApp(report: ClientReport): ReportRuntime {
  const focus = createDialogFocus();
  const modal = createModal(focus);
  const sidepanel = createSidepanel(focus);
  const context: ReportRuntime = {
    report,
    allIssues: report.files.flatMap((file) =>
      file.issues.map((issue) => ({ ...issue, fileName: file.relativePath })),
    ),
    filters: { severities: [], categories: [], searchTerm: '' },
    table: null,
    focus,
    modal,
    sidepanel,
    get router() {
      return router;
    },
    get ui() {
      return ui;
    },
    get renderer() {
      return renderer;
    },
  };
  const router = createRouter(context);
  const ui = createReportUi(context);
  const renderer = createRenderer(context);
  return context;
}
