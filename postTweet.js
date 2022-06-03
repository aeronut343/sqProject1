const axios = require("axios");
require("dotenv").config();
const OAuth = require("oauth-1.0a");
const crypto = require("crypto");
const qs = require("qs")
async function postTweet(msg) {
  const Turl = "https://api.twitter.com/2/tweets";
  // Initialize OAuth 1.0a User Context
  const oauth = OAuth({
    consumer: {
      key: process.env.TWITTERAPPKEY,
      secret: process.env.TWITTERAPPSECRET,
    },
    signature_method: "HMAC-SHA1",
    hash_function(base_string, key) {
      return crypto
        .createHmac("sha1", key)
        .update(base_string)
        .digest("base64");
    },
  });
  const request_data = {
    url: Turl,
    method: "POST"
  };
  const token = {
    key: process.env.TWITTERUSERKEY,
    secret: process.env.TWITTERUSERSECRET,
  };
  console.log(oauth.toHeader(oauth.authorize(request_data, token)));
  axios.defaults.headers.post['Content-Type'] = 'application/json';
  axios.interceptors.request.use((request) => {
    console.log("Starting Request", request);
    return request;
  });
  let headers = oauth.toHeader(oauth.authorize(request_data, token))
  console.log(headers)
  headers['content-type'] = 'application/json'
  // headers['Authorization'] = 'OAuth oauth_consumer_key="aoPeEIM8W427cRlMJMw93JLKL",oauth_token="3180554168-8E2t65Y0rhUM1L7MMIjqiI2JzMTrNBR3MN2A6L0",oauth_signature_method="HMAC-SHA1",oauth_timestamp="1651330462",oauth_nonce="6ya2MnBQuyM",oauth_version="1.0",oauth_signature="iE4epf0TvHbFiRoHRUe2jx41y8o%3D"'
  console.log(headers)
  await axios
    .post(Turl, {"text": msg}, {
      headers: headers,
    })
    .then((res) => {
      // console.log('used one users?ids=')
      const tweet = res.data.data;
      console.log("Tweeted: " + tweet.text + "\nid: " + tweet.id);
    })
    .catch((err) => console.log("post tweet error: " + err));
}

module.exports = { postTweet };
