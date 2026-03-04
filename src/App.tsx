import { Routes, Route } from 'react-router-dom'
import { ROUTES } from '@/constants'
import LandingPage from '@/pages/LandingPage'
import ARPage from '@/pages/ARPage'
import MagicPage from '@/pages/MagicPage'
import FaceMeshPage from '@/pages/FaceMeshPage'

export default function App() {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<LandingPage />} />
      <Route path={ROUTES.AR} element={<ARPage />} />
      <Route path={ROUTES.MAGIC} element={<MagicPage />} />
      <Route path={ROUTES.FACEMESH} element={<FaceMeshPage />} />
    </Routes>
  )
}
