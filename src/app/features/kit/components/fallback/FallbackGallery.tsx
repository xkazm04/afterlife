'use client';

import { PopupButton } from '@/components/controls/toolbar/PopupButton';
import { ToolbarButton } from '@/components/controls/toolbar/ToolbarButton';
import { HelpButton } from '@/components/overlays/HelpButton';
import { Legend } from '@/components/overlays/popover/Legend';
import { DetailPage, DetailSection } from '@/components/shell/detail/DetailPage';
import { EntityNotFound } from '@/components/shell/fallback/EntityNotFound';
import { ErrorView } from '@/components/shell/fallback/ErrorView';
import { NotFoundView } from '@/components/shell/fallback/NotFoundView';
import { ShellLoading } from '@/components/shell/loading/ShellLoading';
import { GallerySection } from '../GallerySection';
import { Specimen } from '../Specimen';
import styles from './FallbackGallery.module.css';

/** The states a screen falls back to (not found, error, loading), the nested detail page, and the toolbar and help buttons. */
export function FallbackGallery() {
  const error = Object.assign(new Error('GitLab answered 502 for projects/acme'), { digest: 'd41d8cd9' });
  return (
    <GallerySection title="fallback/ and detail/">
      <Specimen label="EntityNotFound: a dynamic route whose thing is missing">
        <div className={styles.frame}>
          <EntityNotFound title="No such project" note="ledgerline-old is not in the watched group." href="/fleet" back="Back to Fleet" />
        </div>
      </Specimen>
      <Specimen label="ErrorView: the message, the digest, Retry">
        <div className={styles.frame}>
          <ErrorView error={error} retry={() => {}} />
        </div>
      </Specimen>
      <Specimen label="NotFoundView: names the path, links to Fleet">
        <div className={styles.frame}>
          <NotFoundView />
        </div>
      </Specimen>
      <Specimen label="ShellLoading: the window frame while a screen streams in">
        <div className={`${styles.frame} ${styles.tall}`}>
          <ShellLoading />
        </div>
      </Specimen>
      <Specimen label="DetailPage and DetailSection: back link, title, lede, a wide card">
        <div className={`${styles.frame} ${styles.tall}`}>
          <DetailPage parent={{ label: 'Fleet', href: '/fleet' }} title="ledgerline" lede="Watching, 31 of 34 proofs pass." status="detail page">
            <DetailSection title="Proof" aux="7 days">
              31 pass, 2 fail, 1 inconclusive
            </DetailSection>
            <DetailSection title="Tier" wide>
              Supervised
            </DetailSection>
          </DetailPage>
        </div>
      </Specimen>
      <Specimen label="ToolbarButton: plain, pressed (a toggle), icon-only needs aria-label">
        <div className={styles.bar}>
          <ToolbarButton>Plain</ToolbarButton>
          <ToolbarButton pressed>Pressed</ToolbarButton>
          <ToolbarButton aria-label="Disabled toolbar button" disabled>
            ?
          </ToolbarButton>
        </div>
      </Specimen>
      <Specimen label="PopupButton: plain, active (a filter is applied, tinted), no icon">
        <div className={styles.bar}>
          <PopupButton icon="sort">Attention</PopupButton>
          <PopupButton icon="filter" active>
            Tier: Hands-off
          </PopupButton>
          <PopupButton>Group</PopupButton>
        </div>
      </Specimen>
      <Specimen label="HelpButton: hover or focus peeks the legend, click pins it (toasts come from ToastProvider, shown under overlays/)">
        <HelpButton title="Legend">
          <Legend rows={[['?', 'Opens this legend']]} />
        </HelpButton>
      </Specimen>
    </GallerySection>
  );
}
