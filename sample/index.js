const accountSID = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSID, authToken);
const cfg = require('../src/config');

client.messages
    .create({
        body: 'Hellooooo!',
        from: `whatsapp:${cfg.twilioPhoneNumber}` ,
        to: 'whatsapp:+923112809331'
    }).then(message => { console.log(message.sid); })
    .catch(err => {console.error(err)})

console.log(cfg);