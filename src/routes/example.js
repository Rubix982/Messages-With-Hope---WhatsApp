const express = require('express');
const cfg = require('../config');
const client = require('twilio')(cfg.twilioAccountSid, cfg.twilioAuthToken);

/* eslint-disable new-cap */
const router = express.Router();

// console.log(cfg);

// client.messages
//   .create({
//     body: 'Hellooooo!',
//     from: `whatsapp:${cfg.twilioPhoneNumber}`,
//     to: `whatsapp:+923112809331`
//   }).then(message => { console.log(message.sid); })
//   .catch(err => { console.error(err) })

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
router.post('/send-sms', (req, res, next) => {
  console.log(req);
  console.log(req.body);
  const { To, From, Body } = req.body;
  console.log(To, From, Body);
  try {
    client.messages.create({
      from: 'whatsapp:' + cfg.twilioPhoneNumber,
      to: To,
      body: Body,
    }).then(message => console.log(message.sid));
  } catch (err) {
    console.error(err);
    res.status(500).send({
      status: 'error',
      message: 'Failed to send SMS. Check server logs for more details.',
    });
  }
});

module.exports = router;
