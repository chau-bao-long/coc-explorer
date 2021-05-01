import { gitColumnRegistrar } from '../gitColumnRegistrar';
import pathLib from 'path';
import { gitTreeHighlights } from '../gitSource';

gitColumnRegistrar.registerColumn('root', 'root', ({ source }) => ({
  draw() {
    return {
      drawNode(row) {
        row.add(pathLib.basename(source.root), { hl: gitTreeHighlights.rootName });
      },
    };
  },
}));
