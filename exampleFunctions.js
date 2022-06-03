const axios = require('axios')
require('dotenv').config()
const fs = require('fs')
const OAuth = require('oauth-1.0a')
const crypto = require('crypto')

function chunk(myArray, size) {
    const chunks = []
    while (myArray.length) {
        chunks.push(myArray.splice(0, size))
    }
    return chunks
}

async function convertIds(idchunk, convertIdsUrl) {
    let twitterHandles = []
    const url = convertIdsUrl + idchunk.toString()
    // Initialize OAuth 1.0a User Context
    const oauth = OAuth({
        consumer: {
            key: process.env.CONSUMER_KEY,
            secret: process.env.CONSUMER_SECRET,
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
        method: 'GET'
    }

    // Note: The token is optional for some requests
    const token = {
        key: process.env.USER_KEY,
        secret: process.env.USER_SECRET,
    }
    await axios
        .get(url, {
            headers: oauth.toHeader(oauth.authorize(request_data, token))
        })
        .then((res) => {
            // console.log('used one users?ids=')
            const users = res.data.data
            // console.log('users length: ' + users.length)
            twitterHandles = users.map(user => user.username)
            // for (const user of users) {
            //     twitterHandles.push(user.username)
            // };
        })
        .catch(err => console.log('convert error: ' + err))
    // console.log(twitterHandles)
    return twitterHandles
}

async function getHandles(followerIdsUrl, convertIdsUrl, cursor, fileName) {
    let ids = []
    let next_cursor_str = ""
    await axios
        .get(followerIdsUrl + cursor, {
            headers: {
                'Authorization': 'Bearer ' + process.env.TOKEN
            }
        })
        .then(function (res) {
            ids = res.data.ids
            next_cursor_str = res.data.next_cursor_str
        })
        .catch(err => { console.log('follower error: ' + err) })

    // divide ids into 100 length chunks and convert to screen names
    let handleChunks = []
    const idChunks = chunk(ids, 100)
    for (const idchunk of idChunks) {
        // console.log('before convert: ' + idchunk.length)
        const handleChunk = await convertIds(idchunk, convertIdsUrl)
        // console.log('after convert: ' + handleChunk.length)
        handleChunks.push(handleChunk)
    }
    // console.log(handleChunks)
    flatChunks = handleChunks.flat(1)
    // console.log(flatChunks)
    const strChunks = flatChunks.join(',\n')
    // console.log(strChunks)
    handleStr = strChunks + ',\n'
    fs.appendFile('./' + fileName + '.csv', handleStr, (err) => { console.log(err) })
    console.log('should be very last')
    return next_cursor_str
}

module.exports = { chunk, convertIds, getHandles }