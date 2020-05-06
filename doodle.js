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
const environment = require('./environment');

// app bootstrap
const crockett = 'https://www.crockettdoodles.com/available-puppies';
const agent = 'DoodleNotifierBot/1.0.0';
const schedule = later.parse.text('every 5 mins');

// fetch/parse, send email notification
const fetchAndNotify = function() {
  const options = {
    url: crockett,
    headers: {
      'User-Agent': agent
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

      // filter some doodles
      const filteredDoodles = doodles;
        // .filter( d => !d.name.startsWith('Maze') );
        // .filter( d => !d.name.startsWith('Adele') );

      if (filteredDoodles.length === 0) {
        console.log('no doodles found :(');
        return;
      }

      // populate subject/body with doodles
      const subject = 'Pup Alert - Found (' + filteredDoodles.length + ') Doodle' + (filteredDoodles.length === 1 ? '' : 's');
      var body = '<p><a href="' + crockett + '">Available Pups</a></p><hr>';

      for (var i = 0; i < filteredDoodles.length; i++) {
        body += '<p><strong>Name:</strong> ' + filteredDoodles[i].name + '</p>';
        body += '<p><strong>Description:</strong> ' + filteredDoodles[i].desc + '</p>';
        body += '<div><img src="' + filteredDoodles[i].img + '"></div><hr>';
      }

      // create mail message
      const mailOptions = {
        from: agent,
        to: environment.vars.to,
        subject: subject,
        html: body
      };

      // send the mail
      sendMail(mailOptions);
    } else {
      // error logging
      console.error('error occurred:\n' + error);

      // wait 1 minute and try again
      setTimeout(fetchAndNotify, (1000*60)*1);
    }
  });
};

// send mail
const sendMail = function(mailOptions) {
  // create transporter with SMTP credentials
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: environment.vars.smtpUser,
      pass: environment.vars.smtpPassword
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

// start the app
(function() {
  later.date.localTime();
  later.setInterval(fetchAndNotify, schedule);
})();
