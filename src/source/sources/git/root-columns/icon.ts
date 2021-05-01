import { gitColumnRegistrar } from '../gitColumnRegistrar';
import { gitTreeHighlights } from '../gitSource';

gitColumnRegistrar.registerColumn('root', 'icon', ({ source }) => ({
  draw() {
    return {
      drawNode(row, { node }) {
        row.add(
          source.view.isExpanded(node)
            ? source.icons.expanded
            : source.icons.collapsed,
          { hl: gitTreeHighlights.expandIcon },
        );
      },
    };
  },
}));
