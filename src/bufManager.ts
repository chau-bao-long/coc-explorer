import { workspace, ExtensionContext, Emitter } from 'coc.nvim';
import pathLib from 'path';
import { onEvents, onBufDelete, onBufWipeout, compactI } from './util';
import { BufferNode } from './source/sources/buffer/bufferSource';

const regex = /^\s*(\d+)(.+?)"(.+?)".*/;

export class BufManager {
  private bufferNodes: BufferNode[] = [];
  private bufferNodeMapByFullpath: Map<string, BufferNode> = new Map();
  private bufferNodeMapById: Map<number, BufferNode> = new Map();
  onReload = (fn: () => void) => this.reloadEvent.event(fn);
  onModified = (fn: (fullpath: string) => void) => this.modifiedEvent.event(fn);

  private nvim = workspace.nvim;
  private reloadEvent = new Emitter<void>();
  private modifiedEvent = new Emitter<string>();

  constructor(public context: ExtensionContext) {
    context.subscriptions.push(
      onEvents(
        [
          'BufCreate',
          'BufHidden',
          'BufUnload',
          'BufWinEnter',
          'BufWinLeave',
          'BufWritePost',
        ],
        () => this.reload(),
      ),
      onBufDelete(() => this.reload()),
      onBufWipeout(() => this.reload()),
      ...(['TextChanged', 'TextChangedI', 'TextChangedP'] as const).map(
        (event) =>
          onEvents(event, async (bufnr: number) => {
            const bufNode = this.bufferNodeMapById.get(bufnr);
            if (!bufNode) {
              return;
            }
            const buffer = this.nvim.createBuffer(bufnr);
            const modified = !!(await buffer.getOption('modified'));
            if (bufNode.modified === modified) {
              return;
            }
            bufNode.modified = modified;
            this.modifiedEvent.fire(bufNode.fullpath);
          }),
      ),
    );
  }

  get list() {
    return this.bufferNodes;
  }

  async removeBufNode(bufNode: BufferNode, skipModified: boolean) {
    if (!skipModified && bufNode.modified) {
      throw new Error('The content of buffer has not been saved!');
    }

    await this.nvim.command(`bwipeout! ${bufNode.bufnr}`);
  }

  async remove(fullpath: string, skipModified: boolean) {
    if (fullpath.endsWith('/')) {
      return this.removePrefix(fullpath, skipModified);
    } else {
      const bufNode = this.bufferNodeMapByFullpath.get(fullpath);
      if (!bufNode) {
        return;
      }
      await this.removeBufNode(bufNode, skipModified);
    }
  }

  async removePrefix(prefixFullpath: string, skipModified: boolean) {
    for (const [fullpath, bufNode] of this.bufferNodeMapByFullpath) {
      if (fullpath.startsWith(prefixFullpath)) {
        await this.removeBufNode(bufNode, skipModified);
      }
    }
  }

  modified(fullpath: string): boolean {
    if (fullpath.endsWith('/')) {
      return this.modifiedPrefix(fullpath);
    } else {
      return this.bufferNodeMapByFullpath.get(fullpath)?.modified ?? false;
    }
  }

  modifiedPrefix(prefixFullpath: string): boolean {
    for (const [fullpath, bufNode] of this.bufferNodeMapByFullpath) {
      if (fullpath.startsWith(prefixFullpath)) {
        if (bufNode.modified) {
          return true;
        }
      }
    }
    return false;
  }

  async reload() {
    const lsCommand = 'ls!';
    const content = (await this.nvim.call('execute', lsCommand)) as string;

    this.bufferNodes = compactI(
      await Promise.all(
        content.split(/\n/).map(async (line) => {
          const matches = line.match(regex);
          if (!matches) {
            return null;
          }
          const bufnr = matches[1];
          const flags = matches[2];
          const bufname = matches[3];
          const fullpath: string = await workspace.nvim.call('expand', [
            `#${bufnr}:p`,
          ]);
          return {
            type: 'child' as const,
            uid: bufnr,
            level: 1,
            bufnr: parseInt(bufnr),
            bufnrStr: bufnr,
            bufname,
            fullpath,
            basename: pathLib.basename(bufname),
            unlisted: flags.includes('u'),
            current: flags.includes('%'),
            previous: flags.includes('#'),
            visible: flags.includes('a'),
            hidden: flags.includes('h'),
            modifiable: !flags.includes('-'),
            readonly: flags.includes('='),
            terminal:
              flags.includes('R') || flags.includes('F') || flags.includes('?'),
            modified: flags.includes('+'),
            readErrors: flags.includes('x'),
          };
        }),
      ),
    );

    this.bufferNodeMapByFullpath = this.bufferNodes.reduce((map, node) => {
      map.set(node.fullpath, node);
      return map;
    }, new Map<string, BufferNode>());

    this.bufferNodeMapById = this.bufferNodes.reduce((map, node) => {
      map.set(node.bufnr, node);
      return map;
    }, new Map<number, BufferNode>());

    this.reloadEvent.fire();
  }
}