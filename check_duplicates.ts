
import { db } from './app/web/src/lib/firebaseAdmin.ts';

async function checkDuplicates() {
  try {
    const snap = await db.collection('passengers').get();
    const passengers = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    const phones = new Map<string, string[]>();
    const emails = new Map<string, string[]>();

    passengers.forEach((p: any) => {
      if (p.phone) {
        const cleanPhone = p.phone.trim().replace(/\D/g, '');
        if (cleanPhone) {
          const list = phones.get(cleanPhone) || [];
          list.push(p.id);
          phones.set(cleanPhone, list);
        }
      }
      if (p.email) {
        const cleanEmail = p.email.trim().toLowerCase();
        if (cleanEmail) {
          const list = emails.get(cleanEmail) || [];
          list.push(p.id);
          emails.set(cleanEmail, list);
        }
      }
    });

    console.log('--- Duplicate Check Results ---');
    console.log('Duplicate Phones:');
    for (const [phone, ids] of phones.entries()) {
      if (ids.length > 1) console.log(`Phone ${phone}: ${ids.join(', ')}`);
    }
    console.log('\nDuplicate Emails:');
    for (const [email, ids] of emails.entries()) {
      if (ids.length > 1) console.log(`Email ${email}: ${ids.join(', ')}`);
    }
    console.log('--- End of Check ---');
  } catch (err) {
    console.error('Error checking duplicates:', err);
  }
}

checkDuplicates();
