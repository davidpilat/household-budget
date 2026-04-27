import React from 'react'
import { supabase } from '../lib/supabase'

const fmt = n => '$' + Math.abs(parseFloat(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function Settings({ settings, setSettings, setSyncing, p2BookIncome }) {
  const save = async (key, value) => {
    setSyncing(true)
    setSettings(prev => ({ ...prev, [key]: value }))
    await supabase.from('settings').upsert({ key, value: String(value) }, { onConflict: 'key' })
    setSyncing(false)
  }

  const exportCSV = async () => {
    const { data } = await supabase.from('expenses').select('*').order('date', { ascending: false })
    if (!data?.length) { alert('No expenses to export.'); return }
    const rows = [['Date', 'Description', 'Category', 'Paid By', 'Amount']]
    data.forEach(e => {
      const who = e.paid_by === 'shared' ? 'Shared' : e.paid_by === 'p1' ? settings.p1_name : settings.p2_name
      rows.push([e.date, e.description, e.category, who, parseFloat(e.amount).toFixed(2)])
    })
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = `budget-${new Date().toISOString().slice(0, 7)}.csv`
    a.click()
  }

  const p2Base = parseFloat(settings.p2_income) || 0
  const p2Total = p2Base + (parseFloat(p2BookIncome) || 0)

  return (
    <div>
      <div className="card">
        <div className="card-title">Names</div>
        <div className="settings-grid">
          <div className="form-group">
            <label className="form-label">Person 1</label>
            <input type="text" defaultValue={settings.p1_name} placeholder="e.g. David"
              onBlur={e => save('p1_name', e.target.value || 'Partner 1')} />
          </div>
          <div className="form-group">
            <label className="form-label">Person 2</label>
            <input type="text" defaultValue={settings.p2_name} placeholder="e.g. Wife"
              onBlur={e => save('p2_name', e.target.value || 'Partner 2')} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Monthly income</div>
        <div className="settings-grid">
          <div className="form-group">
            <label className="form-label">{settings.p1_name}</label>
            <input type="number" defaultValue={settings.p1_income} placeholder="0" min="0"
              onBlur={e => save('p1_income', e.target.value || '0')} />
          </div>
          <div className="form-group">
            <label className="form-label">{settings.p2_name} — base salary</label>
            <input type="number" defaultValue={settings.p2_income} placeholder="0" min="0"
              onBlur={e => save('p2_income', e.target.value || '0')} />
          </div>
        </div>
        {p2BookIncome > 0 && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--c-green-bg)', borderRadius: 'var(--radius)', fontSize: 13 }}>
            <span style={{ color: 'var(--c-green)', fontWeight: 500 }}>+ {fmt(p2BookIncome)} book profit this month</span>
            <span style={{ color: 'var(--c-text2)', marginLeft: 8 }}>→ {settings.p2_name} total: {fmt(p2Total)}</span>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">Data</div>
        <p style={{ fontSize: 13, color: 'var(--c-text2)', marginBottom: 12 }}>
          All data is shared in real-time with anyone who has the app URL.
        </p>
        <button className="btn" onClick={exportCSV}>Export CSV</button>
      </div>
    </div>
  )
}
