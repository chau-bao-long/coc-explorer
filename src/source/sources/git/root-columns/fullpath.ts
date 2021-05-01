import { displayedFullpath } from '../../../../util';
import { gitColumnRegistrar } from '../gitColumnRegistrar';
import { gitTreeHighlights } from '../gitSource';

gitColumnRegistrar.registerColumn('root', 'fullpath', () => ({
  draw() {
    return {
      drawNode(row, { node, isLabeling }) {
        row.add(displayedFullpath(node.fullpath), {
          hl: isLabeling ? gitTreeHighlights.directory : gitTreeHighlights.fullpath,
        });
      },
    };
  },
}));
