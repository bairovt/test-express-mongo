#!/usr/bin/env node

import app from 'app'
import http from 'http';
import mongoose from 'mongoose';
import config from 'config';

const server = http.createServer(app);
server.on('error', (error: Error) => {
  throw error;
});
server.on('listening', () => {
  const addr = server.address();
  // console.info(`Listening on http://localhost:${addr.port}`);
  console.info(`Listening on http://localhost:${config.PORT}`);
});

if (process.env.NODE_ENV === 'development') {
  // mongoose.set('debug', true);
}

mongoose.connect('mongodb://localhost:27017/test1').then(() => {
  server.listen(config.PORT);
});

