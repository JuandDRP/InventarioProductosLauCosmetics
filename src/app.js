const express = require('express');
const cors = require('cors');
const conectarDB = require('./config/db');
const { nanoid } = require('nanoid');

require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

let db, productosCol;



conectarDB().then((database) => {
    db = database;

    productosCol = db.collection('productos');

    const PORT = process.env.PORT || 3001;

    app.listen(PORT, () => {
        console.log(`🚀 Servidor en puerto ${PORT}`);
    });
});



app.get('/ping', (req, res) => res.sendStatus(200));

app.get('/', (req, res) => {
    res.send('API de productos funcionando 🚀');
});


app.post('/productos', async (req, res) => {
    try {
        const { producto, cantidad, costo, margen } = req.body;

        if (!producto || cantidad == null || costo == null || margen == null) {
            return res.status(400).json({ error: 'Faltan datos' });
        }

        if (margen >= 100 || margen < 0) {
            return res.status(400).json({
                error: 'El margen debe ser menor a 100 y mayor a 0'
            });


        }

        const precioVenta = Number((costo / (1 - margen / 100)).toFixed(0));
        const totalinvertido = Number((cantidad * costo).toFixed(0));

        const nuevoProducto = {
            id: nanoid(6),
            producto,
            cantidad,
            costo,
            margen,
            precioVenta,
            disponibles: cantidad,
            totalVentas: 0,
            totalinvertido,
            fechaCreacion: new Date()
        };

        const resultado = await productosCol.insertOne(nuevoProducto);

        res.status(201).json({
            _id: resultado.insertedId,
            ...nuevoProducto
        });

    } catch (error) {
        console.error('❌ Error al guardar producto:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});



app.get('/productos', async (req, res) => {
    try {
        const productos = await productosCol
            .find()
            .sort({ fechaCreacion: -1 })
            .toArray();

        res.json(productos);
    } catch (error) {
        console.error('❌ Error al obtener productos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});



app.delete('/productos/:id', async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const { id } = req.params;

        const resultado = await productosCol.deleteOne({
            _id: new ObjectId(id)
        });

        if (resultado.deletedCount === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json({ mensaje: 'Producto eliminado correctamente' });

    } catch (error) {
        console.error('❌ Error al eliminar producto:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post("/ventas", async (req, res) => {
    try {
        const { id, cantidadVendida } = req.body;

        // Validación
        if (!id || !cantidadVendida || cantidadVendida <= 0) {
            return res.status(400).json({ error: "Datos inválidos" });
        }

        const prod = await productosCol.findOne({ id });

        if (!prod) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }

        if (prod.disponibles < cantidadVendida) {
            return res.status(400).json({ error: "Stock insuficiente" });
        }

        const totalVenta = cantidadVendida * prod.precioVenta;

        await productosCol.updateOne(
            { id },
            {
                $inc: {
                    disponibles: -cantidadVendida,
                    totalVentas: totalVenta
                }
            }
        );

        const productoActualizado = await productosCol.findOne({ id });

        res.json(productoActualizado);

    } catch (error) {
        console.error("❌ Error en venta:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

app.post("/stock", async (req, res) => {
    try {
        const { id, cantidad } = req.body;

        if (!id || !cantidad || cantidad <= 0) {
            return res.status(400).json({ error: "Datos inválidos" });
        }

        const producto = await productosCol.findOne({ id });

        if (!producto) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }

        const inversionNueva = cantidad * producto.costo;
        const nuevoTotalInvertido = producto.totalinvertido + inversionNueva;


        await productosCol.updateOne(
            { id },
            {
                $inc: {
                    cantidad: cantidad,
                    disponibles: cantidad
                },
                $set: {
                    totalinvertido: nuevoTotalInvertido
                }
            }
        );

        const productoActualizado = await productosCol.findOne({ id });

        res.json(productoActualizado);

    } catch (error) {
        console.error("❌ Error en stock:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

app.post("/ventas/revertir", async (req, res) => {
    try {
        const { id, cantidad } = req.body;

        if (!id || !cantidad || cantidad <= 0) {
            return res.status(400).json({ error: "Datos inválidos" });
        }

        const prod = await productosCol.findOne({ id });

        if (!prod) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }

        const totalRevertir = cantidad * prod.precioVenta;

        await productosCol.updateOne(
            { id },
            {
                $inc: {
                    disponibles: cantidad,
                    totalVentas: -totalRevertir
                }
            }
        );

        res.json({ mensaje: "✅ Venta revertida correctamente" });

    } catch (error) {
        console.error("Error al revertir venta:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});