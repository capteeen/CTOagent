// TODO(phase-2) LLM usage: posts and one-line reasons ONLY.
// Never used for trade decisions. Use the latest Claude model via the
// Anthropic SDK; give it the row's numbers and require the output to quote them.

import type { Action, Token } from '../types';

export interface Writer {
  reason(t: Token, a: Omit<Action, 'reason'>): Promise<string>;
  announcement(t: Token): Promise<string>;
  update(t: Token, hoursSinceTakeover: number): Promise<string>;
  reply(t: Token, mention: string): Promise<string>;
}
