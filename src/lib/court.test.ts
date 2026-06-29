import { describe, expect, it } from 'vitest';
import { act, addWeird, createInitialState, dragResident, runScenario, sanitizeWeird, summarize } from './court';

const scenarioActions = ['drag:mika:52:42', 'pulse', 'betray', 'apologize', 'replay', 'weird:<img src=x onerror=alert(1)>朝', 'settle'];

describe('Shock Court simulation', () => {
  it('creates deterministic scenario summaries', () => {
    const a = summarize(runScenario('morning-ryo', scenarioActions));
    const b = summarize(runScenario('morning-ryo', scenarioActions));
    expect(a).toEqual(b);
    expect(a.loop).toBe(2);
    expect(a.shocks).toBeGreaterThan(0);
  });

  it('produces shock rings and scars when residents collide', () => {
    const state = dragResident(createInitialState('impact'), 'mika', 52, 42);
    expect(state.lastCollision).not.toBe('none');
    expect(state.shocks.some((shock) => shock.kind === 'ring')).toBe(true);
    expect(state.residents.reduce((sum, resident) => sum + resident.scars.length, 0)).toBeGreaterThan(0);
  });

  it('keeps apology as a side-effect instead of deleting scars', () => {
    const collided = dragResident(createInitialState('apology'), 'mika', 52, 42);
    const scarsBefore = summarize(collided).scars;
    const apologized = act(collided, 'apologize');
    expect(summarize(apologized).scars).toBe(scarsBefore);
    expect(Math.max(...apologized.threads.map((thread) => thread.shake))).toBeLessThanOrEqual(Math.max(...collided.threads.map((thread) => thread.shake)));
  });

  it('sanitizes hostile weird input for quarantine display', () => {
    const clean = sanitizeWeird('<svg onload=alert(1)>朝<script>alert(2)</script>');
    expect(clean).not.toContain('<');
    expect(clean).not.toContain('onload=');
    expect(clean).toContain('event=');
    const state = addWeird(createInitialState('weird'), '<img src=x onerror=alert(1)>');
    expect(state.quarantine[0]).not.toContain('<img');
  });

  it('uses unique log ids after repeated actions', () => {
    const state = runScenario('repeat', ['pulse', 'pulse', 'pulse', 'replay', 'replay']);
    const ids = state.logs.map((log) => log.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
