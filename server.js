const express = require('express');
const line = require('@line/bot-sdk');
require('dotenv').config();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const app = express();

// Middleware for LINE webhook signature validation
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// Event handler
function handleEvent(event) {
  // If the event is from a group, log the Group ID
  if (event.source.type === 'group') {
    const groupId = event.source.groupId;
    console.log('----------------------------------------');
    console.log(`[+] Group ID found: ${groupId}`);
    console.log('----------------------------------------');
  }

  // Handle messages in the group
  if (event.type === 'message' && event.message.type === 'text') {
    if (event.message.text.toLowerCase() === 'getid') {
      const replyToken = event.replyToken;
      const source = event.source;

      let replyText = 'This is not a group chat.';
      
      if (source.type === 'group') {
        replyText = `Your Group ID is:\n${source.groupId}`;
      } else if (source.type === 'room') {
        replyText = `Your Room ID is:\n${source.roomId}`;
      }

      const client = new line.messagingApi.MessagingApiClient({
        channelAccessToken: config.channelAccessToken
      });

      return client.replyMessage({
        replyToken: replyToken,
        messages: [{ type: 'text', text: replyText }]
      });
    }
  }

  return Promise.resolve(null);
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
