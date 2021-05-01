import prettyBytes from 'pretty-bytes';
import { gitColumnRegistrar } from '../gitColumnRegistrar';
import { gitTreeHighlights } from '../gitSource';

gitColumnRegistrar.registerColumn('child', 'size', () => ({
  draw() {
    return {
      labelVisible: ({ node }) => !node.directory,
      drawNode(row, { node }) {
        if (node.lstat) {
          row.add(prettyBytes(node.lstat.size), { hl: gitTreeHighlights.size });
        }
      },
    };
  },
}));
