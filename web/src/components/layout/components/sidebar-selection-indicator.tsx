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
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react'
import { useEffect, useRef } from 'react'

import '@/styles/sidebar-navigation.css'

/** Decorative only: routing, keyboard focus and button sizes are unchanged. */
export function SidebarSelectionIndicator() {
  const markerRef = useRef<HTMLSpanElement>(null)
  const top = useMotionValue(0)
  const bottom = useMotionValue(16)
  const left = useMotionValue(0)
  const opacity = useMotionValue(0)
  const height = useTransform(() => Math.max(3, bottom.get() - top.get()))
  const reduced = useReducedMotion()

  useEffect(() => {
    const host = markerRef.current?.parentElement
    if (!host) return
    let initialized = false
    let goalTop = Number.NaN
    let goalBottom = Number.NaN
    let stopTop: (() => void) | undefined
    let stopBottom: (() => void) | undefined

    const update = (transition: boolean) => {
      const candidates = host.querySelectorAll<HTMLElement>(
        '[data-sidebar="menu-sub-button"][data-active], [data-sidebar="menu-button"][data-active]'
      )
      const active = [...candidates]
        .reverse()
        .find((item) => item.getBoundingClientRect().height > 0)
      if (!active) {
        stopTop?.()
        stopBottom?.()
        opacity.set(0)
        initialized = false
        return
      }
      const rect = active.getBoundingClientRect()
      const bounds = host.getBoundingClientRect()
      const markerHeight = Math.min(16, rect.height / 2)
      const nextTop =
        rect.top -
        bounds.top +
        host.scrollTop +
        (rect.height - markerHeight) / 2
      const nextBottom = nextTop + markerHeight
      left.set(
        (getComputedStyle(host).direction === 'rtl'
          ? rect.right - 3
          : rect.left) -
          bounds.left +
          host.scrollLeft
      )
      opacity.set(1)
      if (initialized && nextTop === goalTop && nextBottom === goalBottom) {
        return
      }
      goalTop = nextTop
      goalBottom = nextBottom
      stopTop?.()
      stopBottom?.()
      if (!initialized || reduced || !transition) {
        top.set(nextTop)
        bottom.set(nextBottom)
      } else {
        const down = nextTop + nextBottom >= top.get() + bottom.get()
        // FLClash-inspired leading/trailing edges. Retarget from the current
        // painted edges so rapid reversals never jump to the previous row.
        const lead = (t: number) => 1 - (1 - Math.min(1, t / 0.6)) ** 3
        const trail = (t: number) => {
          const p = Math.max(0, (t - 0.35) / 0.65)
          return p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2
        }
        const a = animate(top, nextTop, {
          duration: 0.32,
          ease: down ? trail : lead,
        })
        const b = animate(bottom, nextBottom, {
          duration: 0.32,
          ease: down ? lead : trail,
        })
        stopTop = () => a.stop()
        stopBottom = () => b.stop()
      }
      initialized = true
    }

    const sizeObserver = new ResizeObserver(() => update(false))
    const observeLayout = () => {
      sizeObserver.disconnect()
      sizeObserver.observe(host)
      const list = host.querySelector('[data-nav-list]')
      if (list) sizeObserver.observe(list)
    }
    const mutationObserver = new MutationObserver((records) => {
      if (records.some((record) => record.type === 'childList')) observeLayout()
      update(!records.some((record) => record.attributeName === 'dir'))
    })
    mutationObserver.observe(host, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-active', 'data-state', 'hidden'],
    })
    mutationObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dir'],
    })
    mutationObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['dir'],
    })
    observeLayout()
    update(false)
    return () => {
      stopTop?.()
      stopBottom?.()
      sizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [bottom, left, opacity, reduced, top])

  return (
    <motion.span
      ref={markerRef}
      aria-hidden='true'
      data-slot='sidebar-selection-indicator'
      className='sidebar-selection-indicator'
      style={{ y: top, height, left, opacity }}
    />
  )
}
