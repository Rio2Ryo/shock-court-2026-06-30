import { runScenario, summarize } from '../src/lib/court';

const args = process.argv.slice(2);
const getArg = (name: string, fallback: string) => {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
};

const seed = getArg('seed', 'morning-ryo');
const actions = getArg('actions', 'drag:mika:52:42,pulse,betray,apologize,replay,weird:<svg onload=alert(1)>朝の火花,settle')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const state = runScenario(seed, actions);
const summary = summarize(state);

if (args.includes('--json')) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(`Shock Court scenario seed=${summary.seed} loop=${summary.loop} tick=${summary.tick}`);
  console.log(`lastCollision=${summary.lastCollision}`);
  console.log(`shocks=${summary.shocks} scars=${summary.scars} maxTension=${summary.maxTension}`);
  console.log(`quarantine=${summary.quarantine.join(' | ') || 'none'}`);
  console.log(summary.logs.join('\n'));
}
