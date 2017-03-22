// var reindeers = {
//     "one" : {
//         "value" : 1
//     },
//     "two" : {
//         "value" : 2
//     },
//     "three" : {
//         "value" : 3
//     },
//     "four" : {
//         "value" : 4
//     },
//     "five" : {
//         "value" : 5
//     },
//     "six" : {
//         "value" : 6
//     },
//     "seven" : {
//         "value" : 7
//     },
//     "eight" : {
//         "value" : 8
//     },
//     "nine" : {
//         "value" : 9
//     },
//     "zero" : {
//         "value" : 0
//
//     }
// }


var request = require("request")
var greekUtils = require('greek-utils');
var pinDigits;
var numOfMessages = 0;
var logged = false;
var wasLogged = false;
var currentMoney = 0; // FIXME HARDFIX
//TODO: google map image https://maps.googleapis.com/maps/api/staticmap?size=764x400&center="+msg.lat+","+msg.long+"&zoom=17&markers="+msg.lat+","+msg.long
//TODO: reprompt

exports.handler = function(event, context) {
    try {
        /*eslint-disable no-console */
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        if (event.session.new) {
            onSessionStarted({
                requestId: event.request.requestId
            }, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request, event.session, function callback(sessionAttributes, speechletResponse) {
                context.succeed(buildResponse(sessionAttributes, speechletResponse));
            });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request, event.session, function callback(sessionAttributes, speechletResponse) {
                context.succeed(buildResponse(sessionAttributes, speechletResponse));
            });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};




function onSessionStarted(sessionStartedRequest, session) {
    // add any session init logic here
}

// Called when the user invokes the skill without specifying what they want.
function onLaunch(launchRequest, session, callback) {
    getWelcomeResponse(callback)
}

// Called when the user specifies an intent for this skill.
function onIntent(intentRequest, session, callback) {
    var intent = intentRequest.intent
    var intentName = intentRequest.intent.name;

    //callback(session.attributes, buildSpeechletResponseWithoutCard("intent name "+intentName, "", false))
    // dispatch custom intents to handlers here
    if (intentName == "bankIntent" || intentName == "metersIntent" || intentName == "productsIntent"
     || intentName == "usdEIntent" || intentName == "rsdEIntent" || intentName == "gbpEIntent"
     || intentName == "digitsIntent" || intentName == "sendMoneyIntent") {
        handleBankIntent(intent, session, callback, intentName)
    } else if (intentName == "AMAZON.CancelIntent") {
        handleCancelIntent(intent, session, callback)

    }  else if (intentName == "AMAZON.NoIntent") {
        handleCancelIntent(intent, session, callback)

    } else {
        throw "invalid intent"
    }

}

// Called when the user ends the session.
// Is not called when the skill returns shouldEndSession=true.
function onSessionEnded(sessionEndedRequest, session) {}

// ------- Skill specific logic -------

function getWelcomeResponse(callback) {
    logged = false;
    wasLogged = false;
    currentMoney = 0
    var numOfMsg = new Promise(function(resolve, reject) {
        authorize(function(err, res) {
            var data = JSON.parse(res);
            var apiKey = data["access_token"];
            var authReq = 'Bearer ' + apiKey;
            request({
                headers: {
                    Authorization: authReq,
                    customer_id: 'me'
                },
                url: 'http://api.beyondhackathon.com/customers/me/messages-count',
                method: 'get'
            }, function(err, res, body) {
                resolve(JSON.parse(body).number);
            });
        });
    });
    numOfMsg.then(function(num) {
        var speechOutput = "Hello, Cray. Welcome to the EuroBank assistant. "
        numOfMessages = num;
        speechOutput += " Please authenticate yourself by telling me the 4 digits pin that I sent to your mobile app. "
        // speechOutput += " You have " + num + " unread message.";
        // speechOutput += " How can I help you.";
        var reprompt = "Please tell me what do you need."

        pinDigits = generateAccessDigits()
        //var header = "Get Info"

        var shouldEndSession = false

        var sessionAttributes = {
            "speechOutput": speechOutput,
            "repromptText": reprompt
        }

        callback(sessionAttributes, buildSpeechletResponse(pinDigits, speechOutput, reprompt, shouldEndSession))

    });
}

function handleBankIntent(intent, session, callback, call) {
    var speechOutput = "We have an error"
    var infoResponses = ["Do you need something more?", "Do you need anything else?", "Anything else?", "Can I help you with something else?", "Any other question?"]

    var response = infoResponses[Math.floor(Math.random() * infoResponses.length)]
    getJSON(function(data) {
        if (data != "ERROR") {
            if(call == "digitsIntent"){
                if(!logged || wasLogged == false){
                    if(logged)
                        wasLogged = true
                    var speechOutput = data
                } else {
                    var speechOutput = "You are already authorized"
                    data = ""
                }
            } else {
                if(logged){
                    var speechOutput = data + ", " + response
                } else {
                    var speechOutput = "Please authorize first by reading me four digits that I sent to your mobile app"
                    data = ""
                }
            }

        }
        callback(session.attributes, buildSpeechletResponse(data, speechOutput, "", false))
    }, call, intent)
}

function handleCancelIntent(intent, session, callback) {
    var speechOutput = "Thanks for using Euro Bank service, goodbye!"
    callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, "", true))
}

