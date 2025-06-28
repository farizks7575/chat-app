const jwt = require('jsonwebtoken');

const jwtMiddleware = (req, res, next) => {
  console.log('Inside JWT middleware');

  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ message: 'No authorization header provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const jwtResponse = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { _id: jwtResponse.userId };
    next();
  } catch (err) {
    console.error('JWT verification error:', err.message);
    res.status(403).json({ message: 'Invalid or expired token. Please login again.' });
  }
};

module.exports = jwtMiddleware;