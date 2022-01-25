import jwt from 'jsonwebtoken';
import config from 'config';
import {User, UserModel} from 'models/user';
import {JwtPayload} from 'interfaces'
import { Request, Response, NextFunction } from 'express';


export default async function (req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Empty auth header' });

    const authToken: string = authHeader.split(' ').pop() || '';
    
    const payload = jwt.verify(authToken, config.SECRET_KEY) as JwtPayload;

    const user: User | null = await UserModel.findById(payload.user_id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.locals.user = user;

    return next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: `${err.name}: ${err.message}` });
    }
    next(err);
  }
};
