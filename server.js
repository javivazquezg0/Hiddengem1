require('dotenv').config();
const path = require('path');
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const app = express();

// Configurar la conexión a la base de datos
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'Hiddengem1',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Conexión a la base de datos
db.getConnection((err, connection) => {
  if (err) {
    console.error('Error conectando a la base de datos:', err);
    return;
  }
  console.log('Conectado a la base de datos MariaDB');
  connection.release(); // Always release the connection when done
});

// Middlewares
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000', // Ajusta esto a la URL de tu frontend
  credentials: true
}));

app.use(express.static(path.join(__dirname, '.'), {
  setHeaders: (res, filePath) => {
    if (path.extname(filePath) === '.js') {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Middleware de autenticación JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  // Log para depuración
  console.log('Headers de autenticación:', authHeader ? 'Presente' : 'Ausente');
  
  if (!authHeader) {
    console.log('Authorization header faltante');
    return res.status(401).json({ error: 'Se requiere token de autenticación' });
  }
  
  const token = authHeader.split(' ')[1];
  if (!token) {
    console.log('Token no proporcionado');
    return res.status(401).json({ error: 'Formato de token inválido' });
  }
  
  console.log('Intentando verificar token');
  const secretKey = process.env.JWT_SECRET || 'tu_secreto_super_seguro';
  
  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      console.log('Error verificando token:', err.message);
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }
    
    console.log('Token verificado correctamente para el usuario:', user.email);
    req.user = user;
    next();
  });
};

// Endpoint simple para verificar la autenticación
app.get('/api/check-auth', authenticateToken, (req, res) => {
  res.json({ 
    message: 'Autenticación válida',
    user: {
      id: req.user.id,
      email: req.user.email
    }
  });
});

// Login de usuarios
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }
  
  console.log(`Intento de login para usuario: ${email}`);
  
  try {
    db.execute(
      'SELECT * FROM users WHERE email = ? AND provider = "local"',
      [email],
      async (error, results) => {
        if (error) {
          console.error('Error de base de datos en login:', error);
          return res.status(500).json({ error: 'Error en el servidor' });
        }
        
        if (results.length === 0) {
          console.log(`Usuario no encontrado: ${email}`);
          return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        const user = results[0];
        console.log(`Usuario encontrado, verificando contraseña`);
        
        try {
          const validPassword = await bcrypt.compare(password, user.password);
          
          if (!validPassword) {
            console.log(`Contraseña inválida para usuario: ${email}`);
            return res.status(401).json({ error: 'Credenciales inválidas' });
          }
          
          // Generar token con más información
          const secretKey = process.env.JWT_SECRET || 'tu_secreto_super_seguro';
          console.log(`Usando clave secreta para JWT: ${secretKey.substring(0, 3)}...`);
          
          const token = jwt.sign(
            { 
              id: user.id, 
              email: user.email,
              displayName: user.display_name
            },
            secretKey,
            { expiresIn: '24h' } // Aumentamos tiempo de expiración a 24 horas
          );
          
          console.log(`Login exitoso para usuario: ${email}, token generado`);
          
          res.json({ 
            token, 
            user: { 
              id: user.id,
              displayName: user.display_name, 
              email: user.email 
            } 
          });
        } catch (bcryptError) {
          console.error('Error al verificar contraseña:', bcryptError);
          return res.status(500).json({ error: 'Error al verificar credenciales' });
        }
      }
    );
  } catch (err) {
    console.error('Error en ruta de login:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// También agrega una ruta para verificar el estado de login
app.get('/api/me', authenticateToken, (req, res) => {
  // Responde con los datos del usuario actual
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      displayName: req.user.displayName || req.user.display_name
    }
  });
});

