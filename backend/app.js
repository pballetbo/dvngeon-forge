const express = require("express");
const cors = require("cors");
const app = express();
const authRoutes = require("./routes/authRoutes");
const perfilRoutes = require("./routes/perfilRoutes");

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/perfil", perfilRoutes);

app.get("/", function (req, res) {
  res.send("Backend de Dvngeon Forge funcionando!");
});

const PORT = 3000;
app.listen(PORT, function () {
  console.log("Servidor corriendo en http://localhost:" + PORT);
});
