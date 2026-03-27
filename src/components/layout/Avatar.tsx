// ============================================================
// layout/Avatar.tsx — 头像组件（外部 SVG 文件 + 境界边框）
// ============================================================

const REALM_BORDER_COLORS: Record<number, string> = {
  0: '#9E9E9E', // 凡人
  1: '#9E9E9E', // 练气
  2: '#4CAF50', // 筑基
  3: '#2196F3', // 金丹
  4: '#9C27B0', // 元婴
  5: '#FFD700', // 化神
  6: '#FFD700', // 渡劫
  7: '#FFD700', // 大乘
};

const AVATAR_FILES: Record<string, string> = {
  default: '/avatars/default.svg',
};

interface AvatarProps {
  avatarId: string;
  realmIndex: number;
  size?: number;
}

export default function Avatar({ avatarId, realmIndex, size = 100 }: AvatarProps) {
  const borderColor = REALM_BORDER_COLORS[realmIndex] ?? '#FFD700';
  const src = AVATAR_FILES[avatarId] ?? AVATAR_FILES.default;

  return (
    <div
      className="avatar-frame"
      style={{
        width: size,
        height: size,
        borderColor,
        boxShadow: `0 0 12px ${borderColor}44, inset 0 0 8px ${borderColor}22`,
      }}
    >
      <img src={src} alt="头像" className="avatar-img" width={size * 0.85} height={size * 0.85} />
    </div>
  );
}
