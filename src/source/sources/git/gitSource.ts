import { Uri, window, workspace } from 'coc.nvim';
import fs from 'fs';
import { homedir } from 'os';
import pathLib from 'path';
import { argOptions } from '../../../arg/argOptions';
import { diagnosticHighlights } from '../../../diagnostic/highlights';
import { gitHighlights } from '../../../git/highlights';
import { gitManager } from '../../../git/manager';
import { fileList } from '../../../lists/files';
import {
  fsAccess,
  fsLstat,
  fsReaddir,
  fsStat,
  getExtensions,
  isWindows,
  listDrive,
  logger,
  normalizePath,
} from '../../../util';
import { hlGroupManager } from '../../../highlight/manager';
import { BaseTreeNode, ExplorerSource } from '../../source';
import { sourceManager } from '../../sourceManager';
import { SourcePainters } from '../../sourcePainters';
import { fileArgOptions } from './argOptions';
import { loadGitTreeActions } from './gitTreeActions';
import { gitColumnRegistrar } from './gitColumnRegistrar';
import './load';
import { Notifier } from 'coc-helper';
import { ViewSource } from '../../../view/viewSource';
import { startCocList } from '../../../lists/runner';
import { Explorer } from '../../../types/pkg-config';
import {commitList} from '../../../lists/git';

export interface GitNode extends BaseTreeNode<GitNode, 'root' | 'child'> {
  name: string;
  fullpath: string;
  directory: boolean;
  readonly: boolean;
  executable: boolean;
  readable: boolean;
  writable: boolean;
  hidden: boolean;
  symbolicLink: boolean;
  lstat?: fs.Stats;
}

const hl = hlGroupManager.linkGroup.bind(hlGroupManager);
export const gitTreeHighlights = {
  title: hl('FileRoot', 'Constant'),
  hidden: hl('FileHidden', 'Comment'),
  rootName: hl('FileRootName', 'Identifier'),
  expandIcon: hl('FileExpandIcon', 'Directory'),
  fullpath: hl('FileFullpath', 'Comment'),
  filename: hl('FileFilename', 'None'),
  directory: hl('FileDirectory', 'Directory'),
  directoryExpanded: hl('FileDirectoryExpanded', 'Directory'),
  directoryCollapsed: hl('FileDirectoryCollapsed', 'Directory'),
  linkTarget: hl('FileLinkTarget', 'Comment'),
  gitStaged: hl('FileGitStaged', gitHighlights.gitStaged.group),
  gitUnstaged: hl('FileGitUnstaged', gitHighlights.gitUnstaged.group),
  gitRootStaged: hl('FileGitRootStaged', 'Comment'),
  gitRootUnstaged: hl('FileGitRootUnstaged', 'Operator'),
  indentLine: hl('IndentLine', 'Comment'),
  clip: hl('FileClip', 'Statement'),
  size: hl('FileSize', 'Constant'),
  readonly: hl('FileReadonly', 'Operator'),
  modified: hl('FileModified', 'Operator'),
  timeAccessed: hl('TimeAccessed', 'Identifier'),
  timeModified: hl('TimeModified', 'Identifier'),
  timeCreated: hl('TimeCreated', 'Identifier'),
  diagnosticError: hl(
    'FileDiagnosticError',
    diagnosticHighlights.diagnosticError.group,
  ),
  diagnosticWarning: hl(
    'FileDiagnosticWarning',
    diagnosticHighlights.diagnosticWarning.group,
  ),
  filenameDiagnosticError: hl('FileFilenameDiagnosticError', 'CocErrorSign'),
  filenameDiagnosticWarning: hl(
    'FileFilenameDiagnosticWarning',
    'CocWarningSign',
  ),
};

export class GitSource extends ExplorerSource<GitNode> {
  scheme = 'gitTree';
  showHidden: boolean = this.config.get<boolean>('gitTree.showHiddenFiles')!;
  copiedNodes: Set<GitNode> = new Set();
  cutNodes: Set<GitNode> = new Set();
  view: ViewSource<GitNode> = new ViewSource<GitNode>(this, {
    type: 'root',
    isRoot: true,
    uid: this.helper.getUid(pathLib.sep),
    name: 'root',
    fullpath: homedir(),
    expandable: true,
    directory: true,
    readonly: true,
    executable: false,
    readable: true,
    writable: true,
    hidden: false,
    symbolicLink: true,
    lstat: undefined,
  });
  sourcePainters: SourcePainters<GitNode> = new SourcePainters<GitNode>(
    this,
    gitColumnRegistrar,
  );

  get root() {
    return this.view.rootNode.fullpath;
  }

