const crypto = require('crypto');
const bcrypt = require('bcrypt');
const moment = require('moment');

// read webhook url from env var and init
if(url = process.env.SLACK_WEBHOOK_URL) { 
    const { IncomingWebhook } = require('@slack/webhook');
    var webhook = new IncomingWebhook(url);
}
else {
    console.info('No webhook defined in SLACK_WEBHOOK_URL, Slack notifications will not work');
}

function copy(input_data) {
    return JSON.parse(JSON.stringify(input_data));
}

function get_secure_random_string(bytes_length) {
    const validChars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let array = crypto.randomBytes(bytes_length);
    array = array.map(x => validChars.charCodeAt(x % validChars.length));
    const random_string = String.fromCharCode.apply(null, array);
    return random_string;
}

async function get_hashed_password(password) {
	// If no environment variable is set, default
	// to doing 10 rounds.
	const bcrypt_rounds = process.env.BCRYPT_ROUNDS ? parseInt(process.env.BCRYPT_ROUNDS) : 10;

	return bcrypt.hash(
		password,
		bcrypt_rounds
	);
}

function logit(input_string) {
    const datetime = moment().format('MMMM Do YYYY, h:mm:ss a');
    // Add spacer unless it starts with a `[`
    const spacer = input_string.startsWith('[') ? '' : ' ';
    console.log(`[${datetime}]${spacer}${input_string.trim()}`);
}

function slack_notify(input_string) {
    // only attempt to send the message if webhook has been initialised
    if (typeof webhook !== 'undefined') {
        (async () => {
            await webhook.send({
                text: input_string,
            });
          })();
    }
}

module.exports = {
    copy: copy,
    get_secure_random_string: get_secure_random_string,
    get_hashed_password: get_hashed_password,
    logit: logit,
    slack_notify: slack_notify
};