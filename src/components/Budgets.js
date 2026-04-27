import React from 'react'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const CATEGORIES = ['Snacks', 'Utilities', 'Insurance', 'Subscriptions']
const CAT_COLOR = { Snacks:'#1a7a4a', Utilities:'#2d5be3', Insurance:'#c0392b', Subscriptions:'#6c3bd5' }

export default function Budgets({ expenses, budgets, setSyncing }) {
  const updateBudget = async (cat, val) => {
    setSyncing(true)
    await supabase.from('budgets').upsert({ category: cat, amount: parseFloat(val) || 0 }, { onConflict: 'category' })
    setSyncing(false)
  }

  const fmt = n => '$' + Math.round(n).toLocaleString()

  const chartData = CATEGORIES.map(cat => {
    const spent = expenses.filter(e => e.category === cat).reduce((s, e) => s + parseFloat(e.amount), 0)
    const budget = budgets[cat] || 0
    return { name: cat, spent: Math.round(spent), budget: Math.round(budget) }
  })

  return (
    <div>
      <div className="card">
        <div className="card-title">Budget limits</div>
        {CATEGORIES.map(cat => {
          const spent = expenses.filter(e => e.category === cat).reduce((s, e) => s + parseFloat(e.amount), 0)
          const budget = budgets[cat] || 0
          const pct = budget > 0 ? Math.min(100, Math.round(spent / budget * 100)) : 0
          const barColor = pct >= 100 ? '#c0392b' : pct >= 80 ? '#b05c00' : CAT_COLOR[cat]
          return (
            <div key={cat} className="budget-item">
              <span className="budget-cat-label" style={{ color: CAT_COLOR[cat] }}>{cat}</span>
              <div className="budget-bar-wrap">
                <div className="budget-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
              </div>
              <input
                type="number" className="budget-amt-input" defaultValue={budget} min="0"
                onBlur={e => updateBudget(cat, e.target.value)}
                style={{ width: 80, textAlign: 'right' }}
              />
              <span className="budget-nums">{fmt(spent)} / {fmt(budget)}</span>
            </div>
          )
        })}
      </div>

      <div className="card">
        <div className="card-title">Spending vs budget</div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 4 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => '$' + v.toLocaleString()} />
              <Tooltip formatter={(v, n) => ['$' + v.toLocaleString(), n === 'spent' ? 'Spent' : 'Budget']} />
              <Bar dataKey="budget" fill="#e8e7e0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="spent" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={CAT_COLOR[entry.name]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
