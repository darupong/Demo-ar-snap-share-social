/**
 * Type declarations for A-Frame custom elements in JSX (used by MindAR image tracking).
 * A-Frame and MindAR are loaded via CDN in index.html.
 */
import 'react'

type AFrameHTMLProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>

// Allow hyphenated A-Frame attribute names by intersecting with a loose record
type AFrameAttrs = { [key: string]: unknown }

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'a-scene': AFrameHTMLProps & AFrameAttrs
      'a-assets': AFrameHTMLProps & AFrameAttrs
      'a-camera': AFrameHTMLProps & AFrameAttrs
      'a-entity': AFrameHTMLProps & AFrameAttrs
      'a-video': AFrameHTMLProps & AFrameAttrs
      'a-plane': AFrameHTMLProps & AFrameAttrs
      'a-box': AFrameHTMLProps & AFrameAttrs
    }
  }
}

declare global {
  interface Window {
    AFRAME: unknown
  }
}

export {}
