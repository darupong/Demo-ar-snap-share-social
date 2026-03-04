/** Application route paths — single source of truth for navigation */
export const ROUTES = {
  HOME: '/',
  AR: '/ar',
  MAGIC: '/magic',
  FACEMESH: '/facemesh',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]
