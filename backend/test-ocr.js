import { processReceipt } from './services/ocrService.js';
import path from 'path';

const testOCR = async () => {
  console.log('🧪 Testing OCR Service...\n');

  const testFilePath = path.join('C:', 'Users', 'yashb', 'CascadeProjects', 'expense-management-system', 'invoice_2335462717.pdf');
  
  console.log('📄 Processing file:', testFilePath);
  console.log('⏳ This may take a moment...\n');

  try {
    const result = await processReceipt(testFilePath, 'application/pdf');

    if (result.success) {
      console.log('✅ SUCCESS! Receipt processed successfully.\n');
      console.log('📊 Extracted Data:');
      console.log('─'.repeat(50));
      console.log(`💰 Amount:    ${result.data.amount || 'Not found'}`);
      console.log(`💱 Currency:  ${result.data.currency || 'Not found'}`);
      console.log(`📅 Date:      ${result.data.date || 'Not found'}`);
      console.log(`🏪 Merchant:  ${result.data.merchant || 'Not found'}`);
      console.log('─'.repeat(50));
      console.log('\n📈 Confidence Scores:');
      console.log(`   Amount:    ${(result.data.confidence.amount * 100).toFixed(1)}%`);
      console.log(`   Currency:  ${(result.data.confidence.currency * 100).toFixed(1)}%`);
      console.log(`   Date:      ${(result.data.confidence.date * 100).toFixed(1)}%`);
      console.log(`   Merchant:  ${(result.data.confidence.merchant * 100).toFixed(1)}%`);
      console.log(`   Overall:   ${(result.data.overallConfidence * 100).toFixed(1)}%`);
      
      console.log('\n📝 Raw Text (first 500 chars):');
      console.log('─'.repeat(50));
      console.log(result.data.rawText.substring(0, 500));
      console.log('─'.repeat(50));
    } else {
      console.log('❌ FAILED!', result.error);
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    console.error(error);
  }
};

testOCR();
