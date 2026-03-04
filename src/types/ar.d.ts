// Global declarations for AR.js and Three.js CDN-loaded globals
// These are attached to window by the CDN scripts in index.html
// THREE.js r128 loads first, then AR.js attaches THREEx to window

import type * as Three from 'three'

declare global {
  // Three.js r128 loaded via CDN - same instance used by AR.js internally
  interface Window {
    THREE: typeof Three
    THREEx: typeof THREEx
  }

  // Allow `window.THREE` and `window.THREEx` access
  const THREE: typeof Three

  // AR.js toolkit namespace (attached to window by CDN build)
  namespace THREEx {
    class ArToolkitSource {
      constructor(parameters: ArToolkitSourceParameters)
      domElement: HTMLVideoElement | HTMLImageElement
      ready: boolean
      init(onReady?: () => void, onError?: (error: unknown) => void): void
      onResizeElement(): void
      copyElementSizeTo(target: HTMLElement): void
    }

    interface ArToolkitSourceParameters {
      sourceType: 'webcam' | 'image' | 'video'
      sourceWidth?: number
      sourceHeight?: number
      displayWidth?: number
      displayHeight?: number
    }

    class ArToolkitContext {
      constructor(parameters: ArToolkitContextParameters)
      arController: { canvas: HTMLCanvasElement } | null
      init(onCompleted?: () => void): void
      getProjectionMatrix(): Three.Matrix4
      update(srcElement: HTMLVideoElement | HTMLImageElement): void
    }

    interface ArToolkitContextParameters {
      cameraParametersUrl: string
      detectionMode?: 'mono' | 'mono_and_matrix' | 'color' | 'color_and_matrix'
      maxDetectionRate?: number
      canvasWidth?: number
      canvasHeight?: number
      imageSmoothingEnabled?: boolean
    }

    class ArMarkerControls {
      constructor(
        context: ArToolkitContext,
        object3d: Three.Object3D,
        parameters: ArMarkerControlsParameters
      )
    }

    interface ArMarkerControlsParameters {
      type: 'pattern' | 'barcode' | 'unknown'
      patternUrl?: string
      barcodeValue?: number
      changeMatrixMode?: 'cameraTransformMatrix' | 'modelViewMatrix'
      minConfidence?: number
    }
  }
}

export {}
