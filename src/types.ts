export type DocumentType = 'purchase_order' | 'invoice' | 'receipt';

export type DocumentObject = {
  type: DocumentType;
  data: string;
  document_id: string;
  vendor: string;
  reference_po: string;
  item: string;
  quantity: number;
  unit_price: number | null;
  total: number | null;
  date: Date;
};

export type TripleMatch = {
  purchase_order: DocumentObject;
  invoice: DocumentObject;
  receipt: DocumentObject;
  discrepancies: Discrepancy[];
};

export type Discrepancy = {
  field: string;
  expected: string | number | Date | null;
  actual: string | number | Date | null;
  documents: [DocumentType, DocumentType];
};
