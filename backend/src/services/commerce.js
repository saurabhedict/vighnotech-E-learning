import PDFDocument from 'pdfkit'
import { WalletTxn } from '../models/WalletTxn.js'
import { env } from '../config/env.js'

// Credit a user's wallet and record a ledger entry. Returns the new balance.
export async function creditWallet(user, amount, { type = 'topup', note = '', ref } = {}) {
  user.walletBalance = Math.round((user.walletBalance + amount) * 100) / 100
  await user.save()
  await WalletTxn.create({ userId: user._id, type, amount, balanceAfter: user.walletBalance, note, ref })
  return user.walletBalance
}

// Debit a user's wallet (throws if insufficient). Returns the new balance.
export async function debitWallet(user, amount, { note = '', ref } = {}) {
  if (user.walletBalance < amount) {
    const e = new Error('Insufficient wallet balance')
    e.code = 'INSUFFICIENT'
    throw e
  }
  user.walletBalance = Math.round((user.walletBalance - amount) * 100) / 100
  await user.save()
  await WalletTxn.create({ userId: user._id, type: 'spend', amount, balanceAfter: user.walletBalance, note, ref })
  return user.walletBalance
}

// Build a simple invoice PDF for a paid purchase.
export function invoicePdf({ purchase, content, user }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fontSize(22).fillColor('#b23a2e').text(env.app.name)
    doc.fontSize(10).fillColor('#666').text('Tax Invoice / Receipt')
    doc.moveDown(1)

    doc.fillColor('#000').fontSize(11)
    doc.text(`Invoice #: ${purchase._id}`)
    doc.text(`Date: ${new Date(purchase.paidAt || purchase.createdAt).toUTCString()}`)
    doc.text(`Billed to: ${user.email}`)
    doc.moveDown(1)

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ccc')
    doc.moveDown(0.5)
    doc.fontSize(11).text('Item', 50, doc.y, { continued: true }).text('Amount (₹)', { align: 'right' })
    doc.moveDown(0.3)
    doc.fontSize(11).fillColor('#222')
    doc.text(content?.title || 'Content license', 50, doc.y, { continued: true }).text(String(purchase.listPrice ?? purchase.amount), { align: 'right' })
    if (purchase.discount) {
      doc.fillColor('#0a0').text(`Discount${purchase.couponCode ? ` (${purchase.couponCode})` : ''}`, 50, doc.y, { continued: true }).text(`-${purchase.discount}`, { align: 'right' })
    }
    doc.moveDown(0.5)
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ccc')
    doc.moveDown(0.3)
    doc.fillColor('#000').fontSize(13).text('Total Paid', 50, doc.y, { continued: true }).text(`₹${purchase.amount}`, { align: 'right' })
    doc.moveDown(2)

    doc.fontSize(9).fillColor('#666').text(`Payment method: ${purchase.provider}`)
    doc.text(`License: ${purchase.licenseId || '—'}`)
    doc.text(`Status: ${purchase.status}`)
    doc.moveDown(1).text('Thank you for your purchase. This document is a system-generated receipt.')
    doc.end()
  })
}
