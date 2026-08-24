const jwt = require("jsonwebtoken");

// Authentication middleware module
// Provides helpers to protect routes and enforce role-based access.

/**
 * `protect` middleware
 * - Validates a JWT Bearer token from the `Authorization` header.
 * - Attaches decoded token payload to `req.user` and calls `next()`.
 * - Returns 401 if no token or the token is invalid.
 */
const protect = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer "))
    return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    req.user = decoded; // Attach decoded JWT payload to request object
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

/**
 * `requireRole(...roles)` middleware factory
 * - Returns middleware that checks `req.user.role` is one of allowed roles.
 * - If the user's role is not allowed, responds with 403 Forbidden.
 * - Useful for restricting endpoints to roles like `admin`, `user`, or `shop`.
 */
const requireRole = (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role))
      return res.status(403).json({ message: "Forbidden" });
    next();
  };

module.exports = { protect, requireRole };
