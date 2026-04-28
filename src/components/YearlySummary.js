import React, { useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const CAT_COLORS = {
  Housing:'#2d5be3', Food:'#1a7a4a', Transport:'#b05c00', Health:'#c0392b',
  Entertainment:'#6c3bd5', Shopping:'#c0490a', Snacks:'#0e7a5a',
  Utilities:'#1a4ab0', Insurance:'#8a4500', Subscriptions:'#5c2db0', Other:'#888780'
}
const fmt = n => '$' + Math.abs(parseFloat(n)||0).toLocaleString('en-US', { minimumFractionDigits:0, maximumFractionDigits:0 })
const fmtFull = n => '$' + Math.abs(parseFloat(n)||0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })

function biweeklyInMonth(anchor, year, monthIndex) {
  if (!anchor || !anchor.includes('-')) return 2
  const anchorDate = new Date(anchor + 'T00:00:00')
  const start = new Date(year, monthIndex, 1)
  const end = new Date(year, monthIndex + 1, 0)
  let count = 0, pay = new Date(anchorDate)
  while (pay > start) pay = new Date(pay.getTime() - 14 * 86400000)
  while (pay <= end) {
    pay = new Date(pay.getTime() + 14 * 86400000)
    if (pay >= start && pay <= end) count++
  }
  return count
}

function getIncomeForMonth(incomeHistory, settings, monthKey) {
  if (!incomeHistory || incomeHistory.length === 0) return settings
  const sorted = [...incomeHistory].sort((a, b) => a.effective_from.localeCompare(b.effective_from))
  let applicable = null
  for (const record of sorted) {
    if (record.effective_from <= monthKey) applicable = record
  }
  return applicable || settings
}

