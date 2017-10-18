'use strict';
import superagent from 'superagent';
import {Router} from 'express';
import User from '../model/user.js';
import parserBody from './parser-body.js';
import {basicAuth} from './parser-auth.js';
import {log, daysToMillisseconds} from '../lib/util.js';

export default new Router()

.get('/oauth/google/code', (req, res, next) => {
  if (!req.query.code) {
    res.redirect(process.env.FRONT_URL);
  } else {
    superagent.post('https://www.googleapis.com/oauth2/v4/token')
    .type('form')
    .send({
      code: req.query.code,
      grant_type: 'authorization_code',
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${process.env.API_URL}/oauth/google/code`
    })
    .then(response => {
      console.log('POST: oauth2/v4/token', response.body);
      return superagent.get('https://www.googleapis.com/plus/v1/people/me/openIdConnect')
      .set('Authorization', `Bearer ${response.body.access_token}`)
    })
    .then(response => {
      console.log('GET: /people/me/openIdConnect', response.body);
      console.log('response body', response.body)
      return User.handleOAUTH(response.body);
    })
    .then(user => user.tokenCreate())
    .then( token => {
      console.log('my oauth token:', token);
      res.cookie('X-Sluggram-Token', token);
      res.redirect(process.env.FRONT_URL);
    })
    .catch((error) => {
      console.error(error);
      res.redirect(process.env.FRONT_URL);
    })
  }
})
  .post('/signup', parserBody, (req, res, next) => {
    log('__ROUTE__ POST /signup');

    new User.create(req.body)
      .then(user => user.tokenCreate())
      .then(token => {
        res.cookie('X-Sluggram-Token', token, {maxAge: 900000});

        res.send(token);
      })
      .catch(next);
  })
  .get('/usernames/:username', (req, res, next) => {
    User.findOne({username: username})
      .then(user => {
        if(!user)
          return res.sendStatus(409);
        return res.sendStatus(200);
      })
      .catch(next);
  })
  .get('/login', basicAuth, (req, res, next) => {
    log('__ROUTE__ GET /login');
    req.user.tokenCreate()
      .then((token) => {
        let cookieOptions = {maxAge: daysToMilliseconds(7)};
        res.cookie('X-Sluggram-Token', token, cookieOptions);
        res.send(token);
      })
      .catch(next);
  });
