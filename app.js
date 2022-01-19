const express = require('express')
const http = require('http')

const router = express.Router();

const app = express();

app.use(express.json());

router.get('/', (req, res, next) => {
  res.send('Hello')
})

app.use('/', router);

const PORT = process.env.PORT || 3000;
app.set('port', PORT)

const server = http.createServer(app)

server.listen(PORT)
server.on('error', error => {
  throw error;
})
server.on('listening', () => {
  const addr = server.address();
  console.log(`Listening on http://localhost:${addr.port}`);
})