import {Schema, model, Types, Document} from 'mongoose';
export interface Album extends Document{
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

export const AlbumModel = model<Album>('Album', AlbumSchema);