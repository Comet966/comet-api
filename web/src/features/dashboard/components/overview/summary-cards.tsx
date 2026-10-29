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
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { StaggerContainer, StaggerItem } from '@/components/page-transition'
import { getUserQuotaDates } from '@/features/dashboard/api'
import { useSummaryCardsConfig } from '@/features/dashboard/hooks/use-dashboard-config'
import { formatNumber } from '@/lib/format'
import { requireServerSuccess } from '@/lib/server-error-message'
import { computeTimeRange } from '@/lib/time'
import { useAuthStore } from '@/stores/auth-store'

import { StatCard } from '../ui/stat-card'

export function SummaryCards() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.auth.user)
  const timeRange = useMemo(() => computeTimeRange(1), [])
  const usageQuery = useQuery({
    queryKey: [
      'dashboard',
      'overview',
      'summary-sparklines',
      timeRange.start_timestamp,
      timeRange.end_timestamp,
    ],
    queryFn: async () =>
      requireServerSuccess(
        await getUserQuotaDates({ ...timeRange, default_time: 'hour' })
      ),
    staleTime: 60 * 1000,
  })
  const usage = useMemo(
    () =>
      (usageQuery.data?.data ?? []).reduce(
        (total, row) => ({
          tokens: total.tokens + (Number(row.token_used) || 0),
          requests: total.requests + (Number(row.count) || 0),
        }),
        { tokens: 0, requests: 0 }
      ),
    [usageQuery.data?.data]
  )
  const items = useSummaryCardsConfig({
    todayUsageDisplay: formatNumber(usage.tokens),
    todayRequestsDisplay: formatNumber(usage.requests),
    requestCountDisplay: formatNumber(Number(user?.request_count) || 0),
  })
  return (
    <div className='bg-card overflow-hidden rounded-2xl border p-3 shadow-xs sm:p-5'>
      <h3 className='text-sm font-semibold sm:text-base'>
        {t('Usage at a glance')}
      </h3>
      <p className='text-muted-foreground mt-1 text-xs sm:text-sm'>
        {t('Monitor token usage and request volume')}
      </p>
      <StaggerContainer className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3'>
        {items.map((item, index) => (
          <StaggerItem
            key={item.key}
            className='bg-background/60 rounded-xl border p-3'
          >
            <StatCard
              title={item.title}
              value={
                usageQuery.isError && item.key !== 'totalRequests'
                  ? '—'
                  : item.value
              }
              description={item.description}
              icon={item.icon}
              tone={index === 0 ? 'accent-1' : 'accent-2'}
              loading={usageQuery.isPending && item.key !== 'totalRequests'}
              compactMobile
            />
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  )
}
