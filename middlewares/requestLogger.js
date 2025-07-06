// Middleware para logging detallado de requests y responses
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  console.log(`🌐 ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  console.log("📋 Headers:", req.headers);
  console.log("📦 Body:", req.body);
  console.log("📎 Files:", req.files || req.file ? "Archivo presente" : "Sin archivos");
  
  // Interceptar la respuesta
  const originalSend = res.send;
  const originalJson = res.json;
  
  res.send = function(data) {
    const duration = Date.now() - start;
    console.log(`📤 Response enviada en ${duration}ms - Status: ${res.statusCode}`);
    console.log("📄 Response data:", data);
    originalSend.call(this, data);
  };
  
  res.json = function(data) {
    const duration = Date.now() - start;
    console.log(`📤 JSON Response enviada en ${duration}ms - Status: ${res.statusCode}`);
    console.log("📄 JSON Response data:", JSON.stringify(data, null, 2));
    originalJson.call(this, data);
  };
  
  next();
};

module.exports = requestLogger;
