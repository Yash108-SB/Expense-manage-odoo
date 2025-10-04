import User from '../models/User.js';
import Company from '../models/Company.js';
import generateToken from '../utils/tokenGenerator.js';
import axios from 'axios';

// @desc    Register user & create company
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { email, password, name, companyName, country } = req.body;

    // Validate input
    if (!email || !password || !name || !companyName || !country) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Fetch country currency from API
    const countriesResponse = await axios.get(
      'https://restcountries.com/v3.1/all?fields=name,currencies'
    );

    const countryData = countriesResponse.data.find(
      c => c.name.common.toLowerCase() === country.toLowerCase()
    );

    if (!countryData) {
      return res.status(400).json({ message: 'Country not found' });
    }

    const currencyCode = Object.keys(countryData.currencies)[0];
    const currencyData = countryData.currencies[currencyCode];

    // Create company
    const company = await Company.create({
      name: companyName,
      country: countryData.name.common,
      currency: {
        code: currencyCode,
        symbol: currencyData.symbol || currencyCode,
        name: currencyData.name
      }
    });

    // Create admin user
    const user = await User.create({
      email,
      password,
      name,
      role: 'admin',
      company: company._id
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          company: company
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password').populate('company');

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          company: user.company,
          manager: user.manager
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('company')
      .populate('manager', 'name email');

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
