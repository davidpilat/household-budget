import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import Expenses from './components/Expenses'
import Budgets from './components/Budgets'
import Split from './components/Split'
import Settings from './components/Settings'
import Books from './components/Books'
import Recurring from './components/Recurring'
import YearlySummary from './components/YearlySummary'
import './App.css'

const TABS = ['Expenses', 'Budgets', 'Split', 'Books', 'Recurring', 'Year', 'Settings']

function biweeklyInMonth(anchor, month) {
  if (!anchor || !month || !anchor.includes('-') || !month.includes('-')) return 2
  const [y, m] = month.split('-').map(Number)
  const anchorDate = new Date(anchor + 'T00:00:00')
  const start = new Date(y, m - 1, 1)
  const end = new Date(y, m, 0)
  let count = 0
  let pay = new Date(anchorDate)
  while (pay > start) pay = new Date(pay.getTime() - 14 * 86400000)
  while (pay <= end) {
    pay = new Date(pay.getTime() + 14 * 86400000)
    if (pay >= start && pay <= end) count++
  }
  return count
}

function calcIncome(amount, mode, anchor, month) {
  const base = parseFloat(amount) || 0
  if (mode === 'biweekly' && anchor && anchor.includes('-')) {
    return base * biweeklyInMonth(anchor, month)
  }
  return base
}

