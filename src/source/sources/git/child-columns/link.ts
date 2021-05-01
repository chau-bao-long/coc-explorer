import { gitColumnRegistrar } from '../gitColumnRegistrar';
import { gitTreeHighlights } from '../gitSource';
import { fsReadlink } from '../../../../util';

gitColumnRegistrar.registerColumn('child', 'link', () => ({
  draw() {
    return {
      labelVisible: ({ node }) => node.symbolicLink,
      async drawNode(row, { node }) {
        const linkTarget = node.symbolicLink
          ? await fsReadlink(node.fullpath)
              .then((link) => {
                return '→' + link;
              })
              .catch(() => '')
          : '';
        if (linkTarget) {
          row.add(linkTarget, { hl: gitTreeHighlights.linkTarget, unicode: true });
        }
      },
    };
  },
}));
