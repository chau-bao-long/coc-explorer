import { gitColumnRegistrar } from '../gitColumnRegistrar';
import { gitTreeHighlights } from '../gitSource';

gitColumnRegistrar.registerColumn('child', 'readonly', ({ source }) => ({
  draw() {
    const enabledNerdFont = source.config.get('icon.enableNerdfont');

    return {
      labelOnly: true,
      labelVisible: ({ node }) => node.readonly,
      drawNode(row, { node }) {
        if (node.readonly) {
          row.add(node.readonly ? (enabledNerdFont ? '' : 'RO') : '', {
            hl: gitTreeHighlights.readonly,
          });
        }
      },
    };
  },
}));
