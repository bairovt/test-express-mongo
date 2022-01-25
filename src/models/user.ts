import { Schema, model, Document} from 'mongoose';
import validator from 'validator';

export interface User extends Document {
  login: string;
  email: string;
  password: string;
  registerDate: Date;
}

const UserSchema = new Schema<User>({
  login: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: validator.isEmail,
      message: (props: any) => `${props.value} is not valid email`,
    },
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  registerDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

export const UserModel = model<User>('User', UserSchema);
