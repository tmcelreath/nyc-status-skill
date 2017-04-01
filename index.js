/**
 * This skill  tells the user if Alternate Side Parking Rules in NYC are in effect or Suspended for the
 * specified date, or the current date.
 *
 * Examples:
 * One-shot model:
 *  User: "Alexa, ask NYC Alternate Side if it is suspended."
 *  Alexa: "Alternate side parking rules are in effect today for New York City."
 */

'use strict';

const AlexaSkill = require('./AlexaSkill');
const moment = require('moment-timezone');

const https = require('https');

const APP_ID = "amzn1.echo-sdk-ams.app.e2ad69e8-e3ba-459a-8464-7e939fa3f189";

const NYC311_HOST = 'api.cityofnewyork.us';
const NYC311_PATH = '/311/v1/municipalservices';

const NYC311_APP_ID = 'ab61f3f3';
const NYC311_APP_KEY ='8da2a7e5ffadc3f727b890af441aa9b8';

const VoiceLabs = require("voicelabs")('d7d3f600-1640-11a7-0a6d-0e2486876586');

//const MTA_FEED_API_KEY = '69ea334b85be24d6cb43a39f2682881f';
//const MTA_STATUS_URL = 'http://web.mta.info/status/serviceStatus.txt';

const PARKING = 0;
const GARBAGE = 1;
const SCHOOLS = 2;

const TIME_ZONE = 'America/New_York';

const MSG_HELP = "With NYC Status, you can get status for Alternate Side Rules, Public School Closings, " +
    "and Garbage and Recycling pickup status in New York City for today and tomorrow.  " +
    "For example, you could say 'is alternate side in effect Friday?', 'is school open tomorrow?', " +
    "'is garbage pickup on schedule?', or you can say 'exit' to close.";

const MSG_REPROMPT = "What service can I help you with? Or, say 'exit' to close."

//const DATE_SLOT = 'Date';

const NYC311Skill = function () {
    AlexaSkill.call(this, APP_ID);
};

NYC311Skill.prototype = Object.create(AlexaSkill.prototype);
NYC311Skill.prototype.constructor = NYC311Skill;

NYC311Skill.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    const speechText = "Thanks for using the NYC Status skill. ' + " +
        "Ask, and you can get status for Alternate Side Rules, Public School Closings, " +
        "and Garbage and Recycling pickup status in New York City for today and tomorrow.  " +
        "For example, you could say 'is alternate side in effect', 'is school open', " +
        "'is garbage pickup on schedule', or you can say 'exit' to close.";
    const repromptText = "What can I help you with, parking, schools, or garbage collection? Or, say 'exit' to close.";
    response.ask(speechText, repromptText);
};