function handleUnreckognizedIntent(intent, session, callback) {
    var speechOutput = "Sorry, I don't understand your request. If you don't know what I am capable for, ask me for help."
    callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, "", false))
}

function url() {
    return "http://api.beyondhackathon.com/info/atms"
}

function toRadians(deg) {
    return deg * Math.PI / 180;
}

function locWrap(body) {
    var obj = {};
    // Current location
    var lat = 38.041023;
    var long = 23.762058;
    var b = JSON.parse(body);
    b.reduce(function(acc, value) {
        var R = 6371e3; // metres
        var fi1 = toRadians(value.latitude); //.toRadians();
        var fi2 = toRadians(lat);
        var deltaFi = toRadians(lat - value.latitude); //.toRadians();
        var deltaLambda = toRadians(long - value.longitude); //.toRadians();
        var a = Math.sin(deltaFi / 2) * Math.sin(deltaFi / 2) + Math.cos(fi1) * Math.cos(fi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c;
        if (acc > d) {
            obj = value;
            obj.distance = d;
            return d;
        }
        return acc;
    }, Number.MAX_VALUE);
    return obj;
}

function authorize(done) {
    request.post({
        url: 'http://api.beyondhackathon.com/authorization/token',
        qs: {
            client_id: 'contestant',
            client_secret: 'secret',
            grant_type: 'password',
            username: 'cray',
            password: 'addodsnjej'
        }
    }, function(err, res, body) {
        return done(null, body);
    });
}

var products = new Promise(function(resolve, reject) {
    authorize(function(err, res) {
        var data = JSON.parse(res);
        var apiKey = data["access_token"];
        var authReq = 'Bearer ' + apiKey;
        request({
            headers: {
                Authorization: authReq,
                customer_id: 'me'
            },
            url: 'http://api.beyondhackathon.com/customers/me/products',
            method: 'get'
        }, function(err, res, body) {
            resolve(JSON.parse(body));
        });
    });
});

function exchangeWrap(cd, callback) {
  request.get('http://api.beyondhackathon.com/info/exchange-rates/2017-03-19', function(error, response, body) {
      var data = JSON.parse(body);
      var filteredData = data.filter(function(value) {
          return cd === value.code;
      });
      switch (cd) {
          case "RSD":
            callback("one euro is equal to "+filteredData[0].fixing_price+" Serbian dinars");
          case "USD":
            callback("one euro is equal to "+filteredData[0].fixing_price+" American dollars");
          case "GBP":
            callback("one euro is equal to "+filteredData[0].fixing_price+" British pounds");


      }

  });
}

function getJSON(callback, calling, intent) {
    if (calling === "bankIntent") {
        request.get(url(), function(error, response, body) {
            var obj = locWrap(body);
            var greeklish = greekUtils.toGreeklish(obj.address1);
            callback("Nearest ATM is " + greeklish);
        });
    } else if (calling === "metersIntent") {
        request.get(url(), function(error, response, body) {
            var obj = locWrap(body);
            callback(Math.round(obj.distance) + ' meters.');
        });
    } else if (calling === "productsIntent") {
        products.then(function(data) {
            var currency = '';
            switch (data[0]["currency"]) {
                case "EUR":
                    currency = "euros";
                    break;
                case "USD":
                    currency = "american dollars";
                    break;
                default:
                    break;
            }
            if(currentMoney == 0)
                currentMoney = parseFloat(data[0]["balance"]);
            callback('You have ' + Math.round(currentMoney*100)/100 + ' ' + currency + ' on your account.');
        });
    } else if (calling === "gbpEIntent") {
        exchangeWrap('GBP', callback);
    } else if (calling === "rsdEIntent") {
        exchangeWrap('RSD', callback);
    } else if (calling === "usdEIntent") {
        exchangeWrap('USD', callback);
    } else if (calling === "digitsIntent"){
        //callback("its a number ");
        var userInputNumber = intent.slots.digit.value;
        if(userInputNumber == pinDigits){
            speechOutput = " You have " + numOfMessages + " unread message.";
            speechOutput += " How can I help you.";
            logged = true;
            callback(" Access granted! " +speechOutput);
        } else {
            callback(" Password is not correct. Please try again. ");
        }
    } else if (calling === "sendMoneyIntent"){
        var userInputNumber = intent.slots.money.value;
        currentMoney -= parseFloat(userInputNumber)
        //parseFloat(userInputNumber).toFixed(3)
        callback("Sending " + Math.round(userInputNumber*100)/100 + " euros from your bank account.");
    }
}



// ------- Helper functions to build responses for Alexa -------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: title,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function generateAccessDigits(){
    var digits = "";
    for(var i=0; i<4; i++){
        digits += Math.floor(Math.random()*10)
    }
    return digits;

}

function generateAccessDigits(){
    var digits = "";
    for(var i=0; i<4; i++){
        digits += Math.floor(Math.random()*10)
    }
    return digits;

}


function buildSpeechletResponseWithoutCard(output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {version: "1.0", sessionAttributes: sessionAttributes, response: speechletResponse};
}
