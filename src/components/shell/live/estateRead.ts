// The estate half of the shell's request-time read: the Settings demo-estate cookie and how many real projects are
// saved (discover's loadProjects). Read beside readShellInfo by ShellRead and GET /api/shell, so the nav (which demo
// screens show), the banner and the Settings switch all hear the same answer. Call it after connection().
import { cookies } from 'next/headers';
import { loadProjects } from '@/server/discover';
import { DEMO_ESTATE_COOKIE, estateOf, parseDemoEstate, type Estate } from '@/lib/settings/demoEstate';

/** The estate, or undefined when the projects could not be read (the nav then shows every screen, as before). */
export async function readEstate(): Promise<Estate | undefined> {
  let raw: string | undefined;
  try {
    raw = (await cookies()).get(DEMO_ESTATE_COOKIE)?.value;
  } catch {
    raw = undefined; // no request scope (a test, a prerender): the default setting
  }
  try {
    return estateOf(parseDemoEstate(raw), loadProjects().length);
  } catch {
    return undefined;
  }
}
