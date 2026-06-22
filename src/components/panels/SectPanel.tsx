import type { Player } from '../../game/player';
import type { SectMemberState } from '../../game/types';
import { getAllSectDefs, getItemDef, getRealmDef } from '../../game/registry';
import { describeSectBenefits, getJoinLockReason, getSectState } from '../../game/sect';
import { SECT_TEXTS } from '../../data/texts';
import './SectPanel.css';

interface SectPanelProps {
  player: Player;
  onJoinSect: (sectId: string) => void;
  onClaimStipend: () => void;
  onAdvanceRank: () => void;
  onCompleteMission: (missionId: string) => void;
  onBuyStoreItem: (itemId: string) => void;
  onFoundManagement: () => void;
  onRecruitMember: () => void;
  onCollectYield: () => void;
  onUpgradeFacility: (facilityId: string) => void;
  onAssignMemberTask: (memberId: string, task: SectMemberState['task']) => void;
}

export default function SectPanel(props: SectPanelProps) {
  const state = getSectState(props.player);
  const sect = state.sectId ? getAllSectDefs().find(def => def.id === state.sectId) : undefined;
  const rank = sect?.ranks.find(r => r.id === state.rankId);
  return (
    <div className="sect-panel">
      <div className="sect-intro">{SECT_TEXTS.panel.intro}</div>
      {!sect || !rank ? <JoinSectView {...props} /> : <MembershipView {...props} sect={sect} rank={rank} />}
    </div>
  );
}

