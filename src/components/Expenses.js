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

const today = () => new Date().toISOString().slice(0, 10)

const fmtDate = (d) => {
  if (!d) return ''
  const [year, month, day] = d.slice(0, 10).split('-')
  return `${month}/${day}/${year}`
}

export default function Expenses({ expenses, settings, currentMonth, setSyncing }) {
  const [desc, setDesc] = useState('')
  const [cat, setCat] = useState('Food')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState('shared')
  const [date, setDate] = useState(today())
  const [filter, setFilter] = useState('')
  const [adding, setAdding] = useState(false)
  const [editCatId, setEditCatId] = useState(null)

  // Refund form state
  const [refundDesc, setRefundDesc] = useState('')
  const [refundCat, setRefundCat] = useState('Other')
  const [refundAmount, setRefundAmount] = useState('')
  const [refundDate, setRefundDate] = useState(today())
  const [addingRefund, setAddingRefund] = useState(false)
  const [showRefundForm, setShowRefundForm] = useState(false)

  const add = async () => {
    if (!desc.trim() || !amount || isNaN(parseFloat(amount))) return
    setAdding(true)
    setSyncing(true)
    await supabase.from('expenses').insert({
      description: desc.trim(),
      category: cat,
      amount: parseFloat(amount),
      paid_by: paidBy,
      date: date,
      is_refund: false,
    })
    setDesc(''); setAmount(''); setDate(today())
    setAdding(false); setSyncing(false)
  }

  const addRefund = async () => {
    if (!refundDesc.trim() || !refundAmount || isNaN(parseFloat(refundAmount))) return
    setAddingRefund(true)
    setSyncing(true)
    await supabase.from('expenses').insert({
      description: refundDesc.trim(),
      category: refundCat,
      amount: -Math.abs(parseFloat(refundAmount)),
      paid_by: paidBy,
      date: refundDate,
      is_refund: true,
    })
    setRefundDesc(''); setRefundAmount(''); setRefundDate(today())
    setAddingRefund(false); setSyncing(false); setShowRefundForm(false)
  }

  const del = async (id) => {
    setSyncing(true)
    await supabase.from('expenses').delete().eq('id', id)
    setSyncing(false)
  }

  const updateCategory = async (id, newCat) => {
    setSyncing(true)
    await supabase.from('expenses').update({ category: newCat }).eq('id', id)
    setEditCatId(null)
    setSyncing(false)
  }

  const filtered = filter ? expenses.filter(e => e.category === filter) : expenses
  const sorted = [...filtered].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  const totalSpent = expenses.filter(e => !e.is_refund).reduce((s, e) => s + parseFloat(e.amount || 0), 0)
  const totalRefunds = expenses.filter(e => e.is_refund).reduce((s, e) => s + Math.abs(parseFloat(e.amount || 0)), 0)
  const netSpent = totalSpent - totalRefunds

  const whoLabel = (p) => {
    if (p === 'shared') return 'Shared'
    if (p === 'p1') return settings.p1_name
    if (p === 'p2') return settings.p2_name
    return p
  }

  return (
    <div>
      {/* Summary row */}
      {totalRefunds > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: '1rem' }}>
          <div className="metric">
            <div className="metric-label">Gross spent</div>
            <div className="metric-value" style={{ fontSize: 18 }}>${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Refunds</div>
            <div className="metric-value" style={{ fontSize: 18, color: 'var(--c-green)' }}>-${totalRefunds.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Net spent</div>
            <div className="metric-value" style={{ fontSize: 18 }}>${netSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>
      )}

      {/* Add expense */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span className="card-title" style={{ margin: 0 }}>Add expense</span>
          <button
            className="btn"
            style={{ fontSize: 12, height: 28, padding: '0 12px', color: 'var(--c-green)', borderColor: 'var(--c-green-bg)' }}
            onClick={() => setShowRefundForm(v => !v)}
          >
            {showRefundForm ? 'Cancel refund' : '+ Add refund'}
          </button>
        </div>

        {showRefundForm ? (
          <div>
            <p style={{ fontSize: 12, color: 'var(--c-green)', marginBottom: 8 }}>Refunds reduce your total spent for the month.</p>
            <div className="add-form">
              <input type="text" placeholder="Description (e.g. Amazon return)" value={refundDesc}
                onChange={e => setRefundDesc(e.target.value)} onKeyDown={e => e.key === 'Enter' && addRefund()} />
              <select value={refundCat} onChange={e => setRefundCat(e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <input type="number" placeholder="$0.00" value={refundAmount} min="0" step="0.01"
                onChange={e => setRefundAmount(e.target.value)} onKeyDown={e => e.key === 'Enter' && addRefund()} />
              <input type="date" value={refundDate} onChange={e => setRefundDate(e.target.value)} />
              <select value={paidBy} onChange={e => setPaidBy(e.target.value)}>
                <option value="shared">Shared</option>
                <option value="p1">{settings.p1_name}</option>
                <option value="p2">{settings.p2_name}</option>
              </select>
              <button className="btn btn-primary" onClick={addRefund} disabled={addingRefund}
                style={{ background: 'var(--c-green)', border: 'none' }}>
                {addingRefund ? '…' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="add-form">
            <input type="text" placeholder="Description" value={desc}
              onChange={e => setDesc(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
            <select value={cat} onChange={e => setCat(e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <input type="number" placeholder="$0.00" value={amount} min="0" step="0.01"
              onChange={e => setAmount(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            <select value={paidBy} onChange={e => setPaidBy(e.target.value)}>
              <option value="shared">Shared</option>
              <option value="p1">{settings.p1_name}</option>
              <option value="p2">{settings.p2_name}</option>
            </select>
            <button className="btn btn-primary" onClick={add} disabled={adding}>{adding ? '…' : 'Add'}</button>
          </div>
        )}
      </div>

      {/* Expense list */}
      <div className="card">
        <div className="filter-row">
          <span className="card-title" style={{ margin: 0 }}>
            {sorted.length} expense{sorted.length !== 1 ? 's' : ''}
          </span>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            style={{ width: 'auto', height: 30, padding: '4px 10px', fontSize: 12 }}>
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {!sorted.length
          ? <div className="empty">No expenses yet. Add one above.</div>
          : (
            <div className="expense-list">
              {sorted.map(e => {
                const colors = CAT_COLORS[e.category] || { bg: '#f0efe9', text: '#6b6960' }
                const isRefund = e.is_refund || parseFloat(e.amount) < 0
                return (
                  <div key={e.id} className="expense-row" style={{ opacity: isRefund ? 0.85 : 1 }}>
                    <span className="exp-date">{fmtDate(e.date)}</span>
                    <span className="exp-desc">
                      {isRefund && <span style={{ fontSize: 10, background: 'var(--c-green-bg)', color: 'var(--c-green)', padding: '1px 5px', borderRadius: 4, marginRight: 5, fontWeight: 600 }}>REFUND</span>}
                      {e.description}
                    </span>
                    {editCatId === e.id ? (
                      <select
                        defaultValue={e.category}
                        autoFocus
                        onChange={ev => updateCategory(e.id, ev.target.value)}
                        onBlur={() => setEditCatId(null)}
                        style={{ fontSize: 11, height: 24, padding: '0 6px', borderRadius: 8 }}
                      >
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    ) : (
                      <span
                        className="badge exp-cat-badge"
                        style={{ background: colors.bg, color: colors.text, cursor: 'pointer' }}
                        title="Click to change category"
                        onClick={() => setEditCatId(e.id)}
                      >
                        {e.category} ✎
                      </span>
                    )}
                    <span className="exp-who">{whoLabel(e.paid_by)}</span>
                    <span className="exp-amount" style={{ color: isRefund ? 'var(--c-green)' : 'inherit' }}>
                      {isRefund ? '-' : ''}${Math.abs(parseFloat(e.amount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
