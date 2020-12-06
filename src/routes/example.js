'use strict';

const express = require('express');
const twilio = require('twilio');
const cfg = require('../config');

const client = twilio(cfg.twilioAccountSid, cfg.twilioAuthToken);

/* eslint-disable new-cap */
const router = express.Router();

console.log(cfg);

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
  const { To, From, Body } = req.body;
  console.log(To, From, Body);
  try {
    const { MessageSid } = await client.messages.create({
      from: To,
      to: From,
      body: 'hey! this is the default reply. Please checkout with Saif how this can be improved. Thanks!',
    }).then(message => console.log(message.sid));

    res.send({
      status: 'success',
      message: `SMS sent to ${From}. Message SID: ${MessageSid}`,
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
