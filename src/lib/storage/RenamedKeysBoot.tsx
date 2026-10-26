import { renamedKeysScriptSource } from './renamedKeys';

/** Render first inside <head>: moves pre-rename `belay.*` browser keys to `afterlife.*` before any boot script reads one. */
export function RenamedKeysBoot() {
  return <script dangerouslySetInnerHTML={{ __html: renamedKeysScriptSource() }} />;
}
