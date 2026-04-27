import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORIES = ['Housing', 'Food', 'Transport', 'Health', 'Entertainment', 'Shopping', 'Snacks', 'Utilities', 'Insurance', 'Subscriptions', 'Other']

const CAT_COLORS = {
  Housing: { bg: '#eef2fd', text: '#2d5be3' },
  Food: { bg: '#e8f5ee', text: '#1a7a4a' },
  Transport: { bg: '#fef3e2', text: '#b05c00' },
  Health: { bg: '#fdecea', text: '#c0392b' },
  Entertainment: { bg: '#f0effe', text: '#6c3bd5' },
  Shopping: { bg: '#fff0eb', text: '#c0490a' },
  Snacks: { bg: '#e8f5ee', text: '#0e7a5a' },
  Utilities: { bg: '#e6f1fb', text: '#1a4ab0' },
  Insurance: { bg: '#fef3e2', text: '#8a4500' },
  Subscriptions: { bg: '#f5eefe', text: '#5c2db0' },
  Other: { bg: '#f0efe9', text: '#6b6960' },
}

export default function Recurring({ recurring, setSyncing, settings, expenses, currentMonth }) {
  const [desc, setDesc] = useState('')
  const [cat, setCat] = useState('Housing')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState('shared')
  const [day, setDay] = useState(1)
  const [adding, setAdding] = useState(false)

  const addRecurring = async () => {
    if (!desc.trim() || !amount || isNaN(parseFloat(amount))) return
    setAdding(true)
    setSyncing(true)
    await supabase.from('recurring').insert({
      description: desc.trim(),
      category: cat,
      amount: parseFloat(amount),
      paid_by: paidBy,
      day_of_month: parseInt(day),
    })
    setDesc(''); setAmount(''); setDay(1)
    setAdding(false); setSyncing(false)
  }

  const deleteRecurring = async (id) => {
    setSyncing(true)
    await supabase.from('recurring').delete().eq('id', id)
    setSyncing(false)
  }

  const applyToMonth = async (item) => {
    const d = String(item.day_of_month).padStart(2, '0')
    const date = `${currentMonth}-${d}`
    const alreadyExists = expenses.some(
      e => e.description === item.description &&
           e.amount == item.amount &&
           e.date === date
    )
    if (alreadyExists) {
      alert(`"${item.description}" is already in ${currentMonth}.`)
      return
    }
    setSyncing(true)
    await supabase.from('expenses').insert({
      description: item.description,
      category: item.category,
      amount: item.amount,
      paid_by: item.paid_by,
      date,
    })
    setSyncing(false)
  }

  const applyAllToMonth = async () => {
    setSyncing(true)
    const toInsert = []
    for (const item of recurring) {
      const d = String(item.day_of_month).padStart(2, '0')
      const date = `${currentMonth}-${d}`
      const alreadyExists = expenses.some(
        e => e.description === item.description &&
             e.amount == item.amount &&
             e.date === date
      )
      if (!alreadyExists) {
        toInsert.push({
          description: item.description,
          category: item.category,
          amount: item.amount,
          paid_by: item.paid_by,
          date,
        })
      }
    }
    if (toInsert.length > 0) {
      await supabase.from('expenses').insert(toInsert)
    }
    setSyncing(false)
    alert(toInsert.length > 0 ? `Added ${toInsert.length} recurring expense(s) to ${currentMonth}.` : `All recurring expenses already exist for ${currentMonth}.`)
  }

  const whoLabel = (p) => {
    if (p === 'shared') return 'Shared'
    if (p === 'p1') return settings.p1_name
    if (p === 'p2') return settings.p2_name
    return p
  }

  const totalMonthly = recurring.reduce((s, r) => s + parseFloat(r.amount || 0), 0)

  return (
    <div>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1rem' }}>
        <div className="metric">
          <div className="metric-label">Monthly recurring total</div>
          <div className="metric-value" style={{ fontSize: 20 }}>
            ${totalMonthly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="metric">
          <div className="metric-label">Active recurring expenses</div>
          <div className="metric-value" style={{ fontSize: 20 }}>{recurring.length}</div>
        </div>
      </div>

      {/* Add */}
      <div className="card">
        <div className="card-title">Add recurring expense</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 60px 100px auto', gap: 8, alignItems: 'end' }}>
          <input type="text" placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} onKeyDown={e => e.key === 'Enter' && addRecurring()} />
          <select value={cat} onChange={e => setCat(e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <input type="number" placeholder="$0.00" value={amount} min="0" step="0.01" onChange={e => setAmount(e.target.value)} />
          <input type="number" placeholder="Day" value={day} min="1" max="28" onChange={e => setDay(e.target.value)} title="Day of month (1–28)" />
          <select value={paidBy} onChange={e => setPaidBy(e.target.value)}>
            <option value="shared">Shared</option>
            <option value="p1">{settings.p1_name}</option>
            <option value="p2">{settings.p2_name}</option>
          </select>
          <button className="btn btn-primary" onClick={addRecurring} disabled={adding}>{adding ? '…' : 'Add'}</button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--c-text3)', marginTop: 8 }}>Day = which day of the month this posts (max 28 to avoid month-end issues).</p>
      </div>

      {/* List */}
      {recurring.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span className="card-title" style={{ margin: 0 }}>Recurring expenses</span>
            <button className="btn btn-primary" style={{ fontSize: 12, height: 30, padding: '0 14px' }} onClick={applyAllToMonth}>
              Add all to {currentMonth} ↓
            </button>
          </div>
          <div className="expense-list">
            {recurring.sort((a, b) => a.day_of_month - b.day_of_month).map(r => {
              const colors = CAT_COLORS[r.category] || { bg: '#f0efe9', text: '#6b6960' }
              const d = String(r.day_of_month).padStart(2, '0')
              const date = `${currentMonth}-${d}`
              const alreadyAdded = expenses.some(
                e => e.description === r.description &&
                     e.amount == r.amount &&
                     e.date === date
              )
              return (
                <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '36px 1fr auto auto auto auto', alignItems: 'center', gap: 10, padding: '10px 4px', borderBottom: '1px solid var(--c-border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--c-text3)', fontFamily: "'DM Mono', monospace", textAlign: 'center' }}>
                    {r.day_of_month}
                  </span>
                  <span style={{ fontSize: 14 }}>{r.description}</span>
                  <span className="badge" style={{ background: colors.bg, color: colors.text, fontSize: 11, padding: '2px 8px', borderRadius: 20 }}>{r.category}</span>
                  <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>{whoLabel(r.paid_by)}</span>
                  <span style={{ fontSize: 14, fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>
                    ${parseFloat(r.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  {alreadyAdded
                    ? <span style={{ fontSize: 11, color: 'var(--c-green)', minWidth: 60, textAlign: 'right' }}>✓ added</span>
                    : <button className="btn" style={{ fontSize: 11, height: 26, padding: '0 10px' }} onClick={() => applyToMonth(r)}>+ add</button>
                  }
                  <button className="exp-del" onClick={() => deleteRecurring(r.id)}>×</button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {recurring.length === 0 && (
        <div className="empty">No recurring expenses yet. Add things like rent, subscriptions, or utilities above.</div>
      )}
    </div>
  )
}
