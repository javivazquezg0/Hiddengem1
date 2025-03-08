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
  origin: '*', // Permite solicitudes desde cualquier origen durante desarrollo
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
                          
                          // Generar token JWT
                          const secretKey = process.env.JWT_SECRET || 'tu_secreto_super_seguro';
                          const token = jwt.sign(
                            { 
                                id: user.id,
                                email: user.email,
                                displayName: user.display_name,
                                provider: 'local'
                            },
                            secretKey,
                            { 
                                expiresIn: '24h',
                                algorithm: 'HS256'
                            }
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

// Endpoint para autenticación con Google
app.post('/api/auth/google', async (req, res) => {
  try {
      const { uid, email, displayName, photoURL } = req.body;
      
      console.log('Datos recibidos de Google:', req.body);
      
      if (!email) {
          return res.status(400).json({ error: 'Email es requerido' });
      }
      
      // Primero, verificar si el usuario ya existe (por email, independiente del provider)
      db.execute(
          'SELECT * FROM users WHERE email = ?',
          [email],
          async (error, results) => {
              if (error) {
                  console.error('Error de base de datos en login con Google:', error);
                  return res.status(500).json({ error: 'Error en el servidor' });
              }
              
              let userId;
              
              if (results.length === 0) {
                  // El usuario no existe en absoluto, crearlo
                  console.log('Creando nuevo usuario de Google:', email);
                  try {
                      // Hacemos un console.log del query para depuración
                      const query = 'INSERT INTO users (email, display_name, provider, photo_url) VALUES (?, ?, ?, ?)';
                      const params = [email, displayName || email.split('@')[0], 'google', photoURL || null];
                      console.log('Query de inserción:', query);
                      console.log('Parámetros:', params);
                      
                      const insertResult = await new Promise((resolve, reject) => {
                          db.execute(
                              query,
                              params,
                              (err, result) => {
                                  if (err) {
                                      console.error('Error SQL al crear usuario de Google:', err);
                                      reject(err);
                                  } else {
                                      resolve(result);
                                  }
                              }
                          );
                      });
                      
                      userId = insertResult.insertId;
                      console.log('Usuario creado con ID:', userId);
                  } catch (dbError) {
                      console.error('Error detallado al crear usuario de Google:', dbError);
                      return res.status(500).json({ error: 'Error al crear usuario: ' + dbError.message });
                  }
              } else {
                  // El usuario ya existe, actualizarlo para usar Google si es necesario
                  userId = results[0].id;
                  console.log('Usuario existente encontrado con ID:', userId);
                  
                  // Si el usuario existe pero no es de Google, actualizar su provider
                  if (results[0].provider !== 'google') {
                      try {
                          await new Promise((resolve, reject) => {
                              db.execute(
                                  'UPDATE users SET provider = ?, photo_url = ? WHERE id = ?',
                                  ['google', photoURL || null, userId],
                                  (err, result) => {
                                      if (err) {
                                          console.error('Error al actualizar usuario a Google:', err);
                                          reject(err);
                                      } else {
                                          resolve(result);
                                      }
                                  }
                              );
                          });
                          console.log('Usuario actualizado a provider Google');
                      } catch (updateError) {
                          console.error('Error al actualizar usuario:', updateError);
                          // Continuamos incluso si la actualización falla
                      }
                  }
              }
              
              // Generar token JWT
              const secretKey = process.env.JWT_SECRET || 'tu_secreto_super_seguro';
              const token = jwt.sign(
                { 
                    id: userId,
                    email: email,
                    displayName: displayName,
                    provider: 'google'
                },
                secretKey,
                { 
                    expiresIn: '24h',
                    algorithm: 'HS256'
                }
            );
            
            // El middleware authenticateToken ya está definido al inicio del archivo
              console.log('Login exitoso con Google, token generado para usuario:', email);
              
              res.json({ 
                  token, 
                  user: { 
                      id: userId,
                      displayName: displayName, 
                      email: email,
                      photoURL: photoURL
                  } 
              });
          }
      );
  } catch (err) {
      console.error('Error en ruta de autenticación Google:', err);
      res.status(500).json({ error: 'Error en el servidor: ' + err.message });
  }
});

// Ruta para depurar - quitar en producción
app.get('/api/debug-token', authenticateToken, (req, res) => {
  res.json({
    message: 'Detalles del token',
    user: req.user
  });
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

  // Procesar horarios (mantén el código existente para esto)
  let horarios = [];
  
  // Código para procesar horarios que ya existía en tu server.js
  if (req.body.horarios && Array.isArray(req.body.horarios)) {
    horarios = req.body.horarios;
  } 
  else if (req.body['dia_inicio[]']) {
    // [Mantén el código existente para procesar horarios]
    const diaInicio = Array.isArray(req.body['dia_inicio[]']) ? req.body['dia_inicio[]'] : [req.body['dia_inicio[]']];
    const diaFin = Array.isArray(req.body['dia_fin[]']) ? req.body['dia_fin[]'] : [req.body['dia_fin[]']];
    const apertura = Array.isArray(req.body['apertura[]']) ? req.body['apertura[]'] : [req.body['apertura[]']];
    const cierre = Array.isArray(req.body['cierre[]']) ? req.body['cierre[]'] : [req.body['cierre[]']];
    
    for (let i = 0; i < diaInicio.length; i++) {
      horarios.push({
        dia: `${diaInicio[i]} a ${diaFin[i]}`,
        apertura: apertura[i],
        cierre: cierre[i]
      });
    }
  }
  else if (req.body.dia_inicio) {
    // [Mantén el código existente para procesar horarios]
    // ...
  }

  // Validaciones (mantén el código existente)
  if (!nombre || !calle) {
    return res.status(400).json({ error: 'El nombre y la dirección son obligatorios' });
  }

  // Horarios por defecto (mantén el código existente)
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

      // MODIFICACIÓN: Incluir id_user en la consulta de inserción
      connection.query(
        `INSERT INTO negocios 
         (nombre, descripcion, calle, numero_exterior, numero_interior, 
          colonia, codigo_postal, municipio, estado, telefono, correo, id_user)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [nombre, descripcion, calle, numero_exterior, numero_interior, 
         colonia, codigo_postal, municipio, estado, telefono, correo, req.user.id],
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
          
          // [Mantén el resto del código para insertar horarios]
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
            // Si no hay horarios
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

// Esta función es útil si tienes usuarios que podrían usar tanto login local como Google
function getAllUserBusinesses(userId, res) {
  console.log('getAllUserBusinesses llamada para usuario ID:', userId);
  
  try {
    // Consulta simplificada para usar solo id_user
    const query = `
      SELECT n.*, 
             AVG(r.calificacion) AS promedio_calificaciones, 
             COALESCE(f.url_foto, '/img/default-restaurant.jpg') AS foto_portada
      FROM negocios n
      LEFT JOIN resenas r ON n.id_Negocios = r.id_Negocios
      LEFT JOIN fotos_negocios f ON n.id_Negocios = f.id_Negocios AND f.tipo = 'portada'
      WHERE n.id_user = ?
      GROUP BY n.id_Negocios
    `;
    
    console.log('Ejecutando consulta con parámetro id_user:', userId);
    
    db.query(query, [userId], (err, resultados) => {
      if (err) {
        console.error('Error en consulta SQL:', err);
        return res.status(500).json({ error: 'Error al obtener los negocios: ' + err.message });
      }
      
      console.log(`Negocios encontrados para usuario ${userId}: ${resultados.length}`);
      return res.json(resultados || []);
    });
  } catch (err) {
    console.error('Error en getAllUserBusinesses:', err);
    return res.status(500).json({ error: 'Error interno en getAllUserBusinesses: ' + err.message });
  }
}

// NOTA: Esta ruta está duplicada. Hay otra idéntica más arriba en el código.
// Se mantiene por ahora para evitar romper funcionalidad existente.
app.get('/api/debug-token', authenticateToken, (req, res) => {
  console.log('Contenido del token recibido:', req.user);
  res.json({ 
    message: 'Token válido',
    user: {
      id: req.user.id,
      email: req.user.email,
      displayName: req.user.displayName,
      provider: req.user.provider || 'local'
    }
  });
});

// Endpoint para obtener reseñas recientes
app.get('/api/resenas/recientes', async (req, res) => {
  try {
      const limit = parseInt(req.query.limit) || 3;
      
      const query = `
          SELECT 
              r.*,
              n.nombre as business_name,
              n.id_Negocios as business_id,
              f.url_foto as business_image,
              COALESCE(u.display_name, 'Usuario anónimo') as nombre_usuario
          FROM 
              resenas r
          JOIN 
              negocios n ON r.id_Negocios = n.id_Negocios
          LEFT JOIN 
              fotos_negocios f ON n.id_Negocios = f.id_Negocios AND f.tipo = 'portada'
          LEFT JOIN 
              users u ON r.id_Usuario = u.id
          ORDER BY 
              r.fecha_resena DESC
          LIMIT ?
      `;
      
      db.query(query, [limit], (err, results) => {
          if (err) {
              console.error('Error al obtener reseñas recientes:', err);
              return res.status(500).json({ error: 'Error al obtener reseñas recientes' });
          }
          
          // Procesar resultados y enviar respuesta
          const resenasFormateadas = results.map(resena => {
              // Asegurar que la imagen tenga una ruta válida
              let imageSrc = resena.business_image || '/img/default-restaurant.jpg';
              if (!imageSrc.startsWith('/') && !imageSrc.startsWith('http')) {
                  imageSrc = '/' + imageSrc;
              }
              
              return {
                  ...resena,
                  fecha_creacion: resena.fecha_resena,
                  business_image: imageSrc,
                  comentario: resena.comentario || 'Sin comentario'
              };
          });
          
          res.json(resenasFormateadas);
      });
  } catch (error) {
      console.error('Error en endpoint de reseñas recientes:', error);
      res.status(500).json({ 
          error: 'Error al obtener reseñas recientes',
          message: error.message
      });
  }
});

// Endpoint para filtrar negocios
app.get('/api/negocios/filtro', (req, res) => {
  try {
    // Obtener parámetros de consulta
    const searchTerm = req.query.q ? req.query.q.toLowerCase() : '';
    const categoria = req.query.categoria || '';
    const calificacion = parseFloat(req.query.calificacion) || 0;
    
    console.log('Filtrando con parámetros:', { 
      searchTerm, 
      categoria, 
      calificacion 
    });
    
    // Construir consulta SQL base
    let query = `
      SELECT 
        n.id_Negocios,
        n.nombre,
        n.descripcion,
        COALESCE(n.categoria, 'Restaurante') as categoria,
        n.calle,
        n.numero_exterior,
        n.colonia,
        n.municipio,
        n.estado,
        CONCAT(n.calle, ' ', n.numero_exterior, ', ', n.colonia) AS direccion,
        n.telefono,
        (SELECT hora_apertura FROM horarios_negocios WHERE id_Negocio = n.id_Negocios LIMIT 1) as horario_apertura,
        (SELECT hora_cierre FROM horarios_negocios WHERE id_Negocio = n.id_Negocios LIMIT 1) as horario_cierre,
        (SELECT url_foto FROM fotos_negocios WHERE id_Negocios = n.id_Negocios LIMIT 1) as foto_portada,
        COALESCE(AVG(r.calificacion), 4.5) as promedio_calificaciones,
        COUNT(DISTINCT r.id_Resenas) as total_resenas
      FROM 
        negocios n
      LEFT JOIN
        resenas r ON n.id_Negocios = r.id_Negocios
    `;
    
    // Condiciones WHERE
    const conditions = [];
    const params = [];
    
    // Filtro por término de búsqueda
    if (searchTerm) {
      conditions.push(`(
        LOWER(n.nombre) LIKE ? OR 
        LOWER(n.descripcion) LIKE ? OR 
        LOWER(n.categoria) LIKE ? OR
        LOWER(n.calle) LIKE ? OR
        LOWER(n.colonia) LIKE ? OR
        LOWER(n.municipio) LIKE ? OR
        LOWER(n.estado) LIKE ?
      )`);
      
      const searchPattern = `%${searchTerm}%`;
      params.push(
        searchPattern, 
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern
      );
    }
    
    // Filtro por categoría
    if (categoria) {
      conditions.push('n.categoria = ?');
      params.push(categoria);
    }
    
    // Añadir condiciones WHERE si existen
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    // Agrupar por negocio
    query += ' GROUP BY n.id_Negocios';
    
    // Filtro por calificación (se aplica después del GROUP BY)
    if (calificacion > 0) {
      query += ' HAVING promedio_calificaciones >= ?';
      params.push(calificacion);
    }
    
    // Ordenar resultados
    query += ' ORDER BY n.nombre ASC';
    
    // Ejecutar consulta
    db.query(query, params, (err, results) => {
      if (err) {
        console.error('Error al filtrar negocios:', err);
        return res.status(500).json({ 
          error: 'Error al filtrar negocios',
          message: err.message
        });
      }
      
      // Formatear resultados
      const negociosFormateados = results.map(negocio => {
        // Asegurarse de que imagen contiene una ruta válida
        let imagen = negocio.foto_portada;
        
        if (!imagen || imagen === null || imagen === '') {
          // Asignar imagen por categoría
          const categoria = (negocio.categoria || '').toLowerCase();
          
          if (categoria.includes('pizza')) {
            imagen = '/img/PIZZA.jpg';
          } else if (categoria.includes('taco')) {
            imagen = '/img/TACOS.jpg';
          } else if (categoria.includes('cafe')) {
            imagen = '/img/cafe.jpg';
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
        
        return {
          id_Negocios: negocio.id_Negocios,
          nombre: negocio.nombre,
          descripcion: negocio.descripcion,
          categoria: negocio.categoria,
          calle: negocio.calle,
          numero_exterior: negocio.numero_exterior,
          colonia: negocio.colonia,
          municipio: negocio.municipio,
          estado: negocio.estado,
          direccion: negocio.direccion,
          telefono: negocio.telefono,
          horario_apertura: negocio.horario_apertura || '09:00',
          horario_cierre: negocio.horario_cierre || '22:00',
          foto_portada: imagen,
          promedio_calificaciones: parseFloat(negocio.promedio_calificaciones || 0).toFixed(1),
          total_resenas: negocio.total_resenas || 0
        };
      });
      
      res.json(negociosFormateados);
    });
  } catch (error) {
    console.error('Error en endpoint de filtrado:', error);
    res.status(500).json({ 
      error: 'Error al filtrar negocios',
      message: error.message
    });
  }
});

// Obtener negocios (requiere autenticación)
app.get('/api/negocios', authenticateToken, (req, res) => {
  try {
    console.log('GET /api/negocios - Usuario autenticado:', {
      id: req.user.id,
      email: req.user.email,
      provider: req.user.provider
    });
    
    if (!req.user || !req.user.id) {
      console.error('Error: req.user o req.user.id no disponible');
      return res.status(400).json({ error: 'Información de usuario incompleta en el token' });
    }
    
    // Modificación para depuración: envía una respuesta directa si el usuario existe
    console.log("ID de usuario válido:", req.user.id);
    
    // Llamar a getAllUserBusinesses con el ID de usuario
    getAllUserBusinesses(req.user.id, res);
  } catch (error) {
    console.error("Error en ruta /api/negocios:", error);
    res.status(500).json({ error: "Error en el servidor: " + error.message });
  }
});

// NOTA: Esta función es código del lado del cliente y no debería estar en el servidor.
// Debería moverse a un archivo JavaScript del cliente, como /Resenas/cargar-resenas.js
// Se mantiene comentada aquí como referencia hasta que se mueva al lugar correcto.
/*
function displayBusinesses(businesses) {
  const businessContainer = document.querySelector('.business-grid');
  
  if (!businessContainer) {
      console.error("No se encontró el contenedor de negocios (.business-grid)");
      return;
  }
  
  // Limpiar el contenedor
  businessContainer.innerHTML = '';
  
  // Generar HTML para cada negocio
  businesses.forEach(business => {
      // Verificar la imagen
      let imageSrc = business.imagen || business.foto_portada || '/img/default-restaurant.jpg';
      
      // Asegurar que la imagen tenga una ruta válida
      if (!imageSrc.startsWith('/') && !imageSrc.startsWith('http')) {
          imageSrc = '/' + imageSrc;
      }
      
      // Generar HTML de estrellas
      const starsHtml = Utils.generateStarsHtml(business.promedio_calificaciones || 4);
      
      // Categoría del negocio
      const categoria = business.categoria || 'Restaurante';
      
      // Icono según categoría
      let categoriaIcon = 'utensils';
      if (categoria.toLowerCase().includes('café') || categoria.toLowerCase().includes('cafe')) {
          categoriaIcon = 'coffee';
      } else if (categoria.toLowerCase().includes('taco')) {
          categoriaIcon = 'hamburger';
      } else if (categoria.toLowerCase().includes('pizza')) {
          categoriaIcon = 'pizza-slice';
      }
      
      // Crear el elemento del negocio
      const businessCard = document.createElement('div');
      businessCard.className = 'business-card';
      businessCard.dataset.id = business.id_Negocios;
      
      // IMPORTANTE: Asegúrate de mostrar correctamente el contador de reseñas
      const reviewCount = parseInt(business.total_resenas) || 0;
      
      businessCard.innerHTML = `
          <div class="business-image">
              <img src="${imageSrc}" alt="${business.nombre}" onerror="this.src='/img/default-restaurant.jpg'">
          </div>
          <div class="business-info">
              <h3 class="business-name">${business.nombre}</h3>
              <div class="business-rating">
                  <div class="stars">
                      ${starsHtml}
                  </div>
                  <span class="review-count">${reviewCount} reseñas</span>
              </div>
              <div class="business-category">
                  <i class="fas fa-${categoriaIcon}"></i> ${categoria}
              </div>
              <a href="#" class="write-review-btn" onclick="openReviewModal(${business.id_Negocios}, '${business.nombre.replace(/'/g, "\\'")}'); return false;">Escribir una reseña</a>
          </div>
      `;
      
      businessContainer.appendChild(businessCard);
  });
}
*/
// Endpoint para negocios públicos (añade esto a tu server.js)
app.get('/api/negocios/publicos', (req, res) => {
  console.log('Solicitud recibida para /api/negocios/publicos');
  
  const query = `
      SELECT n.*, 
             COALESCE(AVG(r.calificacion), 4.5) AS promedio_calificaciones, 
             COUNT(r.id_Resenas) AS total_resenas,
             COALESCE(f.url_foto, '/img/default-restaurant.jpg') AS foto_portada,
             n.categoria
      FROM negocios n
      LEFT JOIN resenas r ON n.id_Negocios = r.id_Negocios
      LEFT JOIN fotos_negocios f ON n.id_Negocios = f.id_Negocios AND f.tipo = 'portada'
      GROUP BY n.id_Negocios
      ORDER BY total_resenas DESC
  `;
  
  db.query(query, (err, resultados) => {
      if (err) {
          console.error('Error al obtener los negocios públicos:', err);
          return res.status(500).json({ error: 'Error al obtener los negocios' });
      }
      
      // Formatea los resultados para asegurarnos de que tengan todos los campos necesarios
      const negociosFormateados = resultados.map(negocio => {
          // Asegurar que promedio_calificaciones sea un número
          const promedio = negocio.promedio_calificaciones ? 
              parseFloat(negocio.promedio_calificaciones).toFixed(1) : '4.5';
          
          // Asegurarse de que imagen contiene una ruta válida
          let imagen = negocio.foto_portada;
          
          // Asignar imagen por categoría si no tiene una
          if (!imagen || imagen === null || imagen === '') {
              const categoria = (negocio.categoria || '').toLowerCase();
              
              if (categoria.includes('pizza')) {
                  imagen = '/img/PIZZA.jpg';
              } else if (categoria.includes('taco')) {
                  imagen = '/img/TACOS.jpg';
              } else if (categoria.includes('cafe')) {
                  imagen = '/img/cafe.jpg';
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
          
          // Asignar categoría por defecto si no tiene
          const categoria = negocio.categoria || 'Restaurante';
          
          return {
              ...negocio,
              promedio_calificaciones: promedio,
              foto_portada: imagen,
              imagen: imagen, // Para compatibilidad con código existente
              total_resenas: negocio.total_resenas || 0,
              categoria: categoria
          };
      });
      
      console.log(`Retornando ${negociosFormateados.length} negocios públicos`);
      res.json(negociosFormateados);
  });
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
      
      // Consulta adaptada para manejar la estructura correcta de la tabla users
      // Modificamos la consulta para usar el campo correcto o proporcionar un valor por defecto
      const query = `
          SELECT 
              r.*,
              COALESCE(u.display_name, 'Usuario anónimo') as nombre_usuario
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
                      
                      const currentDate = new Date();
                      
                      if (resenas.length > 0) {
                          // Actualizar reseña existente
                          db.query(
                              'UPDATE resenas SET calificacion = ?, comentario = ?, fecha_resena = ? WHERE id_Negocios = ? AND id_Usuario = ?',
                              [calificacion, comentario, currentDate, idNegocio, idUsuario],
                              (err) => {
                                  if (err) {
                                      console.error('Error al actualizar reseña:', err);
                                      return res.status(500).json({ error: 'Error al actualizar reseña' });
                                  }
                                  
                                  res.json({ 
                                      message: 'Reseña actualizada correctamente',
                                      id_Resena: resenas[0].id_Resenas
                                  });
                              }
                          );
                      } else {
                          // Crear nueva reseña con la fecha actual
                          db.query(
                              'INSERT INTO resenas (id_Negocios, id_Usuario, calificacion, comentario, fecha_resena) VALUES (?, ?, ?, ?, ?)',
                              [idNegocio, idUsuario, calificacion, comentario, currentDate],
                              (err, result) => {
                                  if (err) {
                                      console.error('Error al crear reseña:', err);
                                      return res.status(500).json({ error: 'Error al crear reseña' });
                                  }
                                  
                                  // Obtener información del usuario para la respuesta
                                  db.query(
                                      'SELECT display_name FROM users WHERE id = ?',
                                      [idUsuario],
                                      (userErr, userData) => {
                                          const userName = userErr || !userData.length ? 'Usuario anónimo' : userData[0].display_name;
                                          
                                          res.status(201).json({ 
                                              message: 'Reseña creada correctamente',
                                              id_Resena: result.insertId,
                                              fecha_resena: currentDate,
                                              nombre_usuario: userName
                                          });
                                      }
                                  );
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

// Configuración para mejorar el manejo de errores
process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesa rechazada no manejada:', reason);
  // No cerrar el servidor, solo registrar el error
});

process.on('uncaughtException', (error) => {
  console.error('Excepción no capturada:', error);
  // No cerrar el servidor a menos que sea crítico
  if (isServerFatalError(error)) {
      console.error('Error fatal en el servidor, cerrando proceso');
      process.exit(1);
  }
});

// Función para determinar si un error es fatal para el servidor
function isServerFatalError(error) {
  // Considera fatal si es un error de sintaxis
  if (error instanceof SyntaxError) return true;
  
  // Considera fatal si es un error de referencia (variable no definida)
  if (error instanceof ReferenceError) return true;
  
  // Considera fatal si el mensaje sugiere un error grave
  if (error.message && (
      error.message.includes('Cannot find module') ||
      error.message.includes('out of memory')
  )) return true;
  
  // Por defecto, no considerar fatal
  return false;
}


// Conexión a la base de datos con reintentos
let dbConnectionAttempts = 0;
const MAX_DB_CONNECTION_ATTEMPTS = 5;

function connectDatabase() {
  dbConnectionAttempts++;
  
  db.getConnection((err, connection) => {
      if (err) {
          console.error(`Error conectando a la base de datos (intento ${dbConnectionAttempts}):`, err);
          
          if (dbConnectionAttempts < MAX_DB_CONNECTION_ATTEMPTS) {
              console.log(`Reintentando conexión en ${dbConnectionAttempts * 3} segundos...`);
              setTimeout(connectDatabase, dbConnectionAttempts * 3000);
              return;
          } else {
              console.error('Número máximo de intentos alcanzado. No se pudo conectar a la base de datos.');
              // No cerrar el servidor, permitir que funcione con funcionalidad limitada
          }
      } else {
          dbConnectionAttempts = 0;
          console.log('Conectado a la base de datos MariaDB');
          connection.release();
      }
  });
}

// Iniciar conexión
connectDatabase();

// Configurar reconexión periódica para verificar estado
setInterval(() => {
  db.getConnection((err, connection) => {
      if (err) {
          console.error('Error en verificación periódica de conexión:', err);
          connectDatabase();
      } else {
          connection.ping((pingErr) => {
              connection.release();
              if (pingErr) {
                  console.error('Error en ping a la base de datos:', pingErr);
                  connectDatabase();
              }
          });
      }
  });
}, 60000); // Cada minuto
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