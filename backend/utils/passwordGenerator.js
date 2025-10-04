/**
 * Generate a random secure password
 * @param {number} length - Length of the password (default: 12)
 * @returns {string} - Generated password
 */
export const generatePassword = (length = 12) => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  
  // Ensure at least one character from each category
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Generate a simple memorable password (easier to type)
 * @returns {string} - Generated password
 */
export const generateSimplePassword = () => {
  const adjectives = ['Happy', 'Bright', 'Swift', 'Bold', 'Smart', 'Quick', 'Brave', 'Cool'];
  const nouns = ['Tiger', 'Eagle', 'Shark', 'Lion', 'Falcon', 'Wolf', 'Bear', 'Fox'];
  const numbers = Math.floor(Math.random() * 9999);
  const symbols = ['!', '@', '#', '$', '%'];
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  
  return `${adj}${noun}${numbers}${symbol}`;
};
