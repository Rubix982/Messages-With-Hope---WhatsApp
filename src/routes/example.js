const express = require('express');
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const cfg = require('../config');
const fetch = require('node-fetch');
const { Client } = require('@googlemaps/google-maps-services-js');
const axios = require('axios').default;

require('twilio')(cfg.twilioAccountSid, cfg.twilioAuthToken);

/* eslint-disable new-cap */
const router = express.Router();
const client = new Client({})

let isLanguageSelected = false,
  locationReceived = false,
  isLanguageUrdu = false,
  allInfoFilled = false,
  locationGiven = false,
  sessionEnd = false,
  location = {},
  totalInfo = {},
  JSONObjectForEndpoint = {
    "caretaker": {
      "name": 'Saif',
      "cnic": 'abcd',
      "contact_num": '123'
    },
    'patient': {
      'name': 'a',
      'age': 0,
      'preexisting_conditions': ['diabetes']
    },
    'pickup': {
      'position': {
        'lat': 'a',
        'lng': 'b'
      },
      'landmarks': ['c']
    },
    'destination': {
      'name': 'd',
      'position': {
        'lat': 'e',
        'lng': 'f'
      },
      'landmarks': ['g']
    },
    'patient_condition': 'critical',
    'reason_for_transport': ' Heart Pain',
    'special_needs': ['ventilator', 'oxygen'],
    'distance': 0
  };

let englishFormTemplateForTwilio = `
Care Taker Name: Enter name of the caretaker / accompany to patient;
Care Taker CNIC: Enter the CNIC of the care taker;
Patient Name: Enter patient name here;
Age: Enter age of the patient;
Hospital: Enter the destination of the hospital you wish to reach;
Patient Condition: Is it 'stable' or is it 'critical'?;
Reason For Transport: Enter the most likely cause of emergency ( like heart, lungs, bleeding, stroke problem etc);
Special Needs: Enter special needs, if there are any?;
Pre Existing Conditions: Any pre existing conditions of the patient?;`;

let urduFormTemplateForTwilio = `
نگہداشت کرنے والے کا نام: نگہداشت کرنے والے کا نام / مریض کے ہمراہ درج کریں۔
نگہداشت لینے والا CNIC: نگہداشت کرنے والے کا CNIC درج کریں۔
مریض کا نام: مریض کا نام یہاں داخل کریں۔
عمر: مریض کی عمر درج کریں۔
ہسپتال: جس ہسپتال تک آپ پہنچنا چاہتے ہو اس کی منزل داخل کریں۔
مریضوں کی حالت: کیا یہ 'مستحکم' ہے یا یہ 'تنقیدی' ہے۔
آمد و رفت کی وجہ: ایمرجنسی کی سب سے زیادہ ممکنہ وجہ درج کریں (جیسے دل ، پھیپھڑوں ، خون بہنا ، فالج کا مسئلہ وغیرہ)۔
خصوصی ضرورت: خصوصی ضروریات درج کریں ، اگر کوئی ہو تو؟
پہلے سے موجود حالات: مریض کی کوئی موجودہ حالت؟۔`;

var rad = function (x) {
  return x * Math.PI / 180;
};

var getDistance = function (p1, p2) {
  var R = 6378137; // Earth’s mean radius in meter
  var dLat = rad(p2.lat - p1.lat);
  var dLong = rad(p2.lng - p1.lng);
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(p1.lat)) * Math.cos(rad(p2.lat)) *
    Math.sin(dLong / 2) * Math.sin(dLong / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;
  return d; // returns the distance in meter
};

async function getLocationNearAddress(streetAddress) {
  let params = {
    address: streetAddress,
    components: "country:PK",
    key: process.env.MAPS_KEY,
  };

  console.log("retrieving lat, lng for " + streetAddress);
  client
    .geocode({
      params: params,
    })
    .then((response) => {
      locationResults = response;
      console.log("status: " + response.data.status);
      console.log(response.data.results[0].geometry.location.lat);
      console.log(response.data.results[0].geometry.location.lng);
    })
    .catch((error) => {
      console.log("error retrieving geocoded results", error);
    });
}

async function getResultsFromWit(bodyOfText) {
  const encodedMessage = encodeURIComponent(String(bodyOfText));

  const uri = 'https://api.wit.ai/message?v=20201206&q=' + encodedMessage;
  ``
  const auth = 'Bearer ' + process.env.WITAI_CLIENT_AUTH_TOKEN;

  let results;
  await fetch(uri, { headers: { Authorization: auth } })
    .then(res => res.json())
    .then(res => results = res)

  return results;
}

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

