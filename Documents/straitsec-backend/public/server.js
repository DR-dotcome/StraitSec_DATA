const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors({
  origin: '*', // Allow all origins for development
  methods: ['GET', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// --- Data directory and file ---
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}
const messagesFile = path.join(dataDir, 'messages.json');
if (!fs.existsSync(messagesFile)) {
  fs.writeFileSync(messagesFile, JSON.stringify([], null, 2));
}

// --- Helper functions ---
const readMessages = () => {
  try {
    const data = fs.readFileSync(messagesFile, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading messages:', err);
    return [];
  }
};

const writeMessages = (messages) => {
  try {
    fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2));
    return true;
  } catch (err) {
    console.error('Error writing messages:', err);
    return false;
  }
};

const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(email);

// --- Routes ---

// POST /api/contact - Submit a new message
app.post('/api/contact', (req, res) => {
  const { name, email, phone, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  const messages = readMessages();
  const newMessage = {
    id: Date.now().toString(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone ? phone.trim() : 'Not provided',
    message: message.trim(),
    timestamp: new Date().toISOString(),
    status: 'New'
  };

  messages.push(newMessage);
  if (!writeMessages(messages)) {
    return res.status(500).json({ error: 'Failed to save message.' });
  }

  console.log(`📩 New message from ${name} (${email})`);
  res.status(201).json({ success: true, message: 'Message received!' });
});

// GET /api/messages - Retrieve all messages
app.get('/api/messages', (req, res) => {
  const messages = readMessages();
  // Sort by newest first
  messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(messages);
});

// DELETE /api/messages/:id - Delete a specific message
app.delete('/api/messages/:id', (req, res) => {
  const { id } = req.params;
  const messages = readMessages();
  const initialLength = messages.length;
  const filteredMessages = messages.filter(msg => msg.id !== id);

  if (filteredMessages.length === initialLength) {
    return res.status(404).json({ error: 'Message not found' });
  }

  if (!writeMessages(filteredMessages)) {
    return res.status(500).json({ error: 'Failed to delete message.' });
  }

  console.log(`🗑️ Message ${id} deleted`);
  res.json({ success: true });
});

// PATCH /api/messages/:id/status - Update message status (New/Read)
app.patch('/api/messages/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['New', 'Read'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Use "New" or "Read".' });
  }

  const messages = readMessages();
  const message = messages.find(msg => msg.id === id);
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }

  message.status = status;
  if (!writeMessages(messages)) {
    return res.status(500).json({ error: 'Failed to update status.' });
  }

  console.log(`📌 Message ${id} marked as ${status}`);
  res.json({ success: true, status });
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`🚀 StraitSec backend running on http://localhost:${PORT}`);
  console.log(`📁 Messages stored in: ${messagesFile}`);
});