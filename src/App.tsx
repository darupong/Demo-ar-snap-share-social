import { Routes, Route } from 'react-router-dom'
import { ROUTES } from '@/constants'
import LandingPage from '@/pages/LandingPage'
import ARPage from '@/pages/ARPage'
import MagicPage from '@/pages/MagicPage'
import FaceMeshPage from '@/pages/FaceMeshPage'
import ObjectDetectPage from '@/pages/ObjectDetectPage'
import ObjectDetectorPage from '@/pages/ObjectDetectorPage'
import AIPhotoPage from '@/pages/AIPhotoPage'
import AIPhotoMockupPage from '@/pages/AIPhotoMockupPage'
import PosePage from '@/pages/PosePage'
import DrawPage from '@/pages/DrawPage'
import GesturePage from '@/pages/GesturePage'
import SplashPage from '@/pages/SplashPage'
import ImageTrackingPage from '@/pages/ImageTrackingPage'
import CrabTrackingPage from '@/pages/CrabTrackingPage'

export default function App() {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<LandingPage />} />
      <Route path={ROUTES.AR} element={<ARPage />} />
      <Route path={ROUTES.MAGIC} element={<MagicPage />} />
      <Route path={ROUTES.FACEMESH} element={<FaceMeshPage />} />
      <Route path={ROUTES.OBJECTS} element={<ObjectDetectPage />} />
      <Route path={ROUTES.OBJECTS_DETECTOR} element={<ObjectDetectorPage />} />
      <Route path={ROUTES.AIPHOTO} element={<AIPhotoPage />} />
      <Route path={ROUTES.AIPHOTO_MOCKUP} element={<AIPhotoMockupPage />} />
      <Route path={ROUTES.POSE} element={<PosePage />} />
      <Route path={ROUTES.DRAW} element={<DrawPage />} />
      <Route path={ROUTES.GESTURE} element={<GesturePage />} />
      <Route path={ROUTES.SPLASH} element={<SplashPage />} />
      <Route path={ROUTES.IMAGE_TRACKING} element={<ImageTrackingPage />} />
      <Route path={ROUTES.CRAB_TRACKING} element={<CrabTrackingPage />} />
    </Routes>
  )
}

