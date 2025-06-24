// Middleware para auto-eliminación de eventos
// Este middleware calcula automáticamente la fecha de eliminación para eventos

const calcularFechaEliminacion = function(next) {
  if (this.fecha && !this.fechaEliminacion) {
    // Crear fecha de eliminación: 12 horas después del evento
    const fechaEvento = new Date(this.fecha);
    
    // Si tiene hora de fin, usar esa hora, sino usar medianoche
    if (this.horaFin) {
      const [horas, minutos] = this.horaFin.split(':');
      fechaEvento.setHours(parseInt(horas), parseInt(minutos), 0, 0);
    } else {
      fechaEvento.setHours(23, 59, 59, 999); // Final del día
    }
    
    // Agregar 12 horas para la eliminación automática
    this.fechaEliminacion = new Date(fechaEvento.getTime() + (12 * 60 * 60 * 1000));
    
    console.log(`Evento "${this.titulo}" se eliminará automáticamente el: ${this.fechaEliminacion}`);
  }
  next();
};

// Middleware para actualización (findOneAndUpdate)
const calcularFechaEliminacionUpdate = function(next) {
  const update = this.getUpdate();
  
  if (update.fecha || update.horaFin) {
    const fechaEvento = new Date(update.fecha || new Date());
    
    if (update.horaFin) {
      const [horas, minutos] = update.horaFin.split(':');
      fechaEvento.setHours(parseInt(horas), parseInt(minutos), 0, 0);
    } else {
      fechaEvento.setHours(23, 59, 59, 999);
    }
    
    // Agregar 12 horas para la eliminación automática
    update.fechaEliminacion = new Date(fechaEvento.getTime() + (12 * 60 * 60 * 1000));
    
    console.log(`Evento se eliminará automáticamente el: ${update.fechaEliminacion}`);
  }
  next();
};

module.exports = {
  calcularFechaEliminacion,
  calcularFechaEliminacionUpdate
};
