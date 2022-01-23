const express = require('express')
const crypto = require('crypto')
const {User, Photo, Album} = require('models.js')
const validator = require('validator');
const jwt = require('jsonwebtoken');
const config = require('config.js')
const authenticate = require('./middleware/auth');
const axios = require('axios');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

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
      user = await User.findOne({ email: login.toLowerCase(), password: md5pass }).exec();
    } else {
      user = await User.findOne({ login: login, password: md5pass }).exec();
    }
    if (!user) {
      res.status(401).end('User unauthorized');
    }
    const jwtPayload = {      
      user_id: user._id,
      login: user.lonig,
      email: user.email,
    };
    const authToken = jwt.sign(jwtPayload, config.SECRET_KEY);    
    res.json({ _id: user._id, login: user.login, authToken });
  } catch (err) {
    next(err)
  }
})

app.post('/load-photos', authenticate, async (req, res, next) => {  
  try {
    const user = res.locals.user;
    const resp = await axios.get('http://jsonplaceholder.typicode.com/photos');
    let album;
    let result = {
      duplicated: 0,
      inserted: 0
    };
    for (let item of resp.data) {
      album = await Album.findOne({title: item.albumId, owner: user._id}).exec();
      if (!album) {
        album = new Album({ title: item.albumId, owner: user._id });
        await album.save();
      }
      const photo = new Photo({ 
        albumId: album._id, 
        title: item.title, 
        url: item.url, 
        thumbnailUrl: item.thumbnailUrl, 
        owner: user._id 
      });
      try {
        await photo.save();
        result.inserted++;
      } catch (err) {
        if (err.code === 11000) {
          result.duplicated++;
        } else {
          throw err;
        }
      }
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.get('/get-photos', async (req, res, next) => {
  try {
    // todo types
    const q = {
      ownerid: req.query.ownerid,
      page: parseInt(req.query.page),
      maxcount: parseInt(req.query.maxcount),
    };
    if (typeof q.ownerid !== 'string' || !validator.isMongoId(q.ownerid)) {
      q.ownerid = null;
    }
    if (!q.page || !q.maxcount) {
      return res.status(400).json({ error: "'page' and 'maxcount' must be present" });
    }
    if (typeof q.page !== 'number' || typeof q.maxcount !== 'number') {
      return res.status(400).json({ error: "'page' and 'maxcount' should be a number" });
    }
    if (q.page < 1) {
      return res.status(400).json({ error: "'page' must be >= 1" });
    }
    if (q.maxcount < 1 || q.maxcount > 100) {
      return res.status(400).json({ error: "'maxcount' must be in 1-100" });
    }
    let photos;
    let skip = (q.page - 1) * q.maxcount;
    if (q.ownerid) {      
      photos = await Photo.find({ owner: new ObjectId(q.ownerid) }).skip(skip).limit(q.maxcount).exec();
    } else {
      photos = await Photo.find({}).skip(skip).limit(q.maxcount).exec();
    }
    res.json({q, photos});
  } catch (err) {
    return next(err);
  }
});

app.delete('/delete-photo', authenticate, async (req, res, next) => {
  try {
    const user = res.locals.user;
    let photoid = req.query.photoid;
    if (typeof photoid !== 'string') {
      res.status(400).json({ error: 'photoid must be a string'});
    }
    let photoIds = photoid.split(',');
    let photoObjectIds;
    try {
      photoObjectIds = photoIds.map(id => new ObjectId(id));
    } catch (err) {
      if (err.name === 'BSONTypeError') {
        return res.status(400).json({error: "invalid photoid"})
      } else {
        throw err
      };
    }
    // check if id list contains photos owned by another user
    const forbiddenPhoto = await Photo.findOne({ _id: { $in: photoObjectIds }, owner: {$ne: user._id} });
    if (forbiddenPhoto) {
      return res.status(403).json({error: "id list contains a non-user photo"})
    }
    const result = await Photo.deleteMany({_id: {$in: photoObjectIds}});
    res.json(result);
  } catch (err) {
    next(err)
  }
});

// error handler
app.use((err, req, res, next) => {
  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({ error: err });
  }
  console.error('Unhandled ERROR!', err);
  res.status(500).json({error: 'server error'});
});

module.exports = app