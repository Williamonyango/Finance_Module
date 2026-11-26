export function getMonthlyTrend(monthlyTrend = [], date = new Date()) {
  const totalsByMonth = new Map(
    monthlyTrend.map(({ month, total }) => [month, Number(total) || 0]),
  )

  return Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(date.getFullYear(), date.getMonth() - 5 + index, 1)
    const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`
    return {
      month: monthDate.toLocaleString('en', { month: 'short' }),
      amount: totalsByMonth.get(key) || 0,
    }
  })
}
