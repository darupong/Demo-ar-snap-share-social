# AR Snap Share Social — React + Vite

A multi-page AR & AI demo hub: **AR Marker (Three.js)**, **Magic Hands (hand tracking + fire)**, **Face Mesh** (2D effects + 3D glasses OBJ), and **Object Demos** (Image Classifier + Object Detector with boxes), with capture and share. Built with React + Vite + TypeScript.

## 🚀 Features

- **AR Marker** — Hiro marker tracking with AR.js + Three.js; 3D object overlay, capture & share
- **Magic Hands** — MediaPipe Hand Tracking with fire/effect from fingertips; color presets, capture & share
- **Face Mesh** — MediaPipe Face Landmarker with 2D effects (glasses, lipstick, blush, crown, cat, stickers) and **3D Nerd Glasses** (OBJ) that follow head pose (yaw/tilt)
- **Object Classifier** — MediaPipe Image Classifier (light) shows top labels (เช่น bottle, book, chair) over the scene
- **Object Detector (Boxes)** — MediaPipe Object Detector draws bounding boxes with label + confidence around detected objects (filtered to ignore people/body-related classes)
- **Capture & Share** — Screenshot overlay, download PNG, Web Share API (file + text) with Facebook fallback
- **React + TypeScript** — Type-safe UI, Vite, Tailwind CSS, path alias `@/`
- **Router-based hub** — Separate demo pages via React Router; constants for routes and share text

## 📦 Tech Stack

| Category        | Technology                          |
|----------------|-------------------------------------|
| UI             | React 18, TypeScript                |
| Build          | Vite 5                              |
| Routing        | React Router 6                      |
| Styling        | Tailwind CSS 4                      |
| AR             | AR.js (CDN), Three.js               |
| Vision         | MediaPipe Tasks Vision (Face, Hands, Image Classifier, Object Detector)|
| UI Primitives  | Radix UI (Dialog, Slot), Lucide Icons|
| Testing        | Vitest, Testing Library             |

## 🛠️ Installation

**Requirements:** Node.js (tested with Node 20+)

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test
```

## 🧭 Routes

| Path             | Demo                     | Description                                                     |
|------------------|--------------------------|-----------------------------------------------------------------|
| `/`              | Landing                  | Demo hub with AR, Magic Hands, Face Mesh, Object cards         |
| `/ar`            | AR Marker                | Hiro marker tracking, 3D overlay, capture/share                 |
| `/magic`         | Magic Hands              | Hand tracking + fire effect, capture/share                     |
| `/facemesh`      | Face Mesh                | Face effects + 3D glasses OBJ, capture/share                   |
| `/objects`       | Object Classifier        | Light Image Classifier: top labels only (no boxes), capture/share |
| `/objects-detector` | Object Detector (Boxes) | Heavier Object Detector: bounding boxes + labels, capture/share |

## 📱 Testing on Mobile

- **Same WiFi** — Mobile and computer on the same network
- **Find IP** — Get your computer’s local IP
- **Open in browser:** `http://YOUR_IP:5173/`
- **Allow camera** when prompted

Note: Some mobile browsers require HTTPS for camera access. Use ngrok or a local HTTPS setup if needed.

## 📱 Usage

1. Open the app in the browser
2. Allow camera access when prompted
3. Choose a demo from the home page (AR Marker, Magic Hands, Face Mesh, Object Classifier, or Object Detector)
4. Wait for the model to load (loading spinner disappears)
5. For **AR**: show the Hiro marker to the camera; for **Magic Hands**: show your index finger; for **Face Mesh**: face the camera and pick an effect
6. Use the center button to capture, then download or share

## 📁 Project Structure

