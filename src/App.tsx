import { useEffect, useRef, useState } from 'react';
import './styles.css';
import { act, addWeird, createInitialState, dragResident, runScenario, sanitizeWeird, summarize } from './lib/court';
import type { Action, CourtState, ResidentId } from './lib/types';

declare global {
  interface Window {
    __SHOCK_COURT__?: {
      getState: () => CourtState;
      summary: () => ReturnType<typeof summarize>;
      drag: (id: ResidentId, x: number, y: number) => ReturnType<typeof summarize>;
      act: (action: Action) => ReturnType<typeof summarize>;
      weird: (input: string) => ReturnType<typeof summarize>;
      scenario: (actions: string[], seed?: string) => ReturnType<typeof summarize>;
      export: () => string;
    };
  }
}

function seedFromUrl() {
  const params = new URLSearchParams(location.search);
  return sanitizeWeird(params.get('seed') || 'morning-ryo');
}

export default function App() {
  const [state, setState] = useState(() => createInitialState(seedFromUrl()));
  const [weird, setWeird] = useState('<svg onload=alert(1)>朝の火花');
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const update = (next: CourtState) => {
    stateRef.current = next;
    setState(next);
    return summarize(next);
  };

  useEffect(() => {
    window.__SHOCK_COURT__ = {
      getState: () => stateRef.current,
      summary: () => summarize(stateRef.current),
      drag: (id, x, y) => update(dragResident(stateRef.current, id, x, y)),
      act: (action) => update(act(stateRef.current, action)),
      weird: (input) => update(addWeird(stateRef.current, input)),
      scenario: (actions, seed = stateRef.current.seed) => update(runScenario(seed, actions)),
      export: () => JSON.stringify(stateRef.current),
    };
    return () => {
      delete window.__SHOCK_COURT__;
    };
  }, []);

  const doAct = (action: Action) => setState((prev) => act(prev, action));
  const closeCollision = () => setState((prev) => dragResident(prev, 'mika', 52, 42));

  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">seed: {state.seed} / loop {state.loop}</p>
          <h1>Shock Court</h1>
          <p>住民磁石を近づけると、白い衝撃リング・火花・ヒビ・震える糸が残る朝の衝突法廷。</p>
        </div>
        <div className="mood">法廷温度 {state.courtroomMood}</div>
      </section>

      <section className="controls" aria-label="法廷操作">
        <button onClick={closeCollision}>Mikaを衝突点へ寄せる</button>
        <button onClick={() => doAct('pulse')}>机を叩く</button>
        <button onClick={() => doAct('betray')}>裏切り糸を公開</button>
        <button onClick={() => doAct('apologize')}>謝罪する</button>
        <button onClick={() => doAct('replay')}>2周目で再現</button>
        <button onClick={() => doAct('settle')}>余震を静める</button>
      </section>

      <section className="court" aria-label="衝突法廷">
        <div className="threads">
          {state.threads.map((thread) => {
            const a = state.residents.find((r) => r.id === thread.a)!;
            const b = state.residents.find((r) => r.id === thread.b)!;
            const left = Math.min(a.x, b.x);
            const top = Math.min(a.y, b.y);
            const width = Math.max(2, Math.hypot(a.x - b.x, a.y - b.y));
            const angle = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
            return <i key={thread.id} className="thread" style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, rotate: `${angle}deg`, opacity: 0.35 + thread.tension / 180, animationDuration: `${Math.max(0.25, 1.2 - thread.shake / 120)}s` }} title={`${thread.label} ${thread.tension}`} />;
          })}
        </div>
        {state.shocks.map((shock) => <span key={shock.id} className={`shock ${shock.kind}`} style={{ left: `${shock.x}%`, top: `${shock.y}%`, width: shock.radius, height: shock.radius }}>{shock.text}</span>)}
        {state.residents.map((resident) => (
          <button
            key={resident.id}
            className="resident"
            style={{ left: `${resident.x}%`, top: `${resident.y}%`, background: resident.color }}
            onClick={() => setState((prev) => dragResident(prev, resident.id, 50, 44))}
            aria-label={`${resident.name}を中央へ動かす`}
          >
            <strong>{resident.name}</strong>
            <small>{resident.scars.length} scars</small>
          </button>
        ))}
      </section>

      <section className="panels">
        <article>
          <h2>住民の本音</h2>
          {state.residents.map((resident) => <p key={resident.id}><b>{resident.name}</b>: {resident.quote}</p>)}
        </article>
        <article>
          <h2>公開記録 / 私的記録</h2>
          {state.threads.map((thread) => <p key={thread.id}><b>{thread.tension}</b> {thread.publicRecord}<br /><span>{thread.privateRecord}</span></p>)}
        </article>
        <article>
          <h2>変な入力の隔離瓶</h2>
          <label>
            入力
            <input value={weird} onChange={(event) => setWeird(event.target.value)} />
          </label>
          <button onClick={() => setState((prev) => addWeird(prev, weird))}>焦げ跡として隔離</button>
          <ul>{state.quarantine.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
        </article>
        <article>
          <h2>ログ</h2>
          {state.logs.slice(-6).map((log) => <p key={log.id}>{log.text}<br /><span>{log.privateText}</span></p>)}
        </article>
      </section>
    </main>
  );
}
