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
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { Button } from '@/components/ui/button'
import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar'

import { SidebarSelectionIndicator } from '../sidebar-selection-indicator'

function NavigationFixture() {
  const [active, setActive] = useState<number | null>(0)
  return (
    <SidebarProvider>
      <SidebarContent data-nav-motion='flclash'>
        <SidebarSelectionIndicator />
        <div data-nav-list=''>
          <SidebarMenu>
            {['Overview', 'Channels', 'Tokens'].map((label, i) => (
              <SidebarMenuItem key={label}>
                <SidebarMenuButton
                  data-row={i}
                  isActive={active === i}
                  onClick={() => setActive(i)}
                >
                  {label}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            <SidebarMenuItem>
              <SidebarMenuButton disabled onClick={() => setActive(3)}>
                Unavailable
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
        <Button onClick={() => setActive(null)}>Clear selection</Button>
      </SidebarContent>
    </SidebarProvider>
  )
}

describe('sidebar selection feedback', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        const index = this.getAttribute('data-row')
        if (index !== null) {
          return new DOMRect(8, 20 + Number(index) * 36, 192, 32)
        }
        return new DOMRect(0, 20, 208, 300)
      }
    )
  })

  test('reduced motion places a decorative marker at the selected row without moving focus', async () => {
    const view = render(<NavigationFixture />)
    const marker = view.container.querySelector(
      '[data-slot=sidebar-selection-indicator]'
    )
    await waitFor(() =>
      expect(marker).toHaveStyle({ opacity: '1', height: '16px', left: '8px' })
    )
    expect(marker).toHaveAttribute('aria-hidden', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Tokens' }))
    await waitFor(() =>
      expect(marker).toHaveStyle({ transform: 'translateY(80px)' })
    )
    expect(screen.getByRole('button', { name: 'Tokens' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Tokens' })).toHaveAttribute(
      'data-active'
    )
    expect(
      screen.getByRole('button', { name: 'Overview' })
    ).not.toHaveAttribute('data-active')
  })

  test('keyboard activation changes the selected row and disabled entries remain disabled', async () => {
    render(<NavigationFixture />)
    const channels = screen.getByRole('button', { name: 'Channels' })
    channels.focus()
    await userEvent.keyboard('{Enter}')
    expect(channels).toHaveAttribute('data-active')
    expect(channels).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Unavailable' })).toBeDisabled()
  })

  test('a destination without an active row hides the marker instead of leaving a stale selection', async () => {
    const view = render(<NavigationFixture />)
    const marker = view.container.querySelector(
      '[data-slot=sidebar-selection-indicator]'
    )
    await waitFor(() => expect(marker).toHaveStyle({ opacity: '1' }))
    await userEvent.click(
      screen.getByRole('button', { name: 'Clear selection' })
    )
    await waitFor(() => expect(marker).toHaveStyle({ opacity: '0' }))
  })
})
