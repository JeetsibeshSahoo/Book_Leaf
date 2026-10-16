import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import db from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seedDatabase() {
  console.log('🌱 Starting BookLeaf database seeding...');

  try {
    // 1. Locate and read bookleaf_sample_data.json (check root or server directory)
    const possiblePaths = [
      path.resolve(__dirname, '../../../bookleaf_sample_data.json'), 
      path.resolve(__dirname, '../../bookleaf_sample_data.json'),   
      path.resolve(process.cwd(), '../bookleaf_sample_data.json'),
      path.resolve(process.cwd(), 'bookleaf_sample_data.json'),
    ];

    let sampleDataPath = possiblePaths.find((p) => fs.existsSync(p));

    if (!sampleDataPath) {
      throw new Error(
        `Could not find bookleaf_sample_data.json. Please ensure it exists in the project root.`
      );
    }

    console.log(`📖 Reading sample dataset from: ${sampleDataPath}`);
    const rawData = fs.readFileSync(sampleDataPath, 'utf8');
    const { authors } = JSON.parse(rawData);

    // 2. Clear existing records to ensure clean, repeatable seeding
    console.log('🧹 Cleaning existing tables...');
    await db.query('TRUNCATE TABLE internal_notes, ticket_messages, tickets, books, users CASCADE');

    // 3. Create Default Admin User
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const adminRes = await db.query(
      `INSERT INTO users (name, email, password, role, city)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role`,
      ['Operations Admin', 'admin@bookleaf.com', adminPasswordHash, 'ADMIN', 'Delhi']
    );
    const adminUser = adminRes.rows[0];
    console.log(`👤 Admin created: ${adminUser.email} (password: admin123)`);

    // 4. Seed Authors and their Books
    const authorPasswordHash = await bcrypt.hash('password123', 10);
    let totalBooksInserted = 0;
    const authorMap = new Map(); // author_id -> db UUID
    const bookMap = new Map();   // book_id -> db UUID

    for (const author of authors) {
      const userRes = await db.query(
        `INSERT INTO users (author_id, name, email, password, phone, city, role, joined_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, author_id, name, email`,
        [
          author.author_id,
          author.name,
          author.email,
          authorPasswordHash,
          author.phone,
          author.city,
          'AUTHOR',
          author.joined_date ? new Date(author.joined_date) : new Date(),
        ]
      );

      const dbAuthor = userRes.rows[0];
      authorMap.set(author.author_id, dbAuthor.id);

      // Insert Books for this author
      if (Array.isArray(author.books)) {
        for (const book of author.books) {
          const bookRes = await db.query(
            `INSERT INTO books (
              book_id, title, isbn, genre, publication_date, status, mrp,
              author_royalty_per_copy, total_copies_sold, total_royalty_earned,
              royalty_paid, royalty_pending, last_payout_date, print_partner,
              available_on, author_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING id, book_id, title`,
            [
              book.book_id,
              book.title,
              book.isbn || null,
              book.genre || null,
              book.publication_date ? new Date(book.publication_date) : null,
              book.status,
              book.mrp !== null ? Number(book.mrp) : null,
              book.author_royalty_per_copy !== null ? Number(book.author_royalty_per_copy) : null,
              book.total_copies_sold || 0,
              book.total_royalty_earned || 0,
              book.royalty_paid || 0,
              book.royalty_pending || 0,
              book.last_royalty_payout_date ? new Date(book.last_royalty_payout_date) : null,
              book.print_partner || null,
              book.available_on || [],
              dbAuthor.id,
            ]
          );

          bookMap.set(book.book_id, bookRes.rows[0].id);
          totalBooksInserted++;
        }
      }
    }

    console.log(`✅ Seeded ${authors.length} authors and ${totalBooksInserted} books.`);

    // 5. Seed 3 Starter Realistic Support Tickets (Matching assignment sample queries)
    console.log('🎫 Seeding initial demonstration tickets...');

    // Ticket 1: Royalty query from Priya Sharma (AUTH001) for "Whispers of the Ganges" (BK001)
    const priyaId = authorMap.get('AUTH001');
    const bk1Id = bookMap.get('BK001');

    const ticket1Res = await db.query(
      `INSERT INTO tickets (
        subject, description, status, category, ai_category, priority, ai_priority,
        ai_confidence, author_id, book_id, assigned_to_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, ticket_number, subject`,
      [
        'Pending royalty payment for Q3',
        'I published my book 4 months ago and I noticed ₹3,570 is showing as pending royalty. When will this payout be credited to my bank account?',
        'OPEN',
        'ROYALTY_AND_PAYMENTS',
        'ROYALTY_AND_PAYMENTS',
        'HIGH',
        'HIGH',
        0.96,
        priyaId,
        bk1Id,
        adminUser.id,
        new Date(Date.now() - 3600000 * 24 * 2), // 2 days ago
      ]
    );

    // Initial message on ticket 1
    await db.query(
      `INSERT INTO ticket_messages (ticket_id, sender_id, message, created_at)
       VALUES ($1, $2, $3, $4)`,
      [
        ticket1Res.rows[0].id,
        priyaId,
        'I published my book 4 months ago and I noticed ₹3,570 is showing as pending royalty. When will this payout be credited to my bank account?',
        new Date(Date.now() - 3600000 * 24 * 2),
      ]
    );

    // Ticket 2: Defective copies query from Vikram Joshi (AUTH004) for "Debugging Life" (BK006)
    const vikramId = authorMap.get('AUTH004');
    const bk6Id = bookMap.get('BK006');

    const ticket2Res = await db.query(
      `INSERT INTO tickets (
        subject, description, status, category, ai_category, priority, ai_priority,
        ai_confidence, author_id, book_id, assigned_to_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, ticket_number, subject`,
      [
        'Print Quality Issue - Author Copies Defective',
        'I received my 10 author copies yesterday. The cover binding on 4 copies is completely misaligned and pages 45-52 have ink smudges.',
        'IN_PROGRESS',
        'PRINTING_AND_QUALITY',
        'PRINTING_AND_QUALITY',
        'CRITICAL',
        'CRITICAL',
        0.98,
        vikramId,
        bk6Id,
        adminUser.id,
        new Date(Date.now() - 3600000 * 5), // 5 hours ago
      ]
    );

    await db.query(
      `INSERT INTO ticket_messages (ticket_id, sender_id, message, created_at)
       VALUES ($1, $2, $3, $4)`,
      [
        ticket2Res.rows[0].id,
        vikramId,
        'I received my 10 author copies yesterday. The cover binding on 4 copies is completely misaligned and pages 45-52 have ink smudges.',
        new Date(Date.now() - 3600000 * 5),
      ]
    );

    // Internal Note on Ticket 2 (ops note)
    await db.query(
      `INSERT INTO internal_notes (ticket_id, admin_id, note, created_at)
       VALUES ($1, $2, $3, $4)`,
      [
        ticket2Res.rows[0].id,
        adminUser.id,
        'Flagged with Delhi printing facility. Waiting for author to attach photos to verify batch reprint.',
        new Date(Date.now() - 3600000 * 3),
      ]
    );

    console.log('✅ Demo tickets seeded successfully!');
    console.log('\n===============================================');
    console.log('🎉 SEEDING COMPLETE! TEST CREDENTIALS:');
    console.log('-----------------------------------------------');
    console.log('👑 Admin Portal:');
    console.log('   Email:    admin@bookleaf.com');
    console.log('   Password: admin123');
    console.log('✍️  Author Portal (Any author from sample data):');
    console.log('   Email:    priya.sharma@email.com');
    console.log('   Email:    rohit.kapoor@email.com');
    console.log('   Email:    sneha.kulkarni@email.com');
    console.log('   Password: password123 (for all authors)');
    console.log('===============================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();