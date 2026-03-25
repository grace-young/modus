import { DocumentObject, TripleMatch, Discrepancy, DocumentType } from './types';

function compareField(
  field: string,
  poValue: string | number | null,
  otherValue: string | number | null,
  otherType: DocumentType
): Discrepancy | null {
  if (poValue === null && otherValue === null) return null;
  if (poValue !== otherValue) {
    return {
      field,
      expected: poValue,
      actual: otherValue,
      documents: ['purchase_order', otherType],
    };
  }
  return null;
}

function findDiscrepancies(
  po: DocumentObject,
  invoice: DocumentObject,
  receipt: DocumentObject
): Discrepancy[] {
  const discrepancies: Discrepancy[] = [];

  // Compare invoice against PO (the PO is the source of truth)
  const invoiceChecks: { field: string; poVal: string | number | null; invVal: string | number | null }[] = [
    { field: 'vendor', poVal: po.vendor, invVal: invoice.vendor },
    { field: 'item', poVal: po.item, invVal: invoice.item },
    { field: 'quantity', poVal: po.quantity, invVal: invoice.quantity },
    { field: 'unit_price', poVal: po.unit_price, invVal: invoice.unit_price },
    { field: 'total', poVal: po.total, invVal: invoice.total },
  ];

  for (const check of invoiceChecks) {
    const d = compareField(check.field, check.poVal, check.invVal, 'invoice');
    if (d) discrepancies.push(d);
  }

  // Compare receipt against PO
  const receiptChecks: { field: string; poVal: string | number | null; recVal: string | number | null }[] = [
    { field: 'vendor', poVal: po.vendor, recVal: receipt.vendor },
    { field: 'item', poVal: po.item, recVal: receipt.item },
    { field: 'quantity', poVal: po.quantity, recVal: receipt.quantity },
  ];

  for (const check of receiptChecks) {
    const d = compareField(check.field, check.poVal, check.recVal, 'receipt');
    if (d) discrepancies.push(d);
  }

  return discrepancies;
}

export function findTripleMatches(documents: DocumentObject[]): TripleMatch[] {
  const receipts = documents.filter((d) => d.type === 'receipt');
  const purchaseOrders = documents.filter((d) => d.type === 'purchase_order');
  const invoices = documents.filter((d) => d.type === 'invoice');

  const matches: TripleMatch[] = [];

  // Start with each receipt and work backwards
  for (const receipt of receipts) {
    const poNumber = receipt.reference_po;

    // Find matching PO
    const matchingPO = purchaseOrders.find((po) => po.document_id === poNumber);
    if (!matchingPO) {
      console.warn(`Receipt ${receipt.document_id}: no matching PO found for ${poNumber}`);
      continue;
    }

    // Find matching invoice
    const matchingInvoice = invoices.find((inv) => inv.reference_po === poNumber);
    if (!matchingInvoice) {
      console.warn(`Receipt ${receipt.document_id}: no matching invoice found for PO ${poNumber}`);
      continue;
    }

    const discrepancies = findDiscrepancies(matchingPO, matchingInvoice, receipt);

    matches.push({
      purchase_order: matchingPO,
      invoice: matchingInvoice,
      receipt,
      discrepancies,
    });
  }

  return matches;
}
