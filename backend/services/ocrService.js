import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

import Tesseract from 'tesseract.js';
import fs from 'fs';

/**
 * Extract text from PDF file
 */
export const extractTextFromPDF = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return {
      text: data.text,
      numPages: data.numpages,
      info: data.info
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to extract text from PDF');
  }
};

/**
 * Extract text from image using OCR (Tesseract.js)
 */
export const extractTextFromImage = async (filePath) => {
  try {
    const result = await Tesseract.recognize(
      filePath,
      'eng',
      {
        logger: (m) => console.log(m)
      }
    );
    
    return {
      text: result.data.text,
      confidence: result.data.confidence,
      words: result.data.words
    };
  } catch (error) {
    console.error('OCR error:', error);
    throw new Error('Failed to perform OCR on image');
  }
};

/**
 * Clean and normalize extracted text
 */
const cleanText = (text) => {
  // Remove excessive whitespace but preserve line structure
  text = text.replace(/[ \t]+/g, ' ');
  // Remove excessive newlines
  text = text.replace(/\n{3,}/g, '\n\n');
  // Fix common OCR errors
  text = text.replace(/\bl\b/g, '1'); // lowercase L to 1
  text = text.replace(/\bO\b/g, '0'); // uppercase O to 0
  return text.trim();
};

/**
 * Find all lines containing specific keywords
 */
const findLinesWithKeywords = (text, keywords) => {
  const lines = text.split('\n');
  const matches = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const keyword of keywords) {
      if (line.match(new RegExp(keyword, 'i'))) {
        matches.push({
          line,
          index: i,
          nextLine: lines[i + 1] || '',
          prevLine: lines[i - 1] || ''
        });
      }
    }
  }
  
  return matches;
};

/**
 * Extract all numbers from text that look like amounts
 */
const extractAllNumbers = (text) => {
  const numbers = [];
  const pattern = /\b(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})?)\b/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const numStr = match[1].replace(/[,\s]/g, '');
    const num = parseFloat(numStr);
    if (num > 0 && num < 1000000) {
      numbers.push({ value: num, position: match.index, text: match[0] });
    }
  }
  return numbers;
};

/**
 * Parse extracted text to find key receipt information
 */
