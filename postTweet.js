const axios = require('axios')
require('dotenv').config()
const OAuth = require('oauth-1.0a')
const crypto = require('crypto')

async function postTweet(msg) {
    url = "https://api.twitter.com/2/tweets"
    // Initialize OAuth 1.0a User Context
    const oauth = OAuth({
        consumer: {
            key: process.env.TWITTERAPPKEY,
            secret: process.env.TWITTERAPPSECRET,
        },
        signature_method: 'HMAC-SHA1',
        hash_function(base_string, key) {
            return crypto
                .createHmac('sha1', key)
                .update(base_string)
                .digest('base64')
        },
    })
    const request_data = {
        url: url,
        method: 'POST',
        data: {
            "text": msg
        }
    }
    const token = {
        key: process.env.USER_KEY,
        secret: process.env.USER_SECRET,
    }
    await axios
        .post(url, {
            headers: oauth.toHeader(oauth.authorize(request_data, token))
        })
        .then((res) => {
            // console.log('used one users?ids=')
            const tweet = res.data.data
            console.log('Tweeted: ' + tweet.text + '\nid: ' + tweet.id)
        })
        .catch(err => console.log('convert error: ' + err))
}

module.exports = { postTweet }