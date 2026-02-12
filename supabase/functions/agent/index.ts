// Supabase Edge Function: POST /functions/v1/agent
// IA agent with tool calling. Requires Authorization: Bearer <user JWT>.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ENTITY_TYPES = ['client', 'deal', 'project', 'internal'] as const;
const PRIORITIES = ['low', 'medium', 'high'] as const;

function isValidUuid(s: string): boolean {
  const u = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return u.test(s);
}

const SYSTEM_PROMPT = `Te llamas Finny y eres el asistente del CRM Finomik. Ayudas a los usuarios con tareas, clientes, deals, proyectos, resúmenes del dashboard y búsqueda de documentos en Recursos. Responde en el mismo idioma que el usuario. Sé conciso y útil.`;

// Tool definitions for Gemini (functionDeclarations format)
const GEMINI_TOOLS: Array<{ name: string; description: string; parameters: { type: 'object'; properties?: Record<string, unknown>; required?: string[] } }> = [
  {
    name: 'create_task',
    description: 'Crear una tarea de trabajo para el usuario actual.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título de la tarea' },
        description: { type: 'string', description: 'Descripción opcional' },
        due_at: { type: 'string', description: 'Fecha de vencimiento ISO' },
        remind_at: { type: 'string', description: 'Fecha de recordatorio ISO' },
        priority: { type: 'string', description: 'low, medium o high' },
        links: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              entity_type: { type: 'string', description: 'client, deal, project o internal' },
              entity_id: { type: 'string', description: 'UUID o null para internal' },
            },
          },
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'list_tasks',
    description: 'Listar las tareas de trabajo asignadas al usuario actual.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filtrar por status: open, in_progress' },
        limit: { type: 'number', description: 'Máximo de tareas (default 20)' },
      },
    },
  },
  {
    name: 'list_clients',
    description: 'Listar o buscar clientes del CRM (centros/escuelas).',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Texto de búsqueda en nombre, email, etc.' },
        stage: { type: 'string', description: 'Fase: new, contacted, meeting, proposal, negotiation, won, lost' },
        limit: { type: 'number', description: 'Máximo de resultados (default 20)' },
      },
    },
  },
  {
    name: 'list_deals',
    description: 'Listar deals del pipeline.',
    parameters: {
      type: 'object',
      properties: {
        stage: { type: 'string', description: 'Fase del deal' },
        limit: { type: 'number', description: 'Máximo de resultados (default 20)' },
      },
    },
  },
  {
    name: 'list_projects',
    description: 'Listar proyectos.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'planned, active, on_hold, completed, cancelled' },
        limit: { type: 'number', description: 'Máximo de resultados (default 20)' },
      },
    },
  },
  {
    name: 'get_dashboard',
    description: 'Obtener resumen del dashboard: clientes, deals, pipeline, tareas próximas.',
    parameters: {
      type: 'object',
      properties: {
        date_range: { type: 'string', description: 'last30, last90 o ytd' },
      },
    },
  },
  {
    name: 'search_resources',
    description: 'Buscar documentos y enlaces en la página de Recursos (por título, descripción o alias).',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Texto a buscar' },
        type: { type: 'string', description: 'Tipo: logo, contract, deck, template, report, doc, etc.' },
        status: { type: 'string', description: 'draft, final, archived' },
        limit: { type: 'number', description: 'Máximo de resultados (default 15)' },
      },
      required: ['query'],
    },
  },
];

declare namespace OpenAI {
  interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content?: string | null;
    tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
    tool_call_id?: string;
  }
}

type AgentMessage = OpenAI.ChatMessage & { name?: string };

interface GeminiContentPart {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}
interface GeminiContent {
  role: string;
  parts: GeminiContentPart[];
}
interface GeminiContentsResult {
  systemInstruction?: { parts: Array<{ text: string }> };
  contents: GeminiContent[];
}

