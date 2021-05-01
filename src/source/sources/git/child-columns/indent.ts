import { gitColumnRegistrar } from '../gitColumnRegistrar';
import { GitNode, gitTreeHighlights } from '../gitSource';

/**
 * indentLine
 *
 * │
 * └
 */
function printIndentLine(node: GitNode) {
  let row = '';
  if (node.parent?.isRoot) {
    return row;
  }
  if (node.nextSiblingNode === undefined) {
    row = '└ ';
  } else {
    row = '│ ';
  }
  let curNode = node.parent;
  while (curNode) {
    if (curNode.parent?.isRoot) {
      break;
    }
    if (curNode.nextSiblingNode === undefined) {
      row = '  ' + row;
    } else {
      row = '│ ' + row;
    }
    curNode = curNode.parent;
  }
  return row;
}

gitColumnRegistrar.registerColumn('child', 'indent', ({ source }) => ({
  draw() {
    const enabledNerdFont = source.config.get('icon.enableNerdfont');
    const enableIndentLine = (() => {
      const indentLine = source.getColumnConfig<boolean | undefined>(
        'indent.indentLine',
      );
      if (enabledNerdFont && indentLine === undefined) {
        return true;
      } else {
        return indentLine;
      }
    })();

    return {
      drawNode(row, { node }) {
        if (enableIndentLine) {
          row.add(printIndentLine(node), { hl: gitTreeHighlights.indentLine });
        } else {
          row.add(
            source
              .getColumnConfig<string>('indent.chars')
              .repeat((node.level ?? 0) - 1),
          );
        }
      },
    };
  },
}));
