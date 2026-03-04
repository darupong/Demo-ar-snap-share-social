import {
  useEffect, useRef, useImperativeHandle, forwardRef, useCallback,
} from 'react'
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'

export const NERD_GLASSES_OBJ_URL = '/3d/Nerd_Glasses/15945%20Nerd%20Glasses_v1_new.obj'

/** ปรับค่าแว่น 3D ให้ตรงใบหน้า (ใน FaceMeshCanvas.tsx) */
const NERD_GLASSES_3D_TUNE = {
  /** เลื่อนแว่นซ้าย(+) / ขวา(-) (พิกเซล) */
  offsetX: 940,
  /** เลื่อนแว่นขึ้น(-) / ลง(+) (พิกเซล) */
  offsetY: -330,
  /** ระยะระหว่างตาคูณค่านี้ = ความกว้างใบหน้าที่ใช้คำนวณขนาดแว่น (ยิ่งมากแว่นยิ่งใหญ่) */
  eyeSpanMultiplier: 1.2,
  /** ความกว้างใบหน้า (พิกเซล) หารค่านี้ = scale แว่น (ยิ่งมากแว่นยิ่งเล็ก) */
  scaleDivisor: 6,
  /** พลิกแกน Y (true = แก้กรณีเงยขึ้นแว่นลง เงยลงแว่นขึ้น) */
  invertY: true,
  /** พลิกทิศทางเอียง (true = ถ้าขาแว่นหันสวนกับตอนเอียงหน้า) */
  invertTilt: false,
  /** ตัวคูณมุมเอียง (1 = ปกติ, มากกว่า 1 = เอียงมากขึ้น เช่น 1.5) */
  tiltMultiplier: 7.5,
}

export type FaceEffect = 'glasses' | 'lipstick' | 'blush' | 'crown' | 'cat' | 'stickers' | 'nerd_glasses_3d'

export interface FaceMeshCanvasRef {
  captureImage: () => Promise<string | null>
}

interface FaceMeshCanvasProps {
  effect: FaceEffect
  effectColor?: string
  onFaceDetected?: (count: number) => void
  onReady?: () => void
  onError?: (msg: string) => void
}

// ─── Coordinate helpers ────────────────────────────────────────────────────

function getCoverTransform(videoW: number, videoH: number, screenW: number, screenH: number) {
  const va = videoW / videoH, sa = screenW / screenH
  let displayW: number, displayH: number
  if (va > sa) { displayH = screenH; displayW = screenH * va }
  else          { displayW = screenW; displayH = screenW / va }
  return { displayW, displayH, offsetX: (screenW - displayW) / 2, offsetY: (screenH - displayH) / 2 }
}

type Mapper = (v: number) => number

// ─── Effect: Glasses ───────────────────────────────────────────────────────

function drawGlasses(
  ctx: CanvasRenderingContext2D,
  lm: NormalizedLandmark[],
  mx: Mapper, my: Mapper,
  color: string,
) {
  // Eye corner landmarks
  const loX = mx(lm[33].x),  liX = mx(lm[133].x), ltY = my(lm[159].y), lbY = my(lm[145].y)
  const roX = mx(lm[263].x), riX = mx(lm[362].x), rtY = my(lm[386].y), rbY = my(lm[374].y)

  const lCx = (loX + liX) / 2, lCy = (ltY + lbY) / 2
  const lRx = Math.abs(loX - liX) / 2 * 1.15, lRy = Math.abs(ltY - lbY) / 2 * 1.45

  const rCx = (roX + riX) / 2, rCy = (rtY + rbY) / 2
  const rRx = Math.abs(roX - riX) / 2 * 1.15, rRy = Math.abs(rtY - rbY) / 2 * 1.45

  const tilt = Math.atan2(lCy - rCy, lCx - rCx)
  const lw   = Math.max(2.5, lRy * 0.25)

  ctx.save()

  // Lens fill (subtle tint)
  ctx.globalAlpha = 0.18
  ctx.fillStyle = color
  ctx.beginPath(); ctx.ellipse(lCx, lCy, lRx, lRy, tilt, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.ellipse(rCx, rCy, rRx, rRy, tilt, 0, Math.PI * 2); ctx.fill()

  // Frame stroke
  ctx.globalAlpha = 1
  ctx.strokeStyle = color
  ctx.lineWidth = lw
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath(); ctx.ellipse(lCx, lCy, lRx, lRy, tilt, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.ellipse(rCx, rCy, rRx, rRy, tilt, 0, Math.PI * 2); ctx.stroke()

  // Bridge (curved arc between inner corners)
  const bMidX = (liX + riX) / 2, bMidY = Math.min(lCy, rCy) - lRy * 0.35
  ctx.beginPath()
  ctx.moveTo(lCx - lRx, lCy)
  ctx.quadraticCurveTo(bMidX, bMidY, rCx + rRx, rCy)
  ctx.stroke()

  // Temples (extend outward from outer edges)
  const tmLen = lRx * 2.2
  ctx.beginPath(); ctx.moveTo(lCx + lRx, lCy); ctx.lineTo(lCx + lRx + tmLen, lCy + tmLen * 0.1); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(rCx - rRx, rCy); ctx.lineTo(rCx - rRx - tmLen, rCy + tmLen * 0.1); ctx.stroke()

  ctx.restore()
}

// ─── Effect: Lipstick ─────────────────────────────────────────────────────

const UPPER_OUTER = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291]
const UPPER_INNER = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308]
const LOWER_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291]
const LOWER_INNER = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308]

