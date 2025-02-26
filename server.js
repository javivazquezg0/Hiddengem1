const path = require('path');
const express = require('express');
const mysql = require('mysql2');
const app = express();

// Configurar la conexión a la base de datos
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'Hiddengem1'
});

// Conectar a la base de datos
db.connect((err) => {
    if (err) {
        console.error('Error conectando a la base de datos:', err);
        return;
    }
    console.log('Conectado a la base de datos MariaDB');
});

// Middleware para parsear JSON
app.use(express.json());

// Servir archivos estáticos desde la carpeta "public"
app.use(express.static('public'));

// Ruta para servir el archivo index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

//Console.log para verificar que la solicitud a style.css se esta manejando correctamente
app.use((req, res, next) => {
    console.log(`Solicitud recibida: ${req.method} ${req.url}`);
    next();
});

// Ruta de prueba
app.get('/api/negocios', (req, res) => {
    const query = `
        SELECT n.*, AVG(r.calificacion) AS promedio_calificaciones, f.url_foto AS foto_portada
        FROM negocios n
        LEFT JOIN resenas r ON n.id_Negocios = r.id_Negocios
        LEFT JOIN fotos_negocios f ON n.id_Negocios = f.id_Negocios AND f.tipo = 'portada'
        GROUP BY n.id_Negocios
    `;
    db.query(query, (err, resultados) => {
        if (err) {
            console.error('Error al obtener los negocios:', err);
            return res.status(500).json({ error: 'Error al obtener los negocios' });
        }
        res.json(resultados);
    });
});
// Iniciar el servidor
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
