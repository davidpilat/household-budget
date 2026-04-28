import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

const fmt = n => '$' + Math.abs(parseFloat(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function Settings({ settings, setSettings, setSyncing, p2BookIncome = 0, bonuses = [], currentMonth, p1Income = 0, p2Income = 0, p1Bonuses = 0, p2Bonuses = 0 }) {
  const [showBonusForm, setShowBonusForm] = useState(false)
  const [bonusDesc, setBonusDesc] = useState('')
  const [bonusAmt, setBonusAmt] = useState('')
  const [bonusWho, setBonusWho] = useState('p1')
  const [addingBonus, setAddingBonus] = useState(false)

  const safeMonth = (currentMonth && currentMonth.includes('-')) ? currentMonth : new Date().toISOString().slice(0, 7)

  const save = async (key, value) => {
    setSyncing(true)
    setSettings(prev => ({ ...prev, [key]: value }))
    await supabase.from('settings').upsert({ key, value: String(value) }, { onConflict: 'key' })
    setSyncing(false)
  }

  const deleteBonus = async (id) => {
    setSyncing(true)
    await supabase.from('bonuses').delete().eq('id', id)
    setSyncing(false)
  }

  const addBonus = async () => {
    if (!bonusAmt || isNaN(parseFloat(bonusAmt))) return
    setAddingBonus(true)
    setSyncing(true)
    await supabase.from('bonuses').insert({
      description: bonusDesc.trim() || 'Bonus',
      amount: parseFloat(bonusAmt),
      paid_to: bonusWho,
      month: safeMonth,
    })
    setBonusDesc(''); setBonusAmt('')
    setAddingBonus(false); setSyncing(false); setShowBonusForm(false)
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
    a.download = `budget-${safeMonth}.csv`
    a.click()
  }

  const p1Mode = settings.p1_income_mode || 'monthly'
  const p2Mode = settings.p2_income_mode || 'monthly'
  const monthBonuses = bonuses.filter(b => b.month === safeMonth)

  return (
    <div>
      {/* Names */}
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

      {/* P1 Income */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span className="card-title" style={{ margin: 0 }}>{settings.p1_name}'s income</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {['monthly', 'biweekly'].map(m => (
              <button key={m} onClick={() => save('p1_income_mode', m)}
                className="btn" style={{ height: 26, padding: '0 10px', fontSize: 11,
                  background: p1Mode === m ? 'var(--c-accent)' : 'transparent',
                  color: p1Mode === m ? 'white' : 'var(--c-text2)',
                  fontWeight: p1Mode === m ? 600 : 400, border: p1Mode === m ? 'none' : undefined }}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-grid">
          <div className="form-group">
            <label className="form-label">{p1Mode === 'biweekly' ? 'Per-paycheck amount' : 'Monthly amount'}</label>
            <input key={settings.p1_income} type="number" defaultValue={settings.p1_income} placeholder="0" min="0"
              onBlur={e => save('p1_income', e.target.value || '0')} />
          </div>
          {p1Mode === 'biweekly' && (
            <div className="form-group">
              <label className="form-label">A recent pay date</label>
              <input key={settings.p1_pay_anchor} type="date" defaultValue={settings.p1_pay_anchor || ''}
                onBlur={e => save('p1_pay_anchor', e.target.value)} />
            </div>
          )}
        </div>
        <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--c-surface2)', borderRadius: 'var(--radius)', fontSize: 13 }}>
          <span style={{ color: 'var(--c-text2)' }}>
            {p1Mode === 'biweekly' ? 'Biweekly paychecks this month' : 'Monthly salary'}
            {p1Bonuses > 0 && <span style={{ color: 'var(--c-green)', marginLeft: 8 }}>+ {fmt(p1Bonuses)} bonus</span>}
          </span>
          <span style={{ float: 'right', fontWeight: 600, color: 'var(--c-text)', fontFamily: "'DM Mono', monospace" }}>{fmt(p1Income)}</span>
        </div>
      </div>

      {/* P2 Income */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span className="card-title" style={{ margin: 0 }}>{settings.p2_name}'s income</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {['monthly', 'biweekly'].map(m => (
              <button key={m} onClick={() => save('p2_income_mode', m)}
                className="btn" style={{ height: 26, padding: '0 10px', fontSize: 11,
                  background: p2Mode === m ? 'var(--c-accent)' : 'transparent',
                  color: p2Mode === m ? 'white' : 'var(--c-text2)',
                  fontWeight: p2Mode === m ? 600 : 400, border: p2Mode === m ? 'none' : undefined }}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-grid">
          <div className="form-group">
            <label className="form-label">{p2Mode === 'biweekly' ? 'Per-paycheck amount' : 'Monthly amount'}</label>
            <input key={settings.p2_income} type="number" defaultValue={settings.p2_income} placeholder="0" min="0"
              onBlur={e => save('p2_income', e.target.value || '0')} />
          </div>
          {p2Mode === 'biweekly' && (
            <div className="form-group">
              <label className="form-label">A recent pay date</label>
              <input key={settings.p2_pay_anchor} type="date" defaultValue={settings.p2_pay_anchor || ''}
                onBlur={e => save('p2_pay_anchor', e.target.value)} />
            </div>
          )}
        </div>
        <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--c-surface2)', borderRadius: 'var(--radius)', fontSize: 13 }}>
          <span style={{ color: 'var(--c-text2)' }}>
            {p2Mode === 'biweekly' ? 'Biweekly paychecks this month' : 'Monthly salary'}
            {p2BookIncome > 0 && <span style={{ color: 'var(--c-green)', marginLeft: 8 }}>+ {fmt(p2BookIncome)} books</span>}
            {p2Bonuses > 0 && <span style={{ color: 'var(--c-green)', marginLeft: 8 }}>+ {fmt(p2Bonuses)} bonus</span>}
          </span>
          <span style={{ float: 'right', fontWeight: 600, color: 'var(--c-text)', fontFamily: "'DM Mono', monospace" }}>{fmt(p2Income)}</span>
        </div>
      </div>

      {/* Bonuses */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span className="card-title" style={{ margin: 0 }}>Bonuses — {safeMonth}</span>
          <button className="btn btn-primary" style={{ height: 28, padding: '0 12px', fontSize: 12 }}
            onClick={() => setShowBonusForm(v => !v)}>
            {showBonusForm ? 'Cancel' : '+ Add bonus'}
          </button>
        </div>

        {showBonusForm && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 100px auto', gap: 8, marginBottom: 14, alignItems: 'end' }}>
            <input type="text" placeholder="e.g. Year-end bonus" value={bonusDesc} onChange={e => setBonusDesc(e.target.value)} />
            <input type="number" placeholder="$0.00" value={bonusAmt} min="0" step="0.01" onChange={e => setBonusAmt(e.target.value)} />
            <select value={bonusWho} onChange={e => setBonusWho(e.target.value)}>
              <option value="p1">{settings.p1_name}</option>
              <option value="p2">{settings.p2_name}</option>
            </select>
            <button className="btn btn-primary" onClick={addBonus} disabled={addingBonus}>{addingBonus ? '…' : 'Save'}</button>
          </div>
        )}

        {monthBonuses.length === 0
          ? <p style={{ fontSize: 13, color: 'var(--c-text3)' }}>No bonuses this month.</p>
          : monthBonuses.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--c-border)', fontSize: 13 }}>
              <span style={{ flex: 1 }}>{b.description}</span>
              <span style={{ color: 'var(--c-text2)' }}>{b.paid_to === 'p1' ? settings.p1_name : settings.p2_name}</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, color: 'var(--c-green)' }}>+{fmt(b.amount)}</span>
              <button className="exp-del" onClick={() => deleteBonus(b.id)}>×</button>
            </div>
          ))
        }
      </div>

      {/* Data */}
      <div className="card">
        <div className="card-title">Data</div>
        <p style={{ fontSize: 13, color: 'var(--c-text2)', marginBottom: 12 }}>All data is shared in real-time with anyone who has the app URL.</p>
        <button className="btn" onClick={exportCSV}>Export CSV</button>
      </div>
    </div>
  )
}