// Registro de usuarios
app.post('/api/register', async (req, res) => {
  try {
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

// Ruta para registrar negocios
app.post('/api/negocios', authenticateToken, (req, res) => {
  console.log('Recibido en /api/negocios:', req.body);
  
  const { 
      nombre, 
      descripcion, 
      calle, 
      numero_exterior, 
      numero_interior, 
      colonia, 
      codigo_postal, 
      municipio, 
      estado, 
      telefono, 
      correo, 
      horarios 
  } = req.body;

  if (!nombre || !calle || !horarios?.length) {
      return res.status(400).json({ error: 'Campos requeridos faltantes' });
  }

  // Verificar que el usuario está autenticado
  if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  // Transacción para garantizar integridad
  db.getConnection((err, connection) => {
    if (err) {
      console.error('Error al obtener conexión a DB:', err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }

    connection.beginTransaction(err => {
      if (err) {
        connection.release();
        return res.status(500).json({ error: 'Error al iniciar transacción' });
      }

      // Insertar el negocio
      connection.query(
        `INSERT INTO negocios 
         (nombre, descripcion, calle, numero_exterior, numero_interior, 
          colonia, codigo_postal, municipio, estado, telefono, correo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [nombre, descripcion, calle, numero_exterior, numero_interior, 
         colonia, codigo_postal, municipio, estado, telefono, correo],
        (err, result) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              console.error('Error al insertar negocio:', err);
              res.status(500).json({ error: 'Error al guardar el negocio' });
            });
          }

          const idNegocio = result.insertId;
          console.log('Negocio insertado con ID:', idNegocio);
          
          // Preparar consulta para horarios
          const horariosValues = [];
          const horariosPlaceholders = [];
          
          // Insertar horarios
          horarios.forEach(h => {
            // Dividir el rango de días
            const [diaInicio, diaFin] = h.dia.split(' a ');
            
            horariosValues.push(idNegocio, diaInicio, diaFin, h.apertura, h.cierre);
            horariosPlaceholders.push('(?, ?, ?, ?, ?)');
          });
          
          // Insertar horarios - solo si hay placeholders
          if (horariosPlaceholders.length > 0) {
            const horariosQuery = `INSERT INTO horarios_negocios 
                                  (id_Negocio, dia_inicio, dia_fin, hora_apertura, hora_cierre)
                                  VALUES ${horariosPlaceholders.join(', ')}`;
            
            connection.query(horariosQuery, horariosValues, (err) => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  console.error('Error al insertar horarios:', err);
                  res.status(500).json({ error: 'Error al guardar los horarios' });
                });
              }
              
              // Si todo está bien, confirmar la transacción
              connection.commit(err => {
                if (err) {
                  return connection.rollback(() => {
                    connection.release();
                    console.error('Error al confirmar transacción:', err);
                    res.status(500).json({ error: 'Error al confirmar los cambios' });
                  });
                }
                
                connection.release();
                res.status(201).json({ 
                  message: 'Negocio registrado exitosamente',
                  idNegocio 
                });
              });
            });
          } else {
            // Si no hay horarios (aunque esto no debería ocurrir según tu validación)
            connection.commit(err => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  console.error('Error al confirmar transacción sin horarios:', err);
                  res.status(500).json({ error: 'Error al confirmar los cambios' });
                });
              }
              
              connection.release();
              res.status(201).json({ 
                message: 'Negocio registrado exitosamente (sin horarios)',
                idNegocio 
              });
            });
          }
        }
      );
    });
  });
});

// Obtener negocios
app.get('/api/negocios', (req, res) => {
  const query = `
      SELECT n.*, 
             AVG(r.calificacion) AS promedio_calificaciones, 
             COALESCE(f.url_foto, '/img/default-restaurant.jpg') AS foto_portada
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
// Configurar almacenamiento para imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads', 'negocios');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'negocio-' + uniqueSuffix + ext);
  }
});

// Filtro para aceptar solo imágenes
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB límite
  }
});

// Rutas para manejar imágenes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ruta para subir imágenes de un negocio
app.post('/api/negocios/:id/imagenes', authenticateToken, upload.array('imagenes', 5), (req, res) => {
  const idNegocio = req.params.id;
  
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No se subieron imágenes' });
  }

  // Procesar archivos subidos
  const archivos = req.files.map((file, index) => {
    // El tipo es "portada" para la primera imagen, "general" para el resto
    const tipo = index === 0 ? 'portada' : 'general';
    
    return {
      id_Negocios: idNegocio,
      url_foto: `/uploads/negocios/${file.filename}`,
      tipo: tipo,
      fecha_subida: new Date()
    };
  });
  
  // Insertar referencias en la base de datos
  const query = `INSERT INTO fotos_negocios (id_Negocios, url_foto, tipo, fecha_subida) VALUES ?`;
  const values = archivos.map(archivo => [
    archivo.id_Negocios, 
    archivo.url_foto, 
    archivo.tipo, 
    archivo.fecha_subida
  ]);
  
  db.query(query, [values], (err, result) => {
    if (err) {
      console.error('Error al guardar referencias de imágenes:', err);
      return res.status(500).json({ error: 'Error al guardar referencias de imágenes' });
    }
    
    res.status(201).json({
      message: 'Imágenes subidas exitosamente',
      archivos: archivos.map(a => ({
        url: a.url_foto,
        tipo: a.tipo
      }))
    });
  });
});

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err);
  res.status(500).json({ 
    error: 'Error en el servidor', 
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Iniciar servidor
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});