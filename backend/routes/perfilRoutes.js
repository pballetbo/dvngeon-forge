const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const perfilController = require("../controllers/perfilController");

router.post("/", auth.verificarToken, perfilController.completarPerfil);
router.get("/me", auth.verificarToken, perfilController.obtenirPerfilPropi);
router.get(
  "/:usuari_id",
  auth.verificarToken,
  perfilController.obtenirPerfilAlie
);
router.put("/", auth.verificarToken, perfilController.actualitzarPerfil);
router.delete("/", auth.verificarToken, perfilController.eliminarUsuari);

module.exports = router;
