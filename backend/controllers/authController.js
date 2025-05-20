const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");

exports.register = async function (req, res) {
  const { username, email, password, rol } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Has d'informar l'email!" });
  }
  if (!password) {
    return res.status(400).json({ message: "Has d'informar la contrasenya!" });
  }
  if (!username) {
    return res.status(400).json({ message: "Has d'informar el nom d'usuari!" });
  }
  if (!rol) {
    return res.status(400).json({ message: "Has d'informar el rol!" });
  }

  if (rol !== "jugador" && rol !== "gamemaster") {
    return res
      .status(400)
      .json({ message: "El rol ha de ser 'jugador' o 'gamemaster'" });
  }
  try {
    const passwordSegura = await bcrypt.hash(password, 10);
    const [resultat] = await pool.query(
      "INSERT INTO usuaris (username, email, password, rol) VALUES (?, ?, ?, ?)",
      [username, email, passwordSegura, rol]
    );

    res.status(201).json({
      id: resultat.insertId,
      missatge: "Usuari registrat correctament!",
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      if (error.sqlMessage.includes("email")) {
        res.status(400).json({ error: "L'email ja existeix!" });
      } else if (error.sqlMessage.includes("username")) {
        res.status(400).json({ error: "El nom d'usuari ja existeix!" });
      }
    } else {
      res.status(500).json({ error: "Error al registrar l'usuari!" });
    }
  }
};

exports.login = async function (req, res) {
  const { username, password } = req.body;
  if (!username) {
    return res.status(400).json({ message: "Has d'informar el nom d'usuari" });
  }
  if (!password) {
    return res.status(400).json({ message: "Has d'informar la contrasenya" });
  }

  try {
    const [resultats] = await pool.query(
      "SELECT * FROM usuaris WHERE username = ?",
      [username]
    );

    if (!resultats.length) {
      return res.status(401).json({ message: "Aquest usuari no existeix" });
    }

    const usuari = resultats[0];

    const contrasenyaValida =
      usuari && (await bcrypt.compare(password, usuari.password));
    if (!contrasenyaValida) {
      return res.status(401).json({ message: "Contrasenya incorrecta!" });
    }

    const token = jwt.sign(
      { id: usuari.id, rol: usuari.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    res.json({
      token: token,
      usuari: {
        id: usuari.id,
        username: usuari.username,
        rol: usuari.rol,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "Error a l'iniciar sessió",
    });
  }
};
