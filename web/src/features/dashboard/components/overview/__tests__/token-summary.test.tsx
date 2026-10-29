import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

import { SummaryCards } from '../summary-cards'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  useAuthStore.setState(useAuthStore.getInitialState(), true)
})
it('shows real last-day tokens and requests without balance, wallet or currency', async () => {
  useAuthStore.getState().auth.setUser({
    id: 1,
    username: 'user',
    role: 1,
    quota: 987654,
    used_quota: 333333,
    request_count: 45,
  })
  vi.spyOn(api, 'get').mockResolvedValue({
    data: {
      success: true,
      data: [{ created_at: 1700000000, token_used: 1200, quota: 0, count: 3 }],
    },
  })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <SummaryCards />
    </QueryClientProvider>
  )
  expect(await screen.findByText('1,200')).toBeVisible()
  expect(screen.getByText('3')).toBeVisible()
  expect(screen.getByText('45')).toBeVisible()
  expect(
    screen.queryByText(
      /Credit remaining|Wallet|Balance depleted|Historical Usage/
    )
  ).not.toBeInTheDocument()
  client.clear()
})

it('shows unavailable values instead of zero usage when the statistics request fails', async () => {
  vi.spyOn(api, 'get').mockRejectedValue(new Error('Statistics unavailable'))
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <SummaryCards />
    </QueryClientProvider>
  )
  expect(await screen.findAllByText('—')).toHaveLength(2)
  client.clear()
})
