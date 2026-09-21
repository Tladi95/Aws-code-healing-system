import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import './theme.css'

type Category = 'Food' | 'Transport' | 'Bills' | 'Entertainment' | 'Health' | 'Other'
type Expense = { id: number; title: string; category: Category; amount: number; date: string }
type ExpenseForm = Omit<Expense, 'id'>
const categories: Category[] = ['Food', 'Transport', 'Bills', 'Entertainment', 'Health', 'Other']
const emptyForm: ExpenseForm = { title: '', category: 'Food', amount: 0, date: new Date().toISOString().slice(0, 10) }
const apiUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
function formatMoney(value: number) { return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 2 }).format(value) }
function formatDate(date: string) { return new Intl.DateTimeFormat('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`)) }
function monthKey(date: string) { return date.slice(0, 7) }
function formatToday() { return new Intl.DateTimeFormat('en-ZA', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date()) }

function App() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [form, setForm] = useState<ExpenseForm>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<'All' | Category>('All')
  const [showAllExpenses, setShowAllExpenses] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  useEffect(() => { fetch(`${apiUrl}/expenses`).then((response) => response.ok ? response.json() : Promise.reject(new Error('API unavailable'))).then((data: Expense[]) => { setExpenses(data); setIsConnected(true) }).catch(() => setIsConnected(false)) }, [])
  const total = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amount, 0), [expenses])
  const currentMonth = new Date().toISOString().slice(0, 7)
  const monthlyTotal = useMemo(() => expenses.filter((expense) => monthKey(expense.date) === currentMonth).reduce((sum, expense) => sum + expense.amount, 0), [expenses, currentMonth])
  const categoryTotals = useMemo(() => categories.map((category) => ({ category, total: expenses.filter((expense) => expense.category === category).reduce((sum, expense) => sum + expense.amount, 0) })).filter((item) => item.total > 0), [expenses])
  const categoryGradient = useMemo(() => {
    if (!total) return '#e7e7e2'
    const colors = ['#f4b860', '#ee765c', '#77a6a0', '#6575c4', '#d993ae', '#d9d5c9']
    let start = 0
    return `conic-gradient(${categoryTotals.map((item, index) => { const end = start + (item.total / total) * 100; const segment = `${colors[index]} ${start}% ${end}%`; start = end; return segment }).join(', ')})`
  }, [categoryTotals, total])
  const filteredExpenses = expenses.filter((expense) => (activeCategory === 'All' || expense.category === activeCategory) && expense.title.toLowerCase().includes(search.toLowerCase())).sort((a, b) => b.date.localeCompare(a.date))
  function openAddForm() { setEditingId(null); setForm(emptyForm); setIsFormOpen(true) }
  function openEditForm(expense: Expense) { setEditingId(expense.id); setForm({ title: expense.title, category: expense.category, amount: expense.amount, date: expense.date }); setIsFormOpen(true) }
  async function saveExpense(event: FormEvent) {
    event.preventDefault()
    const payload = { ...form, amount: Number(form.amount) }
    if (!payload.title.trim() || payload.amount <= 0) return
    const localExpense = { ...payload, id: editingId || Date.now() }
    setExpenses((current) => editingId ? current.map((expense) => expense.id === editingId ? localExpense : expense) : [localExpense, ...current])
    setIsFormOpen(false)
    try { const response = await fetch(editingId ? `${apiUrl}/expenses/${editingId}` : `${apiUrl}/expenses`, { method: editingId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (response.ok) { const saved = await response.json(); setExpenses((current) => editingId ? current.map((expense) => expense.id === editingId ? saved : expense) : current.map((expense) => expense.id === localExpense.id ? saved : expense)); setIsConnected(true) } } catch { setIsConnected(false) }
  }
  async function deleteExpense(id: number) { setExpenses((current) => current.filter((expense) => expense.id !== id)); try { await fetch(`${apiUrl}/expenses/${id}`, { method: 'DELETE' }) } catch { setIsConnected(false) } }

  return (
    <div className="app-shell">
      <main className="main-content"><header className="topbar"><div><p className="eyebrow">{formatToday()}</p><h1>Expense Tracker <span>✦</span></h1></div><div className="header-actions"><button className="icon-button" type="button" aria-label="Notifications">♧<i></i></button><button className="button-primary" type="button" onClick={openAddForm}><span>+</span> Add expense</button></div></header>
        <section id="overview" className="dashboard-grid"><div className="metric-card featured"><div className="metric-label">Total expenses <button type="button" aria-label="More information">ⓘ</button></div><strong>{formatMoney(total)}</strong><div className="metric-foot"><span>{expenses.length} recorded</span></div></div><div className="metric-card"><div className="metric-label">This month <span className="dot orange"></span></div><strong>{formatMoney(monthlyTotal)}</strong><div className="metric-foot"><span>{expenses.filter((expense) => monthKey(expense.date) === currentMonth).length} transactions</span></div></div><div className="metric-card budget-card"><div className="metric-label">Categories used <span className="dot green"></span></div><strong>{categoryTotals.length}</strong><div className="metric-foot"><span>of {categories.length} categories</span></div></div></section>
        <section className="content-grid"><div className="panel category-panel" id="categories"><div className="panel-heading"><div><p className="eyebrow">Where it goes</p><h2>Spending by category</h2></div><span className="text-button">All expenses</span></div><div className="category-layout"><div className="donut" style={{ background: categoryGradient }}><div><strong>{formatMoney(total)}</strong><small>all time</small></div></div><div className="legend">{categoryTotals.map((item, index) => <div className="legend-item" key={item.category}><span className={`legend-dot dot-${index}`}></span><span>{item.category}</span><strong>{formatMoney(item.total)}</strong></div>)}{categoryTotals.length === 0 && <p className="empty-state">Add an expense to see the breakdown.</p>}</div></div></div></section>
        <section className="panel transactions-panel" id="expenses"><div className="panel-heading"><div><p className="eyebrow">Your money, in motion</p><h2>Recent transactions</h2></div><button className="text-button" type="button" onClick={() => setShowAllExpenses((current) => !current)}>{showAllExpenses ? 'Show less' : 'View all'} <span>{showAllExpenses ? '↑' : '→'}</span></button></div><div className="table-tools"><label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search expenses" /></label><div className="filter-row"><button className={activeCategory === 'All' ? 'filter active' : 'filter'} onClick={() => setActiveCategory('All')} type="button">All</button>{categories.slice(0, 3).map((category) => <button className={activeCategory === category ? 'filter active' : 'filter'} onClick={() => setActiveCategory(category)} type="button" key={category}>{category}</button>)}</div></div><div className="transaction-list">{filteredExpenses.slice(0, showAllExpenses ? undefined : 5).map((expense) => <div className="transaction-row" key={expense.id}><div className={`category-icon category-${expense.category.toLowerCase()}`}>{expense.category === 'Food' ? '⌁' : expense.category === 'Transport' ? '↗' : expense.category === 'Bills' ? '▤' : expense.category === 'Entertainment' ? '☆' : expense.category === 'Health' ? '+' : '○'}</div><div className="transaction-name"><strong>{expense.title}</strong><small>{expense.category} <span>•</span> {formatDate(expense.date)}</small></div><strong className="transaction-amount">− {formatMoney(expense.amount)}</strong><div className="row-actions"><button type="button" onClick={() => openEditForm(expense)}>Edit</button><button type="button" onClick={() => deleteExpense(expense.id)}>Delete</button></div></div>)}</div>{filteredExpenses.length === 0 && <div className="empty-state">No expenses match your search.</div>}</section><footer><span><i className={isConnected ? 'status connected' : 'status'}></i>{isConnected ? 'Synced with your account' : 'API not connected'}</span><span>Last updated just now</span></footer></main>
      {isFormOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setIsFormOpen(false)}><form className="expense-modal" onSubmit={saveExpense}><div className="modal-heading"><div><p className="eyebrow">{editingId ? 'Update details' : 'New transaction'}</p><h2>{editingId ? 'Edit expense' : 'Add an expense'}</h2></div><button type="button" className="close-button" onClick={() => setIsFormOpen(false)} aria-label="Close">×</button></div><label>What did you spend on?<input autoFocus required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Weekly groceries" /></label><div className="form-row"><label>Amount<input required min="0.01" step="0.01" type="number" value={form.amount || ''} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} placeholder="0.00" /></label><label>Date<input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label></div><label>Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as Category })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><button className="button-primary full-button" type="submit">{editingId ? 'Save changes' : 'Add expense'} <span>→</span></button></form></div>}
    </div>
  )
}

export default App
