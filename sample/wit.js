const fetch = require('node-fetch');
require('dotenv').config()

const q = encodeURIComponent('hello, world!');
const uri = 'https://api.wit.ai/message?v=20201206&q=' + q;
const auth = 'Bearer ' + process.env.WITAI_CLIENT_AUTH_TOKEN;
fetch(uri, {headers: {Authorization: auth}})
    .then(res => res.json())
    .then(res => console.log(res))