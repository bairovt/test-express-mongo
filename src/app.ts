import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { User, UserModel } from 'models/user';
import { Photo, PhotoModel } from 'models/photo';
import { Album, AlbumModel } from 'models/album';
import validator from 'validator';
import jwt from 'jsonwebtoken';
import config from 'config';
import authenticate from './middleware/auth';
import axios from 'axios';
import mongoose from 'mongoose';
import { JwtPayload } from 'interfaces';

const ObjectId = mongoose.Types.ObjectId;

const app = express();

app.use(express.json());

app.post('/register', async (req, res, next) => {
  try {
    let user: User = new UserModel({
      login: req.body.login,
      email: req.body.email,
      password: req.body.password,
    });
    await UserModel.validate(user);
    const existing: User | null = await UserModel.findOne({
      $or: [{ login: user.login }, { email: user.email }],
    });
    if (existing) {
      return res.status(409).json({ error: { message: 'The same login or email already registered' } });      
    }
    await user.save();
    res.json({ _id: user._id });
  } catch (err) {
    next(err);
  }
});

app.post('/login', async (req, res, next) => {
  try {
    const login: string = req.body.login;
    const password: string = req.body.password;
    let user: User | null;
    const md5password: string = crypto.createHash('md5').update(password).digest('hex');
    if (validator.isEmail(login)) {
      user = await UserModel.findOne({ email: login.toLowerCase(), password: md5password });
    } else {
      user = await UserModel.findOne({ login: login, password: md5password });
    }
    if (!user) {
      return res.status(401).end('User unauthorized');
    }
    const jwtPayload: JwtPayload = {
      user_id: user._id,
      login: user.login,
      email: user.email,
    };
    const authToken = jwt.sign(jwtPayload, config.SECRET_KEY);
    res.json({ _id: user._id, login: user.login, authToken });
  } catch (err) {
    next(err);
  }
});

