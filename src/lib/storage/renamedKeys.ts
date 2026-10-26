// Browser keys saved before the rename (Belay -> Afterlife) move to their new name once, before first paint, so nobody
// loses a saved text size, a fleet's last look or an Onboard session. Pure string helpers, no DOM: the boot script runs
// the same moves inline in <head> (RenamedKeysBoot), ahead of the text-size boot script that reads the new key.

/** The prefix keys had before the rename. It keeps the old name on purpose: it is what browsers already hold. */
export const OLD_KEY_PREFIX = 'belay.';
export const KEY_PREFIX = 'afterlife.';

/** The key a pre-rename key moves to, or null for a key that is not one. */
export function renamedKey(key: string): string | null {
  return key.startsWith(OLD_KEY_PREFIX) ? `${KEY_PREFIX}${key.slice(OLD_KEY_PREFIX.length)}` : null;
}

/**
 * The inline script: for localStorage and sessionStorage, every `belay.*` key is copied to its `afterlife.*` name
 * unless that name already holds a value (a newer save wins), then removed. Each store in its own try/catch: blocked
 * storage (a private window, a sandboxed preview) moves nothing and never breaks the page.
 */
export function renamedKeysScriptSource(): string {
  const from = JSON.stringify(OLD_KEY_PREFIX);
  const to = JSON.stringify(KEY_PREFIX);
  return (
    `(function(){function m(g){try{var s=g(),o=[],i,k,n;for(i=0;i<s.length;i++){k=s.key(i);if(k&&k.indexOf(${from})===0)o.push(k)}` +
    `for(i=0;i<o.length;i++){k=o[i];n=${to}+k.slice(${from}.length);if(s.getItem(n)===null)s.setItem(n,s.getItem(k));s.removeItem(k)}}catch(e){}}` +
    `m(function(){return localStorage});m(function(){return sessionStorage})})()`
  );
}
