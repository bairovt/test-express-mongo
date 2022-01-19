const express = require('express')
const mongoose = require('mongoose');
const http = require('http')
const {User, Photo, Album} = require('./models.js')


const app = express();

app.use(express.json());

mongoose.connect('mongodb://localhost:27017/test1');

app.post('/register', async (req, res, next) => {
  try {
    let user = new User({
      login: req.body.login,
      email: req.body.email,
      password: req.body.password      
    });
    await User.validate(user)
    // let existing = await User.findOne()
    user = await user.save();
    res.json(user)
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

const PORT = process.env.PORT || 3000;

const server = http.createServer(app)

server.listen(PORT)
server.on('error', error => {
  throw error;
})
server.on('listening', () => {
  const addr = server.address();
  console.log(`Listening on http://localhost:${addr.port}`);
})