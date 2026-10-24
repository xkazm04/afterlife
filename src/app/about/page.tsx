import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { AboutFilm } from '../features/about/AboutFilm';
import { AboutFrame } from '../features/about/AboutFrame';
import { loadAboutData } from '../features/about/data/loadAboutData';

export const metadata: Metadata = { title: 'Belay About' };

// /about: the one-change film, full-bleed outside the app window (like the front door). The frame is static; the loop
// and the data mode are read at request time inside <Suspense>, so the build never bakes in BELAY_MODE or the demo.
export default function AboutPage() {
  return (
    <Suspense fallback={<AboutFrame />}>
      <AboutRead />
    </Suspense>
  );
}

async function AboutRead() {
  await connection(); // request time: the data source and its data are the running server's, never the build's
  return <AboutFilm data={loadAboutData()} />;
}
