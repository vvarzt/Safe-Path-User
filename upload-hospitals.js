const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('./backend/src/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function uploadHospitals() {
  try {
    // Read hospital data
    const hospitalData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'hospital-data.json'), 'utf8')
    );

    console.log(`Found ${hospitalData.length} hospitals to upload`);

    // Upload each hospital
    for (const hospital of hospitalData) {
      await db.collection('hospitals').add({
        ...hospital,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        searchTerms: generateSearchTerms(hospital.name, hospital.fullName),
      });
      console.log(`✅ Uploaded: ${hospital.name}`);
    }

    console.log('\n✅ All hospitals uploaded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error uploading hospitals:', error);
    process.exit(1);
  }
}

// Generate search terms for better searching
function generateSearchTerms(name, fullName) {
  const terms = new Set();
  
  // Add full name
  terms.add(name.toLowerCase());
  terms.add(fullName.toLowerCase());
  
  // Add words from name
  name.split(/\s+/).forEach(word => {
    if (word.length > 1) {
      terms.add(word.toLowerCase());
    }
  });
  
  // Add words from full name
  fullName.split(/\s+/).forEach(word => {
    if (word.length > 1) {
      terms.add(word.toLowerCase());
    }
  });
  
  return Array.from(terms);
}

uploadHospitals();
