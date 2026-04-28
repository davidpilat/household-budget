import React, { useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const CAT_COLORS = {
  Housing:'#2d5be3', Food:'#1a7a4a', Transport:'#b05c00', Health:'#c0392b',
  Entertainment:'#6c3bd5', Shopping:'#c0490a', Snacks:'#0e7a5a',
  Utilities:'#1a4ab0', Insurance:'#8a4500', Subscriptions:'#5c2db0', Other:'#888780'
}

const fmt = n => '$' + Math.abs(parseFloat(n)||0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtFull = n => '$' + Math.abs(parseFloat(n)||0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function biweeklyInMonth(anchor, year, month) {
  if (!anchor || !anchor.includes('-')) return 2
  const anchorDate = new Date(anchor + 'T00:00:00')
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  let count = 0
  let pay = new Date(anchorDate)
  while (pay > start) pay = new Date(pay.getTime() - 14 * 86400000)
  while (pay <= end) {
    pay = new Date(pay.getTime() + 14 * 86400000)
    if (pay >= start && pay <= end) count++
  }
  return count
}

export default function YearlySummary({ expenses, books, bonuses, settings, currentMonth }) {
  const currentYear = currentMonth ? currentMonth.slice(0, 4) : new Date().getFullYear().toString()
  const [year, setYear] = useState(currentYear)

  // Get available years from data
  const years = [...new Set([
    ...expenses.map(e => e.date?.slice(0, 4)),
    ...books.map(b => b.date?.slice(0, 4)),
  ].filter(Boolean))].sort().reverse()
  if (!years.includes(year) && years.length > 0) { /* keep selected year */ }

  const yearExpenses = expenses.filter(e => e.date?.startsWith(year) && !e.is_refund && parseFloat(e.amount) > 0)
  const yearRefunds = expenses.filter(e => e.date?.startsWith(year) && (e.is_refund || parseFloat(e.amount) < 0))
  const yearBooks = books.filter(b => b.date?.startsWith(year))
  const yearBonuses = bonuses.filter(b => b.month?.startsWith(year))

  // Monthly income calculation
  const monthlyIncome = MONTHS.map((_, i) => {
    const monthKey = `${year}-${String(i + 1).padStart(2, '0')}`
    const p1Mode = settings.p1_income_mode || 'monthly'
    const p2Mode = settings.p2_income_mode || 'monthly'
    const p1Base = p1Mode === 'biweekly'
      ? (parseFloat(settings.p1_income) || 0) * biweeklyInMonth(settings.p1_pay_anchor, parseInt(year), i)
      : (parseFloat(settings.p1_income) || 0)
    const p2Base = p2Mode === 'biweekly'
      ? (parseFloat(settings.p2_income) || 0) * biweeklyInMonth(settings.p2_pay_anchor, parseInt(year), i)
      : (parseFloat(settings.p2_income) || 0)
    const monthBonuses = yearBonuses.filter(b => b.month === monthKey)
    const p1Bonus = monthBonuses.filter(b => b.paid_to === 'p1').reduce((s, b) => s + parseFloat(b.amount || 0), 0)
    const p2Bonus = monthBonuses.filter(b => b.paid_to === 'p2').reduce((s, b) => s + parseFloat(b.amount || 0), 0)
    const bookProfit = yearBooks.filter(b => b.date?.startsWith(monthKey) && b.sale_price)
      .reduce((s, b) => s + parseFloat(b.sale_price || 0) - parseFloat(b.shipping_cost || 0) - parseFloat(b.purchase_price || 0), 0)
    return { month: MONTHS[i], income: p1Base + p2Base + p1Bonus + p2Bonus + bookProfit }
  })

  // Monthly spending
  const monthlySpending = MONTHS.map((name, i) => {
    const monthKey = `${year}-${String(i + 1).padStart(2, '0')}`
    const spent = yearExpenses.filter(e => e.date?.startsWith(monthKey)).reduce((s, e) => s + parseFloat(e.amount || 0), 0)
    const refunded = yearRefunds.filter(e => e.date?.startsWith(monthKey)).reduce((s, e) => s + Math.abs(parseFloat(e.amount || 0)), 0)
    const income = monthlyIncome[i].income
    return { month: name, spent: Math.round(spent - refunded), income: Math.round(income), saved: Math.round(income - (spent - refunded)) }
  })

  // Totals
  const totalIncome = monthlySpending.reduce((s, m) => s + m.income, 0)
  const totalSpent = monthlySpending.reduce((s, m) => s + m.spent, 0)
  const totalSaved = totalIncome - totalSpent
  const savingsRate = totalIncome > 0 ? Math.round((totalSaved / totalIncome) * 100) : 0
  const totalRefunds = yearRefunds.reduce((s, e) => s + Math.abs(parseFloat(e.amount || 0)), 0)
  const totalBookProfit = yearBooks.filter(b => b.sale_price)
    .reduce((s, b) => s + parseFloat(b.sale_price || 0) - parseFloat(b.shipping_cost || 0) - parseFloat(b.purchase_price || 0), 0)
  const totalBonuses = yearBonuses.reduce((s, b) => s + parseFloat(b.amount || 0), 0)

  // Spending by category
  const catSpending = {}
  yearExpenses.forEach(e => {
    catSpending[e.category] = (catSpending[e.category] || 0) + parseFloat(e.amount || 0)
  })
  const catData = Object.entries(catSpending)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value: Math.round(value) }))

  // Best/worst month
  const spentMonths = monthlySpending.filter(m => m.spent > 0)
  const bestMonth = spentMonths.length ? spentMonths.reduce((a, b) => a.saved > b.saved ? a : b) : null
  const worstMonth = spentMonths.length ? spentMonths.reduce((a, b) => a.saved < b.saved ? a : b) : null
  const avgMonthlySpend = spentMonths.length ? Math.round(totalSpent / spentMonths.length) : 0

  // Top spending category
  const topCat = catData[0]

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
        <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Year selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
        <span style={{ fontSize: 13, color: 'var(--c-text2)' }}>Year</span>
        <select value={year} onChange={e => setYear(e.target.value)}
          style={{ width: 'auto', height: 34, padding: '4px 28px 4px 10px', fontSize: 13 }}>
          {(years.length ? years : [currentYear]).map(y => <option key={y}>{y}</option>)}
        </select>
      </div>

      {/* Top metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: '1rem' }}>
        {[
          { label: 'Total income', value: fmtFull(totalIncome), color: 'var(--c-text)' },
          { label: 'Total spent', value: fmtFull(totalSpent), color: 'var(--c-text)' },
          { label: 'Net saved', value: (totalSaved >= 0 ? '' : '-') + fmtFull(totalSaved), color: totalSaved >= 0 ? 'var(--c-green)' : 'var(--c-red)' },
          { label: 'Savings rate', value: `${savingsRate}%`, color: savingsRate >= 20 ? 'var(--c-green)' : savingsRate >= 10 ? 'var(--c-amber)' : 'var(--c-red)' },
        ].map(m => (
          <div key={m.label} className="metric">
            <div className="metric-label">{m.label}</div>
            <div className="metric-value" style={{ fontSize: 20, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Income vs Spending chart */}
      <div className="card">
        <div className="card-title">Monthly income vs spending</div>
        <div className="chart-container" style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlySpending} margin={{ top: 4, right: 4, left: -15, bottom: 0 }} barGap={2}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => '$' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="income" name="Income" fill="var(--c-accent)" radius={[3,3,0,0]} opacity={0.3} />
              <Bar dataKey="spent" name="Spent" fill="var(--c-accent)" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Savings per month */}
      <div className="card">
        <div className="card-title">Monthly savings</div>
        <div className="chart-container" style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlySpending} margin={{ top: 4, right: 4, left: -15, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => '$' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v >= -1000 ? v : '-'+(Math.abs(v)/1000).toFixed(0)+'k')} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="saved" name="Saved" stroke="var(--c-green)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Spending by category */}
      {catData.length > 0 && (
        <div className="card">
          <div className="card-title">Spending by category</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'center' }}>
            <div className="chart-container" style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={catData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                    {catData.map((entry, i) => <Cell key={i} fill={CAT_COLORS[entry.name] || '#888'} />)}
                  </Pie>
                  <Tooltip formatter={v => fmtFull(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {catData.slice(0, 6).map(c => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: CAT_COLORS[c.name] || '#888', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, flex: 1 }}>{c.name}</span>
                  <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: 'var(--c-text2)' }}>{fmt(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="card">
        <div className="card-title">Year insights</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {avgMonthlySpend > 0 && (
            <div style={insightStyle}>
              <span style={insightIcon}>📊</span>
              <div><strong>Avg monthly spend</strong> — {fmtFull(avgMonthlySpend)}/month across active months</div>
            </div>
          )}
          {bestMonth && (
            <div style={insightStyle}>
              <span style={insightIcon}>🏆</span>
              <div><strong>Best month</strong> — {bestMonth.month} with {fmtFull(bestMonth.saved)} saved</div>
            </div>
          )}
          {worstMonth && bestMonth && worstMonth.month !== bestMonth.month && (
            <div style={insightStyle}>
              <span style={insightIcon}>📉</span>
              <div><strong>Toughest month</strong> — {worstMonth.month} with {worstMonth.saved >= 0 ? fmtFull(worstMonth.saved) + ' saved' : fmtFull(Math.abs(worstMonth.saved)) + ' over budget'}</div>
            </div>
          )}
          {topCat && (
            <div style={insightStyle}>
              <span style={insightIcon}>💸</span>
              <div><strong>Top category</strong> — {topCat.name} at {fmtFull(topCat.value)} ({totalSpent > 0 ? Math.round(topCat.value / totalSpent * 100) : 0}% of spending)</div>
            </div>
          )}
          {totalRefunds > 0 && (
            <div style={insightStyle}>
              <span style={insightIcon}>↩️</span>
              <div><strong>Total refunds</strong> — {fmtFull(totalRefunds)} returned this year</div>
            </div>
          )}
          {totalBookProfit > 0 && (
            <div style={insightStyle}>
              <span style={insightIcon}>📚</span>
              <div><strong>Book hustle</strong> — {fmtFull(totalBookProfit)} profit from {yearBooks.filter(b => b.sale_price).length} books sold</div>
            </div>
          )}
          {totalBonuses > 0 && (
            <div style={insightStyle}>
              <span style={insightIcon}>🎉</span>
              <div><strong>Bonuses received</strong> — {fmtFull(totalBonuses)} in extra income</div>
            </div>
          )}
          {savingsRate >= 20 && (
            <div style={{ ...insightStyle, background: 'var(--c-green-bg)', borderRadius: 8, padding: '8px 10px' }}>
              <span style={insightIcon}>✅</span>
              <div style={{ color: 'var(--c-green)' }}><strong>On track!</strong> Saving {savingsRate}% of income — above the recommended 20%</div>
            </div>
          )}
          {savingsRate > 0 && savingsRate < 10 && (
            <div style={{ ...insightStyle, background: 'var(--c-amber-bg)', borderRadius: 8, padding: '8px 10px' }}>
              <span style={insightIcon}>⚠️</span>
              <div style={{ color: 'var(--c-amber)' }}><strong>Heads up</strong> — only saving {savingsRate}% of income. Aim for 20%+</div>
            </div>
          )}
          {yearExpenses.length === 0 && (
            <div style={{ color: 'var(--c-text3)', fontSize: 13 }}>No data yet for {year}. Start adding expenses to see your yearly picture.</div>
          )}
        </div>
      </div>
    </div>
  )
}

const insightStyle = { display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'var(--c-text2)' }
const insightIcon = { fontSize: 16, flexShrink: 0, marginTop: 1 }
