import type { Action, CourtLog, CourtState, Resident, ResidentId, ScenarioSummary, Shock, Thread } from './types';

const names: Array<[ResidentId, string, string]> = [
  ['mika', 'Mika', '#ff6b9a'],
  ['ren', 'Ren', '#68d8ff'],
  ['yura', 'Yura', '#ffd166'],
  ['koh', 'Koh', '#9dff8f'],
  ['ryo', 'Ryo', '#c7a5ff'],
];

export function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (const char of seed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rand(seed: number) {
  let value = seed || 1;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return ((value >>> 0) % 10000) / 10000;
  };
}

export function sanitizeWeird(input: string): string {
  return input
    .replace(/<\s*script/gi, 'script-tag')
    .replace(/on\w+\s*=/gi, 'event=')
    .replace(/[<>]/g, '')
    .replace(/[^\P{Cc}\t\n\r]/gu, ' ')
    .slice(0, 80)
    .trim() || 'empty-static';
}

export function createInitialState(seed = 'morning-ryo'): CourtState {
  const next = rand(hashSeed(seed));
  const residents: Resident[] = names.map(([id, name, color], index) => ({
    id,
    name,
    x: 14 + index * 18 + Math.round(next() * 8),
    y: 20 + Math.round(next() * 46),
    vx: 0,
    vy: 0,
    color,
    scars: [],
    quote: 'まだ誰にも触れていない。',
    fearOf: null,
  }));

  const threads: Thread[] = [
    makeThread('mika', 'ren', '密約', 44),
    makeThread('ren', 'yura', '証言', 38),
    makeThread('yura', 'koh', '嫉妬', 50),
    makeThread('koh', 'ryo', '観察', 35),
    makeThread('ryo', 'mika', '朝の余震', 47),
  ];

  return {
    seed,
    loop: 1,
    tick: 0,
    residents,
    threads,
    shocks: [],
    logs: [makeLog(0, 0, '法廷が起動。磁石たちはまだ無傷。', '私的記録: 最初に近づく者を全員が待っている。')],
    quarantine: [],
    lastCollision: 'none',
    courtroomMood: 42,
  };
}

function makeThread(a: ResidentId, b: ResidentId, label: string, tension: number): Thread {
  return {
    id: `${a}-${b}`,
    a,
    b,
    label,
    tension,
    shake: 0,
    publicRecord: `${label}: 安定`,
    privateRecord: `${label}: まだ嘘が混ざっている`,
  };
}

function makeLog(tick: number, salt: number, text: string, privateText: string): CourtLog {
  return { id: `log-${tick}-${salt}-${hashSeed(text).toString(36)}`, tick, text, privateText };
}

function shockBurst(tick: number, x: number, y: number, label: string): Shock[] {
  const shocks: Shock[] = [
    { id: `ring-${tick}-${label}`, x, y, radius: 22, ttl: 6, kind: 'ring', text: 'バチッ' },
    { id: `crack-${tick}-${label}`, x: x + 2, y: y + 2, radius: 10, ttl: 9, kind: 'crack' },
  ];
  for (let i = 0; i < 8; i += 1) {
    shocks.push({ id: `spark-${tick}-${label}-${i}`, x: x + (i - 4) * 2, y: y + ((i % 3) - 1) * 5, radius: 3 + (i % 3), ttl: 4 + (i % 4), kind: 'spark' });
  }
  return shocks;
}

export function dragResident(state: CourtState, id: ResidentId, x: number, y: number): CourtState {
  const safeX = Math.max(4, Math.min(94, Number.isFinite(x) ? x : 50));
  const safeY = Math.max(8, Math.min(86, Number.isFinite(y) ? y : 45));
  const residents = state.residents.map((r) => (r.id === id ? { ...r, x: safeX, y: safeY, quote: '誰かの近くで糸が鳴っている。' } : r));
  return resolveCollisions({ ...state, residents, tick: state.tick + 1 });
}

function distance(a: Resident, b: Resident): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function resolveCollisions(state: CourtState): CourtState {
  const next = { ...state, residents: state.residents.map((r) => ({ ...r, scars: [...r.scars] })), threads: state.threads.map((t) => ({ ...t })), shocks: state.shocks.map((s) => ({ ...s })) };
  let salt = next.logs.length;
  for (let i = 0; i < next.residents.length; i += 1) {
    for (let j = i + 1; j < next.residents.length; j += 1) {
      const a = next.residents[i];
      const b = next.residents[j];
      if (distance(a, b) < 17) {
        const label = `${a.id}-${b.id}`;
        const midX = Math.round((a.x + b.x) / 2);
        const midY = Math.round((a.y + b.y) / 2);
        const scar = `loop${next.loop}:${b.name}との火花@${midX},${midY}`;
        const dx = a.x <= b.x ? -7 : 7;
        a.x = Math.max(4, Math.min(94, a.x + dx));
        b.x = Math.max(4, Math.min(94, b.x - dx));
        a.scars = [...new Set([...a.scars, scar])];
        b.scars = [...new Set([...b.scars, `loop${next.loop}:${a.name}を覚えた焦げ跡`])];
        a.fearOf = b.id;
        b.fearOf = a.id;
        a.quote = `${b.name}に触れる前から身体が逃げた。`;
        b.quote = `${a.name}の火花を、公開記録には薄く書く。`;
        next.threads = next.threads.map((t) => {
          if ([t.a, t.b].includes(a.id) || [t.a, t.b].includes(b.id)) {
            const tension = Math.min(99, t.tension + 17);
            return { ...t, tension, shake: Math.min(100, t.shake + 55), publicRecord: `${t.label}: 軽い接触`, privateRecord: `${t.label}: ${a.name}と${b.name}がバチッと割れた` };
          }
          return t;
        });
        next.shocks = [...next.shocks, ...shockBurst(next.tick, midX, midY, label)];
        next.lastCollision = `${a.name}-${b.name} shock @ ${midX},${midY}`;
        next.logs = [...next.logs, makeLog(next.tick, salt, `公開: ${a.name}と${b.name}は軽く接触。`, `本音: ${a.name}と${b.name}の間に白い衝撃リングと焦げ跡。`)];
        next.courtroomMood = Math.min(99, next.courtroomMood + 9);
        salt += 1;
      }
    }
  }
  return next;
}

