export type ResidentId = 'mika' | 'ren' | 'yura' | 'koh' | 'ryo';

export type Resident = {
  id: ResidentId;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  scars: string[];
  quote: string;
  fearOf: ResidentId | null;
};

export type Thread = {
  id: string;
  a: ResidentId;
  b: ResidentId;
  label: string;
  tension: number;
  shake: number;
  publicRecord: string;
  privateRecord: string;
};

export type Shock = {
  id: string;
  x: number;
  y: number;
  radius: number;
  ttl: number;
  kind: 'ring' | 'spark' | 'crack';
  text?: string;
};

export type CourtLog = {
  id: string;
  tick: number;
  text: string;
  privateText: string;
};

export type CourtState = {
  seed: string;
  loop: number;
  tick: number;
  residents: Resident[];
  threads: Thread[];
  shocks: Shock[];
  logs: CourtLog[];
  quarantine: string[];
  lastCollision: string;
  courtroomMood: number;
};

export type Action =
  | 'pulse'
  | 'apologize'
  | 'replay'
  | 'settle'
  | 'betray';

export type ScenarioSummary = {
  seed: string;
  loop: number;
  tick: number;
  scars: number;
  shocks: number;
  maxTension: number;
  logs: string[];
  lastCollision: string;
  quarantine: string[];
};
