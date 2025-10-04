import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/axios';
import toast from 'react-hot-toast';
import { Upload, Camera, Loader, X, Plus, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';

const NewExpense = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [processingOCR, setProcessingOCR] = useState(false);
  const [currencies, setCurrencies] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    currency: user?.company?.currency?.code || '',
    category: 'Other',
    expenseDate: new Date().toISOString().split('T')[0],
    merchantName: '',
    expenseLines: []
  });
  const [receipt, setReceipt] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [ocrData, setOcrData] = useState(null);
  const [ocrConfidence, setOcrConfidence] = useState(null);

  const categories = [
    'Travel',
    'Food',
    'Office Supplies',
    'Equipment',
    'Utilities',
    'Marketing',
    'Training',
    'Entertainment',
    'Other'
  ];

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    try {
      const { data } = await axios.get(
        `https://api.exchangerate-api.com/v4/latest/${user?.company?.currency?.code || 'USD'}`
      );
      const currencyList = Object.keys(data.rates).sort();
      setCurrencies(currencyList);
    } catch (error) {
      console.error('Error fetching currencies:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Please upload an image or PDF file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setReceipt(file);
    
    // Create preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }

    // Process OCR
    await processOCR(file);
  };

  const processOCR = async (file) => {
    setProcessingOCR(true);
    toast.loading('Processing receipt with OCR...', { id: 'ocr' });

    try {
      const formDataOCR = new FormData();
      formDataOCR.append('receipt', file);

      const { data } = await api.post('/ocr/receipt', formDataOCR, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (data.success && data.data) {
        const { amount, date, merchant, currency, confidence, overallConfidence, suggestions } = data.data;

        // Store OCR data and confidence
        setOcrData(data.data);
        setOcrConfidence(confidence);

        // Auto-fill form fields
        setFormData(prev => ({
          ...prev,
          amount: amount || prev.amount,
          expenseDate: date || prev.expenseDate,
          merchantName: merchant || prev.merchantName,
          currency: currency || prev.currency
        }));

        // Show appropriate message based on confidence
        if (overallConfidence >= 0.7) {
          toast.success(`✅ Receipt processed! (${(overallConfidence * 100).toFixed(0)}% confidence)`, { id: 'ocr' });
        } else if (overallConfidence >= 0.5) {
          toast.success(`⚠️ Receipt processed. Please review extracted data.`, { id: 'ocr' });
        } else {
          toast.error(`⚠️ Low confidence extraction. Please verify all fields.`, { id: 'ocr' });
        }

        // Show which fields need review
        if (suggestions.needsReview && suggestions.lowConfidenceFields.length > 0) {
          toast(`📝 Please verify: ${suggestions.lowConfidenceFields.join(', ')}`, {
            duration: 5000,
            icon: '⚠️'
          });
        }
      } else {
        toast.error('No data extracted from receipt', { id: 'ocr' });
      }
    } catch (error) {
      console.error('OCR error:', error);
      toast.error(error.response?.data?.message || 'Failed to process receipt', { id: 'ocr' });
    } finally {
      setProcessingOCR(false);
    }
  };

  const handleRerunOCR = async () => {
    if (receipt) {
      await processOCR(receipt);
    }
  };

  // Helper to get field confidence class
  const getFieldClass = (fieldName) => {
    if (!ocrConfidence || !ocrConfidence[fieldName]) {
      return 'input-field';
    }
    
    const confidence = ocrConfidence[fieldName];
    if (confidence < 0.5 && confidence > 0) {
      return 'input-field bg-amber-50 border-amber-300 focus:border-amber-500 focus:ring-amber-500';
    }
    if (confidence >= 0.5 && confidence < 0.7) {
      return 'input-field bg-blue-50 border-blue-300 focus:border-blue-500 focus:ring-blue-500';
    }
    if (confidence >= 0.7) {
      return 'input-field bg-green-50 border-green-300 focus:border-green-500 focus:ring-green-500';
    }
    return 'input-field';
  };

  const addExpenseLine = () => {
    setFormData({
      ...formData,
      expenseLines: [
        ...formData.expenseLines,
        { description: '', amount: '', category: formData.category }
      ]
    });
  };

  const updateExpenseLine = (index, field, value) => {
    const updatedLines = [...formData.expenseLines];
    updatedLines[index][field] = value;
    setFormData({ ...formData, expenseLines: updatedLines });
  };

  const removeExpenseLine = (index) => {
    const updatedLines = formData.expenseLines.filter((_, i) => i !== index);
    setFormData({ ...formData, expenseLines: updatedLines });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await api.post('/expenses', formData);
      toast.success('Expense created successfully!');
      navigate('/expenses');
    } catch (error) {
      console.error('Create expense error:', error);
      toast.error(error.response?.data?.message || 'Failed to create expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Submit New Expense</h1>
        <p className="text-gray-600 mt-1">Create a new expense claim for approval</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Receipt Upload */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Receipt (Optional)</h2>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            {previewUrl ? (
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Receipt preview"
                    className="max-w-full h-auto max-h-64 mx-auto rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setReceipt(null);
                      setPreviewUrl(null);
                      setOcrData(null);
                      setOcrConfidence(null);
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow-lg"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                {/* OCR Status */}
                {ocrData && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">Extracted Data</h3>
                      <button
                        type="button"
                        onClick={handleRerunOCR}
                        disabled={processingOCR}
                        className="text-xs btn-secondary inline-flex items-center"
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${processingOCR ? 'animate-spin' : ''}`} />
                        Re-scan
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Amount */}
                      <div className="flex items-center">
                        {ocrConfidence?.amount >= 0.5 ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-500 mr-1" />
                        )}
                        <span className="text-gray-600">Amount:</span>
                        <span className="ml-1 font-medium">{(ocrConfidence?.amount * 100).toFixed(0)}%</span>
                      </div>
                      
                      {/* Currency */}
                      <div className="flex items-center">
                        {ocrConfidence?.currency >= 0.5 ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-500 mr-1" />
                        )}
                        <span className="text-gray-600">Currency:</span>
                        <span className="ml-1 font-medium">{(ocrConfidence?.currency * 100).toFixed(0)}%</span>
                      </div>
                      
                      {/* Date */}
                      <div className="flex items-center">
                        {ocrConfidence?.date >= 0.5 ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-500 mr-1" />
                        )}
                        <span className="text-gray-600">Date:</span>
                        <span className="ml-1 font-medium">{(ocrConfidence?.date * 100).toFixed(0)}%</span>
                      </div>
                      
                      {/* Merchant */}
                      <div className="flex items-center">
                        {ocrConfidence?.merchant >= 0.5 ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-500 mr-1" />
                        )}
                        <span className="text-gray-600">Merchant:</span>
                        <span className="ml-1 font-medium">{(ocrConfidence?.merchant * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    
                    {/* Overall confidence bar */}
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">Overall Confidence</span>
                        <span className="text-xs font-semibold">{(ocrData.overallConfidence * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            ocrData.overallConfidence >= 0.7
                              ? 'bg-green-500'
                              : ocrData.overallConfidence >= 0.5
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${ocrData.overallConfidence * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                {processingOCR ? (
                  <div className="py-8">
                    <Loader className="h-12 w-12 text-primary-600 mx-auto animate-spin" />
                    <p className="mt-4 text-gray-600">Processing receipt with OCR...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Upload receipt image or PDF</p>
                    <p className="text-sm text-gray-500 mb-4">
                      We'll automatically extract expense details using OCR
                    </p>
                    <label className="btn-primary inline-flex items-center cursor-pointer">
                      <Camera className="h-5 w-5 mr-2" />
                      Choose File
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Basic Information */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Expense Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., Client Dinner, Flight to NY"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="input-field"
                placeholder="Additional details about this expense"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                Amount *
                {ocrConfidence?.amount > 0 && (
                  <span className="ml-2 text-xs text-gray-500">({(ocrConfidence.amount * 100).toFixed(0)}% confidence)</span>
                )}
              </label>
              <input
                type="number"
                name="amount"
                required
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={handleChange}
                className={getFieldClass('amount')}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                Currency *
                {ocrConfidence?.currency > 0 && (
                  <span className="ml-2 text-xs text-gray-500">({(ocrConfidence.currency * 100).toFixed(0)}% confidence)</span>
                )}
              </label>
              <select
                name="currency"
                required
                value={formData.currency}
                onChange={handleChange}
                className={getFieldClass('currency')}
              >
                <option value="">Select currency</option>
                {currencies.map(curr => (
                  <option key={curr} value={curr}>{curr}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                name="category"
                required
                value={formData.category}
                onChange={handleChange}
                className="input-field"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                Date *
                {ocrConfidence?.date > 0 && (
                  <span className="ml-2 text-xs text-gray-500">({(ocrConfidence.date * 100).toFixed(0)}% confidence)</span>
                )}
              </label>
              <input
                type="date"
                name="expenseDate"
                required
                value={formData.expenseDate}
                onChange={handleChange}
                max={new Date().toISOString().split('T')[0]}
                className={getFieldClass('date')}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                Merchant Name
                {ocrConfidence?.merchant > 0 && (
                  <span className="ml-2 text-xs text-gray-500">({(ocrConfidence.merchant * 100).toFixed(0)}% confidence)</span>
                )}
              </label>
              <input
                type="text"
                name="merchantName"
                value={formData.merchantName}
                onChange={handleChange}
                className={getFieldClass('merchant')}
                placeholder="e.g., Restaurant ABC, Airlines XYZ"
              />
            </div>
          </div>
        </div>

        {/* Expense Lines */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Line Items (Optional)</h2>
            <button
              type="button"
              onClick={addExpenseLine}
              className="btn-secondary inline-flex items-center text-sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Line
            </button>
          </div>

          {formData.expenseLines.length === 0 ? (
            <p className="text-sm text-gray-600">No line items added</p>
          ) : (
            <div className="space-y-3">
              {formData.expenseLines.map((line, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      placeholder="Description"
                      value={line.description}
                      onChange={(e) => updateExpenseLine(index, 'description', e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Amount"
                      min="0"
                      step="0.01"
                      value={line.amount}
                      onChange={(e) => updateExpenseLine(index, 'amount', e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => removeExpenseLine(index)}
                      className="btn-danger w-full"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/expenses')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Submit Expense'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewExpense;
