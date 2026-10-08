/**
 * Role-Based Access Control Middleware
 * Restricts access to endpoints based on user roles (e.g., 'MOH').
 */

/**
 * Returns a middleware function that ensures req.user has one of the allowed roles.
 *
 * @param {...string} allowedRoles - e.g. 'MOH', 'ADMIN'
 * @returns {import("express").RequestHandler}
 */
function requireRole(...allowedRoles) {
  // Normalize allowed roles to uppercase for case-insensitive comparison
  const normalizedAllowed = allowedRoles.map((r) => String(r).toUpperCase());

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        error: "Unauthenticated",
        message: "Authentication required to access this resource.",
      });
    }

    const userRole = String(req.user.role).toUpperCase();

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        error: "Forbidden",
        message: `Access denied. Requires role: ${allowedRoles.join(" or ")}. Current role: ${req.user.role}`,
      });
    }

    next();
  };
}

module.exports = requireRole;
