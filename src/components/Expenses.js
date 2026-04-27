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

export default function Expenses({ expenses, settings, currentMonth, setSyncing }) {
  const [desc, setDesc] = useState('')
  const [cat, setCat] = useState('Food')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState('shared')
  const [filter, setFilter] = useState('')
  const [adding, setAdding] = useState(false)

  const add = async () => {
    if (!desc.trim() || !amount || isNaN(parseFloat(amount))) return
    setAdding(true)
    setSyncing(true)
    const day = new Date().getDate().toString().padStart(2, '0')
    await supabase.from('expenses').insert({
      description: desc.trim(),
      category: cat,
      amount: parseFloat(amount),
      paid_by: paidBy,
      date: `${currentMonth}-${day}`,
    })
    setDesc(''); setAmount('')
    setAdding(false); setSyncing(false)
  }

  const del = async (id) => {
    setSyncing(true)
    await supabase.from('expenses').delete().eq('id', id)
    setSyncing(false)
  }

  const filtered = filter ? expenses.filter(e => e.category === filter) : expenses

  const whoLabel = (p) => {
    if (p === 'shared') return 'Shared'
    if (p === 'p1') return settings.p1_name
    if (p === 'p2') return settings.p2_name
    return p
  }

  return (
    <div>
      <div className="card">
        <div className="card-title">Add expense</div>
        <div className="add-form">
          <input
            type="text" placeholder="Description" value={desc}
            onChange={e => setDesc(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
          />
          <select value={cat} onChange={e => setCat(e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <input
            type="number" placeholder="$0.00" value={amount} min="0" step="0.01"
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
          />
          <select value={paidBy} onChange={e => setPaidBy(e.target.value)}>
            <option value="shared">Shared</option>
            <option value="p1">{settings.p1_name}</option>
            <option value="p2">{settings.p2_name}</option>
          </select>
          <button className="btn btn-primary" onClick={add} disabled={adding}>
            {adding ? '…' : 'Add'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="filter-row">
          <span className="card-title" style={{ margin: 0 }}>
            {filtered.length} expense{filtered.length !== 1 ? 's' : ''}
          </span>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 'auto', height: 30, padding: '4px 10px', fontSize: 12 }}>
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {!filtered.length
          ? <div className="empty">No expenses yet. Add one above.</div>
          : (
            <div className="expense-list">
              {filtered.map(e => {
                const colors = CAT_COLORS[e.category] || { bg: '#f0efe9', text: '#6b6960' }
                return (
                  <div key={e.id} className="expense-row">
                    <span className="exp-desc">{e.description}</span>
                    <span className="badge exp-cat-badge" style={{ background: colors.bg, color: colors.text }}>
                      {e.category}
                    </span>
                    <span className="exp-who">{whoLabel(e.paid_by)}</span>
                    <span className="exp-amount">
                      ${parseFloat(e.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <button className="exp-del" onClick={() => del(e.id)}>×</button>
                  </div>
                )
              })}
            </div>
          )
        }
      </div>
    </div>
  )
}
