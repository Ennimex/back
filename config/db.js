const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const dbConnectionString = process.env.MONGODB_URI;

const connect = async () => {
  try {
    await mongoose.connect(dbConnectionString, {
      // Eliminadas las opciones obsoletas:
      // useNewUrlParser: true,       // ← Ya no es necesario
      // useUnifiedTopology: true,    // ← Ya no es necesario
      
      // Opciones recomendadas para producción:
      serverSelectionTimeoutMS: 5000, // 5 segundos para seleccionar servidor
      socketTimeoutMS: 45000,         // 45 segundos de timeout de socket
      maxPoolSize: 10,                // Máximo de conexiones en el pool
      retryWrites: true,              // Reintentar escrituras
      w: 'majority'                   // Confirmación de escritura
    });
    
    console.log('✅ Conectado exitosamente a MongoDB Atlas');
    
    // Eventos de conexión para mejor manejo
    mongoose.connection.on('connected', () => {
      console.log('Mongoose conectado a DB');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error(`Error de conexión en Mongoose: ${err}`);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose desconectado');
    });
    
  } catch (error) {
    console.error('❌ Error de conexión a MongoDB:', error.message);
    process.exit(1);
  }
};

// Manejo de cierre limpio
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('Conexión a MongoDB cerrada por terminación de la aplicación');
  process.exit(0);
});

module.exports = { mongoose, connect };