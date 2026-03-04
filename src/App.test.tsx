import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

describe('App router', () => {
  it('renders LandingPage at /', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.getByRole('heading', { name: /AR Snap/ })).toBeTruthy()
    expect(screen.getByText('เลือก Demo')).toBeTruthy()
  })

  it('renders Face Mesh page at /facemesh', () => {
    render(
      <MemoryRouter initialEntries={['/facemesh']}>
        <App />
      </MemoryRouter>
    )
    expect(
      screen.getByText(/มองตรงหน้ากล้อง|กำลังโหลด AI|Face Mesh ของคุณ/i)
    ).toBeTruthy()
  })

  it('Landing has link/button to Face Mesh demo', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.getByText(/Face Mesh/)).toBeTruthy()
  })
})
