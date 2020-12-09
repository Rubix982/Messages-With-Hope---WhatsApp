const cfg = require('../src/config');
const client = require('twilio')(cfg.twilioAccountSid, cfg.twilioAuthToken);

client.messages
    .create({
        body: 'Hellooooo!',
        persistentAction: ['geo:24.8920491,67.0735131'],
        from: `whatsapp:${cfg.twilioPhoneNumber}` ,
        to: `whatsapp:+923112809331`
    }).then(message => { console.log(message.sid); })
    .catch(err => {console.error(err)})

console.log(cfg);