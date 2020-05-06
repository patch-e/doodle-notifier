# doodle-alert

node.js app that sends an email to recipients when doodle puppies are posted to Crockett Doodles.

depends on unsource controlled environment.js module that should contain the following format:
```javascript
module.exports = {

    vars: {
        smtpUser: 'username',
        smtpPassword: 'password',
        to: 'comma@separated.com, recipients@here.com'
    }

};
```
