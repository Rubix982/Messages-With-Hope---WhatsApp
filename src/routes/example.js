'use strict';

const express = require('express');
const twilio = require('twilio');
const cfg = require('../config');

const client = twilio(cfg.twilioAccountSid, cfg.twilioAuthToken);

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
  console.log(req.body);
  console.log(To, Body);
  try {
    const { MessageSid } = await client.messages.create({
      from: cfg.twilioPhoneNumber,
      to: tostring(To),
      body: toString(Body),
    });

    res.send({
      status: 'success',
      message: `SMS sent to ${req.body.To}. Message SID: ${MessageSid}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      status: 'error',
      message: 'Failed to send SMS. Check server logs for more details.',
    });
  }
});

router.post('/message', async (req, res, next) => {
  const { To, From, Body } = req.body;
});

module.exports = router;
