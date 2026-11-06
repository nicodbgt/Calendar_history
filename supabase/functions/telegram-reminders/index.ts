import { createClient } from "npm:@supabase/supabase-js@2";

const TIME_ZONE = "America/Argentina/Buenos_Aires";
const SAME_DAY_LEAD_HOURS = 2;
const TWO_DAYS_REMINDER_HOUR = 9;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /\b([01]?\d|2[0-3]):([0-5]\d)\b/;
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-telegram-test-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type EventRecord = {
  id: string | number;
  fecha: string;
  horario: string;
  direccion: string | null;
  lugar: string | null;
  cliente: string;
};

type ReminderType = "dos_dias" | "mismo_dia";

function localDateTime(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

function addDateDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function shiftLocalTime(date: string, hour: number, minute: number, hours: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day, hour - hours, minute));
  return `${shifted.toISOString().slice(0, 10)}T${shifted.toISOString().slice(11, 16)}`;
}

function eventStart(event: EventRecord): string | null {
  if (!DATE_PATTERN.test(event.fecha)) return null;
  const match = event.horario.match(TIME_PATTERN);
  if (!match) return null;
  return `${event.fecha}T${match[1].padStart(2, "0")}:${match[2]}`;
}

function formatDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function messageFor(event: EventRecord, type: ReminderType, start: string): string {
  const reminder = type === "dos_dias" ? "En 2 días tenés un trabajo" : "Hoy tenés un trabajo";
  const details = [
    `📅 ${formatDate(event.fecha)} · ${start.slice(11)}`,
    `👤 ${event.cliente}`,
    event.lugar ? `📍 ${event.lugar}` : null,
    event.direccion ? `Dirección: ${event.direccion}` : null,
  ].filter(Boolean);

  return `${reminder}:\n${details.join("\n")}`;
}

async function sendTelegramMessage(token: string, chatId: string, text: string): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  const responseText = await response.text();
  let result: unknown;
  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error(`Telegram API respondió con estado ${response.status} y una respuesta inválida`);
  }

  const isSuccessful = typeof result === "object" && result !== null && "ok" in result && result.ok === true;
  const description =
    typeof result === "object" && result !== null && "description" in result && typeof result.description === "string"
      ? result.description
      : null;
  if (!response.ok || !isSuccessful) {
    const detail = description ? `: ${description}` : "";
    throw new Error(`Telegram API respondió con estado ${response.status}${detail}`);
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { status, headers: CORS_HEADERS });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Método no permitido" }, 405);
  }

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Solicitud JSON inválida" }, 400);
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  const telegramTestSecret = Deno.env.get("TELEGRAM_TEST_SECRET");
  if (body.action === "test") {
    if (!telegramTestSecret) {
      return jsonResponse({ error: "La clave de prueba no está configurada en Supabase" }, 503);
    }
    if (request.headers.get("x-telegram-test-secret") !== telegramTestSecret) {
      return jsonResponse({ error: "Clave de prueba incorrecta" }, 401);
    }
  } else if (!cronSecret || request.headers.get("x-cron-secret") !== cronSecret) {
    return jsonResponse({ error: "No autorizado" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const telegramChatId = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!telegramToken || !telegramChatId) {
    console.error("Falta configurar una o más variables de entorno requeridas");
    return jsonResponse({ error: "Configuración incompleta de Telegram" }, 500);
  }

  if (body.action === "test") {
    try {
      await sendTelegramMessage(
        telegramToken,
        telegramChatId,
        "✅ Prueba de Telegram exitosa. Los avisos del calendario están conectados correctamente.",
      );
      return jsonResponse({ sent: true });
    } catch (error) {
      console.error("No se pudo enviar la prueba de Telegram:", error);
      const detail = error instanceof Error ? error.message : "Error desconocido";
      return jsonResponse({ error: `Telegram rechazó el envío: ${detail}` }, 502);
    }
  }

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Falta configurar una o más variables de entorno requeridas");
    return jsonResponse({ error: "Configuración incompleta de Supabase" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const now = localDateTime(new Date());
  const today = now.slice(0, 10);
  const twoDaysAhead = addDateDays(today, 2);
  const { data: events, error: eventsError } = await supabase
    .from("eventos_calendario")
    .select("id, fecha, horario, direccion, lugar, cliente")
    .gte("fecha", today)
    .lte("fecha", twoDaysAhead);

  if (eventsError) {
    console.error("No se pudieron consultar los trabajos:", eventsError.message);
    return jsonResponse({ error: "Error consultando los trabajos" }, 500);
  }

  let sent = 0;
  const failures: string[] = [];

  for (const event of (events ?? []) as EventRecord[]) {
    const start = eventStart(event);
    if (!start) {
      console.warn(`Se omite el trabajo ${event.id}: fecha u horario inválido`);
      continue;
    }

    const candidates: { type: ReminderType; due: string }[] = [
      {
        type: "dos_dias",
        due: `${addDateDays(event.fecha, -2)}T${String(TWO_DAYS_REMINDER_HOUR).padStart(2, "0")}:00`,
      },
      {
        type: "mismo_dia",
        due: shiftLocalTime(event.fecha, Number(start.slice(11, 13)), Number(start.slice(14, 16)), SAME_DAY_LEAD_HOURS),
      },
    ];

    for (const { type, due } of candidates) {
      if (now < due || now >= start) continue;

      const reservation = {
        evento_id: String(event.id),
        tipo: type,
        fecha: event.fecha,
        horario_inicio: start.slice(11),
      };
      const { data: claimed, error: claimError } = await supabase
        .from("telegram_recordatorios")
        .upsert(reservation, {
          onConflict: "evento_id,tipo,fecha,horario_inicio",
          ignoreDuplicates: true,
        })
        .select("evento_id");

      if (claimError) {
        console.error(`No se pudo reservar el recordatorio del trabajo ${event.id}:`, claimError.message);
        failures.push(String(event.id));
        continue;
      }
      if (!claimed?.length) continue;

      try {
        await sendTelegramMessage(telegramToken, telegramChatId, messageFor(event, type, start));
        sent += 1;
      } catch (error) {
        const { error: releaseError } = await supabase
          .from("telegram_recordatorios")
          .delete()
          .match(reservation);
        if (releaseError) {
          console.error(`No se pudo liberar el recordatorio del trabajo ${event.id}:`, releaseError.message);
        }
        console.error(`No se pudo enviar el recordatorio del trabajo ${event.id}:`, error);
        failures.push(String(event.id));
      }
    }
  }

  if (failures.length) {
    return jsonResponse({ sent, failed: failures.length }, 500);
  }

  return jsonResponse({ sent });
});
