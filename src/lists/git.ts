import { ListTask, window } from 'coc.nvim';
import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';
import { registerList } from './runner';
import readline from 'readline';

class Task extends EventEmitter implements ListTask {
  private processes: ChildProcess[] = [];

  start(cmd: string, args: string[]): void {
    const process = spawn(cmd, args);
    this.processes.push(process);
    process.on('error', (e) => {
      this.emit('error', e.message);
    });
    const rl = readline.createInterface(process.stdout);
    process.stderr.on('data', (chunk) => {
      // eslint-disable-next-line no-console
      console.error(chunk.toString('utf8'));
    });

    rl.on('line', (line: string) => {
      this.emit('data', { label: line });
    });
    rl.on('close', () => {
      this.emit('end');
    });
  }

  dispose(): void {
    for (const process of this.processes) {
      if (!process.killed) {
        process.kill();
      }
    }
  }
  
}

type Arg = {
  callback?: (commitHash: String) => void | Promise<void>;
};

export const commitList = registerList<Arg, any>({
  name: 'listGitCommits',
  defaultAction: 'chooseCommit',
  async loadItems(arg) {
    const task = new Task();

    task.start('git', ['log', '--oneline']);
    return task;
  },
  init() {
    this.addAction('chooseCommit', async ({ arg, item }) => {
      if (arg.callback) {
        await arg.callback(item.label);
      }
    });
  },
});
