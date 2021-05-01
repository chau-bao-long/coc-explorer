import pathLib from 'path';
import { displayedFullpath } from '../../../../util';
import { gitColumnRegistrar } from '../gitColumnRegistrar';
import { gitTreeHighlights } from '../gitSource';

gitColumnRegistrar.registerColumn('child', 'fullpath', () => ({
  draw() {
    return {
      drawNode(row, { node }) {
        if (node.directory) {
          row.add(displayedFullpath(node.fullpath) + pathLib.sep, {
            hl: gitTreeHighlights.directory,
          });
        } else {
          row.add(node.fullpath);
        }
      },
    };
  },
}));