function JoinSectView({ player, onJoinSect }: SectPanelProps) {
  return (
    <section className="sect-section">
      <div className="sect-section-title">{SECT_TEXTS.panel.joinTitle}</div>
      <div className="sect-card-list">
        {getAllSectDefs().map(sect => {
          const lock = getJoinLockReason(player, sect.id);
          return (
            <article key={sect.id} className="sect-card">
              <div className="sect-card-title">{sect.name}</div>
              <div className="sect-desc">{sect.description}</div>
              <div className="sect-meta">{SECT_TEXTS.panel.alignment(SECT_TEXTS.alignment[sect.alignment])}</div>
              <div className="sect-meta">{SECT_TEXTS.panel.minRealm(getRealmDef(sect.minRealm)?.name ?? String(sect.minRealm))}</div>
              <div className="sect-meta">{SECT_TEXTS.panel.entryGold(sect.entryGold ?? 0)}</div>
              {lock && <div className="sect-lock">{lock}</div>}
              <button className="sect-action" disabled={!!lock} onClick={() => onJoinSect(sect.id)}>{SECT_TEXTS.panel.join}</button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MembershipView({ player, sect, rank, onClaimStipend, onAdvanceRank, onCompleteMission, onBuyStoreItem, onFoundManagement, onRecruitMember, onCollectYield, onUpgradeFacility, onAssignMemberTask }: SectPanelProps & { sect: NonNullable<ReturnType<typeof getAllSectDefs>[number]>; rank: NonNullable<ReturnType<typeof getAllSectDefs>[number]['ranks'][number]> }) {
  const state = getSectState(player);
  return (
    <>
      <section className="sect-section">
        <div className="sect-section-title">{SECT_TEXTS.panel.membershipTitle}</div>
        <div className="sect-card sect-overview">
          <div>{SECT_TEXTS.panel.name(sect.name)}</div>
          <div>{SECT_TEXTS.panel.rank(rank.name)}</div>
          <div>{SECT_TEXTS.panel.contribution(state.contribution, state.totalContribution)}</div>
          <div>{SECT_TEXTS.panel.alignment(SECT_TEXTS.alignment[sect.alignment])}</div>
          <div className="sect-actions">
            <button className="sect-action" onClick={onClaimStipend}>{SECT_TEXTS.panel.claimStipend}</button>
            <button className="sect-action" onClick={onAdvanceRank}>{SECT_TEXTS.panel.advanceRank}</button>
          </div>
        </div>
      </section>

      <section className="sect-section">
        <div className="sect-section-title">{SECT_TEXTS.panel.benefitsTitle}</div>
        <div className="sect-tags">{describeSectBenefits(player).map(line => <span key={line} className="sect-tag">{line}</span>)}</div>
      </section>

      <section className="sect-section">
        <div className="sect-section-title">{SECT_TEXTS.panel.missionsTitle}</div>
        <div className="sect-card-list">
          {sect.missions.length === 0 ? <div className="sect-empty">{SECT_TEXTS.panel.noMissions}</div> : sect.missions.map(mission => (
            <article key={mission.id} className="sect-card">
              <div className="sect-card-title">{mission.title}</div>
              <div className="sect-desc">{mission.description}</div>
              <div className="sect-meta">{SECT_TEXTS.panel.rankRequirement(sect.ranks.find(r => r.id === mission.minRankId)?.name ?? mission.minRankId)}</div>
              <div className="sect-meta">{SECT_TEXTS.panel.cooldown(mission.repeatCooldownMonths)}</div>
              <button className="sect-action" onClick={() => onCompleteMission(mission.id)}>{SECT_TEXTS.panel.doMission}</button>
            </article>
          ))}
        </div>
      </section>

      <section className="sect-section">
        <div className="sect-section-title">{SECT_TEXTS.panel.storeTitle}</div>
        <div className="sect-card-list">
          {sect.store.length === 0 ? <div className="sect-empty">{SECT_TEXTS.panel.noStore}</div> : sect.store.map(item => (
            <article key={item.itemId} className="sect-card">
              <div className="sect-card-title">{getItemDef(item.itemId)?.name ?? item.itemId}</div>
              <div className="sect-meta">{SECT_TEXTS.panel.costContribution(item.contributionCost)}</div>
              <div className="sect-meta">{SECT_TEXTS.panel.rankRequirement(sect.ranks.find(r => r.id === item.minRankId)?.name ?? item.minRankId)}</div>
              <button className="sect-action" onClick={() => onBuyStoreItem(item.itemId)}>{SECT_TEXTS.panel.buy}</button>
            </article>
          ))}
        </div>
      </section>

      <ManagementView
        sect={sect}
        state={state}
        onFoundManagement={onFoundManagement}
        onRecruitMember={onRecruitMember}
        onCollectYield={onCollectYield}
        onUpgradeFacility={onUpgradeFacility}
        onAssignMemberTask={onAssignMemberTask}
      />
    </>
  );
}

function ManagementView({ sect, state, onFoundManagement, onRecruitMember, onCollectYield, onUpgradeFacility, onAssignMemberTask }: {
  sect: ReturnType<typeof getAllSectDefs>[number];
  state: ReturnType<typeof getSectState>;
  onFoundManagement: () => void;
  onRecruitMember: () => void;
  onCollectYield: () => void;
  onUpgradeFacility: (facilityId: string) => void;
  onAssignMemberTask: (memberId: string, task: SectMemberState['task']) => void;
}) {
  const management = state.management;
  if (!management?.active) {
    return (
      <section className="sect-section">
        <div className="sect-section-title">{SECT_TEXTS.panel.managementTitle}</div>
        <button className="sect-action" onClick={onFoundManagement}>{SECT_TEXTS.panel.foundManagement}</button>
      </section>
    );
  }
  return (
    <section className="sect-section">
      <div className="sect-section-head">
        <div className="sect-section-title">{SECT_TEXTS.panel.managementTitle}</div>
        <div className="sect-actions">
          <button className="sect-action" onClick={onRecruitMember}>{SECT_TEXTS.panel.recruit}</button>
          <button className="sect-action" onClick={onCollectYield}>{SECT_TEXTS.panel.collectYield}</button>
        </div>
      </div>
      <div className="sect-resource-line">
        {SECT_TEXTS.panel.resourceLine(management.resources.treasury, management.resources.herbs, management.resources.ore, management.resources.morale, management.resources.prestige)}
      </div>
      <div className="sect-subtitle">{SECT_TEXTS.panel.membersTitle}</div>
      <div className="sect-card-list">
        {management.members.length === 0 ? <div className="sect-empty">{SECT_TEXTS.panel.noMembers}</div> : management.members.map(member => (
          <article key={member.id} className="sect-card">
            <div className="sect-card-title">{member.name}</div>
            <div className="sect-meta">{SECT_TEXTS.panel.memberLine(SECT_TEXTS.memberRoles[member.role], member.loyalty, member.cultivation, SECT_TEXTS.taskNames[member.task])}</div>
            <div className="sect-actions">
              <button className="sect-mini-action" onClick={() => onAssignMemberTask(member.id, 'cultivate')}>{SECT_TEXTS.panel.assignCultivate}</button>
              <button className="sect-mini-action" onClick={() => onAssignMemberTask(member.id, 'gather')}>{SECT_TEXTS.panel.assignGather}</button>
              <button className="sect-mini-action" onClick={() => onAssignMemberTask(member.id, 'guard')}>{SECT_TEXTS.panel.assignGuard}</button>
              <button className="sect-mini-action" onClick={() => onAssignMemberTask(member.id, 'idle')}>{SECT_TEXTS.panel.assignIdle}</button>
            </div>
          </article>
        ))}
      </div>
      <div className="sect-subtitle">{SECT_TEXTS.panel.facilitiesTitle}</div>
      <div className="sect-card-list">
        {sect.facilities.map(facility => {
          const level = management.facilities[facility.id] ?? 0;
          return (
            <article key={facility.id} className="sect-card">
              <div className="sect-card-title">{facility.name}</div>
              <div className="sect-desc">{facility.description}</div>
              <div className="sect-meta">{SECT_TEXTS.panel.facilityLevel(level, facility.maxLevel)}</div>
              <button className="sect-action" onClick={() => onUpgradeFacility(facility.id)}>{SECT_TEXTS.panel.upgrade}</button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
