const express = require('express')
const mongoose = require('mongoose');
const crypto = require('crypto')
const {User, Photo, Album} = require('models.js')
const validator = require('validator');
const jwt = require('jsonwebtoken');
const config = require('config.js')

const app = express();

app.use(express.json());

app.post('/register', async (req, res, next) => {
  try {
    let user = new User({
      login: req.body.login,
      email: req.body.email,
      password: crypto.createHash('md5').update(req.body.password).digest('hex')
    });
    await User.validate(user)
    const existing = await User.findOne({$or: [{login: user.login}, {email: user.email}]}).exec()
    if (existing) {
      res.status(409).json({ error: { message: 'The same login or email already registered' } });
      return next();
    }
    user = await user.save();
    res.json({_id: user._id})
  } catch (err) {    
    next(err)
  }
})

app.post('/login', async (req, res, next) => {
  try {
    // todo validate dto
    const login = req.body.login;    
    const password = req.body.password;
    let user; // todo addtype
    const md5pass = crypto.createHash('md5').update(password).digest('hex');
    if (validator.isEmail(login)) {
      user = await User.findOne({ email: login, password: md5pass }).exec();
    } else {
      user = await User.findOne({ login: login, password: md5pass }).exec();
    }
    if (!user) {
      res.status(401).end();
    }
    const jwtPayload = {      
      user_id: user._id,
      login: user.lonig,
      email: user.email,
    };
    const authToken = jwt.sign(jwtPayload, config.SECRET_KEY);    
    res.json({ login: user.login, authToken });
  } catch (err) {
    next(err)
  }
})

// error handler
app.use((err, req, res, next) => {
  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({ error: err });
  }
  console.error('ERROR!!!', err);
  res.status(500).json({error: 'server error'});
});

module.exports = app