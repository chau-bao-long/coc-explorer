import { Notifier } from 'coc-helper';
import { window, workspace } from 'coc.nvim';
import pathLib from 'path';
import { ActionSource } from '../../../actions/actionSource';
import {
  RevealStrategy,
  revealStrategyList,
  SearchOption,
  searchOptionList,
} from '../../../types';
import {
  bufnrByWinnrOrWinid,
  currentBufnr,
  input,
  selectWindowsUI,
} from '../../../util';
import { GitNode, GitSource } from './gitSource';

export function loadGitTreeActions(action: ActionSource<GitSource, GitNode>) {
  const { nvim } = workspace;
  const file = action.owner;

  action.addNodeAction(
    'reveal',
    async ({ args }) => {
      const target = args[0];
      let targetBufnr: number | undefined;
      let targetPath: string | undefined;
      if (/\d+/.test(target)) {
        targetBufnr = parseInt(target, 10);
        if (targetBufnr === 0) {
          targetBufnr = await currentBufnr();
        }
      } else {
        const revealStrategy = (target ?? 'previousWindow') as RevealStrategy;

        const actions: Record<
          RevealStrategy,
          undefined | ((args?: string[]) => void | Promise<void>)
        > = {
          select: async () => {
            await selectWindowsUI(file.explorer.config, file.sourceType, {
              onSelect: async (winnr) => {
                targetBufnr = await bufnrByWinnrOrWinid(winnr);
              },
            });
          },
          sourceWindow: async () => {
            targetBufnr = await bufnrByWinnrOrWinid(
              await file.explorer.sourceWinnr(),
            );
          },
          previousBuffer: async () => {
            targetBufnr = await file.explorer.explorerManager.previousBufnr.get();
          },
          previousWindow: async () => {
            targetBufnr = await bufnrByWinnrOrWinid(
              await file.explorer.explorerManager.prevWinnrByPrevWindowID(),
            );
          },
          path: async () => {
            targetPath = args[1];
            if (!targetPath) {
              targetPath = await input(
                'Input a reveal path:',
                file.view.currentNode()?.fullpath ?? '',
                'file',
              );
            }
          },
        };
        await actions[revealStrategy]?.();
      }

      if (targetBufnr) {
        const bufinfo = await nvim.call('getbufinfo', [targetBufnr]);
        if (!bufinfo[0] || !bufinfo[0].name) {
          return;
        }

        targetPath = bufinfo[0].name;
      }

      if (!targetPath) {
        return;
      }

      const expandOptions = args[1] ?? '';
      const compact = expandOptions.includes('compact') || undefined;
      const [revealNode, notifiers] = await file.revealNodeByPathNotifier(
        targetPath,
        {
          compact,
        },
      );
      if (revealNode) {
        await Notifier.runAll(notifiers);
      }
    },
    'reveal buffer in explorer',
    {
      args: [
        {
          name: 'target',
          description: `bufnr number | ${revealStrategyList.join(' | ')}`,
        },
      ],
      menus: {
        '0': 'use current buffer',
        '0:compact': 'use current buffer and compact',
        select: 'use select windows UI',
        previousBuffer: 'use last used buffer',
        previousWindow: 'use last used window',
        sourceWindow: 'use the window where explorer opened',
        path: {
          description: 'use custom path',
          args: 'path:<path>',
          async actionArgs() {
            return ['path'];
          },
        },
      },
    },
  );

  action.addNodeAction(
    'search',
    async ({ node, args }) => {
      const searchOptions = (args[0] ?? '').split('|') as SearchOption[];
      const recursive = searchOptions.includes('recursive');
      const strict = searchOptions.includes('strict');

      await file.searchByCocList(
        node.isRoot ? node.fullpath : pathLib.dirname(node.fullpath),
        { recursive, strict },
      );
    },
    'search by coc-list',
    {
      args: [
        {
          name: 'search options',
          description: searchOptionList.join(' | '),
        },
      ],
      menus: {
        recursive: 'recursively',
        strict: 'exact match',
        'recursive|strict': 'recursively and strict',
      },
    },
  );

  action.addNodeAction(
    'showFilesInGitCommits',
    async ({ node, args }) => {
      await file.searchGitCommits();
    },
    'show files in git commits'
  );
}
