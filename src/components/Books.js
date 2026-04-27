import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

const today = () => new Date().toISOString().slice(0, 10)
const fmt = n => '$' + Math.abs(parseFloat(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function Books({ books, currentMonth, setSyncing, settings }) {
  const [title, setTitle] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [shipping, setShipping] = useState('')
  const [date, setDate] = useState(today())
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editSale, setEditSale] = useState('')
  const [editShipping, setEditShipping] = useState('')

  const addBook = async () => {
    if (!title.trim() || !purchasePrice || isNaN(parseFloat(purchasePrice))) return
    setAdding(true)
    setSyncing(true)
    await supabase.from('books').insert({
      title: title.trim(),
      purchase_price: parseFloat(purchasePrice),
      sale_price: salePrice ? parseFloat(salePrice) : null,
      shipping_cost: shipping ? parseFloat(shipping) : null,
      date: date,
    })
    setTitle(''); setPurchasePrice(''); setSalePrice(''); setShipping(''); setDate(today())
    setAdding(false); setSyncing(false)
  }

  const markSold = async (book) => {
    const sale = parseFloat(editSale)
    const ship = parseFloat(editShipping) || 0
    if (isNaN(sale)) return
    setSyncing(true)
    await supabase.from('books').update({
      sale_price: sale,
      shipping_cost: ship || null,
    }).eq('id', book.id)
    setEditId(null); setEditSale(''); setEditShipping('')
    setSyncing(false)
  }

  const deleteBook = async (id) => {
    setSyncing(true)
    await supabase.from('books').delete().eq('id', id)
    setSyncing(false)
  }

  const totalCost = books.reduce((s, b) => s + parseFloat(b.purchase_price || 0), 0)
  const totalRevenue = books.filter(b => b.sale_price).reduce((s, b) => s + parseFloat(b.sale_price || 0) - parseFloat(b.shipping_cost || 0), 0)
  const netProfit = totalRevenue - totalCost
  const unsold = books.filter(b => !b.sale_price)
  const sold = books.filter(b => b.sale_price).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const unsoldCost = unsold.reduce((s, b) => s + parseFloat(b.purchase_price || 0), 0)

  return (
    <div>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1rem' }}>
        {[
          { label: 'Revenue', value: fmt(totalRevenue), color: 'var(--c-text)' },
          { label: 'Total cost', value: fmt(totalCost), color: 'var(--c-text)' },
          { label: 'Net profit', value: (netProfit >= 0 ? '' : '-') + fmt(netProfit), color: netProfit >= 0 ? 'var(--c-green)' : 'var(--c-red)' },
          { label: 'Unsold inventory', value: fmt(unsoldCost), color: 'var(--c-text)' },
        ].map(m => (
          <div key={m.label} className="metric">
            <div className="metric-label">{m.label}</div>
            <div className="metric-value" style={{ fontSize: 18, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Add book */}
      <div className="card">
        <div className="card-title">Add book</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 90px 130px auto', gap: 8, alignItems: 'end' }}>
          <input type="text" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addBook()} />
          <input type="number" placeholder="Paid $" value={purchasePrice} min="0" step="0.01" onChange={e => setPurchasePrice(e.target.value)} />
          <input type="number" placeholder="Sold $" value={salePrice} min="0" step="0.01" onChange={e => setSalePrice(e.target.value)} />
          <input type="number" placeholder="Ship $" value={shipping} min="0" step="0.01" onChange={e => setShipping(e.target.value)} />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          <button className="btn btn-primary" onClick={addBook} disabled={adding}>{adding ? '…' : 'Add'}</button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--c-text3)', marginTop: 8 }}>Leave "Sold $" blank if not yet sold. Shipping is subtracted from sale price.</p>
      </div>

      {/* Unsold */}
      {unsold.length > 0 && (
        <div className="card">
          <div className="card-title">Unsold ({unsold.length})</div>
          <div className="expense-list">
            {unsold.map(b => (
              <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', alignItems: 'center', gap: 10, padding: '10px 4px', borderBottom: '1px solid var(--c-border)' }}>
                <span style={{ fontSize: 14 }}>{b.title}</span>
                <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>paid {fmt(b.purchase_price)}</span>
                {editId === b.id ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="number" placeholder="Sale $" value={editSale} onChange={e => setEditSale(e.target.value)} style={{ width: 80 }} />
                    <input type="number" placeholder="Ship $" value={editShipping} onChange={e => setEditShipping(e.target.value)} style={{ width: 70 }} />
                    <button className="btn btn-primary" style={{ height: 30, padding: '0 10px', fontSize: 12 }} onClick={() => markSold(b)}>Save</button>
                    <button className="btn" style={{ height: 30, padding: '0 10px', fontSize: 12 }} onClick={() => setEditId(null)}>Cancel</button>
                  </div>
                ) : (
                  <button className="btn" style={{ height: 28, padding: '0 12px', fontSize: 12 }} onClick={() => { setEditId(b.id); setEditSale(''); setEditShipping('') }}>Mark sold</button>
                )}
                <button className="exp-del" onClick={() => deleteBook(b.id)}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sold */}
      {sold.length > 0 && (
        <div className="card">
          <div className="card-title">Sold ({sold.length})</div>
          <div className="expense-list">
            {sold.map(b => {
              const net = parseFloat(b.sale_price || 0) - parseFloat(b.shipping_cost || 0) - parseFloat(b.purchase_price || 0)
              return (
                <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '72px 1fr auto auto auto auto', alignItems: 'center', gap: 10, padding: '10px 4px', borderBottom: '1px solid var(--c-border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--c-text3)', fontFamily: "'DM Mono', monospace" }}>
                    {b.date ? b.date.slice(5).replace('-', '/') : ''}
                  </span>
                  <span style={{ fontSize: 14 }}>{b.title}</span>
                  <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>paid {fmt(b.purchase_price)}</span>
                  {b.shipping_cost ? <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>ship {fmt(b.shipping_cost)}</span> : <span />}
                  <span style={{ fontSize: 14, fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>sold {fmt(b.sale_price)}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: net >= 0 ? 'var(--c-green)' : 'var(--c-red)', fontFamily: "'DM Mono', monospace" }}>
                    {net >= 0 ? '+' : '-'}{fmt(net)}
                  </span>
                  <button className="exp-del" onClick={() => deleteBook(b.id)}>×</button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {books.length === 0 && (
        <div className="empty">No books tracked yet. Add your first one above.</div>
      )}
    </div>
  )
}