export const parseReceiptData = (text) => {
  const data = {
    amount: null,
    date: null,
    merchant: null,
    currency: 'USD',
    confidence: {
      amount: 0,
      date: 0,
      merchant: 0,
      currency: 0
    }
  };

  // Clean text for better parsing
  const cleanedText = cleanText(text);
  const originalLines = text.split('\n').filter(line => line.trim().length > 0);

  // SMART AMOUNT EXTRACTION - Multi-strategy approach
  console.log('🔍 Strategy 1: Looking for total/amount keywords...');
  
  // Find lines with total/amount keywords
  const amountKeywords = ['total', 'amount due', 'balance', 'payable', 'payment', 'grand total', 'net amount'];
  const amountLines = findLinesWithKeywords(text, amountKeywords);
  
  // Extract amount - ULTRA comprehensive patterns (priority order)
  const amountPatterns = [
    // HIGHEST PRIORITY: Exact "TOTAL AMOUNT DUE" patterns
    /TOTAL\s+AMOUNT\s+DUE[^\n]+(INR|USD|EUR|GBP|AED|CAD|Rs\.?)\s+(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2}))/gi,
    /TOTAL\s+AMOUNT[^\n]+(INR|USD|EUR|GBP|AED|CAD|Rs\.?)\s+(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2}))/gi,
    
    // Total for statement patterns
    /total\s+for\s+this\s+statement[^\n]+(INR|USD|EUR|GBP|AED|Rs\.?)\s*[^\d]*(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2}))/gi,
    
    // Amount Due patterns
    /amount\s+due[^\n]+(INR|USD|EUR|GBP|AED|Rs\.?)\s+(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2}))/gi,
    
    // Balance/Payable patterns
    /(?:balance|payable)[^\n]+(INR|USD|EUR|GBP|AED|Rs\.?)\s+(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2}))/gi,
    
    // Number followed by currency (same line): "10.64 INR"
    /\b(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2}))\s+(INR|USD|EUR|GBP|AED|CAD|AUD|JPY|CNY|SGD|Rs\.?)\b/gi,
    
    // Currency followed by number: "INR 10.64"
    /\b(INR|USD|EUR|GBP|AED|CAD|AUD|SGD|Rs\.?|₹|\$|€|£)\s+(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2}))/gi,
    
    // Currency symbols: "$ 10.64" or "$10.64"
    /(?:\$|€|£|¥|₹)\s*(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2}))/g,
    
    // Total/Amount with colon
    /(?:total|amount|payment|balance|sum)[\s:]+(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2}))/gi,
  ];

  for (const pattern of amountPatterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      // Get the last match (usually the total)
      const lastMatch = matches[matches.length - 1];
      
      // Check if currency is in group 1 or 2
      let amountStr, currencyStr;
      if (lastMatch[2] && isNaN(lastMatch[1])) {
        // Currency is in group 1, amount in group 2
        currencyStr = lastMatch[1];
        amountStr = lastMatch[2];
      } else if (lastMatch[2]) {
        // Amount is in group 1, currency in group 2
        amountStr = lastMatch[1];
        currencyStr = lastMatch[2];
      } else {
        // Only amount found
        amountStr = lastMatch[1];
      }
      
      // Clean amount string: remove commas and spaces
      amountStr = amountStr.replace(/[,\s]/g, '');
      const parsedAmount = parseFloat(amountStr);
      
      // Validate amount is reasonable (not 0, not too large)
      if (parsedAmount > 0 && parsedAmount < 1000000) {
        data.amount = parsedAmount;
        data.confidence.amount = 0.85; // High confidence for regex match
        console.log('✓ Extracted amount:', data.amount, 'from:', lastMatch[0]);
        
        // Set currency if found
        if (currencyStr) {
          data.currency = currencyStr.toUpperCase().replace(/RS\.?/i, 'INR');
          data.confidence.currency = 0.9;
        }
        break;
      }
    }
  }

  // FALLBACK 1: Check lines with amount keywords for numbers
  if (!data.amount && amountLines.length > 0) {
    console.log('⚠️ Strategy 2: Scanning lines with amount keywords...');
    
    for (const lineInfo of amountLines) {
      // Look for any number with 2 decimals in this line or next line
      const combinedText = lineInfo.line + ' ' + lineInfo.nextLine;
      const numberMatch = combinedText.match(/\d{1,3}(?:[,\s]\d{3})*\.\d{2}/);
      
      if (numberMatch) {
        const amountStr = numberMatch[0].replace(/[,\s]/g, '');
        const parsedAmount = parseFloat(amountStr);
        
        if (parsedAmount > 0 && parsedAmount < 1000000) {
          data.amount = parsedAmount;
          data.confidence.amount = 0.6;
          console.log('✓ Found amount in keyword line:', data.amount, 'from:', lineInfo.line);
          
          // Look for currency in same context
          const currencyMatch = combinedText.match(/\b(INR|USD|EUR|GBP|AED|CAD|Rs\.?|₹|\$|€|£)\b/i);
          if (currencyMatch) {
            data.currency = currencyMatch[1].toUpperCase().replace(/RS\.?/i, 'INR');
            data.confidence.currency = 0.7;
          }
          break;
        }
      }
    }
  }
  
  // FALLBACK 2: Contextual number search
  if (!data.amount) {
    console.log('⚠️ Strategy 3: Contextual number search...');
    const allNumbers = extractAllNumbers(text);
    
    if (allNumbers.length > 0) {
      // Sort by value descending
      allNumbers.sort((a, b) => b.value - a.value);
      
      // Look for numbers that appear after keywords
      for (const num of allNumbers) {
        const contextBefore = text.substring(Math.max(0, num.position - 50), num.position).toLowerCase();
        const contextAfter = text.substring(num.position, num.position + 50).toLowerCase();
        
        // Check if this number appears in a total/amount context
        if (contextBefore.match(/total|amount|due|pay|balance|sum|grand|net/i) ||
            contextAfter.match(/inr|usd|eur|gbp|aed|cad|rs|₹|\$|€|£/i)) {
          data.amount = num.value;
          data.confidence.amount = 0.5;
          console.log('✓ Contextual amount:', data.amount, 'from context near:', num.text);
          break;
        }
      }
      
      // FALLBACK 3: Take largest meaningful number
      if (!data.amount) {
        console.log('⚠️ Strategy 4: Taking largest meaningful number...');
        
        // Filter out very small amounts (likely line items) and very large (likely account numbers)
        const reasonableNumbers = allNumbers.filter(n => n.value >= 1 && n.value <= 100000);
        
        if (reasonableNumbers.length > 0) {
          data.amount = reasonableNumbers[0].value;
          data.confidence.amount = 0.3;
          console.log('⚠️ Last resort amount:', data.amount);
        }
      }
    }
  }

  // Extract date - ULTRA comprehensive patterns
  const datePatterns = [
    // "Statement Date: October 1 , 2025" (with extra space before comma)
    /(?:statement|invoice|bill)\s+date[\s:]+([A-Z][a-z]+)\s+(\d{1,2})\s*,?\s*(\d{4})/gi,
    // "Date: October 1, 2025" or "Date: October 1 , 2025"
    /\bdate[\s:]+([A-Z][a-z]+)\s+(\d{1,2})\s*,?\s*(\d{4})/gi,
    // Month DD, YYYY anywhere (handles extra spaces)
    /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s*,?\s*(\d{4})\b/gi,
    // DD Month YYYY
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\b/gi,
    // Standard formats with label
    /(?:date|dated|invoice date|bill date)[\s:]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/gi,
    // DD/MM/YYYY or MM/DD/YYYY
    /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/g,
    // YYYY-MM-DD (ISO)
    /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/g,
  ];

  for (const pattern of datePatterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      try {
        let dateObj;
        const matchStr = match[0];
        
        // Try different date parsing strategies
        if (match.length > 3 && match[1] && match[2] && match[3]) {
          // Multi-group match (e.g., Month DD YYYY or DD/MM/YYYY)
          const part1 = match[1];
          const part2 = match[2];
          const part3 = match[3];
          
          // Check if first part is a month name
          if (isNaN(part1)) {
            // Month DD, YYYY format
            dateObj = new Date(`${part1} ${part2}, ${part3}`);
          } else if (part1.length === 4) {
            // YYYY-MM-DD format
            dateObj = new Date(`${part1}-${part2.padStart(2, '0')}-${part3.padStart(2, '0')}`);
          } else {
            // Try DD/MM/YYYY or MM/DD/YYYY
            // Assume MM/DD/YYYY for US-style dates
            dateObj = new Date(`${part1}/${part2}/${part3}`);
            
            // If invalid, try DD/MM/YYYY
            if (isNaN(dateObj.getTime())) {
              dateObj = new Date(`${part2}/${part1}/${part3}`);
            }
          }
        } else {
          // Single group match - direct parse
          dateObj = new Date(matchStr);
        }
        
        // Validate date is reasonable (not in future, not too old)
        if (!isNaN(dateObj.getTime())) {
          const now = new Date();
          const threeYearsAgo = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
          
          if (dateObj <= now && dateObj >= threeYearsAgo) {
            data.date = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD format
            data.confidence.date = 0.8;
            console.log('✓ Extracted date:', data.date, 'from:', matchStr);
            break;
          }
        }
      } catch (error) {
        console.error('Date parsing error:', error.message);
      }
    }
    
    if (data.date) break; // Stop if date found
  }

  // DATE FALLBACK 1: Check lines with date keywords
  if (!data.date) {
    console.log('⚠️ Date Strategy 2: Checking lines with date keywords...');
    
    const dateKeywords = ['date', 'dated', 'invoice date', 'statement date', 'bill date', 'issued'];
    const dateLines = findLinesWithKeywords(text, dateKeywords);
    
    for (const lineInfo of dateLines) {
      const combinedText = lineInfo.line + ' ' + lineInfo.nextLine;
      
      // Look for month names
      const monthMatch = combinedText.match(/(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s*,?\s*(\d{4})/i);
      if (monthMatch) {
        try {
          const dateStr = `${monthMatch[1]} ${monthMatch[2]}, ${monthMatch[3]}`;
          const dateObj = new Date(dateStr);
          if (!isNaN(dateObj.getTime())) {
            data.date = dateObj.toISOString().split('T')[0];
            data.confidence.date = 0.7;
            console.log('✓ Found date in keyword line:', data.date);
            break;
          }
        } catch (e) { /* continue */ }
      }
      
      // Look for numeric dates
      const numericMatch = combinedText.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
      if (numericMatch) {
        try {
          const dateObj = new Date(numericMatch[0]);
          if (!isNaN(dateObj.getTime())) {
            data.date = dateObj.toISOString().split('T')[0];
            data.confidence.date = 0.6;
            console.log('✓ Found numeric date in keyword line:', data.date);
            break;
          }
        } catch (e) { /* continue */ }
      }
    }
  }
  
  // DATE FALLBACK 2: Scan for any valid date format
  if (!data.date) {
    console.log('⚠️ Date Strategy 3: Scanning all text for dates...');
    
    const fallbackPatterns = [
      /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/g,
      /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/g
    ];
    
    for (const pattern of fallbackPatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        try {
          const dateStr = match[0];
          const dateObj = new Date(dateStr);
          
          if (!isNaN(dateObj.getTime())) {
            const now = new Date();
            const fiveYearsAgo = new Date(now.getFullYear() - 5, 0, 1);
            
            if (dateObj <= now && dateObj >= fiveYearsAgo) {
              data.date = dateObj.toISOString().split('T')[0];
              data.confidence.date = 0.4;
              console.log('✓ Fallback date:', data.date, 'from:', dateStr);
              break;
            }
          }
        } catch (error) { /* continue */ }
      }
      if (data.date) break;
    }
  }
  
  // DATE FALLBACK 3: Use today's date
  if (!data.date) {
    data.date = new Date().toISOString().split('T')[0];
    data.confidence.date = 0.1;
    console.log('⚠️ No date found, using today:', data.date);
  }

  // Extract merchant/vendor name - ULTRA robust
  const merchantPatterns = [
    // AWS/Cloud specific patterns
    /Amazon\s+Web\s+Services\s+[A-Za-z\s]+(?:Private\s+)?(?:Limited|Ltd)/i,
    /Amazon\s+Web\s+Services/i,
    /AWS\s+[A-Za-z\s]+/i,
    // Google Cloud, Microsoft Azure, etc.
    /Google\s+Cloud\s+Platform/i,
    /Microsoft\s+Azure/i,
    // Statement/Invoice issuer - common pattern
    /([A-Z][A-Za-z\s&.,'-]+)\s+(?:Statement|Invoice|Bill|Receipt)/i,
    // Explicit labels
    /(?:merchant|vendor|from|seller|company|business|store)[\s:]+([A-Z][A-Za-z\s&.,'-]{2,60})/i,
    // Bill patterns
    /(?:bill\s+to|billed\s+by|invoice\s+from|purchased\s+from|issued\s+by)[\s:]+([A-Z][A-Za-z\s&.,'-]{2,60})/i,
  ];

  // Try explicit patterns first
  for (const pattern of merchantPatterns) {
    const match = text.match(pattern);
    if (match) {
      // Use capture group if available, otherwise use full match
      const merchantName = (match[1] || match[0]).trim();
      
      // Clean up merchant name
      const cleaned = merchantName
        .replace(/\s+(Statement|Invoice|Bill|Receipt)$/i, '')
        .replace(/^\s*(From|To|Vendor|Merchant):\s*/i, '')
        .trim();
      
      // Validate it's not junk
      if (cleaned.length > 2 && 
          !cleaned.match(/^(please note|invoice|page \d+|eligible|offer|statement|bill|receipt)$/i)) {
        data.merchant = cleaned;
        data.confidence.merchant = 0.85;
        console.log('✓ Extracted merchant (explicit):', cleaned);
        break;
      }
    }
  }

  // If no merchant found, look at first few lines intelligently
  if (!data.merchant) {
    for (let i = 0; i < Math.min(10, originalLines.length); i++) {
      const line = originalLines[i].trim();
      
      // Skip common header/footer text and short lines
      if (line.length < 3 || line.match(/^(invoice|receipt|bill|statement|page|tax|date|account|customer|number|id|total|amount|due)$/i)) {
        continue;
      }
      
      // Look for company-like names (capitalized, reasonable length, no account numbers)
      if (line.match(/^[A-Z][A-Za-z\s&.,'-]{2,60}$/) && !line.match(/\d{6,}/) && !line.match(/^\d+$/)) {
        data.merchant = line;
        data.confidence.merchant = 0.6;
        console.log('✓ Extracted merchant (from line', i + 1, '):', line);
        break;
      }
    }
  }

  // Last resort: look for words with "Inc", "LLC", "Ltd", "Corp", etc.
  if (!data.merchant) {
    const companyMatch = text.match(/([A-Z][A-Za-z\s&.,'-]+(?:Inc|LLC|Ltd|Limited|Corp|Corporation|Co|Company|LLP|PLC|Pvt|Private|Llc|llc|ltd|inc)\b[A-Za-z\s]*)/i);
    if (companyMatch && companyMatch[1]) {
      data.merchant = companyMatch[1].trim();
      data.confidence.merchant = 0.7;
      console.log('✓ Extracted merchant (company suffix):', data.merchant);
    }
  }

  // FALLBACK: If still no merchant, use first non-empty line that looks like a name
  if (!data.merchant) {
    console.log('⚠️ Primary merchant patterns failed, trying fallback...');
    
    for (let i = 0; i < Math.min(15, originalLines.length); i++) {
      const line = originalLines[i].trim();
      
      // Skip very short lines and obvious non-merchant text
      if (line.length < 2 || 
          line.match(/^\d+$/) ||
          line.match(/^(invoice|receipt|bill|statement|page|tax|date|account|customer|number|id|total|amount|due|po box|address|phone|email|website|www|http)$/i)) {
        continue;
      }
      
      // Take first line that has some alpha characters
      if (line.match(/[A-Za-z]{3,}/) && line.length <= 80) {
        data.merchant = line.length > 50 ? line.substring(0, 50) + '...' : line;
        data.confidence.merchant = 0.4; // Low confidence fallback
        console.log('✓ Fallback merchant (line', i + 1, '):', data.merchant);
        break;
      }
    }
    
    // Absolute last resort
    if (!data.merchant) {
      data.merchant = 'Unknown Merchant';
      data.confidence.merchant = 0.1;
      console.log('⚠️ No merchant found, using default');
    }
  }

  // Extract currency if not already found - check symbols and codes
  if (!data.currency || data.confidence.currency < 0.5) {
    // Check for currency codes
    const currencyCodeMatch = text.match(/\b(USD|EUR|GBP|INR|AED|CAD|AUD|JPY|CNY|SGD|HKD|NZD|CHF|SEK|NOK|DKK|ZAR|MXN|BRL)\b/i);
    if (currencyCodeMatch) {
      data.currency = currencyCodeMatch[1].toUpperCase();
      data.confidence.currency = 0.8;
    } else {
      // Check for currency symbols and map to codes
      const symbolMap = {
        '$': 'USD',
        '€': 'EUR',
        '£': 'GBP',
        '¥': 'JPY',
        '₹': 'INR',
        'Rs': 'INR',
        'Rs.': 'INR'
      };
      
      for (const [symbol, code] of Object.entries(symbolMap)) {
        if (text.includes(symbol)) {
          data.currency = code;
          data.confidence.currency = 0.6;
          break;
        }
      }
      
      // If still no currency, default to USD
      if (!data.currency || data.confidence.currency === 0) {
        data.currency = 'USD';
        data.confidence.currency = 0.2;
      }
    }
  }

  // Calculate overall confidence
  const avgConfidence = (
    data.confidence.amount +
    data.confidence.date +
    data.confidence.merchant +
    data.confidence.currency
  ) / 4;

  // Ensure we have at least some value for each field
  if (!data.amount) {
    data.amount = 0;
    data.confidence.amount = 0;
  }
  if (!data.date) {
    data.date = new Date().toISOString().split('T')[0];
    data.confidence.date = 0.1;
  }
  if (!data.merchant) {
    data.merchant = 'Unknown';
    data.confidence.merchant = 0;
  }
  if (!data.currency) {
    data.currency = 'USD';
    data.confidence.currency = 0.2;
  }

  // Recalculate overall confidence
  const finalConfidence = (
    data.confidence.amount +
    data.confidence.date +
    data.confidence.merchant +
    data.confidence.currency
  ) / 4;

  // Log extraction results
  console.log('\n📊 OCR Extraction Results:');
  console.log('  Amount:', data.amount || 'NOT FOUND', `(${(data.confidence.amount * 100).toFixed(0)}%)`);
  console.log('  Currency:', data.currency || 'NOT FOUND', `(${(data.confidence.currency * 100).toFixed(0)}%)`);
  console.log('  Date:', data.date || 'NOT FOUND', `(${(data.confidence.date * 100).toFixed(0)}%)`);
  console.log('  Merchant:', data.merchant || 'NOT FOUND', `(${(data.confidence.merchant * 100).toFixed(0)}%)`);
  console.log('  Overall Confidence:', `${(finalConfidence * 100).toFixed(0)}%`);
  
  if (finalConfidence < 0.5) {
    console.log('  ⚠️ LOW CONFIDENCE - Please verify all extracted fields!');
  } else if (finalConfidence >= 0.7) {
    console.log('  ✅ HIGH CONFIDENCE - Extraction successful!');
  }
  console.log('');

  return {
    ...data,
    overallConfidence: finalConfidence,
    rawText: text
  };
};

/**
 * Main function to process receipt (handles both PDF and images)
 */
export const processReceipt = async (filePath, mimetype) => {
  try {
    let extractedText = '';
    let confidence = 1;

    console.log('\n🔍 Processing receipt:', filePath);
    console.log('   File type:', mimetype);

    // Determine file type and extract text accordingly
    if (mimetype === 'application/pdf') {
      const pdfData = await extractTextFromPDF(filePath);
      extractedText = pdfData.text;
      console.log('\n📄 PDF Text Extraction Complete');
      console.log('   Pages:', pdfData.numPages);
      console.log('   Text length:', extractedText.length, 'characters');
      console.log('\n📝 First 300 characters:');
      console.log('   ', extractedText.substring(0, 300).replace(/\n/g, '\n    '));
    } else if (mimetype.startsWith('image/')) {
      const imageData = await extractTextFromImage(filePath);
      extractedText = imageData.text;
      confidence = imageData.confidence / 100; // Convert to 0-1 scale
      console.log('\n🖼️ Image OCR Complete');
      console.log('   Confidence:', (confidence * 100).toFixed(1) + '%');
      console.log('   Text length:', extractedText.length, 'characters');
      console.log('\n📝 First 300 characters:');
      console.log('   ', extractedText.substring(0, 300).replace(/\n/g, '\n    '));
    } else {
      throw new Error('Unsupported file type. Please upload PDF or image file.');
    }

    // Parse the extracted text
    console.log('\n🔎 Starting data extraction...');
    const parsedData = parseReceiptData(extractedText);

    // Adjust confidence based on OCR confidence (for images)
    if (mimetype.startsWith('image/')) {
      Object.keys(parsedData.confidence).forEach(key => {
        parsedData.confidence[key] *= confidence;
      });
      parsedData.overallConfidence *= confidence;
    }

    return {
      success: true,
      data: parsedData
    };
  } catch (error) {
    console.error('Receipt processing error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
