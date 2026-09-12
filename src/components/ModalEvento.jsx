import React, { useState, useEffect } from 'react';

export default function ModalEvento({ isOpen, onClose, onSave, eventoEditar }) {
  const [formData, setFormData] = useState({
    fecha: '', horario: '', direccion: '', lugar: '', cliente: ''
  });

  useEffect(() => {
    if (eventoEditar) {
      setFormData(eventoEditar);
    } else {
      setFormData({ fecha: '', horario: '', direccion: '', lugar: '', cliente: '' });
    }
  }, [eventoEditar, isOpen]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-heading">
          <span className="modal-kicker">Calendario</span>
          <button type="button" onClick={onClose} className="close-button" aria-label="Cerrar formulario">×</button>
        </div>
        <h2 className="modal-title">
          {eventoEditar ? 'editar evento' : 'nuevo evento'}
        </h2>
        
        <form onSubmit={handleSubmit} className="event-form">
          <label className="form-field">
            <span>Fecha</span>
          <input type="date" name="fecha" value={formData.fecha} onChange={handleChange} required
            />
          </label>
          <label className="form-field">
            <span>Horario</span>
          <input type="text" name="horario" placeholder="Ej: 18:30 a 19:30" value={formData.horario} onChange={handleChange} required
            />
          </label>
          <label className="form-field">
            <span>Dirección</span>
          <input type="text" name="direccion" placeholder="Dirección" value={formData.direccion} onChange={handleChange} 
            />
          </label>
          <label className="form-field">
            <span>Lugar</span>
          <input type="text" name="lugar" placeholder="Lugar" value={formData.lugar} onChange={handleChange} 
            />
          </label>
          <label className="form-field">
            <span>Cliente</span>
          <input type="text" name="cliente" placeholder="Cliente" value={formData.cliente} onChange={handleChange} required
            />
          </label>
          
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancelar
            </button>
            <button type="submit" className="save-button">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}