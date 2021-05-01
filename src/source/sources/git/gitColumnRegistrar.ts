import { GitNode, GitSource } from './gitSource';
import { ColumnRegistrar } from '../../columnRegistrar';

export class GitColumnRegistrar extends ColumnRegistrar<
  GitNode,
  GitSource
> {}

export const gitColumnRegistrar = new GitColumnRegistrar();
