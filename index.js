const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Stripe = require('stripe');
const fs = require('fs');
require('dotenv').config(); // Load .env variables

const app = express();

// ✅ Use ENV VARIABLE NAMES, not values
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const USERS_FILE = './verified_users.json';

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.raw({ type: 'application/json' }));

function saveEmail(email) {
  const users = fs.existsSync(USERS_FILE)
    ? JSON.parse(fs.readFileSync(USERS_FILE))
    : [];
  if (!users.includes(email)) {
    users.push(email);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users));
    console.log(`✅ Saved verified email: ${email}`);
  }
}

app.post('/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.sendStatus(400);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email;
    if (email) {
      saveEmail(email);
    }
  }

  res.sendStatus(200);
});

app.get('/verified-emails', (req, res) => {
  if (!fs.existsSync(USERS_FILE)) {
    return res.json([]);
  }
  const emails = JSON.parse(fs.readFileSync(USERS_FILE));
  res.json(emails);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

