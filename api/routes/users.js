const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const Users = require("../models/users");
require("../connection/mongoose");
const { isAuthenticated } = require("../auth/index");

const signToken = (_id) => {
  return jwt.sign({ _id }, "mi-secreto", {
    expiresIn: 60 * 60 * 24 * 365,
  });
};

router.post("/user/register", (req, res) => {
  const { nombre, email, password } = req.query;
  crypto.randomBytes(16, (err, salt) => {
    const newSalt = salt.toString("base64"); //convierte el salt en un string largo

    //encriptamos la contraseña
    crypto.pbkdf2(password, newSalt, 10000, 64, "sha1", (err, key) => {
      const encryptedPassword = key.toString("base64");
      Users.findOne({ email })
        .exec()
        .then((user) => {
          if (user) {
            return res.send("Usuario ya registrado");
          }
          Users.create({
            nombre,
            email,
            password: encryptedPassword,
            salt: newSalt,
          }).then(() => {
            res.send("Usuario creado");
          });
        });
    });
  });
});

router.post("/user/login", (req, res) => {
  const { email, password } = req.query;
  Users.findOne({ email })
    .exec()
    .then((user) => {
      if (!user) {
        return res.send("Usuario y/o contraseña incorrecta");
      }
      crypto.pbkdf2(password, user.salt, 10000, 64, "sha1", (err, key) => {
        const encryptedPassword = key.toString("base64");
        if (user.password === encryptedPassword) {
          const token = signToken(user._id);
          return res.send({ token });
        }
        return res.send("Usuario y/o contraseña incorrecta");
      });
    });
});

router.get("/me", isAuthenticated, (req, res) => {
  res.send(req.user);
});

router.get("/user:email", isAuthenticated, (req, res) => {
  Users.find({ email: req.params.email })
    .exec()
    .then((x) => res.status(200).send(x));
});

router.delete("/user:id", isAuthenticated, (req, res) => {
  console.log(req.params.id);
  Users.findOneAndDelete({ _id: req.params.id })
    .exec()
    .then(() => res.sendStatus(204));
});

router.put("/user", (req, res) => {
  const { id, password } = req.query;
  Users.findOne({ _id: id })
    .exec()
    .then((user) => {
      if (!user) {
        return res.send("Usuario y/o contraseña incorrecta");
      }
      crypto.pbkdf2(password, user.salt, 10000, 64, "sha1", (err, key) => {
        const encryptedPassword = key.toString("base64");
        if (user.password === encryptedPassword) {
          Users.findOneAndUpdate({ _id: id }, req.body).then(() =>
            res.sendStatus(204)
          );
        } else {
          res.send(JSON.stringify("Contraseña incorrecta"));
        }
      });
    });
});

module.exports = router;
