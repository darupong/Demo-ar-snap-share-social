/** Application route paths — single source of truth for navigation */
export const ROUTES = {
  HOME: '/',
  AR: '/ar',
  MAGIC: '/magic',
  FACEMESH: '/facemesh',
  OBJECTS: '/objects',
  OBJECTS_DETECTOR: '/objects-detector',
  AIPHOTO: '/aiphoto',
  AIPHOTO_MOCKUP: '/aiphoto-mockup',
  POSE: '/pose',
  DRAW: '/draw',
  GESTURE: '/gesture',
  SPLASH: '/splash',
  IMAGE_TRACKING: '/image-tracking',
  CRAB_TRACKING: '/crabtracking',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]

