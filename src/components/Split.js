import React from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function Split({ expenses, settings }) {
  const p1Expenses = expenses.filter(e => e.paid_by === 'p1')
  const p2Expenses = expenses.filter(e => e.paid_by === 'p2')
  const sharedExpenses = expenses.filter(e => e.paid_by === 'shared')

  const p1Total = p1Expenses.reduce((s, e) => s + parseFloat(e.amount), 0)
  const p2Total = p2Expenses.reduce((s, e) => s + parseFloat(e.amount), 0)
  const sharedTotal = sharedExpenses.reduce((s, e) => s + parseFloat(e.amount), 0)

  const p1Effective = p1Total + sharedTotal / 2
  const p2Effective = p2Total + sharedTotal / 2

  const diff = p1Effective - p2Effective
  const owed = Math.abs(diff)

  const fmt = n => '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const pieData = [
    { name: settings.p1_name, value: Math.round(p1Total * 100) / 100 },
    { name: settings.p2_name, value: Math.round(p2Total * 100) / 100 },
    { name: 'Shared', value: Math.round(sharedTotal * 100) / 100 },
  ].filter(d => d.value > 0)

  const COLORS = ['#2d5be3', '#1a7a4a', '#888780']

  return (
    <div>
      <div className="card">
        <div className="card-title">Effective spend this month</div>
        <div className="split-grid">
          <div className="split-person">
            <div className="split-name">{settings.p1_name}</div>
            <div className="split-amount">{fmt(p1Effective)}</div>
            <div className="split-detail">
              {fmt(p1Total)} personal · {fmt(sharedTotal / 2)} shared
            </div>
          </div>
          <div className="split-person">
            <div className="split-name">{settings.p2_name}</div>
            <div className="split-amount">{fmt(p2Effective)}</div>
            <div className="split-detail">
              {fmt(p2Total)} personal · {fmt(sharedTotal / 2)} shared
            </div>
          </div>
        </div>

        {owed < 0.01
          ? <div className="balance-banner even">All square — you're even this month ✓</div>
          : (
            <div className="balance-banner">
              <strong>{diff > 0 ? settings.p2_name : settings.p1_name}</strong> owes{' '}
              <strong>{diff > 0 ? settings.p1_name : settings.p2_name}</strong>{' '}
              {fmt(owed)} this month
            </div>
          )
        }
      </div>

      {pieData.length > 0 && (
        <div className="card">
          <div className="card-title">Spending breakdown</div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => fmt(v)} />
                <Legend formatter={(v) => v} iconType="circle" iconSize={9} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
