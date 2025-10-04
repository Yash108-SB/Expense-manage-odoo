import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import fs from 'fs';
import path from 'path';

const testPDF = async () => {
  const filePath = path.join('C:', 'Users', 'yashb', 'CascadeProjects', 'expense-management-system', 'invoice_2335462717.pdf');
  
  console.log('📄 Testing PDF Parsing...\n');
  console.log('File:', filePath);
  
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    
    console.log('\n📊 PDF Info:');
    console.log('  Pages:', data.numpages);
    console.log('  Text length:', data.text.length, 'characters\n');
    
    console.log('📝 Full Extracted Text:');
    console.log('═'.repeat(80));
    console.log(data.text);
    console.log('═'.repeat(80));
    
    console.log('\n📋 Line by Line:');
    const lines = data.text.split('\n');
    lines.forEach((line, idx) => {
      if (line.trim()) {
        console.log(`  ${(idx + 1).toString().padStart(3)}:`, line);
      }
    });
    
    console.log('\n🔍 Looking for amounts:');
    const amountMatches = data.text.match(/\d+\.\d{2}/g);
    if (amountMatches) {
      amountMatches.forEach(match => console.log('  Found:', match));
    }
    
    console.log('\n📅 Looking for dates:');
    const dateMatches = data.text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g);
    if (dateMatches) {
      dateMatches.forEach(match => console.log('  Found:', match));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

testPDF();
