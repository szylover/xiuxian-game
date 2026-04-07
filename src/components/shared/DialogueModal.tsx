// ============================================================
// DialogueModal.tsx — 对话弹窗组件（T0026）
// ============================================================

import { useState, useEffect } from 'react';
import type { Player } from '../../game/player';
import type { DialogueNode, DialogueChainDef } from '../../game/types';
import { getNpcDef } from '../../game/registry';
import { checkChoiceCondition } from '../../game/dialogue';
import { DIALOGUE_TEXTS } from '../../data/texts/dialogue';
import './DialogueModal.css';

interface DialogueModalProps {
  player: Player;
  dialogueDef: DialogueChainDef;
  currentNode: DialogueNode;
  effectLogs: string[];
  onSelectChoice: (choiceId: string) => void;
  onContinue: () => void;
  onEnd: () => void;
}

export default function DialogueModal({
  player, dialogueDef, currentNode, effectLogs,
  onSelectChoice, onContinue, onEnd,
}: DialogueModalProps) {
  const npcDef = getNpcDef(dialogueDef.npcId);
  const [localLogs, setLocalLogs] = useState<string[]>(effectLogs);

  useEffect(() => {
    setLocalLogs(effectLogs);
  }, [effectLogs]);

  const isNarration = currentNode.type === 'narration';

  // 过滤满足条件的选项
  const visibleChoices = currentNode.choices?.filter(
    c => checkChoiceCondition(player, dialogueDef.npcId, c.condition),
  ) ?? [];

  const hasChoices = visibleChoices.length > 0;
  const hasNextNode = !!currentNode.nextNodeId;
  const isEndNode = !hasChoices && !hasNextNode;

  return (
    <div className="dialogue-modal-overlay">
      <div className="dialogue-modal">
        {/* 头部 */}
        <div className="dialogue-header">
          <span className="dialogue-speaker-emoji">
            {currentNode.speakerEmoji ?? npcDef?.emoji ?? '💬'}
          </span>
          <div className="dialogue-speaker-info">
            <div className="dialogue-speaker-name">
              {currentNode.speaker ?? npcDef?.name ?? DIALOGUE_TEXTS.dialogueTitle}
            </div>
            {npcDef?.title && (
              <div className="dialogue-speaker-title">{npcDef.title}</div>
            )}
          </div>
        </div>

        {/* 对话文本 */}
        <div className="dialogue-body">
          <div className={`dialogue-text ${isNarration ? 'dialogue-narration' : ''}`}>
            {currentNode.text}
          </div>
        </div>

        {/* 效果反馈 */}
        {localLogs.length > 0 && (
          <div className="dialogue-effects">
            {localLogs.map((log, i) => (
              <div key={i} className="dialogue-effect-item">{log}</div>
            ))}
          </div>
        )}

        {/* 选项区域 */}
        {hasChoices && (
          <div className="dialogue-choices">
            {visibleChoices.map(choice => (
              <button
                key={choice.id}
                className="dialogue-choice-btn"
                title={choice.tooltip}
                onClick={() => onSelectChoice(choice.id)}
              >
                ▸ {choice.text}
              </button>
            ))}
          </div>
        )}

        {/* 继续/结束按钮 */}
        {!hasChoices && (
          <div className="dialogue-footer">
            {isEndNode ? (
              <button className="dialogue-continue-btn" onClick={onEnd}>
                {DIALOGUE_TEXTS.endDialogueBtn}
              </button>
            ) : (
              <button className="dialogue-continue-btn" onClick={onContinue}>
                {DIALOGUE_TEXTS.continueBtn}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
