/** Application route paths — single source of truth for navigation */
export const ROUTES = {
  HOME: '/',
  AR: '/ar',
  MAGIC: '/magic',
  FACEMESH: '/facemesh',
  OBJECTS: '/objects',
  OBJECTS_DETECTOR: '/objects-detector',
  AIPHOTO: '/aiphoto',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]