```
demo-ar-snap-share-social/
├── public/
│   ├── 3d/Nerd_Glasses/          # OBJ model for 3D glasses
│   └── patt.hiro                 # AR marker pattern
├── src/
│   ├── components/
│   │   ├── ARScene.tsx           # AR.js + Three.js scene
│   │   ├── FaceMeshCanvas.tsx    # Face Mesh + 3D glasses (OBJ)
│   │   ├── HandFireCanvas.tsx    # Hand tracking + fire effect
│   │   ├── ObjectDetectCanvas.tsx    # Image Classifier (labels only) canvas
│   │   └── ObjectDetectorCanvas.tsx  # Object Detector (bounding boxes + labels) canvas
│   │   └── ui/                   # Button, Badge, Dialog, Sheet, Card
│   ├── constants/
│   │   ├── routes.ts             # ROUTES (/, /ar, /magic, /facemesh, /objects, /objects-detector)
│   │   ├── app.ts                # HIRO_MARKER_URL
│   │   ├── magic.ts              # FIRE_PRESETS, MAGIC_SHARE_TEXT
│   │   ├── ar.ts                 # AR_SHARE_TEXT
│   │   └── facemesh.ts           # FACE_EFFECT_PRESETS, FACEMESH_SHARE_TEXT
│   ├── lib/
│   │   ├── utils.ts              # cn() (Tailwind merge)
│   │   └── image.ts              # dataURLtoBlob()
│   ├── pages/
│   │   ├── LandingPage.tsx
│   │   ├── ARPage.tsx
│   │   │   └── components/InstructionsSheet.tsx
│   │   ├── MagicPage.tsx
│   │   │   └── components/MagicInstructions.tsx
│   │   ├── FaceMeshPage.tsx
│   │   │   └── components/FaceMeshInstructions.tsx
│   │   ├── ObjectDetectPage.tsx
│   │   │   └── components/ObjectDetectInstructions.tsx
│   │   └── ObjectDetectorPage.tsx
│   │       └── components/ObjectDetectorInstructions.tsx
│   ├── types/
│   │   └── ar.d.ts               # AR.js / Three.js globals
│   ├── test/
│   │   └── setup.ts              # Vitest + getUserMedia mock
│   ├── App.tsx
│   ├── App.test.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── vitest.config.ts
└── vite.config.ts
```

## 🎨 Customization

### Face Mesh — 3D glasses alignment

Edit `src/components/FaceMeshCanvas.tsx`, object `NERD_GLASSES_3D_TUNE`:

```ts
const NERD_GLASSES_3D_TUNE = {
  offsetX: 0,        // เลื่อนซ้าย(+) / ขวา(-) px
  offsetY: 0,        // เลื่อนขึ้น(-) / ลง(+) px
  eyeSpanMultiplier: 2.2,
  scaleDivisor: 6,
  invertY: true,     // พลิกแกน Y
  invertTilt: false,
  tiltMultiplier: 1,
  yawMultiplier: 1.2,  // หันข้างตามหน้า
  invertYaw: false,
}
```

### Magic Hands — fire color presets

Edit `src/constants/magic.ts`: add or change entries in `FIRE_PRESETS` and `MAGIC_SHARE_TEXT`.

### AR / Share text

Edit `src/constants/ar.ts` for `AR_SHARE_TEXT`, and `src/constants/app.ts` for `HIRO_MARKER_URL` if needed.

### Camera resolution

In each canvas component (e.g. `FaceMeshCanvas`, `HandFireCanvas`), adjust `getUserMedia`:

```ts
video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
```

## 🌐 Browser Support

- Chrome (Desktop & Android)
- Safari (macOS & iOS)
- Edge (Desktop)
- Firefox (Desktop & Android)

Camera access requires a secure context (HTTPS or localhost).

## 📚 Resources

- [MediaPipe Face Landmarker](https://developers.google.com/mediapipe/solutions/vision/face_landmarker)
- [MediaPipe Hand Landmarker](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker)
- [AR.js](https://ar-js-org.github.io/AR.js/)
- [Three.js](https://threejs.org/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)

## 🐛 Troubleshooting

**Camera not working**

- Ensure the browser has camera permission
- Check if another app is using the camera
- Use localhost or HTTPS

**AR / 3D not showing**

- For AR: ensure the Hiro marker is clearly visible and well lit
- For 3D glasses: ensure the OBJ is under `public/3d/Nerd_Glasses/`

**Performance**

- Lower camera resolution in the component
- Ensure WebGL is enabled

## 📝 License

MIT License — see the LICENSE file for details.

## 🙏 Credits

- [MediaPipe](https://mediapipe.dev/) by Google
- [AR.js](https://ar-js-org.github.io/AR.js/)
- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
