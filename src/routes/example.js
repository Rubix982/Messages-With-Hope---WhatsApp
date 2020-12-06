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
router.post('/send-sms', (req, res, next) => {
  const { To, From, Body } = req.body;
  console.log(To, From, Body);
  const responseObject = {
    from: `whatsapp:${cfg.twilioPhoneNumber}` ,
    to: From,
    body: 'hey! this is the default reply. Please checkout with Saif how this can be improved. Thanks!'
  } 

  console.log(responseObject);
  console.log(String(responseObject.to), String(responseObject.from), String(responseObject.body))
  console.log(responseObject.to, responseObject.from, responseObject.body)
  res.status(200).send({
        status: 'success',
  })

  // try {
  //   client.messages.create(responseObject).then((message) => {
  //     // console.log(message.sid)
  //     res.status(200).send({  
  //       status: 'success',
  //       message: `SMS sent to ${From}. Message SID: ${message.sid}`,
  //     })
  //   }).done();
  // } catch (err) {
  //   console.error(err);
  //   res.status(500).send({
  //     status: 'error',
  //     message: 'Failed to send SMS. Check server logs for more details.',
  //   });
  // }
});

module.exports = router;
