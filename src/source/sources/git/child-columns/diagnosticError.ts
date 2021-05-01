import {
  getDiagnosticConfig,
  printDiagnosticCount,
} from '../../../../diagnostic/config';
import { diagnosticManager } from '../../../../diagnostic/manager';
import { gitColumnRegistrar } from '../gitColumnRegistrar';
import { gitTreeHighlights } from '../gitSource';

gitColumnRegistrar.registerColumn(
  'child',
  'diagnosticError',
  ({ source, subscriptions }) => {
    const diagnosticConfig = getDiagnosticConfig(source.config);

    return {
      init() {
        subscriptions.push(diagnosticManager.bindColumn(source, ['error']));
      },
      draw() {
        return {
          labelVisible: ({ node }) =>
            !!diagnosticManager.getMixedError(node.fullpath),
          drawNode(row, { node, isLabeling }) {
            const errorCount = diagnosticManager.getMixedError(node.fullpath);

            if (isLabeling) {
              row.add((errorCount ?? 0).toString(), {
                hl: gitTreeHighlights.diagnosticError,
              });
              return;
            }
            if (!errorCount) {
              return;
            }
            if (node.directory && source.view.isExpanded(node)) {
              return;
            }
            row.add(printDiagnosticCount(errorCount, diagnosticConfig), {
              hl: gitTreeHighlights.diagnosticError,
            });
          },
        };
      },
    };
  },
);
