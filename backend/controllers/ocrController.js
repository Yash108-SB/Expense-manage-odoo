import { processReceipt } from '../services/ocrService.js';
import fs from 'fs';
import path from 'path';

/**
 * @desc    Process uploaded receipt and extract data
 * @route   POST /api/ocr/receipt
 * @access  Private
 */
export const processReceiptUpload = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please upload a PDF or image file.'
      });
    }

    const { path: filePath, mimetype, originalname } = req.file;

    console.log('Processing receipt:', {
      originalname,
      mimetype,
      filePath
    });

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/tiff'];
    if (!allowedTypes.includes(mimetype)) {
      // Clean up uploaded file
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Please upload PDF, JPEG, PNG, or TIFF files only.'
      });
    }

    // Process the receipt
    const result = await processReceipt(filePath, mimetype);

    // Clean up uploaded file after processing
    try {
      fs.unlinkSync(filePath);
    } catch (cleanupError) {
      console.error('File cleanup error:', cleanupError);
    }

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to process receipt'
      });
    }

    // Return extracted data
    res.json({
      success: true,
      message: 'Receipt processed successfully',
      data: {
        amount: result.data.amount,
        date: result.data.date,
        merchant: result.data.merchant,
        currency: result.data.currency,
        confidence: result.data.confidence,
        overallConfidence: result.data.overallConfidence,
        suggestions: {
          needsReview: result.data.overallConfidence < 0.6,
          lowConfidenceFields: Object.entries(result.data.confidence)
            .filter(([key, value]) => value < 0.5)
            .map(([key]) => key)
        }
      }
    });
  } catch (error) {
    console.error('OCR controller error:', error);
    
    // Clean up file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('File cleanup error:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Server error during receipt processing',
      error: error.message
    });
  }
};

/**
 * @desc    Test OCR with a specific file path (for development)
 * @route   POST /api/ocr/test
 * @access  Private (Admin only)
 */
export const testOCR = async (req, res) => {
  try {
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({
        success: false,
        message: 'File path is required'
      });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found at specified path'
      });
    }

    // Determine mimetype from extension
    const ext = path.extname(filePath).toLowerCase();
    let mimetype;
    switch (ext) {
      case '.pdf':
        mimetype = 'application/pdf';
        break;
      case '.jpg':
      case '.jpeg':
        mimetype = 'image/jpeg';
        break;
      case '.png':
        mimetype = 'image/png';
        break;
      case '.tiff':
      case '.tif':
        mimetype = 'image/tiff';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Unsupported file type'
        });
    }

    // Process the receipt
    const result = await processReceipt(filePath, mimetype);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to process receipt'
      });
    }

    res.json({
      success: true,
      message: 'Receipt processed successfully',
      data: result.data
    });
  } catch (error) {
    console.error('Test OCR error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during OCR test',
      error: error.message
    });
  }
};
