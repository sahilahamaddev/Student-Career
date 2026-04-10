require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors()); // Allows your HTML frontend to communicate with this server
app.use(express.json()); // Allows server to read JSON data

// 1. Setup Email Transporter (Who is sending the email)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 2. Temporary Memory to Store OTPs 
// (In a real professional app, you'd save this to a database like MongoDB or Redis)
const otpStore = {};

// --- ROUTE 1: SEND OTP ---
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  // Generate a 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  
  // Save OTP in memory with a 5-minute expiration
  otpStore[email] = {
    otp: otp,
    expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes in milliseconds
  };

  // Configure the email format
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your StreamSelector Access Code',
    html: `
      <div style="font-family: sans-serif; text-align: center; padding: 20px;">
        <h2>StreamSelector Terminal</h2>
        <p>Your secure One-Time Password (OTP) is:</p>
        <h1 style="color: #38bdf8; letter-spacing: 5px;">${otp}</h1>
        <p>This code will expire in 5 minutes.</p>
      </div>
    `,
  };

  try {
    // Send the email
    await transporter.sendMail(mailOptions);
    console.log(`OTP sent to ${email}: ${otp}`); // For debugging in terminal
    res.status(200).json({ success: true, message: 'OTP sent to email successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to send OTP.' });
  }
});

// --- ROUTE 2: VERIFY OTP ---
app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  // Check if OTP was generated for this email
  const record = otpStore[email];
  
  if (!record) {
    return res.status(400).json({ success: false, message: 'No OTP found for this email. Please request a new one.' });
  }

  // Check if OTP is expired
  if (Date.now() > record.expiresAt) {
    delete otpStore[email]; // Clean up expired OTP
    return res.status(400).json({ success: false, message: 'OTP has expired.' });
  }

  // Check if OTP matches
  if (record.otp === otp) {
    delete otpStore[email]; // Clean up used OTP
    return res.status(200).json({ success: true, message: 'Authentication successful! Access granted.' });
  } else {
    return res.status(400).json({ success: false, message: 'Invalid OTP.' });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 StreamSelector Backend running on http://localhost:${PORT}`);
});