import { Types } from 'mongoose';
export interface JwtPayload {
  // user_id: string;
  user_id: Types.ObjectId;
  login: string;
  email: string;
}
