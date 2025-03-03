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
  origin: 'http://localhost:3001', // Ajusta esto a la URL de tu frontend
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
    correo
    } = req.body;

  // Detectar y procesar los horarios, sea cual sea el formato en que lleguen
  let horarios = [];
  
  // Caso 1: Los horarios vienen como un array de objetos (formato ideal)
  if (req.body.horarios && Array.isArray(req.body.horarios)) {
    horarios = req.body.horarios;
  } 
  // Caso 2: Los horarios vienen en arrays separados con notación de array (dia_inicio[], dia_fin[], etc.)
  else if (req.body['dia_inicio[]']) {
    // Convertir a array si es un solo valor
    const diaInicio = Array.isArray(req.body['dia_inicio[]']) ? req.body['dia_inicio[]'] : [req.body['dia_inicio[]']];
    const diaFin = Array.isArray(req.body['dia_fin[]']) ? req.body['dia_fin[]'] : [req.body['dia_fin[]']];
    const apertura = Array.isArray(req.body['apertura[]']) ? req.body['apertura[]'] : [req.body['apertura[]']];
    const cierre = Array.isArray(req.body['cierre[]']) ? req.body['cierre[]'] : [req.body['cierre[]']];
    
    // Construir array de horarios
    for (let i = 0; i < diaInicio.length; i++) {
      horarios.push({
        dia: `${diaInicio[i]} a ${diaFin[i]}`,
        apertura: apertura[i],
        cierre: cierre[i]
      });
    }
  }
  // Caso 3: Los horarios vienen en arrays separados sin notación de array
  else if (req.body.dia_inicio) {
    // Convertir a array si es un solo valor
    const diaInicio = Array.isArray(req.body.dia_inicio) ? req.body.dia_inicio : [req.body.dia_inicio];
    const diaFin = Array.isArray(req.body.dia_fin) ? req.body.dia_fin : [req.body.dia_fin];
    const apertura = Array.isArray(req.body.apertura) ? req.body.apertura : [req.body.apertura];
    const cierre = Array.isArray(req.body.cierre) ? req.body.cierre : [req.body.cierre];
    
    // Construir array de horarios
    for (let i = 0; i < diaInicio.length; i++) {
      horarios.push({
        dia: `${diaInicio[i]} a ${diaFin[i]}`,
        apertura: apertura[i],
        cierre: cierre[i]
      });
    }
  }

  // Validación de campos mínimos
  if (!nombre || !calle) {
    return res.status(400).json({ error: 'El nombre y la dirección son obligatorios' });
  }

  // Si no hay horarios definidos, crear un horario por defecto
  if (horarios.length === 0) {
    horarios = [{
      dia: 'Lunes a Viernes',
      apertura: '09:00',
      cierre: '18:00'
    }];
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

// Obtener negocios (requiere autenticación)
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

// CORREGIDO: Endpoint para negocios públicos
app.get('/api/negocios/publicos', (req, res) => {
  try {
    // Consulta SQL mejorada con JOIN para obtener el horario de apertura y cierre del negocio
    const query = `
    SELECT 
      n.id_Negocios,
      n.nombre,
      n.descripcion,
      COALESCE(n.categoria, 'Restaurante') as categoria,
      n.calle,
      n.numero_exterior,
      CONCAT(n.calle, ' ', n.numero_exterior, ', ', n.colonia) AS direccion,
      n.colonia,
      n.municipio,
      n.estado,
      n.telefono,
      n.correo,
      (SELECT hora_apertura FROM horarios_negocios WHERE id_Negocio = n.id_Negocios LIMIT 1) as horario_apertura,
      (SELECT hora_cierre FROM horarios_negocios WHERE id_Negocio = n.id_Negocios LIMIT 1) as horario_cierre,
      (SELECT url_foto FROM fotos_negocios WHERE id_Negocios = n.id_Negocios LIMIT 1) as imagen,
      'default' as calificacion_texto,
      4.5 as calificacion,
      0 as total_resenas
    FROM 
      negocios n
    GROUP BY 
      n.id_Negocios
    ORDER BY 
      n.nombre ASC
  `;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error al obtener negocios públicos:', err);
        return res.status(500).json({ 
          error: 'Error al obtener negocios públicos',
          message: err.message
        });
      }

      // Verificar si tenemos resultados
      if (results.length === 0) {
        return res.json([]);
      }
      
      // Formatear resultados para que coincidan con lo esperado por el frontend
      const negociosFormateados = results.map(negocio => {
        // Asegurarse de que imagen contiene una ruta válida
        let imagen = negocio.imagen;
        
        if (!imagen || imagen === null || imagen === '') {
          // Asignar imagen por categoría
          const categoria = (negocio.categoria || '').toLowerCase();
          
          if (categoria.includes('pizza')) {
            imagen = '/img/PIZZA.jpg';
          } else if (categoria.includes('taco')) {
            imagen = '/img/TACOS.jpg';
          } else if (categoria.includes('birria')) {
            imagen = '/img/Birria1.jpg';
          } else if (categoria.includes('pozole')) {
            imagen = '/img/posole.jpg';
          } else {
            imagen = '/img/default-restaurant.jpg';
          }
        }
        
        // Si la ruta no comienza con / o http, agregarle /
        if (imagen && !imagen.startsWith('/') && !imagen.startsWith('http')) {
          imagen = '/' + imagen;
        }
        

        

        // Verificar si es una URL externa o una ruta local
        if (imagen.startsWith('http://') || imagen.startsWith('https://')) {
          // Es una URL externa, mantenerla como está
          console.log(`URL de imagen externa detectada: ${imagen}`);
        } else {
          // Es una ruta local, verificar si existe
          const rutaImagen = path.join(__dirname, imagen.startsWith('/') ? imagen.substring(1) : imagen);
          
          // Si la imagen no existe, usar la imagen por defecto
          if (!fs.existsSync(rutaImagen)) {
            imagen = '/img/default-restaurant.jpg';
            console.log(`Imagen no encontrada: ${rutaImagen}, usando imagen por defecto`);
          }
        }

        return {
          id_Negocios: negocio.id_Negocios,
          nombre: negocio.nombre,
          descripcion: negocio.descripcion,
          categoria: negocio.categoria,
          direccion: negocio.direccion,
          telefono: negocio.telefono,
          horario_apertura: negocio.horario_apertura || '09:00',
          horario_cierre: negocio.horario_cierre || '22:00',
          imagen: imagen,
          calificacion: parseFloat(negocio.calificacion || 4.5).toFixed(1),
          total_resenas: negocio.total_resenas || 0
        };
      });
      
      res.json(negociosFormateados);
    });
  } catch (error) {
    console.error('Error en endpoint /api/negocios/publicos:', error);
    res.status(500).json({ 
      error: 'Error al obtener los negocios públicos',
      message: error.message
    });
  }
});


