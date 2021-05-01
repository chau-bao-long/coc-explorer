import { gitColumnRegistrar } from '../gitColumnRegistrar';
import { format } from 'date-fns';
import { gitTreeHighlights } from '../gitSource';

gitColumnRegistrar.registerColumn('child', 'timeModified', ({ source }) => ({
  draw() {
    return {
      drawNode(row, { node }) {
        if (node.lstat) {
          row.add(
            format(node.lstat.mtime, source.config.get('datetime.format')),
            {
              hl: gitTreeHighlights.timeModified,
            },
          );
        }
      },
    };
  },
}));
