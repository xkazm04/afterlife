import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTs,
  // .claude/ holds worktree copies of the whole repo (belay run, agent isolation): never lint a lane's checkout.
  { ignores: ['.next/**', '.claude/**', '.contest/**', 'design/**', 'docs/**', 'next-env.d.ts'] },
];

export default config;
