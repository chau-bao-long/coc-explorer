import { getRootStatusIcons } from '../../../../git/config';
import { gitManager } from '../../../../git/manager';
import { gitColumnRegistrar } from '../gitColumnRegistrar';
import { gitTreeHighlights } from '../gitSource';

gitColumnRegistrar.registerColumn(
  'root',
  'git',
  ({ source, subscriptions }) => {
    const icons = getRootStatusIcons(source.config);

    return {
      init() {
        subscriptions.push(gitManager.bindColumn(source));
      },
      async draw() {
        return {
          labelVisible({ node }) {
            return !!gitManager.getRootStatus(node.fullpath)?.formats.length;
          },
          async available() {
            return await gitManager.cmd.available();
          },
          drawNode(row, { node, isLabeling }) {
            const status = gitManager.getRootStatus(node.fullpath);
            if (status?.formats.length) {
              const statusChars: string[] = [];
              for (const f of status.formats) {
                if (isLabeling) {
                  statusChars.push(`${icons[f].name}(${icons[f].icon})`);
                } else {
                  statusChars.push(icons[f].icon);
                }
              }
              const hl = status.allStaged
                ? gitTreeHighlights.gitRootStaged
                : gitTreeHighlights.gitRootUnstaged;
              if (isLabeling) {
                row.add(statusChars.join(' & '), {
                  hl,
                });
              } else {
                row.add('{' + statusChars.join('') + '}', {
                  hl,
                });
              }
            }
          },
        };
      },
    };
  },
);
