/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { ParticleWaveMotion } from '../../lib/particle-wave-motion'
import { ParticleWave } from '../particle-wave'

describe('decorative particle wave', () => {
  const context = {
    clearRect: vi.fn(),
    setTransform: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
  }
  let preference: {
    matches: boolean
    addEventListener: ReturnType<typeof vi.fn>
    removeEventListener: ReturnType<typeof vi.fn>
  }
  let preferenceChanged: () => void
  let intersectionChanged: IntersectionObserverCallback
  const disconnect = vi.fn()

  beforeEach(() => {
    preference = {
      matches: false,
      addEventListener: vi.fn((_event, callback) => {
        preferenceChanged = callback
      }),
      removeEventListener: vi.fn(),
    }
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => preference)
    )
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1)
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      context as unknown as CanvasRenderingContext2D
    )
    vi.spyOn(
      HTMLCanvasElement.prototype,
      'getBoundingClientRect'
    ).mockReturnValue({ width: 800, height: 400, left: 0, top: 0 } as DOMRect)
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect = disconnect
      }
    )
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          intersectionChanged = callback
        }
        observe() {}
        disconnect = disconnect
      }
    )
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  test('reduced motion draws a static wave without starting an animation loop', () => {
    preference.matches = true
    const view = render(<ParticleWave />)
    expect(view.container.firstChild).toHaveAttribute('aria-hidden', 'true')
    expect(context.fill).toHaveBeenCalled()
    expect(requestAnimationFrame).not.toHaveBeenCalled()
  })

  test('changing motion preference stops animation and restores it on opt-in', () => {
    render(<ParticleWave />)
    expect(requestAnimationFrame).toHaveBeenCalledOnce()
    vi.mocked(requestAnimationFrame).mockClear()
    preference.matches = true
    act(() => preferenceChanged())
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1)
    expect(requestAnimationFrame).not.toHaveBeenCalled()
    preference.matches = false
    act(() => preferenceChanged())
    expect(requestAnimationFrame).toHaveBeenCalledOnce()
  })

  test('an offscreen wave pauses and unmount removes observers and listeners', () => {
    const view = render(<ParticleWave fullPage />)
    vi.mocked(requestAnimationFrame).mockClear()
    act(() =>
      intersectionChanged(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver
      )
    )
    expect(requestAnimationFrame).not.toHaveBeenCalled()
    act(() =>
      intersectionChanged(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      )
    )
    expect(requestAnimationFrame).toHaveBeenCalledOnce()
    view.unmount()
    expect(disconnect).toHaveBeenCalledTimes(2)
    expect(preference.removeEventListener).toHaveBeenCalledWith(
      'change',
      preferenceChanged
    )
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1)
  })

  test('particles cover the top, middle and bottom of the background plane', () => {
    preference.matches = true
    render(<ParticleWave />)
    const points = context.arc.mock.calls as unknown as number[][]
    for (const [top, bottom] of [
      [0, 80],
      [160, 240],
      [320, 400],
    ]) {
      expect(
        points.some(([x, y]) => x >= 0 && x <= 800 && y >= top && y <= bottom)
      ).toBe(true)
    }
  })

  test('mouse movement deforms the wave without consuming pointer events', () => {
    const baseline = render(<ParticleWave />)
    vi.mocked(requestAnimationFrame).mock.calls.at(-1)?.[0](100)
    context.arc.mockClear()
    vi.mocked(requestAnimationFrame).mock.calls.at(-1)?.[0](140)
    const untouched = context.arc.mock.calls.map((point) => [...point])
    baseline.unmount()

    const interactive = render(<ParticleWave />)
    const event = new Event('pointermove', { cancelable: true })
    Object.assign(event, { clientX: 400, clientY: 200, pointerType: 'mouse' })
    window.dispatchEvent(event)
    vi.mocked(requestAnimationFrame).mock.calls.at(-1)?.[0](100)
    context.arc.mockClear()
    vi.mocked(requestAnimationFrame).mock.calls.at(-1)?.[0](140)
    expect(context.arc.mock.calls).not.toEqual(untouched)
    expect(event.defaultPrevented).toBe(false)
    interactive.unmount()
  })

  test('reduced motion ignores cursor feedback and unmount detaches cursor listeners', () => {
    preference.matches = true
    const remove = vi.spyOn(window, 'removeEventListener')
    const view = render(<ParticleWave />)
    context.arc.mockClear()
    const event = new Event('pointermove')
    Object.assign(event, { clientX: 400, clientY: 200, pointerType: 'mouse' })
    window.dispatchEvent(event)
    expect(context.arc).not.toHaveBeenCalled()
    expect(requestAnimationFrame).not.toHaveBeenCalled()
    view.unmount()
    expect(remove).toHaveBeenCalledWith('pointermove', expect.any(Function))
    expect(remove).toHaveBeenCalledWith('pointerleave', expect.any(Function))
    expect(remove).toHaveBeenCalledWith('blur', expect.any(Function))
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function))
  })

  test('consecutive display frames each redraw the wave without a 30fps gate', () => {
    render(<ParticleWave />)
    context.clearRect.mockClear()
    for (const time of [100, 116.7, 133.4]) {
      vi.mocked(requestAnimationFrame).mock.calls.at(-1)?.[0](time)
    }
    expect(context.clearRect).toHaveBeenCalledTimes(3)
  })

  test('an unavailable canvas context leaves a noninteractive decorative fallback', () => {
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null)
    const view = render(<ParticleWave />)
    expect(view.container.firstChild).toHaveAttribute('aria-hidden', 'true')
    expect(requestAnimationFrame).not.toHaveBeenCalled()
  })
})