function lipPath(
  ctx: CanvasRenderingContext2D,
  outer: number[], inner: number[],
  lm: NormalizedLandmark[], mx: Mapper, my: Mapper,
) {
  ctx.beginPath()
  outer.forEach((i, j) =>
    j === 0 ? ctx.moveTo(mx(lm[i].x), my(lm[i].y)) : ctx.lineTo(mx(lm[i].x), my(lm[i].y))
  )
  ;[...inner].reverse().forEach(i => ctx.lineTo(mx(lm[i].x), my(lm[i].y)))
  ctx.closePath()
}

function drawLipstick(
  ctx: CanvasRenderingContext2D,
  lm: NormalizedLandmark[],
  mx: Mapper, my: Mapper,
  color: string,
) {
  ctx.save()
  ctx.fillStyle = color
  ctx.globalAlpha = 0.72

  lipPath(ctx, UPPER_OUTER, UPPER_INNER, lm, mx, my); ctx.fill()
  lipPath(ctx, LOWER_OUTER, LOWER_INNER, lm, mx, my); ctx.fill()

  // Gloss highlight
  ctx.globalAlpha = 0.28
  const gx = mx(lm[0].x), gy = my(lm[0].y)
  const gR = Math.abs(mx(lm[61].x) - mx(lm[291].x)) * 0.18
  const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, gR)
  grad.addColorStop(0, 'rgba(255,255,255,0.9)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.beginPath(); ctx.ellipse(gx, gy, gR, gR * 0.5, 0, 0, Math.PI * 2); ctx.fill()

  ctx.restore()
}

// ─── Effect: Blush ────────────────────────────────────────────────────────

