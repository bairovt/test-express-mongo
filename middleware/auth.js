const jwt = require('jsonwebtoken');
const config = require('config.js');
const { User } = require('models.js');
const { json } = require('express/lib/response');

module.exports = async function (req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Empty auth header' });
  
    const authToken = authHeader.split(' ').pop();
    const payload = jwt.verify(authToken, config.SECRET_KEY);
  
    const user = await User.findById(payload.user_id).exec();    
  
    if (!user) {
      return res.status(401).json({error: 'User not found'});
    }
  
    res.locals.user = user;
  
    return next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({error: `${err.name}: ${err.message}`})
    }
    next(err);
  }
};
