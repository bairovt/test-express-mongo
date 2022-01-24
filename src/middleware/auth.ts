import jwt from 'jsonwebtoken';
import config from 'config';
import {User} from 'models';
import {JwtPayload} from 'interfaces'


export default async function (req: any, res: any, next: any) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Empty auth header' });

    const authToken = authHeader.split(' ').pop();
    
    const payload = jwt.verify(authToken, config.SECRET_KEY) as JwtPayload;

    const user = await User.findById(payload.user_id);

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