  set root(root: string) {
    this.view.rootNode.uid = this.helper.getUid(root);
    this.view.rootNode.fullpath = root;
    this.view.rootNode.children = undefined;
  }

  getHiddenRules() {
    return this.config.get<{
      extensions: string[];
      filenames: string[];
      patternMatches: string[];
    }>('file.hiddenRules')!;
  }

  isHidden(filename: string) {
    const hiddenRules = this.getHiddenRules();

    const { basename, extensions } = getExtensions(filename);
    const extname = extensions[extensions.length - 1];

    return (
      hiddenRules.filenames.includes(basename) ||
      hiddenRules.extensions.includes(extname) ||
      hiddenRules.patternMatches.some((pattern) =>
        new RegExp(pattern).test(filename),
      )
    );
  }

  isGitChange(parentNode: GitNode, filename: string): boolean {
    return !!gitManager.getMixedStatus(
      parentNode.fullpath + '/' + filename,
      false,
    );
  }

  getColumnConfig<T>(name: string, defaultValue?: T): T {
    return this.config.get('file.column.' + name, defaultValue)!;
  }

  async init() {
    this.disposables.push(
      this.events.on('loaded', () => {
        this.copiedNodes.clear();
        this.cutNodes.clear();
      }),
    );

    loadGitTreeActions(this.action);
  }

  async open() {
    await this.sourcePainters.parseTemplate(
      'root',
      await this.explorer.args.value(fileArgOptions.fileRootTemplate),
      await this.explorer.args.value(fileArgOptions.fileRootLabelingTemplate),
    );

    await this.sourcePainters.parseTemplate(
      'child',
      await this.explorer.args.value(fileArgOptions.fileChildTemplate),
      await this.explorer.args.value(fileArgOptions.fileChildLabelingTemplate),
    );

    this.root = this.explorer.rootUri;
  }

  async cd(fullpath: string) {
    const { nvim } = this;
    const escapePath = (await nvim.call('fnameescape', fullpath)) as string;
    type CdCmd = Explorer['explorer.file.cdCommand'];
    let cdCmd: CdCmd;
    const tabCd = this.config.get<boolean>('file.tabCD');
    if (tabCd !== undefined) {
      logger.error(
        'explorer.file.tabCD has been deprecated, please use explorer.file.cdCommand instead of it',
      );
      if (tabCd) {
        cdCmd = 'tcd';
      } else {
        cdCmd = 'cd';
      }
    } else {
      cdCmd = this.config.get<CdCmd>('file.cdCommand');
    }
    if (cdCmd === 'tcd') {
      if (workspace.isNvim || (await nvim.call('exists', [':tcd']))) {
        await nvim.command('tcd ' + escapePath);
        // eslint-disable-next-line no-restricted-properties
        window.showMessage(`Tab's CWD is: ${fullpath}`);
      }
    } else if (cdCmd === 'cd') {
      await nvim.command('cd ' + escapePath);
      // eslint-disable-next-line no-restricted-properties
      window.showMessage(`CWD is: ${fullpath}`);
    }
  }

  async revealPath() {
    const revealPath = await this.explorer.args.value(argOptions.reveal);
    if (revealPath) {
      return revealPath;
    } else {
      const bufnr = await this.explorer.sourceBufnrBySourceWinid();
      if (bufnr) {
        return this.bufManager.getBufferNode(bufnr)?.fullpath ?? undefined;
      }
      return;
    }
  }

  async openedNotifier(isFirst: boolean) {
    const revealPath = await this.revealPath();
    if (!revealPath) {
      if (isFirst) {
        return this.locator.gotoRootNotifier({ col: 1 });
      }
      return Notifier.noop();
    }

    if (isFirst) {
      return this.locator.gotoRootNotifier({ col: 1 });
    }

    return Notifier.noop();
  }

  getPutTargetNode(node: GitNode) {
    if (node.isRoot) {
      return this.view.rootNode;
    } else if (node.expandable && this.view.isExpanded(node)) {
      return node;
    } else if (node.parent) {
      return node.parent;
    } else {
      return this.view.rootNode;
    }
  }

  getPutTargetDir(node: GitNode) {
    return this.getPutTargetNode(node).fullpath;
  }

  async searchByCocList(
    path: string,
    { recursive, strict }: { recursive: boolean; strict: boolean },
  ) {
    const listArgs = strict ? ['--strict'] : [];
    const task = await startCocList(
      this.explorer,
      fileList,
      {
        showHidden: this.showHidden,
        showIgnore: true,
        rootPath: path,
        recursive,
        revealCallback: async (loc) => {
          await task.waitExplorerShow();
          const [, notifiers] = await this.revealNodeByPathNotifier(
            Uri.parse(loc.uri).fsPath,
          );
          await Notifier.runAll(notifiers);
        },
      },
      listArgs,
    );
    task.waitExplorerShow()?.catch(logger.error);
  }

