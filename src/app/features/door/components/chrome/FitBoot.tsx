import { stageFitSource } from '../../model/fit';

/**
 * Render inside the root layout's <head>: fits the front door's stage and applies its render tier before first paint.
 * A <script> in a page component is never run when React renders it on the client, and React warns about it; the
 * layout's head is server-rendered once, as TextSizeBoot is. The variables it sets are read only by the door.
 */
export function DoorFitBoot() {
  return <script dangerouslySetInnerHTML={{ __html: stageFitSource() }} />;
}
