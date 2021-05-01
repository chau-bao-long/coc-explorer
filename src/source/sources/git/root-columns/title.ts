import { gitColumnRegistrar } from '../gitColumnRegistrar';
import { gitTreeHighlights } from '../gitSource';

gitColumnRegistrar.registerColumn('root', 'title', () => ({
  draw() {
    return {
      drawNode(row) {
        row.add('[GIT]', {
          hl: gitTreeHighlights.title,
        });
      },
    };
  },
}));
