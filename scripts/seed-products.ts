// Writes products/{id} for every product in src/data/mockData.ts: the price
// table Firestore rules check orders against, plus stock.
//
//   Emulator: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npx tsx scripts/seed-products.ts --project demo-magicmeat
//   Live:     GOOGLE_APPLICATION_CREDENTIALS=<key.json> npx tsx scripts/seed-products.ts --project magicmeat-gmpqj
//
// Re-running updates prices. Stock is only set for products that don't exist
// yet, so it never overwrites what the store has set; pass --reset-stock to
// overwrite it anyway.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { PRODUCTS } from '../src/data/mockData';
import { priceTableFor } from '../src/data/pricing';

const args = process.argv.slice(2);
const projectId = args[args.indexOf('--project') + 1];
const resetStock = args.includes('--reset-stock');
if (!args.includes('--project') || !projectId) {
  console.error('Usage: npx tsx scripts/seed-products.ts --project <project-id> [--reset-stock]');
  process.exit(1);
}

// Local Google login (ADC) needs a quota project for the Auth/Firestore admin APIs.
process.env.GOOGLE_CLOUD_QUOTA_PROJECT ||= projectId;

const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
initializeApp(usingEmulator ? { projectId } : { projectId, credential: applicationDefault() });
const db = getFirestore();

const DEFAULT_STOCK_KG = 25;

async function main() {
  const existing = new Set((await db.collection('products').select().get()).docs.map((d) => d.id));
  const batch = db.batch();
  for (const product of PRODUCTS) {
    const ref = db.collection('products').doc(product.id);
    const data: Record<string, unknown> = {
      name: product.name,
      category: product.category,
      prices: priceTableFor(product),
      availableCutIds: product.availableCuts.map((c) => c.id),
    };
    if (resetStock || !existing.has(product.id)) {
      data.inStock = true;
      data.stockKg = DEFAULT_STOCK_KG;
    }
    batch.set(ref, data, { merge: true });
  }
  await batch.commit();
  console.log(
    `Seeded ${PRODUCTS.length} products into ${projectId}${usingEmulator ? ' (emulator)' : ''}.`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
