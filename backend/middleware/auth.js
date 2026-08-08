const jwt = require("jsonwebtoken");

// Protects routes by validating JWT Bearer tokens in Authorization headers
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

// Role-based access control middleware (e.g. admin, shop, user)
const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role))
      return res.status(403).json({ message: "Forbidden" });
    next();
  };

module.exports = { protect, requireRole };
