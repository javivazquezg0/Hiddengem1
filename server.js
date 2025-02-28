require('dotenv').config(); // Cargar variables de entorno
const path = require('path');
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const app = express();

// Configurar la conexión a la base de datos
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'Hiddengem1'
});

// Middlewares
app.use(express.json());
app.use(cors()); // Habilitar CORS
app.use(express.static('.'));

// Configurar express para servir JS con MIME type correcto
app.use(express.static('.', {
  setHeaders: (res, filePath) => {
      if (path.extname(filePath) === '.js') {
          res.setHeader('Content-Type', 'application/javascript');
      }
  }
}));

// Conexión a la base de datos
db.connect((err) => {
  if (err) {
    console.error('Error conectando a la base de datos:', err);
    return;
  }
  console.log('Conectado a la base de datos MariaDB');
});

// Middleware de autenticación JWT CORREGIDO
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.sendStatus(401);
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

// Ruta de registro
app.post('/api/register', async (req, res) => {
  try {
    console.log('Datos recibidos:', req.body); // <-- Debug
    const { email, password, displayName } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.execute(
      'INSERT INTO users (email, password, display_name, provider) VALUES (?, ?, ?, "local")',
      [email, hashedPassword, displayName],
      (error, results) => {
        if (error) {
          console.error('Error en registro:', error);
          return res.status(400).json({ error: 'El usuario ya existe' });
        }
        res.status(201).json({ message: 'Usuario registrado exitosamente' });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Nueva ruta de login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  db.execute(
    'SELECT * FROM users WHERE email = ? AND provider = "local"',
    [email],
    async (error, results) => {
      if (error || results.length === 0) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }
      
      const user = results[0];
      const validPassword = await bcrypt.compare(password, user.password);
      
      if (!validPassword) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }
      
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || 'tu_secreto_super_seguro',
        { expiresIn: '1h' }
      );
      
      res.json({ token, user: { displayName: user.display_name, email: user.email } });
    }
  );
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
