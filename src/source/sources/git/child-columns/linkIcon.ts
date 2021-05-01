import { gitColumnRegistrar } from '../gitColumnRegistrar';

gitColumnRegistrar.registerColumn('child', 'linkIcon', () => ({
  draw() {
    return {
      drawNode(row, { node }) {
        if (node.symbolicLink) {
          row.add('→');
        }
      },
    };
  },
}));
