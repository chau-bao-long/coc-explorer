import { gitColumnRegistrar } from '../gitColumnRegistrar';
import { gitTreeHighlights } from '../gitSource';

gitColumnRegistrar.registerColumn('root', 'hidden', ({ source }) => ({
  draw() {
    return {
      drawNode(row) {
        row.add(source.showHidden ? source.icons.hidden : '', {
          hl: gitTreeHighlights.hidden,
        });
      },
    };
  },
}));
