import { supabase, isSupabaseConfigured } from './supabase';

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AgentResponse {
  message: { role: string; content: string };
}

/**
 * Send conversation to the agent Edge Function and return the assistant reply.
 * Uses the current user's JWT for auth and RLS.
 */
const INVALID_JWT_HINT =
  'No se pudo validar el token. Redespliega la función: supabase functions deploy agent';

export async function sendAgentMessage(
  messages: AgentMessage[]
): Promise<AgentResponse> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase not configured');
  }
  const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
  const session = refreshedSession ?? (await supabase.auth.getSession()).data.session;
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  const { data, error } = await supabase.functions.invoke('agent', {
    body: { messages },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) {
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    let serverBody: string | null = null;
    let serverStatus = 0;
    if (baseUrl && session?.access_token) {
      try {
        const r = await fetch(`${baseUrl}/functions/v1/agent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ messages }),
        });
        serverStatus = r.status;
        serverBody = await r.text();
        if (r.status === 401 && serverBody.includes('Invalid JWT')) {
          throw new Error(INVALID_JWT_HINT);
        }
        if (r.status >= 500) {
          let errMsg = serverBody;
          try {
            const parsed = JSON.parse(serverBody);
            if (parsed.error) errMsg = parsed.error;
            else if (parsed.message) errMsg = parsed.message;
          } catch {
            if (serverBody.length > 200) errMsg = serverBody.slice(0, 200) + '…';
          }
          throw new Error(errMsg || `Error del servidor (${r.status})`);
        }
      } catch (e) {
        if (e instanceof Error && e.message === INVALID_JWT_HINT) throw e;
        if (e instanceof Error && e.message !== error.message) throw e;
      }
    }
    throw new Error(error.message ?? 'Agent request failed');
  }
  if (data?.error) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Agent error');
  }
  if (data?.message && typeof data.message.content === 'string') {
    return {
      message: {
        role: data.message.role ?? 'assistant',
        content: data.message.content,
      },
    };
  }
  throw new Error('Unexpected agent response');
}