export default function YearlySummary({ expenses, books, bonuses, settings, currentMonth, incomeHistory }) {
  const today = new Date()
  const currentYearStr = currentMonth ? currentMonth.slice(0, 4) : today.getFullYear().toString()
  const [year, setYear] = useState(currentYearStr)

  const nowYear = today.getFullYear()
  const nowMonthIndex = today.getMonth() // 0-indexed
  const isCurrentYear = parseInt(year) === nowYear

  // Default range: Jan to current month (or Dec for past years)
  const defaultEnd = isCurrentYear ? nowMonthIndex : 11
  const [startMonth, setStartMonth] = useState(0)
  const [endMonth, setEndMonth] = useState(defaultEnd)

  // When year changes, reset end month appropriately
  const handleYearChange = (y) => {
    setYear(y)
    const isNowYear = parseInt(y) === nowYear
    setStartMonth(0)
    setEndMonth(isNowYear ? nowMonthIndex : 11)
  }

  const years = [...new Set([
    ...expenses.map(e => e.date?.slice(0, 4)),
    ...books.map(b => b.date?.slice(0, 4)),
    currentYearStr,
  ].filter(Boolean))].sort().reverse()

  const yearExpenses = expenses.filter(e => e.date?.startsWith(year) && !e.is_refund && parseFloat(e.amount) > 0)
  const yearRefunds = expenses.filter(e => e.date?.startsWith(year) && (e.is_refund || parseFloat(e.amount) < 0))
  const yearBooks = books.filter(b => b.date?.startsWith(year))
  const yearBonuses = bonuses.filter(b => b.month?.startsWith(year))

  const monthlyData = MONTHS.map((name, i) => {
    const monthKey = `${year}-${String(i + 1).padStart(2, '0')}`
    const isFuture = isCurrentYear && i > nowMonthIndex
    const isOutOfRange = i < startMonth || i > endMonth
    const monthIncome = getIncomeForMonth(incomeHistory, settings, monthKey)

    const p1Mode = monthIncome.p1_income_mode || monthIncome.p1_mode || settings.p1_income_mode || 'monthly'
    const p2Mode = monthIncome.p2_income_mode || monthIncome.p2_mode || settings.p2_income_mode || 'monthly'
    const p1Anchor = monthIncome.p1_pay_anchor || monthIncome.p1_anchor || settings.p1_pay_anchor || ''
    const p2Anchor = monthIncome.p2_pay_anchor || monthIncome.p2_anchor || settings.p2_pay_anchor || ''

    const p1Base = p1Mode === 'biweekly'
      ? (parseFloat(monthIncome.p1_income)||0) * biweeklyInMonth(p1Anchor, parseInt(year), i)
      : (parseFloat(monthIncome.p1_income)||0)
    const p2Base = p2Mode === 'biweekly'
      ? (parseFloat(monthIncome.p2_income)||0) * biweeklyInMonth(p2Anchor, parseInt(year), i)
      : (parseFloat(monthIncome.p2_income)||0)

    const monthBonuses = yearBonuses.filter(b => b.month === monthKey)
    const p1Bonus = monthBonuses.filter(b => b.paid_to === 'p1').reduce((s, b) => s + parseFloat(b.amount||0), 0)
    const p2Bonus = monthBonuses.filter(b => b.paid_to === 'p2').reduce((s, b) => s + parseFloat(b.amount||0), 0)
    const bookProfit = yearBooks.filter(b => b.date?.startsWith(monthKey) && b.sale_price)
      .reduce((s, b) => s + parseFloat(b.sale_price||0) - parseFloat(b.shipping_cost||0) - parseFloat(b.purchase_price||0), 0)

    const income = (isFuture || isOutOfRange) ? 0 : p1Base + p2Base + p1Bonus + p2Bonus + bookProfit
    const spent = (isFuture || isOutOfRange) ? 0
      : yearExpenses.filter(e => e.date?.startsWith(monthKey)).reduce((s, e) => s + parseFloat(e.amount||0), 0)
        - yearRefunds.filter(e => e.date?.startsWith(monthKey)).reduce((s, e) => s + Math.abs(parseFloat(e.amount||0)), 0)

    return { month: name, income: Math.round(income), spent: Math.round(Math.max(0, spent)), saved: Math.round(income - Math.max(0, spent)), isFuture, isOutOfRange }
  })

  const activeMonths = monthlyData.filter(m => !m.isFuture && !m.isOutOfRange)
  const chartMonths = monthlyData.filter(m => !m.isFuture) // show all non-future in chart, greyed out if out of range

  const totalIncome = activeMonths.reduce((s, m) => s + m.income, 0)
  const totalSpent = activeMonths.reduce((s, m) => s + m.spent, 0)
  const totalSaved = totalIncome - totalSpent
  const savingsRate = totalIncome > 0 ? Math.round((totalSaved / totalIncome) * 100) : 0

  // Category spending only in range
  const catSpending = {}
  yearExpenses.filter(e => {
    const mi = parseInt(e.date?.slice(5, 7)) - 1
    return mi >= startMonth && mi <= endMonth
  }).forEach(e => { catSpending[e.category] = (catSpending[e.category]||0) + parseFloat(e.amount||0) })
  const catData = Object.entries(catSpending).sort((a,b) => b[1]-a[1]).map(([name, value]) => ({ name, value: Math.round(value) }))

  // Book + bonus totals in range
  const totalRefunds = yearRefunds.filter(e => {
    const mi = parseInt(e.date?.slice(5,7)) - 1
    return mi >= startMonth && mi <= endMonth
  }).reduce((s, e) => s + Math.abs(parseFloat(e.amount||0)), 0)
  const totalBookProfit = yearBooks.filter(b => b.sale_price).filter(b => {
    const mi = parseInt(b.date?.slice(5,7)) - 1
    return mi >= startMonth && mi <= endMonth
  }).reduce((s, b) => s + parseFloat(b.sale_price||0) - parseFloat(b.shipping_cost||0) - parseFloat(b.purchase_price||0), 0)
  const totalBonuses = yearBonuses.filter(b => {
    const mi = parseInt(b.month?.slice(5,7)) - 1
    return mi >= startMonth && mi <= endMonth
  }).reduce((s, b) => s + parseFloat(b.amount||0), 0)

  const spentMonths = activeMonths.filter(m => m.spent > 0)
  const bestMonth = spentMonths.length ? spentMonths.reduce((a,b) => a.saved > b.saved ? a : b) : null
  const worstMonth = spentMonths.length ? spentMonths.reduce((a,b) => a.saved < b.saved ? a : b) : null
  const avgMonthlySpend = spentMonths.length ? Math.round(totalSpent / spentMonths.length) : 0
  const topCat = catData[0]

  const rangeLabel = startMonth === 0 && endMonth === (isCurrentYear ? nowMonthIndex : 11)
    ? isCurrentYear ? `Jan – ${MONTHS[nowMonthIndex]}` : 'Full year'
    : `${MONTHS[startMonth]} – ${MONTHS[endMonth]}`

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)', borderRadius:8, padding:'8px 12px', fontSize:12 }}>
        <p style={{ fontWeight:600, marginBottom:4 }}>{label}</p>
        {payload.map(p => <p key={p.name} style={{ color:p.color }}>{p.name}: {fmt(p.value)}</p>)}
      </div>
    )
  }

  return (
    <div>
      {/* Controls */}
      <div className="card" style={{ marginBottom:'1rem' }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:12, alignItems:'flex-end' }}>
          <div className="form-group" style={{ minWidth:80 }}>
            <label className="form-label">Year</label>
            <select value={year} onChange={e => handleYearChange(e.target.value)}
              style={{ height:38, padding:'4px 28px 4px 10px', fontSize:13 }}>
              {years.map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ minWidth:100 }}>
            <label className="form-label">From</label>
            <select value={startMonth} onChange={e => setStartMonth(parseInt(e.target.value))}
              style={{ height:38, padding:'4px 28px 4px 10px', fontSize:13 }}>
              {MONTHS.map((m, i) => (
                <option key={i} value={i} disabled={isCurrentYear && i > nowMonthIndex}>{m}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ minWidth:100 }}>
            <label className="form-label">To</label>
            <select value={endMonth} onChange={e => setEndMonth(parseInt(e.target.value))}
              style={{ height:38, padding:'4px 28px 4px 10px', fontSize:13 }}>
              {MONTHS.map((m, i) => (
                <option key={i} value={i} disabled={(isCurrentYear && i > nowMonthIndex) || i < startMonth}>{m}</option>
              ))}
            </select>
          </div>
          <button className="btn" style={{ height:38, fontSize:12 }}
            onClick={() => { setStartMonth(0); setEndMonth(isCurrentYear ? nowMonthIndex : 11) }}>
            Reset
          </button>
          <span style={{ fontSize:13, color:'var(--c-text3)', alignSelf:'center' }}>{rangeLabel} · {activeMonths.length} month{activeMonths.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Top metrics */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:'1rem' }}>
        {[
          { label:'Total income', value:fmtFull(totalIncome), color:'var(--c-text)' },
          { label:'Total spent', value:fmtFull(totalSpent), color:'var(--c-text)' },
          { label:'Net saved', value:(totalSaved>=0?'':'-')+fmtFull(totalSaved), color:totalSaved>=0?'var(--c-green)':'var(--c-red)' },
          { label:'Savings rate', value:`${savingsRate}%`, color:savingsRate>=20?'var(--c-green)':savingsRate>=10?'var(--c-amber)':'var(--c-red)' },
        ].map(m => (
          <div key={m.label} className="metric">
            <div className="metric-label">{m.label}</div>
            <div className="metric-value" style={{ fontSize:20, color:m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Income vs Spending chart — shows all non-future months, dims out-of-range */}
      <div className="card">
        <div className="card-title">Monthly income vs spending · <span style={{ textTransform:'none', fontWeight:400 }}>{rangeLabel}</span></div>
        <div className="chart-container" style={{ height:220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData.filter(m => !m.isFuture)} margin={{ top:4, right:4, left:-15, bottom:0 }} barGap={2}>
              <XAxis dataKey="month" tick={{ fontSize:11 }} />
              <YAxis tick={{ fontSize:10 }} tickFormatter={v => '$'+(v>=1000?(v/1000).toFixed(0)+'k':v)} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="income" name="Income" radius={[3,3,0,0]} opacity={0.35}>
                {monthlyData.filter(m => !m.isFuture).map((m, i) => (
                  <Cell key={i} fill={m.isOutOfRange ? 'var(--c-border-strong)' : 'var(--c-accent)'} />
                ))}
              </Bar>
              <Bar dataKey="spent" name="Spent" radius={[3,3,0,0]}>
                {monthlyData.filter(m => !m.isFuture).map((m, i) => (
                  <Cell key={i} fill={m.isOutOfRange ? 'var(--c-text3)' : 'var(--c-accent)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Savings line */}
      <div className="card">
        <div className="card-title">Monthly savings · <span style={{ textTransform:'none', fontWeight:400 }}>{rangeLabel}</span></div>
        <div className="chart-container" style={{ height:180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={activeMonths} margin={{ top:4, right:4, left:-15, bottom:0 }}>
              <XAxis dataKey="month" tick={{ fontSize:11 }} />
              <YAxis tick={{ fontSize:10 }} tickFormatter={v => '$'+(Math.abs(v)>=1000?(v<0?'-':'')+(Math.abs(v)/1000).toFixed(0)+'k':v)} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="saved" name="Saved" stroke="var(--c-green)" strokeWidth={2} dot={{ r:3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category breakdown */}
      {catData.length > 0 && (
        <div className="card">
          <div className="card-title">Spending by category · <span style={{ textTransform:'none', fontWeight:400 }}>{rangeLabel}</span></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, alignItems:'center' }}>
            <div className="chart-container" style={{ height:200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={catData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                    {catData.map((e,i) => <Cell key={i} fill={CAT_COLORS[e.name]||'#888'} />)}
                  </Pie>
                  <Tooltip formatter={v => fmtFull(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {catData.slice(0,6).map(c => (
                <div key={c.name} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:CAT_COLORS[c.name]||'#888', flexShrink:0 }} />
                  <span style={{ fontSize:12, flex:1 }}>{c.name}</span>
                  <span style={{ fontSize:12, fontFamily:"'DM Mono',monospace", color:'var(--c-text2)' }}>{fmt(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="card">
        <div className="card-title">Insights · <span style={{ textTransform:'none', fontWeight:400 }}>{rangeLabel}</span></div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {avgMonthlySpend > 0 && <Insight icon="📊" text={<><strong>Avg monthly spend</strong> — {fmtFull(avgMonthlySpend)}/month</>} />}
          {bestMonth && <Insight icon="🏆" text={<><strong>Best month</strong> — {bestMonth.month} with {fmtFull(bestMonth.saved)} saved</>} />}
          {worstMonth && bestMonth && worstMonth.month !== bestMonth.month && (
            <Insight icon="📉" text={<><strong>Toughest month</strong> — {worstMonth.month}: {worstMonth.saved>=0?fmtFull(worstMonth.saved)+' saved':fmtFull(Math.abs(worstMonth.saved))+' over budget'}</>} />
          )}
          {topCat && <Insight icon="💸" text={<><strong>Top category</strong> — {topCat.name} at {fmtFull(topCat.value)} ({totalSpent>0?Math.round(topCat.value/totalSpent*100):0}% of spending)</>} />}
          {totalRefunds > 0 && <Insight icon="↩️" text={<><strong>Total refunds</strong> — {fmtFull(totalRefunds)} returned</>} />}
          {totalBookProfit > 0 && <Insight icon="📚" text={<><strong>Book hustle</strong> — {fmtFull(totalBookProfit)} profit from {yearBooks.filter(b=>b.sale_price).filter(b=>{const mi=parseInt(b.date?.slice(5,7))-1;return mi>=startMonth&&mi<=endMonth}).length} books sold</>} />}
          {totalBonuses > 0 && <Insight icon="🎉" text={<><strong>Bonuses</strong> — {fmtFull(totalBonuses)} in extra income</>} />}
          {savingsRate >= 20 && <Insight icon="✅" text={<span style={{color:'var(--c-green)'}}><strong>On track!</strong> Saving {savingsRate}% of income</span>} highlight="green" />}
          {savingsRate > 0 && savingsRate < 10 && <Insight icon="⚠️" text={<span style={{color:'var(--c-amber)'}}><strong>Heads up</strong> — saving only {savingsRate}%. Aim for 20%+</span>} highlight="amber" />}
          {activeMonths.length === 0 && <p style={{ color:'var(--c-text3)', fontSize:13 }}>No data for this range.</p>}
        </div>
      </div>
    </div>
  )
}

function Insight({ icon, text, highlight }) {
  const bg = highlight === 'green' ? 'var(--c-green-bg)' : highlight === 'amber' ? 'var(--c-amber-bg)' : 'transparent'
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:10, fontSize:13, color:'var(--c-text2)', background:bg, borderRadius:highlight?8:0, padding:highlight?'8px 10px':0 }}>
      <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>{icon}</span>
      <div>{text}</div>
    </div>
  )
}
