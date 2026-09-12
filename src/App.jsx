import React, { useState, useEffect } from 'react';
import {
  obtenerEventos,
  crearEvento,
  actualizarEvento,
  actualizarAsistencia,
  eliminarEvento,
} from './services/eventosService';
import ModalEvento from './components/ModalEvento';

export default function App() {
  const [eventos, setEventos] = useState([]);
  const [eventosAsistidos, setEventosAsistidos] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventoEditando, setEventoEditando] = useState(null);

  // Cargar datos al montar
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const data = await obtenerEventos();
      setEventos(data);
      setEventosAsistidos((asistidos) => Object.fromEntries(
        data.map((evento) => [
          evento.id,
          evento.asistido !== undefined ? Boolean(evento.asistido) : Boolean(asistidos[evento.id]),
        ]),
      ));
    } catch (error) {
      console.error("Error cargando eventos:", error);
    }
  };

  const handleGuardar = async (eventoData) => {
    try {
      if (eventoData.id) {
        await actualizarEvento(eventoData.id, eventoData);
      } else {
        await crearEvento(eventoData);
      }
      setIsModalOpen(false);
      cargarDatos(); // Refrescar la tabla
    } catch (error) {
      console.error("Error guardando:", error);
    }
  };

  const handleEliminar = async (id) => {
    if(window.confirm('¿Eliminar este evento?')) {
      try {
        await eliminarEvento(id);
        cargarDatos();
      } catch (error) {
        console.error("Error eliminando:", error);
      }
    }
  };

  const abrirModalNuevo = () => {
    setEventoEditando(null);
    setIsModalOpen(true);
  };

  const abrirModalEditar = (evento) => {
    setEventoEditando(evento);
    setIsModalOpen(true);
  };

  const cambiarAsistencia = async (id) => {
    const estadoAnterior = Boolean(eventosAsistidos[id]);
    const nuevoEstado = !estadoAnterior;

    setEventosAsistidos((asistidos) => ({
      ...asistidos,
      [id]: nuevoEstado,
    }));

    try {
      await actualizarAsistencia(id, nuevoEstado);
    } catch (error) {
      setEventosAsistidos((asistidos) => ({
        ...asistidos,
        [id]: estadoAnterior,
      }));
      console.error('Error guardando asistencia:', error);
    }
  };

  // Fecha con formato local
  const fechaHoy = new Intl.DateTimeFormat('es-AR', { 
    day: '2-digit', month: '2-digit', year: 'numeric' 
  }).format(new Date());

  return (
    <main className="app-shell">
      <div className="calendar-panel">
        
        {/* Header */}
        <div className="calendar-header">
          <div className="date-badge">
            <p>Hoy es</p>
            <p className="date-value">{fechaHoy}</p>
          </div>
          <h1 className="page-title">
            calendario
          </h1>
          <button onClick={abrirModalNuevo} className="add-button">
            <span aria-hidden="true">+</span> Agregar
          </button>
        </div>

        {/* Tabla */}
        <div className="table-frame">
          <table className="events-table">
            <thead>
              <tr>
                <th>asistido</th>
                <th>fecha</th>
                <th>horario</th>
                <th>dirección</th>
                <th>lugar</th>
                <th>cliente</th>
                <th>opciones</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((evento) => (
                <tr key={evento.id} className={eventosAsistidos[evento.id] ? 'attended-row' : ''}>
                  <td className="attendance-cell">
                    <input
                      type="checkbox"
                      checked={Boolean(eventosAsistidos[evento.id])}
                      onChange={() => cambiarAsistencia(evento.id)}
                      aria-label={`Marcar ${evento.cliente} como asistido`}
                    />
                  </td>
                  <td>{evento.fecha}</td>
                  <td className="time-cell">{evento.horario}</td>
                  <td>{evento.direccion || '-'}</td>
                  <td>{evento.lugar || '-'}</td>
                  <td>{evento.cliente}</td>
                  <td className="event-actions">
                    <button onClick={() => abrirModalEditar(evento)} className="edit-button">
                      editar
                    </button>
                    <button onClick={() => handleEliminar(evento.id)} className="delete-button">
                      eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ModalEvento 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleGuardar}
        eventoEditar={eventoEditando}
      />
    </main>
  );
}