function messagesToGeminiContents(messages: AgentMessage[]): GeminiContentsResult {
  const contents: GeminiContent[] = [];
  let i = 0;
  let systemInstruction: { parts: Array<{ text: string }> } | undefined;
  while (i < messages.length) {
    const m = messages[i];
    if (m.role === 'system') {
      if (m.content) systemInstruction = { parts: [{ text: m.content }] };
      i++;
      continue;
    }
    if (m.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: (m.content ?? '').toString() }] });
      i++;
      continue;
    }
    if (m.role === 'assistant') {
      const assistant = m as OpenAI.ChatMessage & { tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> };
      if (assistant.tool_calls?.length) {
        const parts = assistant.tool_calls.map((tc) => {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(tc.function.arguments || '{}');
          } catch {
            args = {};
          }
          return { functionCall: { name: tc.function.name, args } };
        });
        contents.push({ role: 'model', parts });
        i++;
        const toolMessages: AgentMessage[] = [];
        for (let j = 0; j < assistant.tool_calls.length && messages[i]?.role === 'tool'; j++) {
          toolMessages.push(messages[i] as AgentMessage);
          i++;
        }
        contents.push({
          role: 'user',
          parts: toolMessages.map((tm, idx) => ({
            functionResponse: {
              name: assistant.tool_calls![idx].function.name,
              response: { result: (tm.content ?? '').toString() },
            },
          })),
        });
        continue;
      }
      contents.push({ role: 'model', parts: [{ text: (m.content ?? '').toString() }] });
      i++;
      continue;
    }
    i++;
  }
  return { systemInstruction, contents };
}

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function callGemini(
  messages: AgentMessage[],
  apiKey: string
): Promise<{ message: OpenAI.ChatMessage; tool_calls?: OpenAI.ChatMessage['tool_calls'] }> {
  const { systemInstruction, contents } = messagesToGeminiContents(messages);
  const body: Record<string, unknown> = {
    contents,
    tools: [{ functionDeclarations: GEMINI_TOOLS }],
  };
  if (systemInstruction) body.systemInstruction = systemInstruction;

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${err}`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
          functionCall?: { name: string; args?: Record<string, unknown> };
        }>;
      };
    }>;
  };
  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  if (parts.length === 0) throw new Error('No parts in Gemini response');

  const textParts = parts.filter((p) => p.text != null).map((p) => (p as { text: string }).text);
  const functionCallParts = parts.filter((p) => (p as { functionCall?: unknown }).functionCall != null) as Array<{ functionCall: { name: string; args?: Record<string, unknown> } }>;

  if (functionCallParts.length > 0) {
    const tool_calls = functionCallParts.map((p, idx) => ({
      id: `gemini_${idx}_${p.functionCall.name}`,
      type: 'function' as const,
      function: {
        name: p.functionCall.name,
        arguments: typeof p.functionCall.args === 'object' && p.functionCall.args != null
          ? JSON.stringify(p.functionCall.args)
          : '{}',
      },
    }));
    return {
      message: {
        role: 'assistant' as const,
        content: textParts.length ? textParts.join('\n') : null,
        tool_calls,
      },
      tool_calls,
    };
  }

  return {
    message: {
      role: 'assistant' as const,
      content: textParts.join('\n') || null,
      tool_calls: undefined,
    },
    tool_calls: undefined,
  };
}

async function runTool(
  name: string,
  args: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<string> {
  try {
    switch (name) {
      case 'create_task': {
        const title = typeof args.title === 'string' ? args.title.trim() : '';
        if (!title) return JSON.stringify({ error: 'title is required' });
        const priority = args.priority && PRIORITIES.includes(args.priority as typeof PRIORITIES[number]) ? args.priority : 'medium';
        const dueAt = typeof args.due_at === 'string' ? args.due_at : null;
        const remindAt = typeof args.remind_at === 'string' ? args.remind_at : null;
        const description = typeof args.description === 'string' ? args.description.trim() || null : null;
        const links = Array.isArray(args.links)
          ? (args.links as { entity_type?: string; entity_id?: string | null }[]).filter(
              (l) =>
                l &&
                ENTITY_TYPES.includes(l.entity_type as (typeof ENTITY_TYPES)[number]) &&
                (l.entity_id == null || (typeof l.entity_id === 'string' && (l.entity_type === 'internal' || isValidUuid(l.entity_id))))
            )
          : [];
        const { data: taskRow, error: insertError } = await supabase
          .from('work_tasks')
          .insert({
            title,
            description,
            status: 'open',
            priority,
            due_at: dueAt,
            remind_at: remindAt,
            assignee_user_id: userId,
            created_by_user_id: userId,
          })
          .select('id, title, created_at')
          .single();
        if (insertError) return JSON.stringify({ error: insertError.message });
        if (taskRow && links.length > 0) {
          const linkRows = links.map((l: { entity_type: string; entity_id: string | null }) => ({
            task_id: taskRow.id,
            entity_type: l.entity_type,
            entity_id: l.entity_type === 'internal' ? null : (l.entity_id ?? null),
          }));
          await supabase.from('work_task_links').insert(linkRows);
        }
        return JSON.stringify({ success: true, taskId: taskRow?.id, title: taskRow?.title });
      }

      case 'list_tasks': {
        const limit = Math.min(50, Math.max(1, Number(args.limit) || 20));
        const status = args.status === 'in_progress' ? ['in_progress'] : ['open', 'in_progress'];
        const { data, error } = await supabase
          .from('work_tasks')
          .select('id, title, status, priority, due_at, remind_at')
          .eq('assignee_user_id', userId)
          .in('status', status)
          .order('due_at', { ascending: true, nullsFirst: false })
          .limit(limit);
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ tasks: data ?? [] });
      }

      case 'list_clients': {
        const limit = Math.min(50, Math.max(1, Number(args.limit) || 20));
        let q = supabase
          .from('schools')
          .select('id, name, stage, type, email, city, region, contact_person')
          .eq('archived', false)
          .order('updated_at', { ascending: false })
          .limit(limit * 2);
        if (args.stage && typeof args.stage === 'string') q = q.eq('stage', args.stage);
        const { data: rows, error } = await q;
        if (error) return JSON.stringify({ error: error.message });
        let list = (rows ?? []) as { id: string; name: string; stage: string; type: string; email: string; city: string; region: string; contact_person: string }[];
        const search = typeof args.search === 'string' ? args.search.trim().toLowerCase() : '';
        if (search) {
          list = list.filter(
            (c) =>
              (c.name && c.name.toLowerCase().includes(search)) ||
              (c.email && c.email.toLowerCase().includes(search)) ||
              (c.contact_person && c.contact_person.toLowerCase().includes(search)) ||
              (c.city && c.city.toLowerCase().includes(search)) ||
              (c.region && c.region.toLowerCase().includes(search))
          );
        }
        return JSON.stringify({ clients: list.slice(0, limit) });
      }

      case 'list_deals': {
        const limit = Math.min(50, Math.max(1, Number(args.limit) || 20));
        let q = supabase
          .from('deals')
          .select('id, title, stage, value_estimated, currency, expected_close_date, client_id, schools(name)')
          .order('updated_at', { ascending: false })
          .limit(limit);
        if (args.stage && typeof args.stage === 'string') q = q.eq('stage', args.stage);
        const { data: rows, error } = await q;
        if (error) return JSON.stringify({ error: error.message });
        const deals = (rows ?? []).map((r: Record<string, unknown>) => ({
          id: r.id,
          title: r.title,
          stage: r.stage,
          value_estimated: r.value_estimated,
          currency: r.currency,
          expected_close_date: r.expected_close_date,
          client_id: r.client_id,
          clientName: (r.schools as { name?: string } | null)?.name,
        }));
        return JSON.stringify({ deals });
      }

      case 'list_projects': {
        const limit = Math.min(50, Math.max(1, Number(args.limit) || 20));
        let q = supabase
          .from('projects')
          .select('id, title, status, start_date, due_date, client_id, schools(name)')
          .order('updated_at', { ascending: false })
          .limit(limit);
        if (args.status && typeof args.status === 'string') q = q.eq('status', args.status);
        const { data: rows, error } = await q;
        if (error) return JSON.stringify({ error: error.message });
        const projects = (rows ?? []).map((r: Record<string, unknown>) => ({
          id: r.id,
          title: r.title,
          status: r.status,
          start_date: r.start_date,
          due_date: r.due_date,
          client_id: r.client_id,
          clientName: (r.schools as { name?: string } | null)?.name,
        }));
        return JSON.stringify({ projects });
      }

      case 'get_dashboard': {
        const rangeKey = (args.date_range as string) || 'last30';
        const now = new Date();
        const to = now.toISOString().slice(0, 10);
        let from: string;
        if (rangeKey === 'last90') {
          const d = new Date(now);
          d.setDate(d.getDate() - 90);
          from = d.toISOString().slice(0, 10);
        } else if (rangeKey === 'ytd') {
          from = `${now.getFullYear()}-01-01`;
        } else {
          const d = new Date(now);
          d.setDate(d.getDate() - 30);
          from = d.toISOString().slice(0, 10);
        }
        const today = now.toISOString().slice(0, 10);
        const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const [clientsRes, newClientsRes, dealsRes, openDealsRes, projectsRes, tasksRes] = await Promise.all([
          supabase.from('schools').select('id').eq('archived', false),
          supabase.from('schools').select('id').eq('archived', false).gte('created_at', from).lte('created_at', to + 'T23:59:59'),
          supabase.from('deals').select('id, stage, value_estimated, expected_close_date, updated_at, client_id'),
          supabase.from('deals').select('id, stage, value_estimated').neq('stage', 'won').neq('stage', 'lost'),
          supabase.from('projects').select('id, status').eq('status', 'active'),
          supabase.from('tasks').select('id').eq('completed', false).gte('due_date', today).lte('due_date', in7),
        ]);
        const totalClients = (clientsRes.data ?? []).length;
        const newClientsInRange = (newClientsRes.data ?? []).length;
        const deals = (dealsRes.data ?? []) as { stage: string; value_estimated: number | null }[];
        const openDeals = (openDealsRes.data ?? []) as { value_estimated: number | null }[];
        const pipelineValue = openDeals.reduce((s, d) => s + (d.value_estimated ?? 0), 0);
        const openDealsCount = openDeals.length;
        const wonInRange = deals.filter((d) => d.stage === 'won').length;
        const lostInRange = deals.filter((d) => d.stage === 'lost').length;
        const conversionRate = wonInRange + lostInRange > 0 ? Math.round((wonInRange / (wonInRange + lostInRange)) * 100) : null;
        const activeProjectsCount = (projectsRes.data ?? []).length;
        const tasksDueSoonCount = (tasksRes.data ?? []).length;
        return JSON.stringify({
          totalClients,
          newClientsInRange,
          openDealsCount,
          pipelineValue,
          wonDealsInRange: wonInRange,
          conversionRate,
          activeProjectsCount,
          tasksDueSoonCount,
          dateRange: { from, to },
        });
      }

      case 'search_resources': {
        const query = typeof args.query === 'string' ? args.query.trim() : '';
        const limit = Math.min(20, Math.max(1, Number(args.limit) || 15));
        const statusFilter = args.status && typeof args.status === 'string' ? args.status : undefined;
        if (!query) return JSON.stringify({ resources: [], message: 'Provide a search query' });
        const safeTerm = query.slice(0, 100).replace(/,/g, ' ');
        const term = `%${safeTerm}%`;
        let q = supabase
          .from('resources')
          .select('id, title, type, url, status, description, ai_summary')
          .or(`title.ilike.${term},description.ilike.${term},ai_summary.ilike.${term}`)
          .neq('status', 'archived')
          .order('updated_at', { ascending: false })
          .limit(limit);
        if (statusFilter) q = q.eq('status', statusFilter);
        if (args.type && typeof args.type === 'string') q = q.eq('type', args.type);
        const { data: resourceRows, error: resError } = await q;
        if (resError) return JSON.stringify({ error: resError.message });
        let resources = (resourceRows ?? []) as { id: string; title: string; type: string; url: string; status: string; description: string | null; ai_summary: string | null }[];
        const aliasIds = new Set<string>();
        if (resources.length < limit) {
          const { data: aliasRows } = await supabase
            .from('resource_aliases')
            .select('resource_id')
            .ilike('alias', term);
          (aliasRows ?? []).forEach((r: { resource_id: string }) => aliasIds.add(r.resource_id));
        }
        if (aliasIds.size > 0) {
          const { data: aliasResourceRows } = await supabase
            .from('resources')
            .select('id, title, type, url, status, description, ai_summary')
            .in('id', Array.from(aliasIds))
            .neq('status', 'archived')
            .limit(limit);
          const existingIds = new Set(resources.map((r) => r.id));
          for (const r of aliasResourceRows ?? []) {
            if (!existingIds.has((r as { id: string }).id)) {
              resources.push(r as typeof resources[0]);
              existingIds.add((r as { id: string }).id);
            }
          }
        }
        const list = resources.slice(0, limit).map((r) => ({
          id: r.id,
          title: r.title,
          type: r.type,
          url: r.url,
          status: r.status,
          snippet: [r.title, (r.description || '').slice(0, 120), (r.ai_summary || '').slice(0, 120)].filter(Boolean).join(' — ').slice(0, 200),
        }));
        return JSON.stringify({ resources: list });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (e) {
    return JSON.stringify({ error: e instanceof Error ? e.message : String(e) });
  }
}

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Missing or invalid Authorization header' }, 401);
    }
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return jsonResponse({ error: 'GEMINI_API_KEY not configured. Añádela en Supabase → Edge Functions → Secrets.' }, 500);
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    let body: { messages?: Array<{ role: string; content?: string }> };
    try {
      body = (await req.json()) as { messages?: Array<{ role: string; content?: string }> };
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }
    const inputMessages = Array.isArray(body.messages) ? body.messages : [];
    const messages: (OpenAI.ChatMessage & { name?: string })[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...inputMessages
        .filter((m) => m.role && (m.role === 'user' || m.role === 'assistant') && m.content != null)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: String(m.content) })),
    ];
    const maxRounds = 10;
    for (let round = 0; round < maxRounds; round++) {
      const { message, tool_calls } = await callGemini(messages, apiKey);
      messages.push(message);
      if (!tool_calls || tool_calls.length === 0) {
        return jsonResponse({ message: { role: message.role, content: message.content ?? '' } }, 200);
      }
      for (const tc of tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments || '{}');
        } catch {
          args = {};
        }
        const result = await runTool(tc.function.name, args, supabase, user.id);
        messages.push({
          role: 'tool',
          content: result,
          tool_call_id: tc.id,
        } as OpenAI.ChatMessage & { tool_call_id: string });
      }
    }
    const last = messages[messages.length - 1];
    return jsonResponse(
      { message: { role: last?.role ?? 'assistant', content: (last as OpenAI.ChatMessage)?.content ?? 'Lo siento, se ha alcanzado el límite de pasos.' } },
      200
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: msg }, 500);
  }
});
