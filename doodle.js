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

// app constants
const crockettUrl = 'https://www.crockettdoodles.com/available-puppies';
const botAgent = 'DoodleNotifierBot/1.1.0';
const fastSchedule = later.parse.text('every 1 mins');
const slowSchedule = later.parse.text('every 5 mins');
const doodleFilter = {
  cavapoo: {
    name: 'Cavapoo',
    regex: /cavapoo/gi,
    exclude: ''
  },
  nonCavapoo: {
    name: 'Non-Cavapoo',
    regex: false,
    exclude: 'cavapoo'
  }
};

// fetch/parse, send email notification
const fetchAndNotify = function(filter) {
  const options = {
    url: crockettUrl,
    headers: {
      'User-Agent': botAgent
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
      const filteredDoodles = applyFilters(doodles, filter);
      if (filteredDoodles.length === 0) {
        console.log('no doodles found (' + filter.name + ')');
        return;
      }

      // build the message subject
      const subject = 'Pup Alert - Found (' + filteredDoodles.length + ') ' + 
      filter.name + (filteredDoodles.length === 1 ? '' : 's');
      
      // build the message body
      // 1. provide a link
      var body = '<p><a href="' + crockettUrl + '">Available Pups</a></p> ';
      // 2. summarize the names
      body += '<ul>';
      for (var i = 0; i < filteredDoodles.length; i++) {
        body += '<li>' + filteredDoodles[i].name + '</li> ';
      }
      body += '</ul><hr>';
      // 3. list full details
      for (var i = 0; i < filteredDoodles.length; i++) {
        body += '<p><strong>Name:</strong> ' + filteredDoodles[i].name + '</p> ';
        body += '<p><strong>Description:</strong> ' + filteredDoodles[i].desc + '</p> ';
        body += '<div><img src="' + filteredDoodles[i].img + '"></div><hr>';
      }

      // create mail message
      const mailOptions = {
        from: botAgent,
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

// apply filters to collection
const applyFilters = function(collection, filter) {
  if ( filter.regex ) {
    return collection
      .filter( d => filter.regex.test(d.desc) );
      // .filter( d => !d.name.startsWith('name') );
  } else {
    return collection
      .filter( d => !d.desc.toLowerCase().includes(filter.exclude) );
      // .filter( d => !d.name.startsWith('name') );
  }
    
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
  later.setInterval(() => fetchAndNotify(doodleFilter.cavapoo), fastSchedule);
  later.setInterval(() => fetchAndNotify(doodleFilter.nonCavapoo), slowSchedule);
})();
