import { createClient } from '@supabase/supabase-js'

// Configuración de la conexión a PostgreSQL
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)

// Función para Leer (Read)
const fetchEventos = async () => {
  const { data, error } = await supabase.from('eventos_calendario').select('*')
  if (!error) setEventos(data)
}

// Función para Borrar (Delete)
const eliminarEvento = async (id) => {
  const { error } = await supabase.from('eventos_calendario').delete().eq('id', id)
  if (!error) fetchEventos() // Recargar la tabla
}

// Función para Crear (Create)
const agregarEvento = async (nuevoEvento) => {
  const { error } = await supabase.from('eventos_calendario').insert([nuevoEvento])
  if (!error) fetchEventos()
}