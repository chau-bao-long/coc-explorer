import { Explorer, PreviewActionStrategy } from './pkg-config';

export const moveStrategyList = ['default', 'insideSource'] as const;

export type MoveStrategy = typeof moveStrategyList[number];

export const revealStrategyList = [
  'select',
  'previousBuffer',
  'previousWindow',
  'sourceWindow',
  'path',
] as const;

export type RevealStrategy = typeof revealStrategyList[number];

export type OpenStrategy = NonNullable<
  Explorer['explorer.openAction.strategy']
>;

export const openStrategyList: OpenStrategy[] = [
  'select',
  'split',
  'split:plain',
  'split:intelligent',
  'vsplit',
  'vsplit:plain',
  'vsplit:intelligent',
  'tab',
  'previousBuffer',
  'previousWindow',
  'sourceWindow',
];

export const previewOnHoverActionList = [
  'toggle',
  'enable',
  'disable',
] as const;

export type PreviewOnHoverAction = typeof previewOnHoverActionList[number];

export const previewStrategyList: PreviewActionStrategy[] = [
  'labeling',
  'content',
];

export const expandOptionList = [
  'recursive',
  'compact',
  'uncompact',
  'recursiveSingle',
] as const;

export type ExpandOption = typeof expandOptionList[number];

export const collapseOptionList = ['recursive', 'all'] as const;

export type CollapseOption = typeof collapseOptionList[number];

export type ExplorerOpenOptions = {
  width: number;
  height: number;
  /**
   * left position
   */
  left: number;
  /**
   * top position
   */
  top: number;
  border_bufnr?: number;
  border_enable: boolean;
  border_chars: string[];
  /**
   * buffer name
   */
  name?: string;
  /**
   * float win title
   */
  title: string;
  filetype?: string;
  focusLineIndex?: number;
  focus?: boolean;
};

export type FloatingCreateOptions = {
  /**
   * buffer name
   */
  name?: string;
};

export type FloatingOpenOptions = {
  filepath?: string;
} & ExplorerOpenOptions;