NYC311Skill.prototype.intentHandlers = {

    "AlternateSideIntent": function (intent, session, response) {

        const dateSlot = intent.slots.Date;
        let date = null;
        if(dateSlot && dateSlot.value) {
            date = moment(dateSlot.value);
        } else {
            date = moment().tz(TIME_ZONE);
        }

        const options = get311QueryOptions(date, date);

        return https.get(options, function(http_response) {
            let body = '';
            http_response.on('data', function(d) {
                body += d;
            });
            http_response.on('end', function() {
                const data = JSON.parse(body);
                const message = getMessage(data.items, PARKING);
                const speechOutput = {
                    speech: message,
                    type: AlexaSkill.speechOutputType.PLAIN_TEXT
                };
                VoiceLabs.track(session, intent.name, intent.slots, speechOutput.speech, (err, res) => {
                    response.tellWithCard(speechOutput, "NYC Alternate Side Parking Status", message);
                });
            });
        });

    },

    "PublicSchoolIntent": function (intent, session, response) {

        const dateSlot = intent.slots.Date;
        let date = null;
        if(dateSlot && dateSlot.value) {
            date = moment(dateSlot.value);
        } else {
            date = moment().tz(TIME_ZONE);
        }

        const options = get311QueryOptions(date, date);

        return https.get(options, function (http_response) {
            let body = '';
            http_response.on('data', function (d) {
                body += d;
            });
            http_response.on('end', function () {
                const data = JSON.parse(body);
                const message = getMessage(data.items, SCHOOLS);
                const speechOutput = {
                    speech: message,
                    type: AlexaSkill.speechOutputType.PLAIN_TEXT
                };
                VoiceLabs.track(session, intent.name, intent.slots, speechOutput.speech, (err, res) => {
                    response.tellWithCard(speechOutput, "NYC Pubic School Status", message);
                });
            });
        });
    },

    "GarbageRecyclingIntent": function (intent, session, response) {

        const dateSlot = intent.slots.Date;
        let date = null;
        if(dateSlot && dateSlot.value) {
            date = moment(dateSlot.value);
        } else {
            date = moment().tz(TIME_ZONE);
        }

        const options = get311QueryOptions(date, date);

        return https.get(options, function (http_response) {
            let body = '';
            http_response.on('data', function (d) {
                body += d;
            });
            http_response.on('end', function () {
                const data = JSON.parse(body);
                const message = getMessage(data.items, GARBAGE);
                const speechOutput = {
                    speech: message,
                    type: AlexaSkill.speechOutputType.PLAIN_TEXT
                };
                VoiceLabs.track(session, intent.name, intent.slots, speechOutput.speech, (err, res) => {
                    response.tellWithCard(speechOutput, "NYC Garbage/Recycling Status", message);
                });
            });
        });
    },

    "AMAZON.StopIntent": function (intent, session, response) {
        let speechOutput = "";
        VoiceLabs.track(session, intent.name, intent.slots, speechOutput.speech, (err, res) => {
            response.tell(speechOutput);
        });
    },

    "AMAZON.CancelIntent": function (intent, session, response) {
        let speechOutput = "";
        VoiceLabs.track(session, intent.name, intent.slots, speechOutput.speech, (err, res) => {
            response.tell(speechOutput);
        });
    },

    "AMAZON.HelpIntent": function (intent, session, response) {
        const speechText = MSG_HELP;
        const repromptText = MSG_REPROMPT;
        const speechOutput = {
            speech: speechText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        const repromptOutput = {
            speech: repromptText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        VoiceLabs.track(session, intent.name, intent.slots, speechOutput.speech, (err, res) => {
            response.ask(speechOutput, repromptOutput);
        });
    }
};

function get311QueryOptions(start_date, end_date) {
    if(!start_date) {
        start_date = moment().tz(TIME_ZONE);
    }
    let start_date_str = start_date.format('MMDDYYYY');
    let end_date_str = start_date_str;
    if(end_date) {
        end_date_str = end_date.format('MMDDYYYY');
    }
    const FULL_PATH = NYC311_PATH + "?startDate=" + start_date_str + "&endDate=" + end_date_str + "&app_id=" + NYC311_APP_ID + "&app_key=" + NYC311_APP_KEY;
    console.log(NYC311_HOST + FULL_PATH);
    return {
        protocol: 'https:',
        hostname: NYC311_HOST,
        path: FULL_PATH,
        method: 'GET'
    };
}

function getMessage(data, type) {
    var message = null;
    if (data.length > 0) {
        var msg = data[0].items[type].details;
        message = getDateString(data[0]['today_id']) + ': ' + msg + '.';
    } else {
        message = "Sorry, I couldn't find information for that date.";
    }
    return message;
}

function getDateString(date) {
    let return_date = '';
    const dt = moment(date, 'YYYYMMDD').startOf('day');
    const today = moment().startOf('day');
    const tomorrow = moment().startOf('day').add(1, 'days');
    if(dt.isSame(today)) {
        return_date += 'Today, ';
    } else if (dt.isSame(tomorrow)) {
        return_date += 'Tomorrow, ';
    }
    return_date += dt.format('dddd, MMMM Do');
    return return_date;
}

exports.handler = function (event, context) {
    const nyc311Skill = new NYC311Skill();
    nyc311Skill.execute(event, context);
};