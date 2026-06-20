/**
 * 成就系统定义与本地进度管理（localStorage）。
 * 服务端通过 /api/achievement 持久化，前端用本地存储做即时反馈与去重弹窗。
 */

export const ACHIEVEMENTS = [
  { key: 'first_draw', name: '初次落笔', desc: '完成第一次隔空绘画', icon: '🖐️' },
  { key: 'first_save', name: '第一幅作品', desc: '保存你的第一幅画作', icon: '🎨' },
  { key: 'brush_master', name: '画笔大师', desc: '解锁并使用全部 8 种特效画笔', icon: '🖌️' },
  { key: 'template_done', name: '临摹达人', desc: '完成一次模板临摹', icon: '✏️' },
  { key: 'game_clear', name: '游戏高手', desc: '体感小游戏得分突破 100', icon: '🏆' },
  { key: 'streak_3', name: '坚持打卡', desc: '连续打卡 3 天', icon: '🔥' },
  { key: 'streak_7', name: '一周创作', desc: '连续打卡 7 天', icon: '🌟' },
  { key: 'social_like', name: '人气作者', desc: '作品获得第一个赞', icon: '❤️' },
];

const LS_KEY = 'air-doodle-achievements';
const BRUSH_KEY = 'air-doodle-brushes-used';

export function getUnlocked() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * 解锁成就。若为新解锁返回成就对象，否则返回 null（供前端决定是否弹窗）。
 */
export function unlock(key) {
  if (typeof window === 'undefined') return null;
  const def = ACHIEVEMENTS.find((a) => a.key === key);
  if (!def) return null;
  const list = getUnlocked();
  if (list.includes(key)) return null;
  list.push(key);
  localStorage.setItem(LS_KEY, JSON.stringify(list));
  // 同步到服务端（匿名用户也记录，失败不阻塞）
  fetch('/api/achievement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, name: def.name, desc: def.desc, icon: def.icon }),
  }).catch(() => {});
  return def;
}

// 记录使用过的画笔，集齐全部解锁画笔大师
export function recordBrush(brushId) {
  if (typeof window === 'undefined') return null;
  let used = [];
  try {
    used = JSON.parse(localStorage.getItem(BRUSH_KEY) || '[]');
  } catch {
    used = [];
  }
  if (!used.includes(brushId)) {
    used.push(brushId);
    localStorage.setItem(BRUSH_KEY, JSON.stringify(used));
  }
  if (used.length >= 8) return unlock('brush_master');
  return null;
}

// 每日打卡，返回 { streak, newAchievement }
export function checkIn() {
  if (typeof window === 'undefined') return { streak: 0, newAchievement: null };
  const today = new Date().toDateString();
  let data;
  try {
    data = JSON.parse(localStorage.getItem('air-doodle-checkin') || 'null');
  } catch {
    data = null;
  }
  let streak = 1;
  if (data) {
    if (data.last === today) {
      streak = data.streak; // 今天已打卡
      return { streak, newAchievement: null };
    }
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    streak = data.last === yesterday ? data.streak + 1 : 1;
  }
  localStorage.setItem('air-doodle-checkin', JSON.stringify({ last: today, streak }));
  let newAchievement = null;
  if (streak >= 7) newAchievement = unlock('streak_7');
  else if (streak >= 3) newAchievement = unlock('streak_3');
  return { streak, newAchievement };
}
