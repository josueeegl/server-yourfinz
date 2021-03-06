const fs = require("fs-extra");
const { uploadFiles, deletFiles } = require("../connection/cloudinary");
const Transacciones = require("../models/transacciones");
const { formatear, formatearYear } = require("./formatearFecha");
const { gxIngresos, gxGastos } = require("../functions/graficos");
require("../connection/mongoose");

module.exports = {
  postTransaccion: async (req, res) => {
    const { _id } = req.user;
    req.body.usuario_id = _id;
    if (req.files?.imagen) {
      const result = await uploadFiles(req.files.imagen.tempFilePath);
      req.body.imagen = {
        public_id: result.public_id,
        secure_url: result.secure_url,
      };
      await fs.unlink(req.files.imagen.tempFilePath);
    }
    Transacciones.create(req.body).then((x) => {
      res.status(201).send(x);
    });
  },

  getTransacciones: (req, res) => {
    Transacciones.find({ presupuesto_id: req.params.id_presupuesto })
      .sort({ fecha: -1 })
      .exec()
      .then((x) => {
        if (x.length > 0) {
          const result = x.reduce(function (r, a) {
            const fechayhora = a.fecha.toString().split(" ").splice(0, 4);
            const fecha = `${formatear(fechayhora[0])} ${
              fechayhora[2]
            }, ${formatearYear(fechayhora[1])} ${fechayhora[3]}`;
            r[fecha] = r[fecha] || [];
            r[fecha].push(a);
            return r;
          }, Object.create(null));

          var ing = 0.0,
            gas = 0.0;
          for (const pro in result) {
            result[pro].forEach((item) => {
              item.tipo === "Gasto" ? (gas += item.valor) : (ing += item.valor);
            });
          }
          var balance = ing - gas;

          var array = [ing, gas, balance.toFixed(2)];
          for (const property in result) {
            array.push({ title: property, data: result[property] });
          }
          return res.status(200).send(array);
        }

        res.status(200).send(x);
      });
  },

  getTransaccionesResumen: (req, res) => {
    const { _id } = req.user;
    Transacciones.find({ usuario_id: _id })
      .sort({ fecha: -1 })
      .exec()
      .then((x) => {
        if (x.length > 0) {
          var ing = 0.0,
            gas = 0.0;
          x.forEach((item) => {
            item.tipo === "Gasto" ? (gas += item.valor) : (ing += item.valor);
          });
          var balance = ing - gas;

          var ingresosG = gxIngresos(x);
          var gastosG = gxGastos(x);
          var array = [
            ing.toFixed(2),
            gas.toFixed(2),
            balance.toFixed(2),
            ingresosG,
            gastosG,
          ];

          return res.status(200).send(array);
        }

        res.status(200).send(x);
      });
  },
  getTransaccionesDetalle: (req, res) => {
    const { _id } = req.user;
    Transacciones.find({ usuario_id: _id })
      .sort({ fecha: -1 })
      .exec()
      .then((x) => {
        res.status(200).send(x);
      });
  },
};
