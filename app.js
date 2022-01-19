const express = require('express')
const http = require('http')
const crypto = require('crypto')
const {User, Photo, Album} = require('models.js')

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

// error handler
app.use((err, req, res, next) => {
  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({ error: err });
  }
  console.error('ERROR!!!', err);
  res.status(500).json({error: 'server error'});
});

module.exports = app