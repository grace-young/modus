import * as fs from 'fs';
import * as path from 'path';
import { PDFParse } from 'pdf-parse';
import { DocumentObject, DocumentType } from './types';

function detectDocumentType(text: string): DocumentType {
  const lower = text.toLowerCase();
  if (lower.includes('invoice')) return 'invoice';
  if (lower.includes('goods receipt') || lower.includes('receipt id')) return 'receipt';
  if (lower.includes('purchase order') || lower.includes('po number')) return 'purchase_order';
  throw new Error(`Unable to detect document type from text:\n${text}`);
}

function extractField(text: string, pattern: RegExp): string {
  const match = text.match(pattern);
  if (!match || !match[1]) {
    throw new Error(`Failed to extract field with pattern ${pattern} from text:\n${text}`);
  }
  return match[1].trim();
}

function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[$,]/g, ''));
}

function parseDate(value: string): Date {
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: "${value}"`);
  }
  return date;
}

function parseInvoice(text: string): DocumentObject {
  return {
    type: 'invoice',
    data: text,
    document_id: extractField(text, /Invoice Number:\s*(.+)/i),
    vendor: extractField(text, /Vendor:\s*(.+)/i),
    reference_po: extractField(text, /Reference PO:\s*(.+)/i),
    item: extractField(text, /Item:\s*(.+)/i),
    quantity: parseInt(extractField(text, /Quantity:\s*(.+)/i), 10),
    unit_price: parseCurrency(extractField(text, /Unit Price:\s*(.+)/i)),
    total: parseCurrency(extractField(text, /Total:\s*(.+)/i)),
    date: parseDate(extractField(text, /Date:\s*(.+)/i)),
  };
}

function parsePurchaseOrder(text: string): DocumentObject {
  return {
    type: 'purchase_order',
    data: text,
    document_id: extractField(text, /PO Number:\s*(.+)/i),
    vendor: extractField(text, /Vendor:\s*(.+)/i),
    reference_po: extractField(text, /PO Number:\s*(.+)/i),
    item: extractField(text, /Item:\s*(.+)/i),
    quantity: parseInt(extractField(text, /Quantity:\s*(.+)/i), 10),
    unit_price: parseCurrency(extractField(text, /Unit Price:\s*(.+)/i)),
    total: parseCurrency(extractField(text, /Total:\s*(.+)/i)),
    date: parseDate(extractField(text, /Date:\s*(.+)/i)),
  };
}

function parseReceipt(text: string): DocumentObject {
  return {
    type: 'receipt',
    data: text,
    document_id: extractField(text, /Receipt ID:\s*(.+)/i),
    vendor: extractField(text, /Vendor:\s*(.+)/i),
    reference_po: extractField(text, /Reference PO:\s*(.+)/i),
    item: extractField(text, /Item:\s*(.+)/i),
    quantity: parseInt(extractField(text, /Quantity Received:\s*(.+)/i), 10),
    unit_price: null,
    total: null,
    date: parseDate(extractField(text, /Date Received:\s*(.+)/i)),
  };
}

function parseDocument(text: string): DocumentObject {
  const docType = detectDocumentType(text);
  switch (docType) {
    case 'invoice':
      return parseInvoice(text);
    case 'purchase_order':
      return parsePurchaseOrder(text);
    case 'receipt':
      return parseReceipt(text);
  }
}

export async function parsePdf(filePath: string): Promise<DocumentObject> {
  const buffer = fs.readFileSync(filePath);
  const uint8 = new Uint8Array(buffer);
  const parser = new PDFParse(uint8);
  const result = await parser.getText();
  return parseDocument(result.text);
}

export async function parseAllDocuments(documentsDir: string): Promise<DocumentObject[]> {
  const files = fs.readdirSync(documentsDir).filter((f) => f.endsWith('.pdf'));
  if (files.length === 0) {
    throw new Error(`No PDF files found in ${documentsDir}`);
  }

  const documents: DocumentObject[] = [];
  for (const file of files) {
    const filePath = path.join(documentsDir, file);
    const doc = await parsePdf(filePath);
    console.log(`Parsed ${file} -> ${doc.type} (${doc.document_id})`);
    documents.push(doc);
  }

  return documents;
}
