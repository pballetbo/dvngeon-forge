const jwt = require("jsonwebtoken");

exports.verificarToken = function (req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(403).json({ message: "Token no proporcionat" });
  }

  jwt.verify(token, process.env.JWT_SECRET, function (err, dades) {
    if (err) {
      return res.status(401).json({ message: "Token no vàlid o expirat" });
    }

    req.usuariId = dades.id;
    req.usuariRol = dades.rol;
    next();
  });
};