router.get("/hospital", function (_req, res) {
  let places;
  let origin_str;
  console.log(_req.query.location);
  if (_req.query.location) {
    console.log(_req.query.location);
    origin_str = String(_req.query.location);
  }

  client
    .placesNearby({
      params: {
        location: origin_str,
        //radius:1500
        type: "hospital",
        //keyword:healthcare
        key: process.env.MAPS_KEY,
        rankby: "distance",
      },
      timeout: 1000, // milliseconds)
    })
    .then((r) => {
      // Currently disabling the information being logged by the google map apis
      console.log(origin_str.split(",")[0]);
      places = r.data.results;
      res.render("hospital", {
        places: places,
        places_json: JSON.stringify(places),
        origin_str: origin_str,
        lat: _req.query.location.split(",")[0],
        lng: _req.query.location.split(",")[1],
      });
    })
    .catch((error) => {
      console.log("Error Retriving Healthcare Centres", e);
    });

});

// POST: /send-sms
router.post('/sms', async (req, res, next) => {

  // Extracting the content of the req send
  const { From, Body } = req.body;

  let visited = false;

  // Setting up Twilio TwiML
  const twiml = new MessagingResponse();

  if (req.body.Latitude && req.body.Longitude) {

    locationReceived = true;
    location = {
      lat: req.body.Latitude,
      lon: req.body.Longitude
    };

    twiml.message(
      `Your location has been detected at (${location.lat}, ${location.lon})\n`
      + `An ambulance is on your way soon. Thank you for using AmbER`
      // Here we would also add the link to track the location of the ambulance
    );
    locationGiven = true;
  }

  if (sessionEnd) {
    isLanguageSelected = false,
      locationReceived = false,
      isLanguageUrdu = false,
      allInfoFilled = false,
      locationGiven = false,
      sessionEnd = false,
      location = {},
      totalInfo = {},
      JSONObjectForEndpoint = {
        "caretaker": {
          "name": 'Saif',
          "cnic": 'abcd',
          "contact_num": '123'
        },
        'patient': {
          'name': 'a',
          'age': 0,
          'preexisting_conditions': ['diabetes']
        },
        'pickup': {
          'position': {
            'lat': 'a',
            'lng': 'b'
          },
          'landmarks': ['c']
        },
        'destination': {
          'name': 'd',
          'position': {
            'lat': 'e',
            'lng': 'f'
          },
          'landmarks': ['g']
        },
        'patient_condition': 'critical',
        'reason_for_transport': ' Heart Pain',
        'special_needs': ['ventilator', 'oxygen'],
        'distance': 0
      };
  }


  if (allInfoFilled && locationGiven && !sessionEnd) {

    JSONObjectForEndpoint['caretaker']['name'] = totalInfo['caretaker_name']
    JSONObjectForEndpoint['caretaker']['cnic'] = totalInfo['caretaker_cnic']
    JSONObjectForEndpoint['caretaker']['contact_num'] = From.split(':')[1]
    JSONObjectForEndpoint['patient']['name'] = totalInfo['patient_name'];
    JSONObjectForEndpoint['patient']['age'] = totalInfo['age']

    let tempStr = totalInfo['preexisting_conditions']
    let arr = tempStr.split()

    JSONObjectForEndpoint['patient']['preexisting_conditions'] = arr;
    JSONObjectForEndpoint['pickup']['position']['lat'] = location.lat;
    JSONObjectForEndpoint['pickup']['position']['lng'] = location.lon;
    JSONObjectForEndpoint['destination']['name'] = totalInfo['hospital'];
    JSONObjectForEndpoint['patient_condition'] = totalInfo['patient_condition']
    JSONObjectForEndpoint['reason_for_transport'] = totalInfo['reason_for_transport']

    tempStr = totalInfo['special_needs']
    arr = tempStr.split()

    JSONObjectForEndpoint['special_needs'] = arr

    let url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.lat},${location.lon}&key=${process.env.MAPS_KEY}`;

    await fetch(url)
      .then(res => res.json())
      .then((out) => {
        let listOfLandmarks = []

        let resultsFromJSON = out['results']

        for (let i = 0; i < resultsFromJSON.length; ++i) {
          listOfLandmarks.push(resultsFromJSON[i]['formatted_address'])
        }

        JSONObjectForEndpoint['pickup']['landmarks'] = listOfLandmarks
      })
      .catch(err => { throw err });

    let params = {
      address: totalInfo['hospital'],
      components: "country:PK",
      key: process.env.MAPS_KEY,
    };

    await client
      .geocode({
        params: params,
      })
      .then((response) => {
        JSONObjectForEndpoint['destination']['position']['lat'] = String(response.data.results[0].geometry.location.lat);

        JSONObjectForEndpoint['destination']['position']['lng'] = String(response.data.results[0].geometry.location.lng);
      })
      .catch((error) => {
        console.log("error retrieving geocoded results", error);
      });

    url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${JSONObjectForEndpoint['destination']['position']['lat']},${JSONObjectForEndpoint['destination']['position']['lng']}&key=${process.env.MAPS_KEY}`;

    await fetch(url)
      .then(res => res.json())
      .then((out) => {
        let listOfLandmarks = []

        let resultsFromJSON = out['results']

        for (let i = 0; i < resultsFromJSON.length; ++i) {
          listOfLandmarks.push(resultsFromJSON[i]['formatted_address'])
        }

        JSONObjectForEndpoint['destination']['landmarks'] = listOfLandmarks
      })
      .catch(err => { throw err });

    const P1 = { lat: JSONObjectForEndpoint['pickup']['position']['lat'], lng: JSONObjectForEndpoint['pickup']['position']['lng'] }
    const P2 = { lat: JSONObjectForEndpoint['destination']['position']['lat'], lng: JSONObjectForEndpoint['destination']['position']['lng'] }

    JSONObjectForEndpoint['distance'] = String(getDistance(P1, P2));

    let RequestID, phone, latitude, longitude, plate, car;

    await axios.post('https://us-central1-fb-wit-ai.cloudfunctions.net/requestAmbulance', JSONObjectForEndpoint)
      .then(function (response) {
        RequestID = response['data']['data']['id']
      })
      .catch(function (error) {
        console.log(error);
      });

    // twiml.message(`Your ambulance is a ${car}, with plate, ${plate}. You can contact the driver by calling at ${phone}`);

    await axios.get(`https://us-central1-fb-wit-ai.cloudfunctions.net/getAmbulanceUpdate?rid=${RequestID}`)
      .then(function (response) {
        twiml.message(`An ambulance has been alerted and confirmed.`)
      })
      .catch(function (error) {
        twiml.message(`Unable to find an ambulance.`)
        console.log(error);
      });

    sessionEnd = true;

  } else if (Body == 'restart' || Body == 'دوبارہ شروع کریں') {
    // Resetting global variables to their defaults
    // for session management
    twiml.message(`The process is being restarted. Please reply with 'hello' after this message`)
    twiml.message(`براہ کرم اس پیغام کے بعد 'ہیلو' کے ساتھ جواب دیں`)
    isLanguageSelected = false
    locationReceived = false
    isLanguageUrdu = false
    allInfoFilled = false;
    totalInfo = {}
  } else if (Body !== undefined && visited != true) {
    if (Body == '1' && isLanguageSelected == false) {
      isLanguageUrdu = false;
      isLanguageSelected = true;

      twiml.message(`Please find the instructions to proceed in the audio format`)
      twiml.message(``).media(`https://res.cloudinary.com/fast-nuces/video/upload/v1607450279/EnglishAudio_hgxvmc.ogg`);
      twiml.message(englishFormTemplateForTwilio)
    } else if (Body == '2' && isLanguageSelected == false) {
      isLanguageUrdu = true;
      isLanguageSelected = true;

      twiml.message(`براہ کرم آڈیو فارمیٹ میں آگے بڑھنے کے لئے ہدایات تلاش کریں`)
      twiml.message(``).media(`https://res.cloudinary.com/fast-nuces/video/upload/v1607450279/UrduAudio_e7trkg.ogg`);
      twiml.message(urduFormTemplateForTwilio)
    } else if (!Body.startsWith(`نگہداشت کرنے والے کا نام: نگہداشت کرنے والے کا نام / مریض کے ہمراہ درج کریں۔`) && isLanguageUrdu && isLanguageUrdu) {
      let splitTokens = Body.split('۔');

      for (let i = 0; i < splitTokens.length; ++i) {
        splitTokens[i] = splitTokens[i].split('\n').join('');
      }

      let informationRetrieved = [];
      let notProperlyRetrieved = [];

      for (let i = 0; i < splitTokens.length; ++i) {
        splitTokens[i] = splitTokens[i].split('\n').join('');
        informationRetrieved.push(splitTokens[i].split(':')[1]);

        // Information cleaning
        informationRetrieved[i] = informationRetrieved[i].split(' ').join('');

        let tempStr = String(informationRetrieved[i]);
        tempStr = tempStr.trim();

        informationRetrieved[i] = tempStr

        if (informationRetrieved[i] == 'نگہداشت کا نام / مریض کے ہمراہ درج کریں') {
          // Care Taker Name
          notProperlyRetrieved.push(splitTokens[i])
        } else if (!('caretaker_name' in totalInfo) && splitTokens[i].split(':')[0] == 'Care Taker Name') {
          totalInfo['caretaker_name'] = informationRetrieved[i];
        }

        if (informationRetrieved[i] == 'نگہداشت لینے والے کا CNIC درج کریں') {
          // Care Taker Name
          notProperlyRetrieved.push(splitTokens[i])
        } else if (!('caretaker_cnic' in totalInfo) && splitTokens[i].split(':')[0] == 'Care Taker CNIC') {
          totalInfo['caretaker_cnic'] = informationRetrieved[i];
        }

        if (informationRetrieved[i] == 'یہاں مریض کا نام درج کریں') {
          // Name
          notProperlyRetrieved.push(splitTokens[i])
        } else if (!('patient_name' in totalInfo) && splitTokens[i].split(':')[0] == 'Patient Name') {
          totalInfo['patient_name'] = informationRetrieved[i];
        }

        if (informationRetrieved[i] == 'مریض کی عمر درج کریں') {
          // Age
          notProperlyRetrieved.push(splitTokens[i])
        } else if (!('age' in totalInfo) && splitTokens[i].split(':')[0] == 'Age') {
          totalInfo['age'] = informationRetrieved[i];
        }

        if (informationRetrieved[i] == 'جس ہسپتال تک آپ پہنچنا چاہتے ہو اس کی منزل درج کریں') {
          // Hospital
          notProperlyRetrieved.push(splitTokens[i])
        } else if (!('hosptal' in totalInfo) && splitTokens[i].split(':')[0] == 'Hospital') {
          totalInfo['hospital'] = informationRetrieved[i];
        }

        if (informationRetrieved[i] == "کیا یہ 'مستحکم' ہے یا یہ 'تنقیدی' ہے؟") {
          // Patient Condition
          notProperlyRetrieved.push(splitTokens[i])
        } else if (!('patient_condition' in totalInfo) && splitTokens[i].split(':')[0] == 'Patient Condition') {
          totalInfo['patient_condition'] = informationRetrieved[i];
        }

        if (informationRetrieved[i] == 'ہنگامی صورتحال کی سب سے ممکنہ وجہ درج کریں (جیسے دل ، پھیپھڑوں ، خون بہنا ، فالج وغیرہ)') {
          // Reason For Trasnport
          notProperlyRetrieved.push(splitTokens[i])
        } else if (!('reason_for_transport' in totalInfo) && splitTokens[i].split(':')[0] == 'Reason For Transport') {
          totalInfo['reason_for_transport'] = informationRetrieved[i];
        }

        if (informationRetrieved[i] == 'خصوصی ضروریات درج کریں ، اگر کوئی ہو؟') {
          // Special needs
          notProperlyRetrieved.push(splitTokens[i])
        } else if (!('special_needs' in totalInfo) && splitTokens[i].split(':')[0] == 'Special Needs') {

          totalInfo['special_needs'] = informationRetrieved[i];
        }

        if (informationRetrieved[i] == 'مریض کی پہلے سے موجود حالات؟') {
          // Pre existing conditions
          notProperlyRetrieved.push(splitTokens[i])
        } else if (!('preexisting_conditions' in totalInfo) && splitTokens[i].split(':')[0] == 'Pre Existing Conditions') {

          totalInfo['preexisting_conditions'] = informationRetrieved[i];
        }

      }

      if ('patient_name' in totalInfo && 'age' in totalInfo && 'caretaker_name' in totalInfo &&
        'caretaker_cnic' in totalInfo &&
        'hospital' in totalInfo &&
        'reason_for_transport' in totalInfo &&
        'preexisting_conditions' in totalInfo &&
        'patient_condition' in totalInfo && 'special_needs' in totalInfo) {
        twiml.message(`
      موصولہ اطلاع: \n
      نگہداشت کرنے والے کا نام: ${totalInfo['caretaker_name']};
      نگہداشت لینے والا CNIC: ${totalInfo['caretaker_cnic']};
      مریض کا نام: ${totalInfo['patient_name']};
      عمر: ${totalInfo['age']};
      ہسپتال: ${totalInfo['hospital']};
      مریض کی حالت: ${totalInfo['patient_condition']};
      نقل و حمل کی وجہ: ${totalInfo['reason_for_transport']};
      خصوصی ضروریات: ${totalInfo['special_needs']};
      پہلے سے موجود حالات: ${totalInfo['preexisting_conditions']};
          `)
        twiml.message('تمام معلومات موصول ہوگئی ہیں۔ ش')
        twiml.message(`راہ کرم ہمیں اپنا مقام بھیجنے کے لئے تصویر میں دی گئی ہدایات پر عمل کریں۔ اس سے ایمبولینس کو جلدی سے آپ کے مقام تک پہنچنے میں مدد ملے گی۔`).media(`https://res.cloudinary.com/fast-nuces/image/upload/v1607481043/AmberInstructions_y8ycda.jpg`)

        allInfoFilled = true;

      } else {

        let newMessageForTwilio = '';

        if (notProperlyRetrieved.length) {
          splitTokens = [];
          // Some informationw as not properly retrieved.
          // Please enter the following infomartion into the form 
          for (let i = 0; i < notProperlyRetrieved.length; i = i + 1) {
            newMessageForTwilio += notProperlyRetrieved[i] + ';\n'
            splitTokens.push(notProperlyRetrieved[i] + ';\n')
          }
          twiml.message(`Not all needed information was retrieved. Please try again`)
          twiml.message(newMessageForTwilio)
        }
      }
    } else if (!Body.startsWith('Care Taker Name: Enter name of the caretaker / accompany to patient') && isLanguageSelected && !isLanguageUrdu) {
      // console.log("Here in English!");
      let splitTokens = Body.split(';');

      let informationRetrieved = [];
      let notProperlyRetrieved = [];

      for (let i = 0; i < splitTokens.length; ++i) {
        splitTokens[i] = splitTokens[i].split('\n').join('');
        informationRetrieved.push(splitTokens[i].split(':')[1]);

        let tempStr = String(informationRetrieved[i]);
        tempStr = tempStr.trim();

        informationRetrieved[i] = tempStr

        if (informationRetrieved[i] == 'Enter name of the caretaker / accompany to patient') {
          // Care Taker Name
          notProperlyRetrieved.push(splitTokens[i])
        } else if (!('caretaker_name' in totalInfo) && splitTokens[i].split(':')[0] == 'Care Taker Name') {
          totalInfo['caretaker_name'] = informationRetrieved[i];
        }

        if (informationRetrieved[i] == 'Enter the CNIC of the care taker') {
          // Care Taker Name
          notProperlyRetrieved.push(splitTokens[i])
        } else if (!('caretaker_cnic' in totalInfo) && splitTokens[i].split(':')[0] == 'Care Taker CNIC') {
          totalInfo['caretaker_cnic'] = informationRetrieved[i];
        }

        if (informationRetrieved[i] == 'Enter patient name here') {
          // Name
          notProperlyRetrieved.push(splitTokens[i])
        } else if (!('patient_name' in totalInfo) && splitTokens[i].split(':')[0] == 'Patient Name') {
          totalInfo['patient_name'] = informationRetrieved[i];
        }

        if (informationRetrieved[i] == 'Enter age of the patient') {
          // Age
          notProperlyRetrieved.push(splitTokens[i])
        } else if (!('age' in totalInfo) && splitTokens[i].split(':')[0] == 'Age') {
          totalInfo['age'] = informationRetrieved[i];
        }

        if (informationRetrieved[i] == 'Enter the destination of the hospital you wish to reach') {
          // Hospital
          notProperlyRetrieved.push(splitTokens[i])
        } else if (!('hosptal' in totalInfo) && splitTokens[i].split(':')[0] == 'Hospital') {
          totalInfo['hospital'] = informationRetrieved[i];
        }

        if (informationRetrieved[i] == 'Is it \'stable\' or is it \'critical\'?') {
          // Patient Condition
          notProperlyRetrieved.push(splitTokens[i])
        } else if (!('patient_condition' in totalInfo) && splitTokens[i].split(':')[0] == 'Patient Condition') {
          totalInfo['patient_condition'] = informationRetrieved[i];
        }

        if (informationRetrieved[i] == 'Enter the most likely cause of emergency ( like heart, lungs, bleeding, stroke etc)') {
          // Reason For Trasnport
          notProperlyRetrieved.push(splitTokens[i])
        } else if (!('reason_for_transport' in totalInfo) && splitTokens[i].split(':')[0] == 'Reason For Transport') {
          totalInfo['reason_for_transport'] = informationRetrieved[i];
        }

        if (informationRetrieved[i] == 'Enter special needs, if there are any?') {
          // Special needs
          notProperlyRetrieved.push(splitTokens[i])
        } else if (!('special_needs' in totalInfo) && splitTokens[i].split(':')[0] == 'Special Needs') {

          totalInfo['special_needs'] = informationRetrieved[i];
        }

        if (informationRetrieved[i] == ' Any pre existing conditions of the patient?') {
          // Pre existing conditions
          notProperlyRetrieved.push(splitTokens[i])
        } else if (!('preexisting_conditions' in totalInfo) && splitTokens[i].split(':')[0] == 'Pre Existing Conditions') {

          // Information cleaning
          informationRetrieved[i] = informationRetrieved[i].split(' ').join('');

          totalInfo['preexisting_conditions'] = informationRetrieved[i];
        }
      }

      if ('patient_name' in totalInfo && 'age' in totalInfo && 'caretaker_name' in totalInfo &&
        'caretaker_cnic' in totalInfo &&
        'hospital' in totalInfo &&
        'reason_for_transport' in totalInfo &&
        'preexisting_conditions' in totalInfo &&
        'patient_condition' in totalInfo && 'special_needs' in totalInfo) {
        twiml.message(`
Information received as: \n
Care Taker Name: ${totalInfo['caretaker_name']};
Care Taker CNIC: ${totalInfo['caretaker_cnic']};
Patient Name: ${totalInfo['patient_name']};
Age: ${totalInfo['age']};
Hospital: ${totalInfo['hospital']};
Patient Condition: ${totalInfo['patient_condition']};
Reason For Transport: ${totalInfo['reason_for_transport']};
Special Needs: ${totalInfo['special_needs']};
Pre Existing Conditions: ${totalInfo['preexisting_conditions']};
          `)
        visited = true;
        twiml.message('All information has been received. Thank you.')
        twiml.message(`Please follow the instructions in the image to send us your location to help the ambulance reach your location quickly.`).media(`https://res.cloudinary.com/fast-nuces/image/upload/v1607481043/AmberInstructions_y8ycda.jpg`)

        allInfoFilled = true;

      } else {

        let newMessageForTwilio = '';
        if (notProperlyRetrieved.length) {
          splitTokens = [];
          // Some informationw as not properly retrieved.
          // Please enter the following infomartion into the form 
          for (let i = 0; i < notProperlyRetrieved.length; i = i + 1) {
            newMessageForTwilio += notProperlyRetrieved[i] + ';\n'
            splitTokens.push(notProperlyRetrieved[i] + ';\n')
          }
          twiml.message(`Not all needed information was retrieved. Please try again`)
          twiml.message(newMessageForTwilio)
        }
      }
    } else {
      twiml.message(`Welcome to AmbER. We'll help you to connect to a quick ambulance and hospital service. To restart the process, please reply with 'restart' `);
      twiml.message(`امبر میں خوش آمدید۔ ہم آپ کو فوری ایمبولینس اور اسپتال سروس سے رابطہ کرنے میں مدد کریں گے۔ عمل کو دوبارہ شروع کرنے کے لئے ، براہ کرم 'دوبارہ شروع کریں' کے ساتھ جواب دیں۔`)
      twiml.message(`To start the process, please select the language`)
      twiml.message(`عمل شروع کرنے کے لئے ، براہ کرم زبان کا انتخاب کریں`)
      twiml.message(`For English, reply back with 1`)
      twiml.message(`اردو کے ل، ، 2 کے ساتھ جواب دیں`)
    }
  }
  res.writeHead(200, { 'Content-Type': 'text/xml' });
  await res.end(twiml.toString());
});

module.exports = router;