app.post('/load-photos', authenticate, async (req, res, next) => {
  try {
    const user = res.locals.user;
    const resp = await axios.get('http://jsonplaceholder.typicode.com/photos');
    let album: Album | null;
    let result = {
      duplicated: 0,
      inserted: 0,
    };
    for (let item of resp.data) {
      album = await AlbumModel.findOne({ title: item.albumId, owner: user._id });
      if (!album) {
        album = new AlbumModel({ title: item.albumId, owner: user._id });
        await album.save();
      }
      const photo: Photo = new PhotoModel({
        albumId: album._id,
        title: item.title,
        url: item.url,
        thumbnailUrl: item.thumbnailUrl,
        owner: user._id,
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
    let ownerid = req.query.ownerid;
    if (typeof ownerid !== 'string' || !validator.isMongoId(ownerid)) {
      ownerid = undefined;
    }
    const query: {
      ownerid: string | undefined;
      page: number;
      maxcount: number;
    } = {
      ownerid,
      page: typeof req.query.page === 'string' ? parseInt(req.query.page) : NaN,
      maxcount: typeof req.query.maxcount === 'string' ? parseInt(req.query.maxcount) : NaN,
    };
    if (!query.page || !query.maxcount) {
      return res.status(400).json({ error: "'page' and 'maxcount' must be set as a number > 0" });
    }    
    if (query.page < 1) {
      return res.status(400).json({ error: "'page' must be >= 1" });
    }
    if (query.maxcount < 1 || query.maxcount > 100) {
      return res.status(400).json({ error: "'maxcount' must be in 1-100" });
    }
    let photos;
    let skip: number = (query.page - 1) * query.maxcount;
    if (query.ownerid) {
      photos = await PhotoModel.find({ owner: new ObjectId(query.ownerid) })
        .skip(skip)
        .limit(query.maxcount);
    } else {
      photos = await PhotoModel.find({}).skip(skip).limit(query.maxcount);
    }
    res.json({ query, photos });
  } catch (err) {
    return next(err);
  }
});

app.delete('/delete-photo', authenticate, async (req, res, next) => {
  try {
    const user = res.locals.user;
    let photoid = req.query.photoid;
    if (typeof photoid !== 'string') {
      return res.status(400).json({ error: 'photoid must be a string' });
    }
    let photoIds = photoid.split(',');
    let photoObjectIds;
    try {
      photoObjectIds = photoIds.map((id: any) => new ObjectId(id));
    } catch (err) {
      if (err.name === 'BSONTypeError') {
        return res.status(400).json({ error: 'photoid must be ObjectId or list of ObjectId' });
      } else {
        throw err;
      }
    }
    // check if id list contains photos owned by another user
    const forbiddenPhoto = await PhotoModel.findOne({
      _id: { $in: photoObjectIds },
      owner: { $ne: user._id },
    });
    if (forbiddenPhoto) {
      return res.status(403).json({ error: 'id list contains a non-user photo' });
    }
    const result = await PhotoModel.deleteMany({ _id: { $in: photoObjectIds } });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.delete('/delete-album', authenticate, async (req, res, next) => {
  try {
    const user = res.locals.user;
    let albumid = req.query.albumid;
    if (typeof albumid !== 'string') {
      return res.status(400).json({ error: 'albumid must be a string' });
    }
    let albumIds = albumid.split(',');
    let albumObjectIds;
    try {
      albumObjectIds = albumIds.map((id: any) => new ObjectId(id));
    } catch (err) {
      if (err.name === 'BSONTypeError') {
        return res.status(400).json({ error: 'albumid must be ObjectId or list of ObjectId' });
      } else {
        throw err;
      }
    }
    // check if id list contains albums owned by another user
    const forbiddenAlbum = await AlbumModel.findOne({
      _id: { $in: albumObjectIds },
      owner: { $ne: user._id },
    });
    if (forbiddenAlbum) {
      return res.status(403).json({ error: 'id list contains a non-user album' });
    }
    const deletePhotoResult = await PhotoModel.deleteMany({ albumId: { $in: albumObjectIds } });
    const deleteAlbumResult = await AlbumModel.deleteMany({ _id: { $in: albumObjectIds } });
    res.json({ result: { deletePhotoResult, deleteAlbumResult } });
  } catch (err) {
    next(err);
  }
});

app.post('/change-album-title', authenticate, async (req, res, next) => {
  try {
    const user = res.locals.user;

    let albumid = req.query.albumid;    
    if (typeof albumid !== 'string' || !validator.isMongoId(albumid)) {
      return res.status(400).json({ error: 'albumid must be ObjectId' });
    }

    let new_album_name = req.body.new_album_name;

    // check if album is owned by another user
    const forbiddenAlbum = await AlbumModel.findOne({
      _id: new ObjectId(albumid),
      owner: { $ne: user._id },
    });
    if (forbiddenAlbum) {
      return res.status(403).json({ error: 'non-user album' });
    }

    const result = await AlbumModel.updateOne(
      { _id: new ObjectId(albumid) },
      { title: new_album_name }
    );
    res.json({ result });
  } catch (err) {
    next(err);
  }
});

// for test
app.delete('/delete-user', async (req, res, next) => {
  let userid = req.query.userid;
  if (typeof userid !== 'string' || !validator.isMongoId(userid)) {
    return res.status(400).json({ error: 'wrong userid' });
  }
  const deletePhotoResult = await PhotoModel.deleteMany({ owner: new ObjectId(userid) });
  const deleteAlbumResult = await AlbumModel.deleteMany({ owner: new ObjectId(userid) });
  const deleteUserResult = await UserModel.findByIdAndDelete(new ObjectId(userid));
  res.json({ result: { deletePhotoResult, deleteAlbumResult, deleteUserResult } });
})

// error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({ error: err });
  }
  console.error('Unhandled ERROR!', err);
  res.status(500).json({ error: 'server error' });
});

export default app;
