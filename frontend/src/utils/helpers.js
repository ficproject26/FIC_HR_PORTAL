import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'

export const formatDate = (date, fmt = 'MMM dd, yyyy') => {
  if (!date) return '-'
  try { return format(new Date(date), fmt) } catch { return '-' }
}

export const formatDateTime = (date) => {
  if (!date) return '-'
  try { return format(new Date(date), 'MMM dd, yyyy HH:mm') } catch { return '-' }
}

export const timeAgo = (date) => {
  if (!date) return '-'
  try { return formatDistanceToNow(new Date(date), { addSuffix: true }) } catch { return '-' }
}

export const formatTime = (date) => {
  if (!date) return '-'
  try { return format(new Date(date), 'HH:mm') } catch { return '-' }
}

export const formatCurrency = (amount) => {
  if (!amount) return '-'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

export const formatDuration = (hoursDecimal) => {
  if (!hoursDecimal || isNaN(hoursDecimal) || hoursDecimal <= 0) return '0m'
  let h = Math.floor(hoursDecimal)
  let m = Math.round((hoursDecimal - h) * 60)
  if (m === 60) {
    h += 1
    m = 0
  }
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

export const formatDurationHMS = (hoursDecimal) => {
  if (!hoursDecimal || isNaN(hoursDecimal) || hoursDecimal <= 0) return '00h 00m 00s'
  const totalSeconds = Math.round(hoursDecimal * 3600)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  
  const pad = (num) => num.toString().padStart(2, '0')
  return `${pad(h)}h ${pad(m)}m ${pad(s)}s`
}

export const getStatusColor = (status) => {
  const colors = {
    new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    contacted: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    qualified: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    proposal: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    negotiation: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    converted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    lost: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    missed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    online: 'bg-green-100 text-green-700',
    offline: 'bg-gray-100 text-gray-600',
    absent: 'bg-red-100 text-red-700',
  }
  return colors[status] || 'bg-gray-100 text-gray-600'
}

export const getPriorityColor = (priority) => {
  const colors = {
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700',
  }
  return colors[priority] || 'bg-gray-100 text-gray-600'
}

export const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export const truncate = (str, len = 30) => {
  if (!str) return ''
  return str.length > len ? str.substring(0, len) + '...' : str
}

export const debounce = (fn, delay) => {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

/** Local calendar day parts for matching follow-ups on a date grid */
export const getLocalDateParts = (date) => {
  const d = new Date(date)
  return { year: d.getFullYear(), month: d.getMonth(), date: d.getDate() }
}

export const isSameLocalDay = (dateValue, year, monthIndex, day) => {
  const p = getLocalDateParts(dateValue)
  return p.year === year && p.month === monthIndex && p.date === day
}

/** Parse datetime-local value (YYYY-MM-DDTHH:mm) as local wall time → ISO for API */
export const localDatetimeToISO = (datetimeLocal) => {
  if (!datetimeLocal) return null
  const [datePart, timePart = '10:00'] = datetimeLocal.split('T')
  const [y, m, d] = datePart.split('-').map(Number)
  const [h, min] = timePart.split(':').map(Number)
  const local = new Date(y, m - 1, d, h, min || 0, 0, 0)
  return local.toISOString()
}
