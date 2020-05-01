/*
doodle.js
Send an email notification if a doodle is posted to Crockett Doodles

Copyright (c) 2020

Patrick Crager

*/

const nodemailer = require('nodemailer');
const request = require('request');
const cheerio = require('cheerio');
const console = require('clim')('doodle');
const later = require('later');

// app bootstrap
const crockett = 'https://www.crockettdoodles.com/available-puppies';
const process = {
  env: {
    smtpUser: 'username',
    smtpPassword: 'password',
    from: 'doodle-notifier-bot',
    to: 'recipient@somewhere.com'
  }
}

// send mail
const sendMail = function(mailOptions) {
  // create transporter with SMTP credentials
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.smtpUser,
      pass: process.env.smtpPassword
    }
  });

  transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Message sent: ' + info.response + '\n');
    }
  });
};

// fetch/parse, send email notification
const fetchAndNotify = function() {
  const options = {
    url: crockett,
    headers: {
      'User-Agent': 'DoodleNotifier/1.0.0'
    }
  };

  request(options, function (error, response, html) {
    if (!error && response.statusCode === 200) {
      // load html
      const $ = cheerio.load(html);
      
      // parsing
      const doodles = [];
      $('#content figure').each(function(index, figure) {
        const doodle = {
          name: $(figure).find('.image-title-wrapper p').text(),
          desc: $(figure).find('.image-subtitle-wrapper p').text(),
          img:  $(figure).find('img').attr('data-src')
        }

        doodles.push(doodle);
      });

      if (doodles.length === 0) {
        console.log('no doodles found :(');
        return;
      }

      // populate subject/body with doodles
      const subject = 'Pup Alert - Found (' + doodles.length + ') Doodle' + (doodles.length === 1 ? '' : 's');
      var body = '<p><a href="' + crockett + '">Available Pups</a></p><hr>';

      for (var i = 0; i < doodles.length; i++) {
        body += '<p><strong>Name:</strong> ' + doodles[i].name + '</p>';
        body += '<p><strong>Description:</strong> ' + doodles[i].desc + '</p>';
        body += '<div><img src="' + doodles[i].img + '"></div><hr>';
      }

      // create mail message
      const mailOptions = {
        from: process.env.from,
        to: process.env.to,
        subject: utils.trim(subject),
        html: utils.trim(body)
      };

      // send the mail
      sendMail(mailOptions);
    } else {
      // error logging
      console.error('error occurred:');
      console.error(error);

      // wait 1 minute and try again
      setTimeout(fetchAndNotify, (1000*60)*1);
    }
  });
};

// setup the schedule
later.date.localTime();
const schedule = later.parse.text('every 5 mins');
later.setInterval(fetchAndNotify, schedule);

const utils = {
  // type safe trim function
  // returns a trimmed string with continuous spaces replaced with a single space
  trim: function(s) {
    // only invoke trim() if a string was passed in
    if (typeof s === 'string') {
        s = s.trim().replace('\n', '').replace('\t', '').replace(/\s+/g,' ');
    }
    return s;
  }
};
