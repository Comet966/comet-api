import { describe, expect, it } from 'vitest'

import { processChartData, processUserChartData } from '../charts'
import { buildDashboardFlowData, buildFlowSankeySpec } from '../flow'

const rows = [
  {
    created_at: 1700000000,
    username: 'alice',
    model_name: 'model-a',
    token_used: 1200,
    quota: 0,
    count: 2,
  },
  {
    created_at: 1700000000,
    username: 'bob',
    model_name: 'model-b',
    token_used: 300,
    quota: 900000,
    count: 1,
  },
]

describe('public service token analytics', () => {
  it('shows actual token totals even when billing quota is zero or unrelated', () => {
    const result = processChartData(rows)
    expect(result.totalQuotaDisplay.replaceAll(',', '')).toBe('1500')
    expect(result.spec_line.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          values: expect.arrayContaining([
            expect.objectContaining({ Model: 'model-a', Usage: 1200 }),
            expect.objectContaining({ Model: 'model-b', Usage: 300 }),
          ]),
        }),
      ])
    )
  })
  it('ranks users by token usage instead of monetary quota', () => {
    const result = processUserChartData(rows)
    expect(result.spec_user_rank.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          values: [
            expect.objectContaining({ User: 'alice', rawQuota: 1200 }),
            expect.objectContaining({ User: 'bob', rawQuota: 300 }),
          ],
        }),
      ])
    )
  })
  it('keeps empty token analytics at zero', () => {
    expect(processChartData([]).totalQuotaDisplay).toBe('0')
  })
  it('hides quota in flow tooltips while preserving token and request metrics', () => {
    const { flow } = buildDashboardFlowData(rows, 'tokens')
    const spec = buildFlowSankeySpec(flow, 'Flow', String, undefined, false)
    const tooltip = spec.tooltip as {
      mark: { content: { key: string; visible?: () => boolean }[] }
    }
    expect(tooltip.mark.content.map((line) => line.key)).not.toContain('Quota')
    expect(tooltip.mark.content.map((line) => line.key)).toContain('Tokens')
  })
})
