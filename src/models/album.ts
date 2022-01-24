import {Schema, model, Types} from 'mongoose';

export interface Album {
  title: string;
  owner: Types.ObjectId;
}

const AlbumSchema = new Schema<Album>({
  title: {
    type: String,
    required: true,
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
});

const AlbumModel = model<Album>('Album', AlbumSchema);

export default AlbumModel;