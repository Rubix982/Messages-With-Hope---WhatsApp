'use strict';

const express = require('express');
const cfg = require('../config');
const client = require('twilio')(cfg.twilioAccountSid, cfg.twilioAuthToken);

/* eslint-disable new-cap */
const router = express.Router();

// GET: /
router.get('/', (req, res, next) => {
  res.render('index', { title: 'Template App', scripts: ['js/send-sms.js'] });
});

// GET: /example
router.get('/example', (req, res, next) => {
  res.send({
    example: true,
  });
});

// POST: /send-sms
router.post('/send-sms', async (req, res, next) => {
  const { To, Body } = req.body;
  try {
    await client.messages.create({
      from: 'whatsapp:' + cfg.twilioPhoneNumber,
      to: To,
      body: Body,
    });

    res.send({
      status: 'success',
      message: `SMS sent to ${req.body.to}.`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      status: 'error',
      message: 'Failed to send SMS. Check server logs for more details.',
    });
  }
});

module.exports = router;
