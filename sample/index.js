const accountSID = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSID, authToken);

client.messages
    .create({
        body: 'Hellooooo!',
        mediaUrl: ['https://res.cloudinary.com/fast-nuces/video/upload/v1607238131/test_audio_nsxszh.mp3'],
        from: 'whatsapp:+14155238886',
        to: 'whatsapp:+923112809331'
    }).then(message => { console.log(message.sid); })
    .catch(err => {console.error(err)})