// 3. Agrega este endpoint para manejar imágenes por defecto según categoría
app.get('/api/imagen-categoria/:categoria', (req, res) => {
  const categoria = req.params.categoria.toLowerCase();
  let rutaImagen = 'img/default-restaurant.jpg';
  
  if (categoria.includes('pizza')) {
    rutaImagen = 'img/PIZZA.jpg';
  } else if (categoria.includes('taco')) {
    rutaImagen = 'img/TACOS.jpg';
  } else if (categoria.includes('birria')) {
    rutaImagen = 'img/Birria1.jpg';
  } else if (categoria.includes('pozole')) {
    rutaImagen = 'img/posole.jpg';
  }
  
  res.sendFile(path.join(__dirname, rutaImagen));
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

app.use(express.static(path.join(__dirname, '.')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
//Directorios necesarios para imagenes
const directorios = [
  './img',
  './uploads',
  './uploads/negocios'
];

directorios.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Directorio creado: ${dir}`);
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

// Endpoint para obtener detalle de un negocio específico
app.get('/api/negocios/:id', async (req, res) => {
  try {
    const negocioId = req.params.id;
    
    // Consulta adaptada a tu estructura de base de datos
    const query = `
      SELECT 
        n.*,
        COALESCE(AVG(r.calificacion), 0) as promedio_calificaciones,
        COUNT(r.id_Resenas) as total_resenas,
        f.url_foto as foto_portada
      FROM 
        negocios n
      LEFT JOIN 
        resenas r ON n.id_Negocios = r.id_Negocios
      LEFT JOIN 
        fotos_negocios f ON n.id_Negocios = f.id_Negocios AND f.tipo = 'portada'
      WHERE 
        n.id_Negocios = ?
      GROUP BY 
        n.id_Negocios
    `;
    
    db.query(query, [negocioId], (err, negocios) => {
      if (err) {
        console.error('Error al obtener detalle del negocio:', err);
        return res.status(500).json({ error: 'Error al obtener detalles del negocio' });
      }
      
      if (negocios.length === 0) {
        return res.status(404).json({ error: 'Negocio no encontrado' });
      }
      
      const negocio = negocios[0];
      
      // Formatear la ruta de la imagen de portada
      if (negocio.foto_portada && !negocio.foto_portada.startsWith('/') && !negocio.foto_portada.startsWith('http')) {
        negocio.foto_portada = '/' + negocio.foto_portada;
      }
      
      // Si no hay foto, usar una por defecto
      if (!negocio.foto_portada) {
        negocio.foto_portada = '/img/default-restaurant.jpg';
      }
      
      // Formatear calificaciones
      negocio.promedio_calificaciones = parseFloat(negocio.promedio_calificaciones).toFixed(1);
      
      // Obtener todas las imágenes del negocio
      db.query('SELECT id_Fotos as id, url_foto as url, tipo FROM fotos_negocios WHERE id_Negocios = ?', 
        [negocioId], 
        (err, imagenes) => {
          if (err) {
            console.error('Error al obtener imágenes:', err);
            // Continuar sin imágenes
            negocio.imagenes = [];
            return res.json(negocio);
          }
          
          // Formatear las imágenes
          const imagenesFormateadas = imagenes.map(img => {
            if (img.url && !img.url.startsWith('/') && !img.url.startsWith('http')) {
              img.url = '/' + img.url;
            }
            return {
              id: img.id,
              url: img.url,
              es_portada: img.tipo === 'portada'
            };
          });
          
          // Añadir imágenes al objeto del negocio
          negocio.imagenes = imagenesFormateadas;
          negocio.categoria = 'Restaurante'; // Categoría por defecto
          negocio.horario_cierre = '22:00'; // Horario por defecto
          
          res.json(negocio);
        }
      );
    });
    
  } catch (error) {
    console.error('Error al obtener detalles del negocio:', error);
    res.status(500).json({ 
      error: 'Error al obtener detalles del negocio',
      message: error.message
    });
  }
});

// Endpoint para actualizar un negocio
app.put('/api/negocios/:id', authenticateToken, async (req, res) => {
  try {
    const negocioId = req.params.id;
    const updateData = req.body;
    
    // Verificar que el negocio existe
    db.query(
      'SELECT id_Negocios FROM negocios WHERE id_Negocios = ?',
      [negocioId],
      (err, results) => {
        if (err) {
          console.error('Error al verificar negocio:', err);
          return res.status(500).json({ error: 'Error interno del servidor' });
        }
        
        if (results.length === 0) {
          return res.status(404).json({ error: 'Negocio no encontrado' });
        }
        
        // Filtrar solo los campos permitidos para actualización
        const allowedFields = [
          'nombre', 'descripcion', 'calle', 'numero_exterior', 'numero_interior',
          'colonia', 'codigo_postal', 'municipio', 'estado', 'telefono', 'correo'
        ];
        
        const filteredData = {};
        for (const field of allowedFields) {
          if (updateData[field] !== undefined) {
            filteredData[field] = updateData[field];
          }
        }
        
        // Verificar que hay datos para actualizar
        if (Object.keys(filteredData).length === 0) {
          return res.status(400).json({ error: 'No se proporcionaron datos válidos para actualizar' });
        }
        
        // Construir la consulta dinámica
        const updateFields = Object.keys(filteredData)
          .map(field => `${field} = ?`)
          .join(', ');
        
        const updateValues = Object.values(filteredData);
        updateValues.push(negocioId); // Para el WHERE id_Negocios = ?
        
        const query = `UPDATE negocios SET ${updateFields} WHERE id_Negocios = ?`;
        
        // Ejecutar la consulta
        db.query(query, updateValues, (err, result) => {
          if (err) {
            console.error('Error al actualizar negocio:', err);
            return res.status(500).json({ error: 'Error al actualizar el negocio' });
          }
          
          if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'No se actualizó ningún negocio' });
          }
          
          res.json({ 
            message: 'Negocio actualizado correctamente',
            negocioId 
          });
        });
      }
    );
  } catch (error) {
    console.error('Error al actualizar negocio:', error);
    res.status(500).json({ 
      error: 'Error al actualizar el negocio',
      message: error.message
    });
  }
});
// Endpoint para servir imágenes de muestra
app.get('/img/:imageName', (req, res) => {
  const imageName = req.params.imageName;
  const imagePath = path.join(__dirname, 'img', imageName);
  
  // Verificar si la imagen existe
  fs.access(imagePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error('Imagen no encontrada:', imagePath);
      // Usar una imagen por defecto si la solicitada no existe
      return res.sendFile(path.join(__dirname, 'img', 'default-restaurant.jpg'));
    }
    res.sendFile(imagePath);
  });
});
// Endpoint para obtener reseñas de un negocio
app.get('/api/negocios/:id/resenas', async (req, res) => {
  try {
    const negocioId = req.params.id;
    
    // Consulta adaptada a tu estructura de base de datos actual
    const query = `
      SELECT 
        r.*,
        u.nombre_usuario as nombre_usuario
      FROM 
        resenas r
      LEFT JOIN 
        users u ON r.id_Usuario = u.id
      WHERE 
        r.id_Negocios = ?
      ORDER BY 
        r.fecha_resena DESC
    `;
    
    db.query(query, [negocioId], (err, resenas) => {
      if (err) {
        console.error('Error al obtener reseñas:', err);
        return res.status(500).json({ error: 'Error al obtener reseñas' });
      }
      
      // Si no hay reseñas, devolver array vacío
      if (resenas.length === 0) {
        return res.json([]);
      }
      
      // Formatear fechas y otros campos
      const resenasFormateadas = resenas.map(resena => {
        return {
          ...resena,
          fecha_creacion: resena.fecha_resena,
          comentario: resena.comentario || 'Sin comentario',
          nombre_usuario: resena.nombre_usuario || 'Usuario anónimo'
        };
      });
      
      res.json(resenasFormateadas);
    });
    
  } catch (error) {
    console.error('Error al obtener reseñas:', error);
    res.status(500).json({ 
      error: 'Error al obtener reseñas',
      message: error.message
    });
  }
});

// Endpoint para añadir una nueva reseña
app.post('/api/negocios/:id/resenas', authenticateToken, async (req, res) => {
  try {
    const idNegocio = req.params.id;
    const idUsuario = req.user.id; // Usando el objeto user del middleware authenticateToken
    const { calificacion, comentario } = req.body;
    
    // Validar datos
    if (!calificacion || !comentario) {
      return res.status(400).json({ error: 'La calificación y el comentario son obligatorios' });
    }
    
    if (calificacion < 1 || calificacion > 5) {
      return res.status(400).json({ error: 'La calificación debe estar entre 1 y 5' });
    }
    
    // Verificar si el negocio existe
    db.query(
      'SELECT id_Negocios FROM negocios WHERE id_Negocios = ?',
      [idNegocio],
      (err, negocios) => {
        if (err) {
          console.error('Error al verificar negocio:', err);
          return res.status(500).json({ error: 'Error interno' });
        }
        
        if (negocios.length === 0) {
          return res.status(404).json({ error: 'Negocio no encontrado' });
        }
        
        // Verificar si el usuario ya ha dejado una reseña
        db.query(
          'SELECT id_Resenas FROM resenas WHERE id_Negocios = ? AND id_Usuario = ?',
          [idNegocio, idUsuario],
          (err, resenas) => {
            if (err) {
              console.error('Error al verificar reseñas existentes:', err);
              return res.status(500).json({ error: 'Error interno' });
            }
            
            if (resenas.length > 0) {
              // Actualizar reseña existente
              db.query(
                'UPDATE resenas SET calificacion = ?, comentario = ? WHERE id_Negocios = ? AND id_Usuario = ?',
                [calificacion, comentario, idNegocio, idUsuario],
                (err) => {
                  if (err) {
                    console.error('Error al actualizar reseña:', err);
                    return res.status(500).json({ error: 'Error al actualizar reseña' });
                  }
                  
                  res.json({ message: 'Reseña actualizada correctamente' });
                }
              );
            } else {
              // Crear nueva reseña
              db.query(
                'INSERT INTO resenas (id_Negocios, id_Usuario, calificacion, comentario, fecha_resena) VALUES (?, ?, ?, ?, NOW())',
                [idNegocio, idUsuario, calificacion, comentario],
                (err, result) => {
                  if (err) {
                    console.error('Error al crear reseña:', err);
                    return res.status(500).json({ error: 'Error al crear reseña' });
                  }
                  
                  res.status(201).json({ 
                    message: 'Reseña creada correctamente',
                    id_Resena: result.insertId
                  });
                }
              );
            }
          }
        );
      }
    );
  } catch (error) {
    console.error('Error al crear/actualizar reseña:', error);
    res.status(500).json({ 
      error: 'Error al crear/actualizar la reseña',
      message: error.message
    });
  }
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