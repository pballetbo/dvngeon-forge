const express = require("express");
const pool = require("../config/db");
const regexContrasenya = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validTables = {
  estils: "perfil_estil",
  jocs: "perfil_joc",
  modalitats: "perfil_modalitat",
};

exports.completarPerfil = async function (req, res) {
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

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [perfilExistente] = await connection.query(
      "SELECT id FROM perfil WHERE usuari_id = ?",
      [usuariId]
    );

    if (!perfilExistente.length) {
      await connection.rollback();
      return res.status(404).json({ message: "No s'ha trobat el perfil" });
    }

    const perfilId = perfilExistente[0].id;

    await connection.query(
      `UPDATE perfil SET 
        experiencia_id = ?,
        avatar = ?,
        descripcio = ?,
        ciutat = ?
       WHERE id = ?`,
      [experiencia_id, avatar || null, descripcio, ciutat, perfilId]
    );

    await connection.query("DELETE FROM perfil_estil WHERE perfil_id = ?", [
      perfilId,
    ]);
    await connection.query("DELETE FROM perfil_joc WHERE perfil_id = ?", [
      perfilId,
    ]);
    await connection.query("DELETE FROM perfil_modalitat WHERE perfil_id = ?", [
      perfilId,
    ]);

    async function insertRelations(table, field, values) {
      if (values.length > 0) {
        let queryValues = [];

        for (let i = 0; i < values.length; i++) {
          queryValues.push([perfilId, values[i]]);
        }

        await connection.query(
          "INSERT INTO " +
            validTables[table] +
            " (perfil_id, " +
            field +
            ") VALUES ?",
          [queryValues]
        );
      }
    }

    await insertRelations("estils", "estil_id", estils);
    await insertRelations("jocs", "joc_id", jocs);
    await insertRelations("modalitats", "modalitat_id", modalitats);

    await connection.commit();
    res.status(200).json({ success: true, perfilId });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error al actualitzar el perfil:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Error de duplicació de dades" });
    }

    res.status(500).json({ message: "Error al actualitzar el perfil" });
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
      return res.status(404).json({ message: "No s'ha trobat el perfil." });
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

    async function updateRelations(table, field, values, perfil_id) {
      await connection.query(
        "DELETE FROM " + validTables[table] + " WHERE perfil_id = ?",
        [perfil_id]
      );

      if (values && values.length > 0) {
        var queryValues = [];

        for (var i = 0; i < values.length; i++) {
          queryValues.push([perfil_id, values[i]]);
        }

        await connection.query(
          "INSERT INTO " +
            validTables[table] +
            " (perfil_id, " +
            field +
            ") VALUES ?",
          [queryValues]
        );
      }
    }

    await updateRelations("estils", "estil_id", estils, perfil_id);
    await updateRelations("jocs", "joc_id", jocs, perfil_id);
    await updateRelations("modalitats", "modalitat_id", modalitats, perfil_id);

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
    if (token) {
      res.json({ success: true, token: token });
    } else {
      res.json({ success: true });
    }
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

exports.eliminarUsuari = async function (req, res) {
  const usuariId = req.usuariId;
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [perfil] = await connection.query(
      "SELECT id FROM perfil WHERE usuari_id = ?",
      [usuariId]
    );

    if (!perfil.length) {
      await connection.rollback();
      return res.status(404).json({ message: "No s'ha trobat el perfil." });
    }

    const perfilId = perfil[0].id;

    await connection.query("DELETE FROM perfil_estil WHERE perfil_id = ?", [
      perfilId,
    ]);
    await connection.query("DELETE FROM perfil_joc WHERE perfil_id = ?", [
      perfilId,
    ]);
    await connection.query("DELETE FROM perfil_modalitat WHERE perfil_id = ?", [
      perfilId,
    ]);

    await connection.query(
      "DELETE FROM missatge WHERE remitent_id = ? OR destinatari_id = ?",
      [usuariId, usuariId]
    );
    await connection.query("DELETE FROM solicitut WHERE jugador_id = ?", [
      usuariId,
    ]);

    await connection.query("DELETE FROM perfil WHERE id = ?", [perfilId]);

    await connection.query("DELETE FROM usuaris WHERE id = ?", [usuariId]);

    await connection.commit();
    res.status(200).json({ message: "Usuari eliminat correctament" });
  } catch (error) {
    console.error("Error al eliminar l'usuari:", error);

    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(400).json({
        message: "No es pot eliminar l'usuari, referències existents",
      });
    }
    res.status(500).json({ message: "Error al eliminar l'usuari" });
  } finally {
    if (connection) connection.release();
  }
};