function drawBlush(
  ctx: CanvasRenderingContext2D,
  lm: NormalizedLandmark[],
  mx: Mapper, my: Mapper,
) {
  const faceW = Math.abs(mx(lm[234].x) - mx(lm[454].x))
  const r = faceW * 0.13

  for (const idx of [116, 345]) {
    const x = mx(lm[idx].x), y = my(lm[idx].y)
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0,   'rgba(255,105,130,0.55)')
    g.addColorStop(0.5, 'rgba(255, 80,110,0.28)')
    g.addColorStop(1,   'rgba(255, 60, 90,0)')
    ctx.save(); ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  }

  // Small sparkles on cheeks
  ctx.save()
  ctx.font = `${faceW * 0.08}px serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.globalAlpha = 0.8
  ctx.fillText('✦', mx(lm[116].x) + r * 0.6, my(lm[116].y) - r * 0.5)
  ctx.fillText('✦', mx(lm[345].x) - r * 0.6, my(lm[345].y) - r * 0.5)
  ctx.restore()
}

// ─── Effect: Crown ────────────────────────────────────────────────────────

function drawCrown(
  ctx: CanvasRenderingContext2D,
  lm: NormalizedLandmark[],
  mx: Mapper, my: Mapper,
) {
  const faceRight = mx(lm[234].x), faceLeft = mx(lm[454].x)
  const faceW = faceRight - faceLeft
  const cx = mx(lm[10].x)
  const top = my(lm[10].y) - faceW * 0.42
  const bottom = my(lm[10].y) - faceW * 0.06
  const cW = faceW * 0.66
  const L = cx - cW / 2, R = cx + cW / 2
  const H = bottom - top

  ctx.save()
  const grad = ctx.createLinearGradient(cx, top, cx, bottom)
  grad.addColorStop(0,   '#FFE066')
  grad.addColorStop(0.4, '#FFB800')
  grad.addColorStop(1,   '#CC8800')
  ctx.fillStyle = grad
  ctx.strokeStyle = '#996600'
  ctx.lineWidth = 1.5
  ctx.lineJoin = 'round'

  // Crown silhouette: 3 spikes
  ctx.beginPath()
  ctx.moveTo(L, bottom)
  ctx.lineTo(L + cW * 0.04, top + H * 0.55)
  ctx.lineTo(L + cW * 0.22, top + H * 0.14)
  ctx.lineTo(L + cW * 0.36, top + H * 0.55)
  ctx.lineTo(cx,             top)                // center spike (tallest)
  ctx.lineTo(R - cW * 0.36, top + H * 0.55)
  ctx.lineTo(R - cW * 0.22, top + H * 0.14)
  ctx.lineTo(R - cW * 0.04, top + H * 0.55)
  ctx.lineTo(R, bottom)
  ctx.closePath()
  ctx.fill(); ctx.stroke()

  // Jewels
  const gems = [
    { x: L + cW * 0.22, y: top + H * 0.14, c: '#ff4444' },
    { x: cx,            y: top,             c: '#4488ff' },
    { x: R - cW * 0.22, y: top + H * 0.14, c: '#44cc44' },
  ]
  gems.forEach(({ x, y, c }) => {
    ctx.fillStyle = c
    ctx.beginPath(); ctx.arc(x, y, cW * 0.04, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.beginPath(); ctx.arc(x - cW * 0.01, y - cW * 0.01, cW * 0.015, 0, Math.PI * 2); ctx.fill()
  })
  ctx.restore()
}

// ─── Effect: Cat ──────────────────────────────────────────────────────────

function drawCat(
  ctx: CanvasRenderingContext2D,
  lm: NormalizedLandmark[],
  mx: Mapper, my: Mapper,
) {
  const faceRight = mx(lm[234].x), faceLeft = mx(lm[454].x)
  const faceW  = faceRight - faceLeft
  const headY  = my(lm[10].y)
  const earW   = faceW * 0.19
  const earH   = earW * 1.35
  const lEarX  = faceRight - faceW * 0.22   // screen right side
  const rEarX  = faceLeft  + faceW * 0.22   // screen left side

  ctx.save()
  ctx.lineJoin = 'round'

  // Draw one ear (outer + inner)
  function ear(cx: number) {
    ctx.fillStyle = '#f5cfc0'; ctx.strokeStyle = '#bb6688'; ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.moveTo(cx - earW / 2, headY + earH * 0.25)
    ctx.lineTo(cx,            headY - earH)
    ctx.lineTo(cx + earW / 2, headY + earH * 0.25)
    ctx.closePath(); ctx.fill(); ctx.stroke()
    // inner
    ctx.fillStyle = '#ff88aa'
    ctx.beginPath()
    ctx.moveTo(cx - earW * 0.28, headY + earH * 0.1)
    ctx.lineTo(cx,               headY - earH * 0.72)
    ctx.lineTo(cx + earW * 0.28, headY + earH * 0.1)
    ctx.closePath(); ctx.fill()
  }
  ear(lEarX); ear(rEarX)

  // Nose (pink triangle at tip)
  const nx = mx(lm[1].x), ny = my(lm[1].y)
  const ns = faceW * 0.032
  ctx.fillStyle = '#ff88aa'
  ctx.beginPath()
  ctx.moveTo(nx,      ny - ns)
  ctx.lineTo(nx + ns, ny + ns)
  ctx.lineTo(nx - ns, ny + ns)
  ctx.closePath(); ctx.fill()

  // Whiskers (3 per side, extending outward)
  const wy   = ny + faceW * 0.04
  const wSep = faceW * 0.025
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.lineWidth   = 1.4; ctx.lineCap = 'round'

  for (let i = -1; i <= 1; i++) {
    const dy = i * wSep
    // Left whiskers (screen right, starting near nose going further right)
    ctx.beginPath()
    ctx.moveTo(nx + faceW * 0.07, wy + dy)
    ctx.lineTo(faceRight + faceW * 0.12, wy + dy + i * faceW * 0.015)
    ctx.stroke()
    // Right whiskers (screen left)
    ctx.beginPath()
    ctx.moveTo(nx - faceW * 0.07, wy + dy)
    ctx.lineTo(faceLeft - faceW * 0.12, wy + dy + i * faceW * 0.015)
    ctx.stroke()
  }
  ctx.restore()
}

// ─── Effect: Stickers ────────────────────────────────────────────────────

const STICKER_POINTS: Array<{ idx: number; emoji: string; sizeFactor: number; offsetX?: number; offsetY?: number }> = [
  { idx: 10,  emoji: '⭐', sizeFactor: 0.20 },
  { idx: 116, emoji: '✨', sizeFactor: 0.14 },
  { idx: 345, emoji: '✨', sizeFactor: 0.14 },
  { idx: 151, emoji: '💫', sizeFactor: 0.12 },
  { idx: 4,   emoji: '🌟', sizeFactor: 0.10 },
  { idx: 200, emoji: '💖', sizeFactor: 0.11 },
]

function drawStickers(
  ctx: CanvasRenderingContext2D,
  lm: NormalizedLandmark[],
  mx: Mapper, my: Mapper,
) {
  const faceW = Math.abs(mx(lm[234].x) - mx(lm[454].x))
  const t = performance.now() / 1000

  ctx.save()
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'

  STICKER_POINTS.forEach(({ idx, emoji, sizeFactor }, i) => {
    const x = mx(lm[idx].x), y = my(lm[idx].y)
    const pulse = 1 + Math.sin(t * 2.5 + i * 1.1) * 0.15
    const size  = faceW * sizeFactor * pulse
    ctx.font = `${size}px serif`
    ctx.fillText(emoji, x, y)
  })
  ctx.restore()
}

// ─── Canvas component ─────────────────────────────────────────────────────

const FaceMeshCanvas = forwardRef<FaceMeshCanvasRef, FaceMeshCanvasProps>(
  function FaceMeshCanvas({ effect, effectColor = '#1a1a1a', onFaceDetected, onReady, onError }, ref) {
    const videoRef       = useRef<HTMLVideoElement>(null)
    const canvasRef      = useRef<HTMLCanvasElement>(null)
    const glCanvasRef    = useRef<HTMLCanvasElement>(null)
    const animFrameRef   = useRef<number>(0)
    const landmarkerRef  = useRef<FaceLandmarker | null>(null)
    const lastTimeRef    = useRef<number>(-1)
    const isInitRef      = useRef(false)
    const sceneRef      = useRef<THREE.Scene | null>(null)
    const cameraRef     = useRef<THREE.OrthographicCamera | null>(null)
    const rendererRef   = useRef<THREE.WebGLRenderer | null>(null)
    const glassesGroupRef = useRef<THREE.Group | null>(null)

    const effectRef      = useRef(effect)
    const colorRef       = useRef(effectColor)
    const faceCountRef   = useRef(onFaceDetected)
    const onReadyRef     = useRef(onReady)
    const onErrorRef     = useRef(onError)
    useEffect(() => { effectRef.current = effect },             [effect])
    useEffect(() => { colorRef.current = effectColor },        [effectColor])
    useEffect(() => { faceCountRef.current = onFaceDetected }, [onFaceDetected])
    useEffect(() => { onReadyRef.current  = onReady },         [onReady])
    useEffect(() => { onErrorRef.current  = onError },         [onError])

    const captureImage = useCallback(async (): Promise<string | null> => {
      const video = videoRef.current
      const fc = canvasRef.current
      const gl = glCanvasRef.current
      if (!video || !fc) return null
      try {
        const w = window.innerWidth
        const h = window.innerHeight
        const off = document.createElement('canvas')
        off.width = w
        off.height = h
        const ctx = off.getContext('2d')!
        const { displayW, displayH, offsetX, offsetY } = getCoverTransform(
          video.videoWidth || w, video.videoHeight || h, w, h
        )
        ctx.save()
        ctx.scale(-1, 1)
        ctx.drawImage(video, -(offsetX + displayW), offsetY, displayW, displayH)
        ctx.restore()
        if (gl && effectRef.current === 'nerd_glasses_3d') {
          ctx.save()
          ctx.scale(-1, 1)
          ctx.drawImage(gl, -w, 0, w, h)
          ctx.restore()
        }
        ctx.drawImage(fc, 0, 0, w, h)
        return off.toDataURL('image/png', 0.95)
      } catch { return null }
    }, [])

    useImperativeHandle(ref, () => ({ captureImage }), [captureImage])

    useEffect(() => {
      if (isInitRef.current) return
      isInitRef.current = true

      const video = videoRef.current, canvas = canvasRef.current
      if (!video || !canvas) return

      let stopped = false

      const glCanvas = glCanvasRef.current
      function syncSize() {
        if (!canvas) return
        const W = window.innerWidth
        const H = window.innerHeight
        canvas.width = W
        canvas.height = H
        if (glCanvas && rendererRef.current && cameraRef.current) {
          rendererRef.current.setSize(W, H)
          rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2))
          cameraRef.current.left = 0
          cameraRef.current.right = W
          cameraRef.current.top = 0
          cameraRef.current.bottom = H
          cameraRef.current.near = 0.1
          cameraRef.current.far = 2000
          cameraRef.current.updateProjectionMatrix()
        }
      }
      syncSize()
      window.addEventListener('resize', syncSize)

      if (glCanvas) {
        const W = window.innerWidth
        const H = window.innerHeight
        const scene = new THREE.Scene()
        const camera = new THREE.OrthographicCamera(0, W, H, 0, 0.1, 2000)
        camera.position.set(W / 2, H / 2, 500)
        camera.lookAt(W / 2, H / 2, 0)
        const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, alpha: true, antialias: true })
        renderer.setSize(W, H)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.setClearColor(0x000000, 0)
        sceneRef.current = scene
        cameraRef.current = camera
        rendererRef.current = renderer
        const loader = new OBJLoader()
        loader.load(NERD_GLASSES_OBJ_URL, (group) => {
          if (stopped) return
          group.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const m = (child as THREE.Mesh).material
              if (Array.isArray(m)) m.forEach((mat) => ((mat as THREE.MeshPhongMaterial).depthWrite = true))
              else if (m) ((m as THREE.MeshPhongMaterial).depthWrite = true)
            }
          })
          const box = new THREE.Box3().setFromObject(group)
          const center = box.getCenter(new THREE.Vector3())
          group.position.sub(center)
          group.rotation.x = -Math.PI / 2
          glassesGroupRef.current = group
          scene.add(group)
        }, undefined, () => {})
      }

      async function init() {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          })
          if (stopped) { stream.getTracks().forEach(t => t.stop()); return }
          video!.srcObject = stream
          await video!.play()

          const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
          )
          if (stopped) return

          const fl = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numFaces: 1,
            outputFaceBlendshapes: false,
          })
          if (stopped) { fl.close(); return }

          landmarkerRef.current = fl
          onReadyRef.current?.()
          renderLoop()
        } catch (err) {
          onErrorRef.current?.(
            err instanceof Error && err.name === 'NotAllowedError'
              ? 'กล้องไม่พร้อมใช้งาน กรุณาอนุญาตการเข้าถึงกล้อง'
              : 'โหลด AI ไม่สำเร็จ กรุณาลองใหม่'
          )
        }
      }

      function renderLoop() {
        animFrameRef.current = requestAnimationFrame(renderLoop)
        const v = videoRef.current
        const c = canvasRef.current
        const lm = landmarkerRef.current
        const effect = effectRef.current
        if (!v || !c || v.readyState < 2) return
        if (!lm || v.currentTime === lastTimeRef.current) return

        lastTimeRef.current = v.currentTime
        const result = lm.detectForVideo(v, performance.now())
        const faces = result.faceLandmarks
        faceCountRef.current?.(faces.length)

        const W = c.width
        const H = c.height
        const vW = v.videoWidth || W
        const vH = v.videoHeight || H
        const { displayW, displayH, offsetX, offsetY } = getCoverTransform(vW, vH, W, H)
        const mx = (lx: number) => (1 - lx) * displayW + offsetX
        const my = (ly: number) => ly * displayH + offsetY

        if (effect === 'nerd_glasses_3d') {
          const renderer = rendererRef.current
          const scene = sceneRef.current
          const camera = cameraRef.current
          const glassesGroup = glassesGroupRef.current
          if (renderer && scene && camera) {
            renderer.setClearColor(0x000000, 0)
            renderer.clear()
            if (faces.length > 0 && glassesGroup) {
              const face = faces[0]
              const tune = NERD_GLASSES_3D_TUNE
              const leftEyeX = (mx(face[33].x) + mx(face[133].x)) / 2
              const leftEyeY = (my(face[33].y) + my(face[133].y)) / 2
              const rightEyeX = (mx(face[263].x) + mx(face[362].x)) / 2
              const rightEyeY = (my(face[263].y) + my(face[362].y)) / 2
              const centerX = (leftEyeX + rightEyeX) / 2 + tune.offsetX
              let centerY = (leftEyeY + rightEyeY) / 2 + tune.offsetY
              if (tune.invertY) centerY = H - centerY
              const faceW = Math.hypot(rightEyeX - leftEyeX, rightEyeY - leftEyeY) * tune.eyeSpanMultiplier
              const scale = faceW / tune.scaleDivisor
              const angle = Math.atan2(rightEyeY - leftEyeY, rightEyeX - leftEyeX)
              const tiltZ = tune.invertTilt ? angle : -angle
              glassesGroup.position.set(centerX, centerY, 0)
              glassesGroup.scale.setScalar(scale)
              glassesGroup.rotation.x = -Math.PI / 2
              glassesGroup.rotation.z = tiltZ
              renderer.render(scene, camera)
            }
          }
          const ctx2d = c.getContext('2d')!
          ctx2d.clearRect(0, 0, W, H)
          return
        }

        const glRenderer = rendererRef.current
        if (glRenderer) {
          glRenderer.setClearColor(0x000000, 0)
          glRenderer.clear()
        }

        const ctx = c.getContext('2d')!
        if (faces.length === 0) return
        ctx.clearRect(0, 0, W, H)

        for (const face of faces) {
          switch (effect) {
            case 'glasses':
              drawGlasses(ctx, face, mx, my, colorRef.current)
              break
            case 'lipstick':
              drawLipstick(ctx, face, mx, my, colorRef.current)
              break
            case 'blush':
              drawBlush(ctx, face, mx, my)
              break
            case 'crown':
              drawCrown(ctx, face, mx, my)
              break
            case 'cat':
              drawCat(ctx, face, mx, my)
              break
            case 'stickers':
              drawStickers(ctx, face, mx, my)
              break
          }
        }
      }

      init()

      return () => {
        stopped = true
        isInitRef.current = false
        cancelAnimationFrame(animFrameRef.current)
        window.removeEventListener('resize', syncSize)
        const v = videoRef.current
        if (v?.srcObject) {
          ;(v.srcObject as MediaStream).getTracks().forEach(t => t.stop())
          v.srcObject = null
        }
        landmarkerRef.current?.close()
        landmarkerRef.current = null
        rendererRef.current?.dispose()
        rendererRef.current = null
        sceneRef.current = null
        cameraRef.current = null
        glassesGroupRef.current = null
      }
    }, [])

    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <video
          ref={videoRef}
          autoPlay playsInline muted
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
            zIndex: 0,
          }}
        />
        <canvas
          ref={glCanvasRef}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            zIndex: 1, pointerEvents: 'none',
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            zIndex: 2, pointerEvents: 'none',
          }}
        />
      </div>
    )
  }
)

export default FaceMeshCanvas
