import { Schema, model, Types, Document } from 'mongoose';
import validator from 'validator';

export interface Photo extends Document {
  albumId: Types.ObjectId;
  title: string;
  url: string;
  thumbnailUrl: string;
  owner: Types.ObjectId;
}

const PhotoSchema = new Schema<Photo>({
  albumId: { type: Schema.Types.ObjectId, ref: 'Album', required: true },
  title: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
    validate: [validator.isURL, 'invalid url'],
  },
  thumbnailUrl: {
    type: String,
    required: true,
    validate: [validator.isURL, 'invalid url'],
  },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
});

PhotoSchema.index({ albumId: 1, title: 1 }, { unique: true });

export const PhotoModel = model<Photo>('Photo', PhotoSchema);

