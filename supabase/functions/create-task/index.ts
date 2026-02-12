// Supabase Edge Function: POST /functions/v1/create-task
// For AI or other clients to create work tasks. Requires Authorization: Bearer <user JWT>.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ENTITY_TYPES = ['client', 'deal', 'project', 'internal'] as const;
const PRIORITIES = ['low', 'medium', 'high'] as const;

type EntityType = (typeof ENTITY_TYPES)[number];
type Priority = (typeof PRIORITIES)[number];

interface CreateTaskBody {
  title: string;
  description?: string | null;
  due_at?: string | null;
  remind_at?: string | null;
  priority?: Priority;
  assignee_user_id?: string | null;
  links?: { entity_type: EntityType; entity_id: string | null }[];
}

function isValidUuid(s: string): boolean {
  const u = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return u.test(s);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Missing or invalid Authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let body: CreateTaskBody;
  try {
    body = (await req.json()) as CreateTaskBody;
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) {
    return new Response(
      JSON.stringify({ error: 'title is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const priority = body.priority && PRIORITIES.includes(body.priority) ? body.priority : 'medium';
  const assigneeUserId = body.assignee_user_id && isValidUuid(body.assignee_user_id)
    ? body.assignee_user_id
    : user.id;
  const dueAt = body.due_at && typeof body.due_at === 'string' ? body.due_at : null;
  const remindAt = body.remind_at && typeof body.remind_at === 'string' ? body.remind_at : null;
  const description = body.description != null && typeof body.description === 'string' ? body.description.trim() || null : null;

  const links = Array.isArray(body.links)
    ? body.links.filter(
        (l) =>
          l &&
          ENTITY_TYPES.includes(l.entity_type as EntityType) &&
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
      assignee_user_id: assigneeUserId,
      created_by_user_id: user.id,
    })
    .select('id, title, created_at')
    .single();

  if (insertError) {
    return new Response(
      JSON.stringify({ error: insertError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (links.length > 0 && taskRow) {
    const linkRows = links.map((l) => ({
      task_id: taskRow.id,
      entity_type: l.entity_type,
      entity_id: l.entity_type === 'internal' ? null : (l.entity_id ?? null),
    }));
    const { error: linksError } = await supabase.from('work_task_links').insert(linkRows);
    if (linksError) {
      // Task already created; log and continue
      console.error('work_task_links insert error', linksError);
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      taskId: taskRow!.id,
      task: { id: taskRow!.id, title: taskRow!.title, created_at: taskRow!.created_at },
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
