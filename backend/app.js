const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();

app.use(cors());
app.use(bodyParser.json());

const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

app.get("/", function (req, res) {
  res.send("Backend de Dvngeon Forge funcionando!");
});

const PORT = 3000;
app.listen(PORT, function () {
  console.log("Servidor corriendo en http://localhost:" + PORT);
});
