import { useCallback } from 'react';
import { tryBodyRealmBreakthrough } from '../../game/body-cultivation';
import { REALMS } from '../../game/data';
import { BODY_CULTIVATION_TEXTS } from '../../data/texts/body-cultivation';
import type { SystemActionContext } from './types';

export function useBodyCultivationActions({ execAction, chronicleHooks }: Pick<SystemActionContext, 'execAction' | 'chronicleHooks'>) {
  const bodyBreakthrough = useCallback(() => {
    execAction(p => {
      const result = tryBodyRealmBreakthrough(p);
      if (!result.breakthrough) {
        return { player: p, message: BODY_CULTIVATION_TEXTS.notReady };
      }
      // T0068: 记录体修突破事件
      const bodyRealmName = REALMS[result.player.bodyRealmIndex]?.name ?? '???';
      chronicleHooks?.recordEvent('body_realm_breakthrough', result.player, `体修突破至${bodyRealmName}`, {
        bodyRealmName, bodyRealmIndex: result.player.bodyRealmIndex,
      });
      chronicleHooks?.syncSnapshot(result.player);
      return { player: result.player, message: result.message };
    });
  }, [execAction, chronicleHooks]);

  return { bodyBreakthrough };
}
