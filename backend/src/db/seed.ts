/**
 * db/seed.ts
 * Seed script – inserts sample medications (spec §8, FR8).
 * Run with:  npm run seed   (from the backend/ folder)
 *
 * Safe to run multiple times: uses upsert so it won't duplicate data.
 */
import path from 'path';
import dotenv from 'dotenv';

// Load root .env before importing anything that reads env vars
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import prisma from './prisma';

const medications = [
  { name: 'Amoxicillin 500mg',   quantity_in_stock: 200, price: 1.50 },
  { name: 'Paracetamol 500mg',   quantity_in_stock: 500, price: 0.30 },
  { name: 'Ibuprofen 400mg',     quantity_in_stock: 300, price: 0.50 },
  { name: 'Metformin 850mg',     quantity_in_stock: 150, price: 0.80 },
  { name: 'Omeprazole 20mg',     quantity_in_stock: 100, price: 1.20 },
  { name: 'Atorvastatin 40mg',   quantity_in_stock: 80,  price: 2.00 },
  { name: 'Cetirizine 10mg',     quantity_in_stock: 250, price: 0.40 },
  { name: 'Azithromycin 500mg',  quantity_in_stock: 60,  price: 3.50 },
];

async function main() {
  console.log('Seeding medications…');
  for (const med of medications) {
    await prisma.medications.upsert({
      where:  { name: med.name },
      update: { quantity_in_stock: med.quantity_in_stock, price: med.price },
      create: med,
    });
    console.log(`  ✓ ${med.name}`);
  }
  console.log('Seed complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
