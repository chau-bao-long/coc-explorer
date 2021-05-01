import { gitColumnRegistrar } from '../gitColumnRegistrar';
import { format } from 'date-fns';
import { gitTreeHighlights } from '../gitSource';

gitColumnRegistrar.registerColumn('child', 'timeAccessed', ({ source }) => ({
  draw() {
    return {
      drawNode(row, { node }) {
        if (node.lstat) {
          row.add(
            format(node.lstat.atime, source.config.get('datetime.format')),
            {
              hl: gitTreeHighlights.timeAccessed,
            },
          );
        } else {
          row.add('                 ');
        }
      },
    };
  },
}));
