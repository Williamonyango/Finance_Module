import assert from 'node:assert/strict'
import test from 'node:test'
import { getMonthlyTrend } from '../src/services/monthlyTrend.js'

test('monthly trend is flat when the backend has no contributions', () => {
  const trend = getMonthlyTrend([], new Date(2026, 10, 26))

  assert.deepEqual(trend.map(({ month }) => month), ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'])
  assert.deepEqual(trend.map(({ amount }) => amount), [0, 0, 0, 0, 0, 0])
})

test('monthly trend uses backend totals and fills missing months with zero', () => {
  const trend = getMonthlyTrend([
    { month: '2026-07', total: '1250.50' },
    { month: '2026-10', total: '300' },
  ], new Date(2026, 10, 26))

  assert.deepEqual(trend.map(({ amount }) => amount), [0, 1250.5, 0, 0, 300, 0])
})
