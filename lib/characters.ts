// The crew. One character per job. Used by the feed (avatars), the home
// cards, the 3D office and the toasts, so the same face always means the
// same kind of action.

import type { ActionKind } from './types';

export type Role = 'scanner' | 'trader' | 'poster' | 'community' | 'treasurer';

export interface Character {
  role: Role;
  name: string;
  handle: string;
  title: string;
  tagline: string;
  blurb: string;
  kinds: ActionKind[];
  href: string;
  /** look, shared by the pixel avatar and the voxel agent */
  hat: string;
  shirt: string;
  skin: string;
  hair: string;
  glasses?: boolean;
  beard?: boolean;
  /** accent used for the character's chips and labels */
  tone: 'loss' | 'accent' | 'fg' | 'gain' | 'muted';
  icon: string;
}

export const CREW: Character[] = [
  {
    role: 'scanner', name: 'Hawk', handle: 'hawk', title: 'Scanner',
    tagline: 'Sees the dev sell before the chart does.',
    blurb: 'Watches every launch and every tracked wallet. Scores death from dev sells, silence, volume and holders. Never buys.',
    kinds: ['flag'], href: '/tokens?tab=watching',
    hat: '#f0505a', shirt: '#2a2a33', skin: '#f1c9a5', hair: '#2b1d14', glasses: true, tone: 'loss', icon: '⌕',
  },
  {
    role: 'trader', name: 'Brick', handle: 'brick', title: 'Trader',
    tagline: 'Buys the dip, sells at 3x, no feelings.',
    blurb: 'Takes over eligible coins with 2% of the vault, adds on every -20%, sells half at 3x, abandons at 72h if volume is dead. Rules only.',
    kinds: ['takeover', 'buy', 'sell', 'abandon'], href: '/agent',
    hat: '#ffc700', shirt: '#ffc700', skin: '#8d5a3b', hair: '#111111', tone: 'accent', icon: '⇅',
  },
  {
    role: 'poster', name: 'Quill', handle: 'quill', title: 'Poster',
    tagline: 'One X account per takeover. Receipts in every post.',
    blurb: 'Spins up @<TICKER>CTO within 60s of a takeover and posts an update every 2h with the live numbers. Writes, never trades.',
    kinds: ['post'], href: '/activity',
    hat: '#f5f5f7', shirt: '#2a2a33', skin: '#ffdbac', hair: '#5a3a1a', tone: 'fg', icon: '✎',
  },
  {
    role: 'community', name: 'Hana', handle: 'hana', title: 'Community',
    tagline: 'Answers every mention with numbers, not promises.',
    blurb: 'Reads mentions on every CTO account and replies with mcap, holders and the rules. Lives on the phone.',
    kinds: ['reply'], href: '/activity',
    hat: '#22c55e', shirt: '#22c55e', skin: '#d9a577', hair: '#1a1a1a', tone: 'gain', icon: '↩',
  },
  {
    role: 'treasurer', name: 'Vault', handle: 'vault', title: 'Treasurer',
    tagline: 'Claims fees, splits 70/30, pays holders every 6h.',
    blurb: 'Claims creator fees where they are claimable, keeps 30% in the vault for the next takeover and sends 70% to CTO holders.',
    kinds: ['claim'], href: '/holders',
    hat: '#0a0a0a', shirt: '#2a2a33', skin: '#c68642', hair: '#3a2a1a', beard: true, tone: 'gain', icon: '◎',
  },
];

export const BY_ROLE = Object.fromEntries(CREW.map((c) => [c.role, c])) as Record<Role, Character>;

const KIND_TO_ROLE: Record<ActionKind, Role> = {
  flag: 'scanner', takeover: 'trader', buy: 'trader', sell: 'trader', abandon: 'trader', post: 'poster', reply: 'community', claim: 'treasurer',
};

export const whoDid = (kind: ActionKind): Character => BY_ROLE[KIND_TO_ROLE[kind]];
