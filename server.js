const axios = require('axios');
const crypto = require('crypto')
const express = require('express');
const { postTweet } = require('./postTweet');
const { twitchTokenRefresh } = require('./twitchTokenRefresh');
const app = express();
const port = 3000;
require('dotenv').config()

// Define my twitch user id and callback url
const myId = '121300432'
const myUrl = 'https://south-first-garden.glitch.me/eventsub'

// Get stored environment variables
const twitchToken = process.env.TWITCHTOKEN
const twitchClientId = process.env.TWITCHCLIENTID

// Notification request headers
const TWITCH_MESSAGE_ID = 'Twitch-Eventsub-Message-Id'.toLowerCase();
const TWITCH_MESSAGE_TIMESTAMP = 'Twitch-Eventsub-Message-Timestamp'.toLowerCase();
const TWITCH_MESSAGE_SIGNATURE = 'Twitch-Eventsub-Message-Signature'.toLowerCase();
const MESSAGE_TYPE = 'Twitch-Eventsub-Message-Type'.toLowerCase();

// Notification message types
const MESSAGE_TYPE_VERIFICATION = 'webhook_callback_verification';
const MESSAGE_TYPE_NOTIFICATION = 'notification';
const MESSAGE_TYPE_REVOCATION = 'revocation';

// Prepend this string to the HMAC that's created from the message
const HMAC_PREFIX = 'sha256=';

// Request urls
const twitchSubUrl = "https://api.twitch.tv/helix/eventsub/subcriptions";

app.use(express.raw({          // Need raw message body for signature verification
    type: 'application/json'
}))

app.post('/eventsub', async (req, res) => {
    let secret = getSecret();
    let message = getHmacMessage(req);
    let hmac = HMAC_PREFIX + getHmac(secret, message);  // Signature to compare

    if (true === verifyMessage(hmac, req.headers[TWITCH_MESSAGE_SIGNATURE])) {
        console.log("signatures match");

        // If an event sub challenge and not a 'notification', respond with challenge
        if (req.body.challenge) {
            console.log(req.body)
            res.send(req.body.challenge)
            return
        }

        // TODO: Auto-refresh twitch key to avoid an expired token
        twitchTokenRefresh()

        // TODO: turn this into a function
        // Check subscription status to yourself
        let subStatus = false
        subStatus = await axios
            .get(twitchSubUrl, {
                headers: {
                    "Authorization": twitchToken,
                    "Client-Id": twitchClientId
                }
            })
            .then(res => {
                data = res.data
                data.foreach(sub => {
                    if (sub.condition.broadcaster_user_id == myId) return true
                })
            })
            .catch(err => console.log('check sub status error: ' + err))

        // If not subscribed to yourself, subscribe
        if (subStatus == false) {
            await axios
                .post(twitchSubUrl, {
                    headers: {
                        "Authorization": twitchToken,
                        "Client-Id": twitchClientId
                    },
                    data: {
                        "type": "stream.online",
                        "version": "1",
                        "condition": { "broadcaster_user_id": myId },
                        "transport": {
                            "method": "webhook",
                            "callback": myUrl,
                            "secret": process.env.SECRET
                        }
                    }
                })
                .catch(err => console.log('resubscribe error: ' + err))
        }
        // Get JSON object from body, so you can process the message.
        let notification = JSON.parse(req.body);

        if (MESSAGE_TYPE_NOTIFICATION === req.headers[MESSAGE_TYPE]) {
            // Log the event type and request body
            console.log(`Event type: ${notification.subscription.type}`);
            console.log(JSON.stringify(notification.event, null, 4));

            // TODO: Post to Twitter
            const msg = "shall I tweet?"
            postTweet(msg)

            // send the ok (no data)
            res.sendStatus(204);
        }
        else if (MESSAGE_TYPE_VERIFICATION === req.headers[MESSAGE_TYPE]) {
            res.status(200).send(notification.challenge);
        }
        else if (MESSAGE_TYPE_REVOCATION === req.headers[MESSAGE_TYPE]) {
            res.sendStatus(204);

            console.log(`${notification.subscription.type} notifications revoked!`);
            console.log(`reason: ${notification.subscription.status}`);
            console.log(`condition: ${JSON.stringify(notification.subscription.condition, null, 4)}`);
        }
        else {
            res.sendStatus(204);
            console.log(`Unknown message type: ${req.headers[MESSAGE_TYPE]}`);
        }
    }
    else {
        console.log('403');    // Signatures didn't match.
        res.sendStatus(403);
    }
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
})


function getSecret() {
    // TODO: Get secret from secure storage. This is the secret you pass 
    // when you subscribed to the event.
    return process.env.SECRET;
}

// Build the message used to get the HMAC.
function getHmacMessage(request) {
    return (request.headers[TWITCH_MESSAGE_ID] +
        request.headers[TWITCH_MESSAGE_TIMESTAMP] +
        request.body);
}

// Get the HMAC.
function getHmac(secret, message) {
    return crypto.createHmac('sha256', secret)
        .update(message)
        .digest('hex');
}

// Verify whether our hash matches the hash that Twitch passed in the header.
function verifyMessage(hmac, verifySignature) {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(verifySignature));
}