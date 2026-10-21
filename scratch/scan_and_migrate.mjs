import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';

const oldConfig = {
  apiKey: 'AIzaSyCbxsoLoqqKQIORWGwMg4pJtkjYFJY3G5E',
  authDomain: 'nagarst-2111f.firebaseapp.com',
  projectId: 'nagarst-2111f',
  storageBucket: 'nagarst-2111f.firebasestorage.app',
  messagingSenderId: '763785088493',
  appId: '1:763785088493:web:6d1b2954f0c08d8b24ebe4'
};

const newConfig = {
  apiKey: 'AIzaSyCXFh81NPGfD7VNQ2-wIvv_95YqAZzA3UU',
  authDomain: 'nagarst-16040.firebaseapp.com',
  projectId: 'nagarst-16040',
  storageBucket: 'nagarst-16040.firebasestorage.app',
  messagingSenderId: '905215853273',
  appId: '1:905215853273:web:f36a799788874ba89a74c8',
  measurementId: 'G-2SY06TRPY2'
};

const oldApp = initializeApp(oldConfig, 'oldScan');
const oldDb = getFirestore(oldApp);

const newApp = initializeApp(newConfig, 'newMigrate');
const newDb = getFirestore(newApp);

const collectionsToScan = [
  'routes',
  'buses',
  'stops',
  'route_stops',
  'driver_credentials',
  'trips',
  'users',
  'tickets',
  'passes',
  'announcements',
  'incidents',
  'live_locations',
  'feedback',
  'alerts',
  'schedules',
  'audit_logs',
  'maintenance',
  'system_test'
];

async function main() {
  console.log('=== STEP 1: SCANNING ALL COLLECTIONS IN nagarst-2111f ===');
  const foundData = {};

  for (const c of collectionsToScan) {
    try {
      const snap = await getDocs(collection(oldDb, c));
      if (snap.docs.length > 0) {
        console.log(`[FOUND] Collection "${c}": ${snap.docs.length} documents`);
        foundData[c] = snap.docs.map(d => ({ id: d.id, data: d.data() }));
        snap.docs.forEach(d => {
          console.log(`   - ID: ${d.id} | data:`, JSON.stringify(d.data()).slice(0, 100));
        });
      } else {
        console.log(`[EMPTY] Collection "${c}": 0 documents`);
      }
    } catch (err) {
      console.log(`[ERROR] Collection "${c}": ${err.message}`);
    }
  }

  console.log('\n=== STEP 2: COPYING ALL NON-EMPTY COLLECTIONS TO nagarst-16040 ===');
  let totalCopied = 0;
  for (const [colName, docs] of Object.entries(foundData)) {
    console.log(`Migrating ${docs.length} docs in "${colName}"...`);
    for (const item of docs) {
      await setDoc(doc(newDb, colName, item.id), item.data, { merge: true });
      console.log(`   ✓ Copied ${colName}/${item.id}`);
      totalCopied++;
    }
  }

  console.log(`\n🎉 MIGRATION FINISHED: ${totalCopied} documents copied to nagarst-16040.`);
}

main().then(() => process.exit(0)).catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
