// The one pattern for a [param] route's page.tsx on the screen host (fleet, vitals, ladder, maturity, needs-you, task,
// setup): the page reads nothing and draws nothing (the host draws the screen and streams its data), but its title
// names the param. A title that reads params is request data under Cache Components, and generateMetadata reading it
// on an otherwise static page is the "runtime data in generateMetadata()" error (next/dist/docs: generate-metadata).
// The page therefore renders an empty request-time marker behind <Suspense>: Next knows the route is meant to be
// dynamic, the marker paints nothing, and the rest of the layout stays in the static shell.
import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';

type ParamProps = { params: Promise<Record<string, string>> };

/** `generateMetadata` for a [param] page: "<prefix> · <param>" ('Afterlife · Fleet' + project). */
export function paramTitle(prefix: string, name: string): (props: ParamProps) => Promise<Metadata> {
  return async ({ params }) => ({ title: paramTitleOf(prefix, (await params)[name]) });
}

/** "<prefix> · <param>", or the prefix alone without one: the page's title and the host's (ScreenDef.title) alike. */
export function paramTitleOf(prefix: string, param: string | undefined): string {
  return param ? `${prefix} · ${param}` : prefix;
}

/** Says the title is read at request time on purpose; renders nothing. */
async function RequestTime() {
  await connection();
  return null;
}

/** The page itself: the empty request-time marker, nothing else. */
export function ParamShell() {
  return (
    <Suspense>
      <RequestTime />
    </Suspense>
  );
}
