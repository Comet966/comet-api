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
import { useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

import { ParticleWaveMotion } from '../lib/particle-wave-motion'

import '@/styles/home-particles.css'

/** Decorative only: passive cursor feedback never intercepts page interactions. */
export function ParticleWave(props: { fullPage?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let width = 0
    let height = 0
    let frame = 0
    let visible = true
    let lastTime: number | null = null
    let color = getComputedStyle(canvas).color

    const motion = new ParticleWaveMotion()

    const draw = (seconds = 0) => {
      context.clearRect(0, 0, width, height)
      context.fillStyle = color
      const columns = width < 640 ? 20 : 40
      const rows = Math.max(
        16,
        Math.min(40, Math.ceil(height / (width / columns)) + 6)
      )
      for (let row = 0; row < rows; row++) {
        const depth = row / (rows - 1)
        for (let column = 0; column < columns; column++) {
          const across = column / (columns - 1)
          // A tilted plane in perspective: distant rows compress toward the
          // horizon, while near rows spread apart and use larger particles.
          const perspective = 1 / (2.8 - depth * 2.05)
          const projectedDepth = (perspective - 1 / 2.8) / (1 / 0.75 - 1 / 2.8)
          const phase = motion.phase
          const wave =
            Math.sin(across * 9 + depth * 3 - phase) * 0.13 +
            Math.cos(across * 5 - depth * 5 + phase * 0.65) * 0.095
          const x = width * 0.5 + (across - 0.5) * width * 3.4 * perspective
          const y =
            (-0.2 + projectedDepth * 1.6) * height +
            (x - width * 0.5) * 0.09 +
            wave * height * (0.45 + perspective * 0.5)
          const reach = Math.max(160, Math.min(280, width * 0.22))
          const particle = motion.deform(
            row * columns + column,
            x,
            y,
            perspective,
            seconds,
            reach
          )
          context.globalAlpha = Math.min(
            0.72,
            0.22 + projectedDepth * 0.3 + particle.light * 0.16
          )
          context.beginPath()
          context.arc(
            particle.x,
            particle.y,
            1 + perspective * 1.55 + particle.light * 0.25,
            0,
            Math.PI * 2
          )
          context.fill()
        }
      }
      context.globalAlpha = 1
    }

    const animate = (time: number) => {
      frame = 0
      // Follow the display refresh rate. Small fixed particle counts do not
      // need the old 30fps throttle, which made cursor feedback visibly step.
      const seconds =
        lastTime === null ? 0 : Math.min((time - lastTime) / 1000, 0.05)
      lastTime = time
      motion.advance(seconds)
      draw(seconds)
      frame = requestAnimationFrame(animate)
    }

    const syncAnimation = () => {
      cancelAnimationFrame(frame)
      frame = 0
      lastTime = null
      motion.reset(preference.matches)
      draw()
      if (!preference.matches && !document.hidden && visible && width > 0) {
        frame = requestAnimationFrame(animate)
      }
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      syncAnimation()
    }

    const movePointer = (event: PointerEvent) => {
      if (
        preference.matches ||
        document.hidden ||
        !visible ||
        event.pointerType === 'touch'
      ) {
        return
      }
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      if (x < 0 || x > width || y < 0 || y > height) {
        motion.release()
        return
      }
      motion.move(x, y)
    }
    const releasePointer = () => {
      motion.release()
    }
    window.addEventListener('pointermove', movePointer, { passive: true })
    window.addEventListener('pointerleave', releasePointer)
    window.addEventListener('blur', releasePointer)
    window.addEventListener('scroll', releasePointer, { passive: true })

    const sizeObserver = new ResizeObserver(resize)
    sizeObserver.observe(canvas)
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      syncAnimation()
    })
    visibilityObserver.observe(canvas)
    const themeObserver = new MutationObserver(() => {
      color = getComputedStyle(canvas).color
      draw()
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-theme-preset'],
    })
    preference.addEventListener('change', syncAnimation)
    document.addEventListener('visibilitychange', syncAnimation)
    resize()

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', movePointer)
      window.removeEventListener('pointerleave', releasePointer)
      window.removeEventListener('blur', releasePointer)
      window.removeEventListener('scroll', releasePointer)
      sizeObserver.disconnect()
      visibilityObserver.disconnect()
      themeObserver.disconnect()
      preference.removeEventListener('change', syncAnimation)
      document.removeEventListener('visibilitychange', syncAnimation)
    }
  }, [])

  return (
    <div
      className={cn(
        'home-particle-wave',
        props.fullPage && 'home-particle-wave-page'
      )}
      aria-hidden='true'
    >
      <canvas ref={canvasRef} data-slot='particle-wave' />
    </div>
  )
}
