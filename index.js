require('dotenv').config();

const config = require('./config');
const express = require('express');
const telnyx = require('telnyx')(config.TELNYX_API_KEY);

const app = express();

const webhookValidator = (req, res, next) => {
    try {
        telnyx.webhooks.constructEvent(
            JSON.stringify(req.body, null, 2),
            req.header('telnyx-signature-ed25519'),
            req.header('telnyx-timestamp'),
            config.TELNYX_PUBLIC_KEY
        );
        next();
        return;
    }
    catch (e) {
        console.log(`Invalid webhook: ${e.message}`);
        return res.status(400).send(`Webhook Error: ${e.message}`);
    }
}
    
const inboundController = (req, res) => {
    res.sendStatus(200);
    const inboundNumber = req.body.data.payload.from.phone_number;
    const inboundMessage = req.body.data.payload.text;
    console.log(`New message from ${inboundNumber}: ${inboundMessage}`);
    console.log(req.body, "Request Body");
    
    // check keywords in received text
    const rePizza = new RegExp('pizza', 'i');
    const reIceCream = new RegExp('ice cream', 'i');
    let outboundMessage = '';
    if (rePizza.test(inboundMessage)) {
        outboundMessage = 'Chicago pizza is the best';
    } else if (reIceCream.test(inboundMessage)) {
        outboundMessage = 'I prefer gelato';
    } else {
        outboundMessage = 'Please send either the word ‘pizza’ or ‘ice cream’' +
        ' for a different response';
    }
    
    // send SMS
    const ourNumber = req.body.data.payload.to[0].phone_number; //pulls phone number from text payload
    telnyx.messages.create({
        from: ourNumber,
        to: inboundNumber,
        text: outboundMessage,
        webhook_url: (new URL('/webhooks', `${req.protocol}://${req.hostname}`)).href
    }).catch((err, response) => {
        console.log('Error sending message!');
        console.log(err);
    });
}
    
const outboundController = (req, res) => {
    res.sendStatus(200);
    console.log(`Received delivery status ID: ${req.body.data.payload.id}`);
}

app.use(express.json()); // middleware to reinterpret json as object
app.use(webhookValidator); // webhook validation middleware

app.post('/webhooks', inboundController);
app.post('/webhooks', outboundController);

app.listen(config.TELNYX_APP_PORT, () => {
    console.log(`App running on port ${config.TELNYX_APP_PORT}`);
});