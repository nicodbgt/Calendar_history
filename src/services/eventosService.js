import { supabase } from '../config/database';

export const obtenerEventos = async () => {
  const { data, error } = await supabase
    .from('eventos_calendario')
    .select('*')
    .order('fecha', { ascending: true }); // Ordena por fecha
  
  if (error) throw new Error(error.message);
  return data;
};

export const crearEvento = async (evento) => {
  const { data, error } = await supabase
    .from('eventos_calendario')
    .insert([evento])
    .select();
    
  if (error) throw new Error(error.message);
  return data[0];
};

export const actualizarEvento = async (id, evento) => {
  const { data, error } = await supabase
    .from('eventos_calendario')
    .update(evento)
    .eq('id', id)
    .select();
    
  if (error) throw new Error(error.message);
  return data[0];
};

export const actualizarAsistencia = async (id, asistido) => {
  const { data, error } = await supabase
    .from('eventos_calendario')
    .update({ asistido })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const eliminarEvento = async (id) => {
  const { error } = await supabase
    .from('eventos_calendario')
    .delete()
    .eq('id', id);
    
  if (error) throw new Error(error.message);
  return true;
};