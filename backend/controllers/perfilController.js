const e = require("express");
const pool = require("../config/db");
const regexContrasenya = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

//Añadir Delete?

function isValidAvatar(avatar) {
  const urlRegex = /^https?:\/\/[\w.-]+\.(jpg|jpeg|png|gif|webp|svg)$/i;
  return typeof avatar === "string" && urlRegex.test(avatar);
}
exports.crearPerfil = async function (req, res) {
  const {
    experiencia_id,
    avatar,
    descripcio,
    ciutat,
    estils,
    jocs,
    modalitats,
  } = req.body;
  const usuariId = req.usuariId;

  if (!experiencia_id) {
    return res.status(400).json({ message: "Has d'informar l'experiència" });
  }
  if (!ciutat) {
    return res.status(400).json({ message: "Has d'informar la ciutat" });
  }
  if (!estils) {
    return res.status(400).json({ message: "Has d'informar els estils" });
  }
  if (!Array.isArray(estils) || estils.length === 0) {
    return res.status(400).json({ message: "Estils no vàlids" });
  }
  if (!jocs) {
    return res.status(400).json({ message: "Has d'informar els jocs" });
  }
  if (!Array.isArray(jocs) || jocs.length === 0) {
    return res.status(400).json({ message: "Jocs no vàlids" });
  }
  if (!modalitats) {
    return res.status(400).json({ message: "Has d'informar les modalitats" });
  }

  if (!Array.isArray(modalitats) || modalitats.length === 0) {
    return res.status(400).json({ message: "Modalitats no vàlides" });
  }

  if (!descripcio) {
    return res.status(400).json({ message: "Has d'informar la descripció" });
  }
  if (descripcio.length > 255) {
    return res
      .status(400)
      .json({ message: "La descripció no pot tenir més de 255 caràcters" });
  }
  if (avatar && !isValidAvatar(avatar)) {
    return res.status(400).json({ message: "Format d'avatar no vàlid" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [perfilResultat] = await connection.query(
      "INSERT INTO perfil (usuari_id, experiencia_id, avatar, descripcio, ciutat) VALUES (?, ?, ?, ?, ?)",
      [usuariId, experiencia_id, avatar || null, descripcio, ciutat]
    );

    const perfilId = perfilResultat.insertId;

    const insertRelations = async (table, field, values) => {
      if (values.length > 0) {
        await connection.query(
          `INSERT INTO ${table} (perfil_id, ${field}) VALUES ?`,
          [values.map((v) => [perfilId, v])]
        );
      }
    };

    await insertRelations("perfil_estil", "estil_id", estils);
    await insertRelations("perfil_joc", "joc_id", jocs);
    await insertRelations("perfil_modalitat", "modalitat_id", modalitats);

    await connection.commit();
    res.status(201).json({ success: true, perfilId });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error al crear el perfil:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(400)
        .json({ message: "Aquest usuari ja té un perfil creat" });
    }

    res.status(500).json({ message: "Error al crear el perfil" });
  } finally {
    if (connection) connection.release();
  }
};

async function obtenirPerfil(usuari_id) {
  const [perfil] = await pool.query(
    `SELECT p.*, e.nivell as experiencia, u.username, u.rol 
     FROM perfil p
     JOIN experiencia e ON p.experiencia_id = e.id
     JOIN usuaris u ON p.usuari_id = u.id
     WHERE p.usuari_id = ?`,
    [usuari_id]
  );

  if (!perfil.length) return null;

  const perfilDades = perfil[0];

  const [estils] = await pool.query(
    "SELECT e.id, e.nom FROM perfil_estil pe JOIN estiljoc e ON pe.estil_id = e.id WHERE pe.perfil_id = ?",
    [perfilDades.id]
  );
  const [jocs] = await pool.query(
    "SELECT j.id, j.nom FROM perfil_joc pj JOIN joc j ON pj.joc_id = j.id WHERE pj.perfil_id = ?",
    [perfilDades.id]
  );
  const [modalitats] = await pool.query(
    "SELECT m.id, m.nom FROM perfil_modalitat pm JOIN modalitat m ON pm.modalitat_id = m.id WHERE pm.perfil_id = ?",
    [perfilDades.id]
  );

  return {
    id: perfilDades.id,
    usuari_id: perfilDades.usuari_id,
    username: perfilDades.username,
    rol: perfilDades.rol,
    experiencia_id: perfilDades.experiencia_id,
    experiencia: perfilDades.experiencia,
    avatar: perfilDades.avatar,
    descripcio: perfilDades.descripcio,
    ciutat: perfilDades.ciutat,
    estils,
    jocs,
    modalitats,
  };
}

exports.obtenirPerfilPropi = async function (req, res) {
  try {
    const perfil = await obtenirPerfil(req.usuariId);
    if (!perfil) return res.status(404).json({ message: "Perfil no trobat" });
    res.json(perfil);
  } catch (error) {
    console.error("Error al obtenir el perfil:", error);
    res.status(500).json({ message: "Error al obtenir el perfil" });
  }
};

exports.obtenirPerfilAlie = async function (req, res) {
  try {
    const perfil = await obtenirPerfil(req.params.usuari_id);
    if (!perfil) return res.status(404).json({ message: "Perfil no trobat" });
    res.json(perfil);
  } catch (error) {
    console.error("Error al obtenir el perfil:", error);
    res.status(500).json({ message: "Error al obtenir el perfil" });
  }
};
exports.actualitzarPerfil = async function (req, res) {
  const usuari_id = req.usuariId;
  const {
    username,
    password,
    experiencia_id,
    avatar,
    descripcio,
    ciutat,
    estils,
    jocs,
    modalitats,
  } = req.body;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [perfil] = await connection.query(
      "SELECT id FROM perfil WHERE usuari_id = ?",
      [usuari_id]
    );

    if (!perfil.length) {
      await connection.rollback();
      return res
        .status(404)
        .json({ message: "No s'ha trobat el perfil. Cal crear-lo primer." });
    }

    const perfil_id = perfil[0].id;

    if (username || password) {
      let updateUserQuery = "UPDATE usuaris SET ";
      const userUpdates = [];
      const userParams = [];

      if (username) {
        userUpdates.push("username = ?");
        userParams.push(username);
      }

      if (password) {
        if (!regexContrasenya.test(password)) {
          await connection.rollback();
          return res.status(400).json({
            message:
              "La contrasenya ha de tenir almenys 8 caràcters, lletres i un número",
          });
        }
        const contrassenyaSegura = await bcrypt.hash(password, 10);
        userUpdates.push("password = ?");
        userParams.push(contrassenyaSegura);
      }

      userParams.push(usuari_id);
      await connection.query(
        updateUserQuery + userUpdates.join(", ") + " WHERE id = ?",
        userParams
      );
    }

    const profileUpdates = [];
    const profileParams = [];

    if (experiencia_id !== undefined) {
      profileUpdates.push("experiencia_id = ?");
      profileParams.push(experiencia_id);
    }

    if (avatar !== undefined) {
      if (avatar && !isValidAvatar(avatar)) {
        await connection.rollback();
        return res.status(400).json({ message: "Format d'avatar no vàlid" });
      }
      profileUpdates.push("avatar = ?");
      profileParams.push(avatar || null);
    }

    if (descripcio !== undefined) {
      if (descripcio && descripcio.length > 255) {
        await connection.rollback();
        return res
          .status(400)
          .json({ message: "La descripció no pot tenir més de 255 caràcters" });
      }
      profileUpdates.push("descripcio = ?");
      profileParams.push(descripcio);
    }

    if (ciutat !== undefined) {
      profileUpdates.push("ciutat = ?");
      profileParams.push(ciutat);
    }

    if (profileUpdates.length > 0) {
      profileParams.push(usuari_id);
      await connection.query(
        "UPDATE perfil SET " +
          profileUpdates.join(", ") +
          " WHERE usuari_id = ?",
        profileParams
      );
    }

    const updateRelations = async (table, field, values) => {
      await connection.query(`DELETE FROM ${table} WHERE perfil_id = ?`, [
        perfil_id,
      ]);
      if (values && values.length > 0) {
        await connection.query(
          `INSERT INTO ${table} (perfil_id, ${field}) VALUES ?`,
          [values.map((v) => [perfil_id, v])]
        );
      }
    };

    await updateRelations("perfil_estil", "estil_id", estils);
    await updateRelations("perfil_joc", "joc_id", jocs);
    await updateRelations("perfil_modalitat", "modalitat_id", modalitats);

    let token;
    if (username) {
      const [user] = await connection.query(
        "SELECT rol FROM usuaris WHERE id = ?",
        [usuari_id]
      );
      token = jwt.sign(
        { id: usuari_id, rol: user[0].rol, username },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRATION }
      );
    }

    await connection.commit();
    res.json({ success: true, ...(token && { token }) });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(error);

    if (
      error.code === "ER_DUP_ENTRY" &&
      error.sqlMessage.includes("username")
    ) {
      return res
        .status(400)
        .json({ message: "Aquest nom d'usuari ja està en ús" });
    }

    res.status(500).json({ message: "Error al actualitzar el perfil" });
  } finally {
    if (connection) connection.release();
  }
};
