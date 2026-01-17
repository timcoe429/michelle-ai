/**
 * One-time script to get Google OAuth refresh token
 * 
 * Usage:
 * 1. Fill in your CLIENT_ID and CLIENT_SECRET below
 * 2. Run: node scripts/get-google-token.js
 * 3. Open the URL in your browser
 * 4. Authorize and copy the code
 * 5. Paste the code when prompted
 * 6. Copy the refresh token to your .env file
 */

const { google } = require('googleapis');
const readline = require('readline');

// Fill these in from Google Cloud Console
const CLIENT_ID = 'YOUR_CLIENT_ID';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob'
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/calendar'],
  prompt: 'consent' // Force to get refresh token
});

console.log('\n=== Google Calendar OAuth Setup ===\n');
console.log('1. Open this URL in your browser:\n');
console.log(authUrl);
console.log('\n2. Sign in and authorize the app');
console.log('3. Copy the authorization code\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter the authorization code: ', async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n=== Success! ===\n');
    console.log('Add this to your .env file:\n');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\n');
  } catch (error) {
    console.error('Error getting tokens:', error.message);
  }
  rl.close();
});
