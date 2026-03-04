import { describe, it, expect } from 'vitest'
import { ROUTES } from './routes'

describe('ROUTES', () => {
  it('includes FACEMESH path for Face Mesh demo', () => {
    expect(ROUTES.FACEMESH).toBe('/facemesh')
  })

  it('has all expected demo routes', () => {
    expect(ROUTES.HOME).toBe('/')
    expect(ROUTES.AR).toBe('/ar')
    expect(ROUTES.MAGIC).toBe('/magic')
    expect(ROUTES.FACEMESH).toBe('/facemesh')
  })
})
