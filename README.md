# Calendario de trabajos

## Recordatorios por Telegram

Una función programada de Supabase envía dos avisos por cada trabajo:

- Dos días antes, a las 09:00 (hora de Argentina).
- El mismo día, dos horas antes del primer horario que aparezca en el campo `horario` (por ejemplo, `18:30 a 19:30`).

La función revisa los trabajos cada minuto. Los avisos ya enviados quedan registrados para evitar duplicados. Si se edita la fecha o el horario de un trabajo, se habilitan recordatorios para la nueva fecha y horario.
