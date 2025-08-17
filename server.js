const express = require('express');
const multer = require('multer');
const { Readable } = require('stream');
const csvParser = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;


const path = require('path');
app.use(express.json());
// Serve static files from the project root
app.use(express.static(path.join(__dirname)));
// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Support '/api/*' by stripping the prefix so existing handlers (e.g. '/upload-csv') work both locally and on Vercel
app.use('/api', (req, res, next) => {
  req.url = req.url.replace(/^\/api/, '') || '/';
  next();
});

// Supabase config
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'csv-files'; // bucket name from env or default

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  // continue startup; endpoints will return errors when called
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '');

const upload = multer(); // memory storage

// Endpoint to upload a CSV file to Supabase Storage
app.post('/upload-csv', upload.single('csvfile'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded');
  const filename = req.file.originalname;
  const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(filename, req.file.buffer, { upsert: true, contentType: req.file.mimetype });
  if (error) return res.status(500).send('Upload failed: ' + error.message);
  res.json({ filename });
});

// Endpoint to read a CSV file from Supabase Storage
app.get('/read-csv/:filename', async (req, res) => {
  const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).download(req.params.filename);
  if (error || !data) return res.status(404).send('CSV not found');
  const results = [];
  const stream = Readable.from(data);
  stream
    .pipe(csvParser())
    .on('data', (row) => results.push(row))
    .on('end', () => res.json(results))
    .on('error', () => res.status(500).send('Error reading CSV'));
});

// Endpoint to write data to a CSV file in Supabase Storage
app.post('/write-csv', async (req, res) => {
  const { filename, data, headers } = req.body;
  if (!filename || !data || !headers) return res.status(400).send('Missing data');
  // Convert data to CSV string
  const csvRows = [headers.join(',')];
  data.forEach(row => {
    csvRows.push(headers.map(h => JSON.stringify(row[h] ?? '')).join(','));
  });
  const csvString = csvRows.join('\n');
  const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(filename, Buffer.from(csvString), { upsert: true, contentType: 'text/csv' });
  if (error) return res.status(500).send('Error writing CSV: ' + error.message);
  res.send('CSV written successfully');
});

// Endpoint to download a CSV file from Supabase Storage
app.get('/download-csv/:filename', async (req, res) => {
  const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).download(req.params.filename);
  if (error || !data) return res.status(404).send('CSV not found');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`);
  res.setHeader('Content-Type', 'text/csv');
  data.arrayBuffer().then(buffer => {
    res.send(Buffer.from(buffer));
  });
});

// Persist transaction details to Supabase Postgres
app.post('/transactions', async (req, res) => {
  const tx = req.body;
  if (!tx || !tx.transactionId || !tx.userName || !tx.userContact) {
    return res.status(400).send('Missing transaction fields (transactionId, userName, userContact)');
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).send('Server misconfigured: missing Supabase environment variables');
  }

  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert([{ 
        transaction_id: tx.transactionId,
        user_name: tx.userName,
        user_contact: tx.userContact,
        original_price: tx.originalPrice || null,
        discount: tx.discount || null,
        final_amount: tx.finalAmount || null,
        filename: tx.filename || null
      }]);

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).send('Error saving transaction');
    }

    res.json({ ok: true, inserted: data });
  } catch (e) {
    console.error(e);
    res.status(500).send('Unexpected server error');
  }
});

// List transactions (for admin/testing) - use service role only on server
app.get('/transactions', async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return res.status(500).send('Server misconfigured');
  const { data, error } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) return res.status(500).send('Error fetching transactions');
  res.json(data);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