export default function App() {
  const [tab, setTab] = useState('Expenses')
  const [expenses, setExpenses] = useState([])
  const [budgets, setBudgets] = useState({})
  const [settings, setSettings] = useState({
    p1_name: 'Partner 1', p2_name: 'Partner 2',
    p1_income: '0', p2_income: '0',
    p1_income_mode: 'monthly', p2_income_mode: 'monthly',
    p1_pay_anchor: '', p2_pay_anchor: ''
  })
  const [books, setBooks] = useState([])
  const [recurring, setRecurring] = useState([])
  const [bonuses, setBonuses] = useState([])
  const [incomeHistory, setIncomeHistory] = useState([])
  const [currentMonth, setCurrentMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const fetchAll = useCallback(async () => {
    const [{ data: expData }, { data: budData }, { data: setData }, { data: bookData }, { data: recData }, { data: bonData }, { data: ihData }] = await Promise.all([
      supabase.from('expenses').select('*').order('created_at', { ascending: false }),
      supabase.from('budgets').select('*'),
      supabase.from('settings').select('*'),
      supabase.from('books').select('*').order('date', { ascending: false }),
      supabase.from('recurring').select('*').order('day_of_month', { ascending: true }),
      supabase.from('bonuses').select('*').order('created_at', { ascending: false }),
      supabase.from('income_history').select('*').order('effective_from', { ascending: true }),
    ])
    if (expData) setExpenses(expData)
    if (budData) { const map = {}; budData.forEach(b => { map[b.category] = b.amount }); setBudgets(map) }
    if (setData) {
      const map = {}
      setData.forEach(s => { map[s.key] = s.value })
      setSettings(prev => ({ ...prev, ...map }))
    }
    if (bookData) setBooks(bookData)
    if (recData) setRecurring(recData)
    if (bonData) setBonuses(bonData)
    if (ihData) setIncomeHistory(ihData)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
    const channel = supabase.channel('realtime-budget')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'books' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recurring' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bonuses' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'income_history' }, fetchAll)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchAll])

  // All derived values computed fresh every render — no useMemo
  const monthExpenses = expenses.filter(e => e.date && e.date.startsWith(currentMonth))
  const monthBooks = books.filter(b => b.date && b.date.startsWith(currentMonth))
  const monthBonuses = bonuses.filter(b => b.month === currentMonth)

  const bookProfit = monthBooks
    .filter(b => b.sale_price != null)
    .reduce((s, b) => s + parseFloat(b.sale_price || 0) - parseFloat(b.shipping_cost || 0) - parseFloat(b.purchase_price || 0), 0)

  const p1Bonuses = monthBonuses.filter(b => b.paid_to === 'p1').reduce((s, b) => s + parseFloat(b.amount || 0), 0)
  const p2Bonuses = monthBonuses.filter(b => b.paid_to === 'p2').reduce((s, b) => s + parseFloat(b.amount || 0), 0)

  const p1Base = calcIncome(settings.p1_income, settings.p1_income_mode || 'monthly', settings.p1_pay_anchor || '', currentMonth)
  const p2Base = calcIncome(settings.p2_income, settings.p2_income_mode || 'monthly', settings.p2_pay_anchor || '', currentMonth)

  const p1Income = p1Base + p1Bonuses
  const p2Income = p2Base + bookProfit + p2Bonuses
  const totalIncome = p1Income + p2Income
  const totalSpent = monthExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0)  // refunds have negative amounts so they auto-subtract
  const remaining = totalIncome - totalSpent

  const fmt = n => '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  if (loading) return (
    <div className="loading-screen"><div className="loading-spinner" /><p>Loading your budget…</p></div>
  )

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="app-title"><span className="title-icon">◈</span>Household Budget</h1>
            <p className="header-subtitle">{settings.p1_name} & {settings.p2_name}</p>
          </div>
          <div className="header-metrics">
            <div className="hmetric">
              <span className="hmetric-label">Income</span>
              <span className="hmetric-value">{fmt(totalIncome)}</span>
            </div>
            <div className="hmetric">
              <span className="hmetric-label">Spent</span>
              <span className="hmetric-value spent">{fmt(totalSpent)}</span>
            </div>
            <div className="hmetric">
              <span className="hmetric-label">Left</span>
              <span className={`hmetric-value ${remaining < 0 ? 'over' : remaining > 0 ? 'good' : ''}`}>{fmt(remaining)}</span>
            </div>
          </div>
        </div>
        <div className="month-bar">
          <input type="month" value={currentMonth} onChange={e => setCurrentMonth(e.target.value)} className="month-input" />
          {bookProfit > 0 && <span style={{ fontSize: 12, color: 'var(--c-green)', background: 'var(--c-green-bg)', padding: '2px 8px', borderRadius: 10 }}>+{fmt(bookProfit)} books</span>}
          {(p1Bonuses + p2Bonuses) > 0 && <span style={{ fontSize: 12, color: 'var(--c-green)', background: 'var(--c-green-bg)', padding: '2px 8px', borderRadius: 10 }}>+{fmt(p1Bonuses + p2Bonuses)} bonus</span>}
          {syncing && <span className="sync-dot" title="Syncing…" />}
        </div>
      </header>

      <nav className="tab-nav">
        {TABS.map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </nav>

      <main className="app-main">
        {tab === 'Expenses' && <Expenses expenses={monthExpenses} settings={settings} currentMonth={currentMonth} setSyncing={setSyncing} />}
        {tab === 'Budgets' && <Budgets expenses={monthExpenses} budgets={budgets} setSyncing={setSyncing} />}
        {tab === 'Split' && <Split expenses={monthExpenses} settings={settings} bookProfit={bookProfit} p1Bonuses={p1Bonuses} p2Bonuses={p2Bonuses} />}
        {tab === 'Books' && <Books books={monthBooks} currentMonth={currentMonth} setSyncing={setSyncing} settings={settings} />}
        {tab === 'Recurring' && <Recurring recurring={recurring} setSyncing={setSyncing} settings={settings} expenses={monthExpenses} currentMonth={currentMonth} />}
        {tab === 'Year' && <YearlySummary expenses={expenses} books={books} bonuses={bonuses} settings={settings} currentMonth={currentMonth} incomeHistory={incomeHistory} />}
        {tab === 'Settings' && <Settings settings={settings} setSettings={setSettings} setSyncing={setSyncing} p2BookIncome={bookProfit} bonuses={bonuses} currentMonth={currentMonth} p1Income={p1Income} p2Income={p2Income} p1Bonuses={p1Bonuses} p2Bonuses={p2Bonuses} incomeHistory={incomeHistory} />}
      </main>
    </div>
  )
}
