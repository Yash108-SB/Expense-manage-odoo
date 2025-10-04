import Tesseract from 'tesseract.js';
import path from 'path';

export const processReceipt = async (imagePath) => {
  try {
    const { data: { text, confidence } } = await Tesseract.recognize(
      imagePath,
      'eng',
      {
        logger: info => console.log(info)
      }
    );

    // Extract expense details using pattern matching
    const extractedData = extractExpenseDetails(text);

    return {
      extractedText: text,
      confidence,
      ...extractedData
    };
  } catch (error) {
    console.error('OCR processing error:', error.message);
    throw new Error('Failed to process receipt');
  }
};

const extractExpenseDetails = (text) => {
  const lines = text.split('\n').filter(line => line.trim());
  
  // Extract amount (look for currency symbols and numbers)
  const amountRegex = /(?:[$€£¥₹]|USD|EUR|GBP|INR)?\s*(\d+[.,]\d{2})/gi;
  const amounts = [];
  let match;
  
  while ((match = amountRegex.exec(text)) !== null) {
    amounts.push(parseFloat(match[1].replace(',', '.')));
  }

  // Extract date
  const dateRegex = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})|(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/g;
  const dateMatch = text.match(dateRegex);

  // Extract merchant name (usually first few lines)
  const merchantName = lines.slice(0, 3).join(' ').substring(0, 100);

  // Extract line items
  const expenseLines = [];
  const itemRegex = /(.+?)\s+(?:[$€£¥₹]|USD|EUR|GBP|INR)?\s*(\d+[.,]\d{2})/gi;
  
  while ((match = itemRegex.exec(text)) !== null) {
    if (match[1] && match[2]) {
      expenseLines.push({
        description: match[1].trim(),
        amount: parseFloat(match[2].replace(',', '.'))
      });
    }
  }

  return {
    amount: amounts.length > 0 ? Math.max(...amounts) : null,
    date: dateMatch ? dateMatch[0] : null,
    merchantName: merchantName || null,
    expenseLines: expenseLines.slice(0, 10) // Limit to 10 items
  };
};