describe('wave interaction continuity', () => {
  function step(motion: ParticleWaveMotion, seconds = 1 / 60) {
    motion.advance(seconds)
    return motion.deform(0, 420, 210, 1, seconds, 220)
  }

  test('hover response stays consistent on 60Hz and 120Hz displays', () => {
    const standard = new ParticleWaveMotion()
    const fast = new ParticleWaveMotion()
    standard.move(400, 200)
    fast.move(400, 200)
    let a = { x: 420, y: 210, light: 0 }
    let b = a
    for (let i = 0; i < 60; i++) a = step(standard)
    for (let i = 0; i < 120; i++) b = step(fast, 1 / 120)
    expect(Math.abs(a.x - b.x)).toBeLessThan(0.2)
    expect(Math.abs(a.y - b.y)).toBeLessThan(0.2)
    expect(a.y).toBeLessThan(195)
  })

  test('a rapid cursor reversal bends smoothly instead of snapping the particle', () => {
    const motion = new ParticleWaveMotion()
    motion.move(300, 200)
    let previous = step(motion)
    for (let i = 0; i < 60; i++) previous = step(motion)
    motion.move(650, 350)
    const next = step(motion)
    expect(Math.hypot(next.x - previous.x, next.y - previous.y)).toBeLessThan(1)
    for (let i = 0; i < 30; i++) step(motion)
    const moved = step(motion)
    expect(
      Math.hypot(moved.x - previous.x, moved.y - previous.y)
    ).toBeGreaterThan(2)
  })

  test('leaving preserves a fading wake and returns the particle to its plane', () => {
    const motion = new ParticleWaveMotion()
    motion.move(250, 200)
    for (let i = 0; i < 30; i++) step(motion)
    motion.move(450, 220)
    let previous = step(motion)
    for (let i = 0; i < 30; i++) previous = step(motion)
    motion.release()
    const released = step(motion)
    expect(Math.abs(released.y - previous.y)).toBeLessThan(1)
    expect(Math.abs(released.y - 210)).toBeGreaterThan(5)
    let settled = released
    for (let i = 0; i < 240; i++) settled = step(motion)
    expect(Math.abs(settled.x - 420)).toBeLessThan(0.1)
    expect(Math.abs(settled.y - 210)).toBeLessThan(0.1)
  })
})
