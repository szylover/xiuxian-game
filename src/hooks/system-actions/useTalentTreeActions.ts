import { useTalentTree } from '../useTalentTree';
import type { SystemActionContext } from './types';

export function useTalentTreeActions({ player, addLog, setPlayer }: Pick<SystemActionContext, 'player' | 'addLog' | 'setPlayer'>) {
  return useTalentTree(player, setPlayer, addLog);
}
