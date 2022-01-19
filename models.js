const mongoose = require('mongoose');
const validator = require('validator');

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;


const UserSchema = new Schema({
  login: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: [validator.isEmail, 'invalid email'],
  },
  password: {
    type: String,
    required: true,
  },
  registerDate: {
    type: Date,
    required: true,
    default: Date.now
  },
});
const User = mongoose.model('User', UserSchema);


const PhotoSchema = new Schema({
  albumId: { type: ObjectId, required: true },
  title: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  thumbnailUrl: {
    type: String,
    required: true,
  },
  owner: { type: ObjectId, required: true },
});
const Photo = mongoose.model('Photo', PhotoSchema);


const AlbumSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  owner: { type: ObjectId, required: true },
});
const Album = mongoose.model('Album', AlbumSchema);


module.exports = {User, Photo, Album}