  async searchGitCommits() {
    const task = await startCocList(
      this.explorer,
      commitList,
      {
        callback: async (commit) => {
          gitManager.setCurrentCommit(commit.split(' ')[0]);
        },
      },
    );

    task.waitExplorerShow()?.catch(logger.error);
  }

  async revealNodeByPathNotifier(
    path: string,
    {
      startNode = this.view.rootNode,
      goto = true,
      render = true,
      compact,
    }: {
      startNode?: GitNode;
      /**
       * @default true
       */
      goto?: boolean;
      /**
       * @default true
       */
      render?: boolean;
      compact?: boolean;
    } = {},
  ): Promise<[GitNode | undefined, Notifier[]]> {
    path = normalizePath(path);
    const notifiers: Notifier[] = [];

    const revealRecursive = async (
      path: string,
      {
        startNode,
        goto,
        render,
      }: { startNode: GitNode; goto: boolean; render: boolean },
    ): Promise<GitNode | undefined> => {
      if (path === startNode.fullpath) {
        return startNode;
      } else if (
        startNode.directory &&
        path.startsWith(startNode.fullpath + pathLib.sep)
      ) {
        let foundNode: GitNode | undefined = undefined;
        const isRender = render && !this.view.isExpanded(startNode);
        if (!startNode.children) {
          startNode.children = await this.loadInitedChildren(startNode);
        }
        for (const child of startNode.children) {
          const childFoundNode = await revealRecursive(path, {
            startNode: child,
            goto: false,
            render: isRender ? false : render,
          });
          foundNode = childFoundNode;
          if (foundNode) {
            await this.view.expand(startNode, {
              compact,
              uncompact: false,
              render: false,
            });
            break;
          }
        }
        if (foundNode) {
          if (isRender) {
            const renderNotifier = await this.view.renderNotifier({
              node: startNode,
            });
            if (renderNotifier) {
              notifiers.push(renderNotifier);
            }
          }
          if (goto) {
            notifiers.push(await this.locator.gotoNodeNotifier(foundNode));
            notifiers.push(
              Notifier.create(() => this.nvim.command('redraw!', true)),
            );
          }
        }
        return foundNode;
      }
      return;
    };

    const foundNode = await revealRecursive(path, {
      startNode,
      goto,
      render,
    });
    return [foundNode, notifiers];
  }

  sortFiles(files: GitNode[]) {
    return files.sort((a, b) => {
      if (a.directory && !b.directory) {
        return -1;
      } else if (b.directory && !a.directory) {
        return 1;
      } else {
        return a.name.localeCompare(b.name);
      }
    });
  }

  async loadChildren(parentNode: GitNode): Promise<GitNode[]> {
    let filenames: string[];
    if (isWindows && parentNode.fullpath === '') {
      filenames = await listDrive();
    } else {
      filenames = await fsReaddir(parentNode.fullpath);
    }
    const files = await Promise.all(
      filenames.map(async (filename) => {
        try {
          if (!this.isGitChange(parentNode, filename)) {
            return;
          }

          const hidden = this.isHidden(filename);
          if (!this.showHidden && hidden) {
            return;
          }
          const fullpath = normalizePath(
            pathLib.join(parentNode.fullpath, filename),
          );
          const stat = await fsStat(fullpath).catch(() => {});
          const lstat = await fsLstat(fullpath).catch(() => {});
          const executable = await fsAccess(fullpath, fs.constants.X_OK);
          const writable = await fsAccess(fullpath, fs.constants.W_OK);
          const readable = await fsAccess(fullpath, fs.constants.R_OK);
          const directory =
            isWindows && /^[A-Za-z]:[\\\/]$/.test(fullpath)
              ? true
              : stat
              ? stat.isDirectory()
              : false;
          const child: GitNode = {
            type: 'child',
            uid: this.helper.getUid(fullpath),
            expandable: directory,
            name: filename,
            fullpath,
            directory: directory,
            readonly: !writable && readable,
            executable,
            readable,
            writable,
            hidden,
            symbolicLink: lstat ? lstat.isSymbolicLink() : false,
            lstat: lstat || undefined,
          };
          return child;
        } catch (error) {
          logger.error(error);
          return;
        }
      }),
    );

    return this.sortFiles(files.filter((r): r is GitNode => !!r));
  }
}

sourceManager.registerSource('gitTree', GitSource);
