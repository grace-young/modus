import * as path from 'path';
import { parseAllDocuments } from './parser';
import { findTripleMatches } from './matcher';

async function main() {
  const documentsDir = path.resolve(__dirname, '..', 'documents');
  console.log(`Scanning documents in: ${documentsDir}\n`);

  const documents = await parseAllDocuments(documentsDir);
  console.log(`\nParsed ${documents.length} document(s)\n`);

  // Print summary of parsed documents
  for (const doc of documents) {
    console.log(`  [${doc.type.toUpperCase()}] ${doc.document_id} - ${doc.vendor} - ${doc.item} (qty: ${doc.quantity})`);
  }

  console.log('\n--- Triple Match Results ---\n');

  const matches = findTripleMatches(documents);

  if (matches.length === 0) {
    console.log('No triple matches found.');
    return;
  }

  for (const match of matches) {
    console.log(`Match found for PO: ${match.purchase_order.document_id}`);
    console.log(`  Purchase Order: ${match.purchase_order.document_id} (${match.purchase_order.date.toISOString().split('T')[0]})`);
    console.log(`  Invoice:        ${match.invoice.document_id} (${match.invoice.date.toISOString().split('T')[0]})`);
    console.log(`  Receipt:        ${match.receipt.document_id} (${match.receipt.date.toISOString().split('T')[0]})`);
    console.log(`  Vendor:         ${match.purchase_order.vendor}`);
    console.log(`  Item:           ${match.purchase_order.item}`);
    console.log(`  Quantity:       ${match.purchase_order.quantity}`);
    console.log(`  Unit Price:     $${match.purchase_order.unit_price?.toFixed(2) ?? 'N/A'}`);
    console.log(`  Total:          $${match.purchase_order.total?.toFixed(2) ?? 'N/A'}`);

    if (match.discrepancies.length === 0) {
      console.log('  Status:         CLEAN - All documents match');
    } else {
      console.log(`  Status:         DISCREPANCIES FOUND (${match.discrepancies.length})`);
      for (const d of match.discrepancies) {
        console.log(`    - ${d.field}: expected "${d.expected}" (${d.documents[0]}) but got "${d.actual}" (${d.documents[1]})`);
      }
    }
    console.log('');
  }
}

main();
