import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'
import { Purchase } from '../models/Purchase.js'
import { Content } from '../models/Content.js'
import { License } from '../models/License.js'
import { User } from '../models/User.js'

// ── Report data (LLD: Admin Dashboard & Reports) ─────────────────────────────

export async function salesReport() {
  const paid = { status: 'paid' }
  const [totalAgg, byContent, daily] = await Promise.all([
    Purchase.aggregate([{ $match: paid }, { $group: { _id: null, revenue: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    Purchase.aggregate([
      { $match: paid },
      { $group: { _id: '$contentId', revenue: { $sum: '$amount' }, sales: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: 50 },
    ]),
    Purchase.aggregate([
      { $match: paid },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } }, revenue: { $sum: '$amount' }, sales: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 60 },
    ]),
  ])
  // attach content titles
  const contents = await Content.find({ _id: { $in: byContent.map((b) => b._id).filter(Boolean) } }).select('title').lean()
  const titleOf = Object.fromEntries(contents.map((c) => [c._id.toString(), c.title]))
  return {
    title: 'Sales Report',
    summary: { revenue: totalAgg[0]?.revenue || 0, sales: totalAgg[0]?.count || 0 },
    columns: [
      { key: 'content', label: 'Content' },
      { key: 'sales', label: 'Sales' },
      { key: 'revenue', label: 'Revenue (₹)' },
    ],
    rows: byContent.map((b) => ({ content: titleOf[b._id?.toString()] || '(deleted)', sales: b.sales, revenue: b.revenue })),
    daily: daily.map((d) => ({ date: d._id, revenue: d.revenue, sales: d.sales })),
  }
}

export async function contentReport() {
  const [byType, licenses] = await Promise.all([
    Content.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    License.aggregate([{ $group: { _id: '$contentId', licenses: { $sum: 1 } } }, { $sort: { licenses: -1 } }, { $limit: 50 }]),
  ])
  const contents = await Content.find({ _id: { $in: licenses.map((l) => l._id).filter(Boolean) } }).select('title type').lean()
  const map = Object.fromEntries(contents.map((c) => [c._id.toString(), c]))
  return {
    title: 'Content Report',
    summary: { totalContent: await Content.countDocuments(), byType: Object.fromEntries(byType.map((t) => [t._id, t.count])) },
    columns: [
      { key: 'content', label: 'Content' },
      { key: 'type', label: 'Type' },
      { key: 'licenses', label: 'Licenses issued' },
    ],
    rows: licenses.map((l) => ({ content: map[l._id?.toString()]?.title || '(deleted)', type: map[l._id?.toString()]?.type || '—', licenses: l.licenses })),
  }
}

export async function userReport() {
  const since = new Date(Date.now() - 30 * 86400_000)
  const [total, admins, active, signups] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ lastLoginAt: { $gte: since } }),
    User.aggregate([
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, signups: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 60 },
    ]),
  ])
  return {
    title: 'User Report',
    summary: { total, admins, activeLast30d: active },
    columns: [
      { key: 'date', label: 'Date' },
      { key: 'signups', label: 'Signups' },
    ],
    rows: signups.map((s) => ({ date: s._id, signups: s.signups })),
  }
}

export const REPORTS = { sales: salesReport, content: contentReport, users: userReport }

// ── Export (CSV / XLSX / PDF) ────────────────────────────────────────────────

function toCsv({ columns, rows }) {
  const esc = (v) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const head = columns.map((c) => esc(c.label)).join(',')
  const body = rows.map((r) => columns.map((c) => esc(r[c.key])).join(',')).join('\n')
  return Buffer.from(`${head}\n${body}\n`, 'utf8')
}

async function toXlsx(report) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(report.title.slice(0, 31))
  ws.columns = report.columns.map((c) => ({ header: c.label, key: c.key, width: 28 }))
  ws.getRow(1).font = { bold: true }
  report.rows.forEach((r) => ws.addRow(r))
  return Buffer.from(await wb.xlsx.writeBuffer())
}

function toPdf(report) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' })
    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fontSize(18).fillColor('#b23a2e').text(`Vigno Smart Class — ${report.title}`)
    doc.moveDown(0.3).fontSize(9).fillColor('#666').text(new Date().toUTCString())
    if (report.summary) doc.moveDown(0.5).fontSize(10).fillColor('#000').text(JSON.stringify(report.summary))
    doc.moveDown(0.8)

    const labels = report.columns.map((c) => c.label)
    doc.fontSize(10).fillColor('#000').text(labels.join('   |   '))
    doc.moveTo(40, doc.y + 2).lineTo(555, doc.y + 2).stroke('#ccc')
    doc.moveDown(0.4)
    report.rows.slice(0, 200).forEach((r) => {
      doc.fontSize(9).fillColor('#222').text(report.columns.map((c) => r[c.key]).join('   |   '))
    })
    doc.end()
  })
}

export async function exportReport(report, format) {
  if (format === 'xlsx') {
    return { buffer: await toXlsx(report), type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx' }
  }
  if (format === 'pdf') {
    return { buffer: await toPdf(report), type: 'application/pdf', ext: 'pdf' }
  }
  return { buffer: toCsv(report), type: 'text/csv', ext: 'csv' }
}