export function act(state: CourtState, action: Action): CourtState {
  const tick = state.tick + 1;
  if (action === 'pulse') {
    const hot = state.threads.reduce((a, b) => (a.tension > b.tension ? a : b));
    const a = state.residents.find((r) => r.id === hot.a)!;
    const b = state.residents.find((r) => r.id === hot.b)!;
    return resolveCollisions({ ...state, tick, residents: state.residents.map((r) => r.id === b.id ? { ...r, x: a.x + 8, y: a.y + 5 } : r), logs: [...state.logs, makeLog(tick, state.logs.length, '誰かが机を叩いた。糸が震える。', `本音: ${hot.label}が一番先に鳴った。`)] });
  }
  if (action === 'apologize') {
    return { ...state, tick, threads: state.threads.map((t) => ({ ...t, tension: Math.max(0, t.tension - 8), shake: Math.max(0, t.shake - 15), publicRecord: `${t.label}: 謝罪済み`, privateRecord: `${t.label}: 傷は残ったまま` })), logs: [...state.logs, makeLog(tick, state.logs.length, '謝罪で張力だけ少し下がった。', '本音: scarは消えない。第三者が見ている。')] };
  }
  if (action === 'replay') {
    return { ...state, tick, loop: state.loop + 1, shocks: [...state.shocks, ...shockBurst(tick, 50, 46, `replay-${state.loop + 1}`)], residents: state.residents.map((r) => ({ ...r, quote: r.scars.length ? `2周目: ${r.scars[0]}を先に思い出した。` : '2周目なのにまだ無傷のふりをした。' })), logs: [...state.logs, makeLog(tick, state.logs.length, `2周目へ。${state.lastCollision}を床が再生。`, '本音: 公開記録より焦げ跡のほうが正確。')] };
  }
  if (action === 'betray') {
    return { ...state, tick, threads: state.threads.map((t, idx) => idx === 0 ? { ...t, tension: 96, shake: 80, label: '裏切り証言', publicRecord: '裏切り証言: 事故', privateRecord: '裏切り証言: 故意に近づけた' } : t), logs: [...state.logs, makeLog(tick, state.logs.length, '裏切り糸が公開された。', '本音: 事故ではなく、配置された衝突。')] };
  }
  return { ...state, tick, shocks: state.shocks.map((s) => ({ ...s, ttl: s.ttl - 1, radius: s.radius + 5 })).filter((s) => s.ttl > 0), threads: state.threads.map((t) => ({ ...t, shake: Math.max(0, t.shake - 12) })), logs: [...state.logs, makeLog(tick, state.logs.length, '余震が少し静まった。', '本音: 静かになっただけで消えていない。')] };
}

export function addWeird(state: CourtState, input: string): CourtState {
  const clean = sanitizeWeird(input);
  return { ...state, tick: state.tick + 1, quarantine: [...state.quarantine, clean], shocks: [...state.shocks, { id: `quarantine-${state.tick}-${hashSeed(clean)}`, x: 12, y: 82, radius: 14, ttl: 8, kind: 'crack', text: clean }], logs: [...state.logs, makeLog(state.tick + 1, state.logs.length, '変な入力を焦げ跡の瓶に隔離。', `隔離: ${clean}`)] };
}

export function summarize(state: CourtState): ScenarioSummary {
  return {
    seed: state.seed,
    loop: state.loop,
    tick: state.tick,
    scars: state.residents.reduce((sum, r) => sum + r.scars.length, 0),
    shocks: state.shocks.length,
    maxTension: Math.max(...state.threads.map((t) => t.tension)),
    logs: state.logs.slice(-5).map((l) => `${l.text} / ${l.privateText}`),
    lastCollision: state.lastCollision,
    quarantine: state.quarantine,
  };
}

export function runScenario(seed: string, actions: string[]): CourtState {
  let state = createInitialState(seed);
  for (const raw of actions) {
    const [cmd, a, b, c] = raw.split(':');
    if (cmd === 'drag') state = dragResident(state, a as ResidentId, Number(b), Number(c));
    else if (cmd === 'weird') state = addWeird(state, raw.slice('weird:'.length));
    else if (['pulse', 'apologize', 'replay', 'settle', 'betray'].includes(cmd)) state = act(state, cmd as Action);
  }
  return state;
}
