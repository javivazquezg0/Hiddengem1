// Script para migrar los negocios existentes y asignarles un usuario
// Guarda este archivo como migrate-businesses.js y ejecútalo con Node.js

require('dotenv').config(); // Si usas variables de entorno
const mysql = require('mysql2');

// Configurar la conexión a la base de datos (usa la misma configuración que en server.js)
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'Hiddengem1',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ID de un usuario administrador que será el propietario de los negocios sin dueño
// IMPORTANTE: Cambia este valor por el ID de un usuario administrador real
const ADMIN_USER_ID = 1;  // ← Cambia este valor

// Función para asignar usuarios a los negocios
async function migrateBusinesses() {
  return new Promise((resolve, reject) => {
    // Primero verificamos que el usuario admin existe
    db.query('SELECT id FROM users WHERE id = ?', [ADMIN_USER_ID], (err, results) => {
      if (err) {
        return reject(new Error(`Error al verificar usuario administrador: ${err.message}`));
      }
      
      if (results.length === 0) {
        return reject(new Error(`El usuario administrador con ID ${ADMIN_USER_ID} no existe`));
      }
      
      console.log(`Usuario administrador verificado (ID: ${ADMIN_USER_ID})`);
      
      // Contamos cuántos negocios no tienen un id_user asignado
      db.query('SELECT COUNT(*) as count FROM negocios WHERE id_user IS NULL', (err, results) => {
        if (err) {
          return reject(new Error(`Error al contar negocios sin usuario: ${err.message}`));
        }
        
        const countNull = results[0].count;
        console.log(`Negocios sin usuario asignado: ${countNull}`);
        
        if (countNull === 0) {
          return resolve(0); // No hay nada que migrar
        }
        
        // Asignar el usuario administrador a todos los negocios sin id_user
        db.query('UPDATE negocios SET id_user = ? WHERE id_user IS NULL', [ADMIN_USER_ID], (err, result) => {
          if (err) {
            return reject(new Error(`Error al actualizar negocios: ${err.message}`));
          }
          
          console.log(`Negocios actualizados: ${result.affectedRows}`);
          resolve(result.affectedRows);
        });
      });
    });
  });
}

// Función para intentar vincular negocios con id_Usuario a usuarios locales si tienen el mismo ID
async function linkGoogleUsers() {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE negocios n
      JOIN users u ON n.id_Usuario = u.id
      SET n.id_user = u.id
      WHERE n.id_user IS NULL AND n.id_Usuario IS NOT NULL
    `;
    
    db.query(query, (err, result) => {
      if (err) {
        return reject(new Error(`Error al vincular usuarios de Google: ${err.message}`));
      }
      
      console.log(`Negocios vinculados con usuarios de Google: ${result.affectedRows}`);
      resolve(result.affectedRows);
    });
  });
}

// Función para mostrar estadísticas de negocios
async function showStatistics() {
  return new Promise((resolve, reject) => {
    db.query('SELECT COUNT(*) as total FROM negocios', (err, results) => {
      if (err) {
        return reject(new Error(`Error al obtener estadísticas: ${err.message}`));
      }
      
      const total = results[0].total;
      
      db.query('SELECT COUNT(*) as withUser FROM negocios WHERE id_user IS NOT NULL', (err, results) => {
        if (err) {
          return reject(new Error(`Error al obtener estadísticas: ${err.message}`));
        }
        
        const withUser = results[0].withUser;
        
        console.log('\n--- ESTADÍSTICAS DE NEGOCIOS ---');
        console.log(`Total de negocios: ${total}`);
        console.log(`Negocios con usuario asignado: ${withUser}`);
        console.log(`Negocios sin usuario asignado: ${total - withUser}`);
        console.log('-------------------------------\n');
        
        resolve();
      });
    });
  });
}

// Ejecución principal
async function main() {
  try {
    console.log('Iniciando proceso de migración...');
    
    // Mostrar estadísticas iniciales
    await showStatistics();
    
    // Primero intentar vincular usuarios de Google si aplica
    console.log('\nVinculando usuarios de Google...');
    const linkedUsers = await linkGoogleUsers();
    
    // Asignar el usuario administrador a los negocios restantes
    console.log('\nAsignando usuario administrador a negocios sin propietario...');
    const migratedCount = await migrateBusinesses();
    
    console.log(`\nProceso finalizado. ${linkedUsers + migratedCount} negocios actualizados en total.`);
    
    // Mostrar estadísticas finales
    await showStatistics();
    
    console.log('Ahora puedes activar la restricción de clave foránea en la base de datos.');
    
    // Cerrar la conexión
    db.end();
    
  } catch (error) {
    console.error(`\nERROR: ${error.message}`);
    db.end();
    process.exit(1);
  }
}

// Ejecutar el script
main();