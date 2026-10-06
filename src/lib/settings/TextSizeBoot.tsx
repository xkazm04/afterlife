import { bootScriptSource } from './textSize';

/** Render inside <head>. Sets html[data-text-size] from localStorage before first paint (no flash of the wrong size). */
export function TextSizeBoot() {
  return <script dangerouslySetInnerHTML={{ __html: bootScriptSource() }} />;
}
