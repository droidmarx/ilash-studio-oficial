import { supabase } from './supabase';

export const DEFAULT_API_URL = '';
export const SETTINGS_API_URL = '';

export interface ServicoAdicional {
  nome: string;
  valor: string;
}

export interface Recipient {
  id: string;
  nome: string;
  chatID: string;
}

export interface Perfil {
  id: string;
  slug: string;
  nome_exibicao: string;
  logo_url?: string;
}

export interface Anamnese {
  cpf?: string;
  rg?: string;
  profissao?: string;
  dataNascimento?: string;
  procedimentoRecenteOlhos?: boolean;
  alergiaCosmeticos?: boolean;
  problemaTireoide?: boolean;
  problemaOcular?: boolean;
  tratamentoOncologico?: boolean;
  dormeDeLado?: 'Não' | 'Sim, Lado Direito' | 'Sim, Lado Esquerdo' | 'Sim, Ambos os lados';
  gestanteLactante?: boolean;
  observacoesGerais?: string;
  autorizaImagem?: boolean;
  assinatura?: string;
}

export interface WorkingDay {
  active: boolean;
  start: string;
  end: string;
}

export interface WorkingHours {
  dom: WorkingDay;
  seg: WorkingDay;
  ter: WorkingDay;
  qua: WorkingDay;
  qui: WorkingDay;
  sex: WorkingDay;
  sab: WorkingDay;
}

export interface VacationMode {
  active: boolean;
  message: string;
}

export interface TelegramSettings {
  dailySummary: boolean;
  reminder2h: boolean;
}

export const defaultWorkingHours: WorkingHours = {
  dom: { active: false, start: "09:00", end: "18:00" },
  seg: { active: true, start: "09:00", end: "18:00" },
  ter: { active: true, start: "09:00", end: "18:00" },
  qua: { active: true, start: "09:00", end: "18:00" },
  qui: { active: true, start: "09:00", end: "18:00" },
  sex: { active: true, start: "09:00", end: "18:00" },
  sab: { active: true, start: "09:00", end: "14:00" },
};

export const defaultVacationMode: VacationMode = {
  active: false,
  message: "Estamos de férias! Retornamos em breve.",
};

export const defaultTelegramSettings: TelegramSettings = {
  dailySummary: true,
  reminder2h: true,
};

export const defaultTechniques: string[] = ["Brasileiro", "Egípcio", "4D", "5D", "Fio-a-Fio", "Fox"];

export interface Client {
  id: string;
  nome: string;
  data: string;
  servico: string;
  tipo: 'Aplicação' | 'Manutenção' | 'Remoção' | string;
  valor?: string;
  valorAplicacao?: string;
  valorManutencao?: string;
  valorRemocao?: string;
  whatsapp?: string;
  observacoes?: string;
  aniversario?: string;
  servicosAdicionais?: ServicoAdicional[];
  anamnese?: Anamnese;
  isUnifiedValue?: boolean;
  unifiedValue?: string;
  confirmado?: boolean;
  reminderSent?: boolean;
}

export async function getRecipients(userId?: string): Promise<Recipient[]> {
  let query = supabase
    .from('configuracoes')
    .select('*');
  
  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Erro ao buscar configurações:', error);
    return [];
  }
  
  return data.map((item: any) => ({
    id: item.id,
    nome: item.nome,
    chatID: item.valor
  }));
}

export async function getTelegramToken(userId?: string): Promise<string | null> {
  // O token agora é global e deve ser definido no ambiente
  return process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || null;
}

export async function uploadLogo(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}-${Math.random()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('logos')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('logos')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export async function updateTelegramToken(token: string): Promise<void> {
  // Função desativada: o token agora é global e gerenciado via variáveis de ambiente
  console.warn('updateTelegramToken chamada, mas a funcionalidade foi desativada.');
}

export async function getWebhookStatus(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false; // If no user, cannot get user-specific webhook status

  const { data, error } = await supabase
    .from('configuracoes')
    .select('valor')
    .eq('nome', 'WEBHOOK_STATE')
    .eq('user_id', user.id) // Add user_id to the query
    .maybeSingle();
  
  if (error || !data) return false;
  return data.valor === 'ACTIVE';
}

export async function updateWebhookStatus(active: boolean): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('configuracoes')
    .upsert({ user_id: user.id, nome: 'WEBHOOK_STATE', valor: active ? 'ACTIVE' : 'INACTIVE' }, { onConflict: 'user_id, nome' });
}

export async function getWorkingHours(userId?: string): Promise<WorkingHours> {
  try {
    let query = supabase
      .from('configuracoes')
      .select('valor')
      .eq('nome', 'WORKING_HOURS');
    
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.maybeSingle();
    
    if (error || !data) return defaultWorkingHours;
    return JSON.parse(data.valor);
  } catch {
    return defaultWorkingHours;
  }
}

export async function updateWorkingHours(hours: WorkingHours): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const value = JSON.stringify(hours);
  await supabase
    .from('configuracoes')
    .upsert({ user_id: user.id, nome: 'WORKING_HOURS', valor: value }, { onConflict: 'user_id, nome' });
}

export async function getVacationMode(userId?: string): Promise<VacationMode> {
  try {
    let query = supabase
      .from('configuracoes')
      .select('valor')
      .eq('nome', 'VACATION_MODE');
    
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.maybeSingle();
    
    if (error || !data) return defaultVacationMode;
    return JSON.parse(data.valor);
  } catch {
    return defaultVacationMode;
  }
}

export async function updateVacationMode(mode: VacationMode): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const value = JSON.stringify(mode);
  await supabase
    .from('configuracoes')
    .upsert({ user_id: user.id, nome: 'VACATION_MODE', valor: value }, { onConflict: 'user_id, nome' });
}

export async function getTelegramConfig(userId?: string): Promise<TelegramSettings> {
  try {
    let query = supabase
      .from('configuracoes')
      .select('valor')
      .eq('nome', 'TELEGRAM_CONFIG');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.maybeSingle();
    
    if (error || !data) return defaultTelegramSettings;
    return JSON.parse(data.valor);
  } catch {
    return defaultTelegramSettings;
  }
}

export async function updateTelegramConfig(settings: TelegramSettings): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const value = JSON.stringify(settings);
  await supabase
    .from('configuracoes')
    .upsert({ user_id: user.id, nome: 'TELEGRAM_CONFIG', valor: value }, { onConflict: 'user_id, nome' });
}

export async function getTechniques(userId?: string): Promise<string[]> {
  try {
    let query = supabase
      .from('configuracoes')
      .select('valor')
      .eq('nome', 'TECHNIQUES');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.maybeSingle();
    
    if (error || !data) return defaultTechniques;
    return JSON.parse(data.valor);
  } catch {
    return defaultTechniques;
  }
}

export async function updateTechniques(techniques: string[]): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const value = JSON.stringify(techniques);
  await supabase
    .from('configuracoes')
    .upsert({ user_id: user.id, nome: 'TECHNIQUES', valor: value }, { onConflict: 'user_id, nome' });
}

export async function updateRecipient(recipient: Recipient): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from('configuracoes')
    .update({ nome: recipient.nome, valor: recipient.chatID })
    .eq('id', recipient.id)
    .eq('user_id', user.id);
  
  if (error) throw error;
}

export async function createRecipient(recipient: Omit<Recipient, 'id'>, userId?: string): Promise<void> {
  let targetUserId = userId;
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    targetUserId = user?.id;
  }
  if (!targetUserId) return;

  const { error } = await supabase
    .from('configuracoes')
    .insert({ user_id: targetUserId, nome: recipient.nome, valor: recipient.chatID });
  
  if (error) throw error;
}

export async function deleteRecipient(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from('configuracoes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  
  if (error) throw error;
}

export async function getClients(userId?: string): Promise<Client[]> {
  let query = supabase
    .from('agendamentos')
    .select('*')
    .order('data', { ascending: true });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Erro ao buscar clientes:', error);
    return [];
  }
  
  return data.map(mapToClient);
}

export async function getClient(id: string): Promise<Client> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { data, error } = await supabase
    .from('agendamentos')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();
  
  if (error) throw error;
  return mapToClient(data);
}

export async function createClient(data: Omit<Client, 'id'>, userId?: string): Promise<Client> {
  const payload = mapToDb(data);
  if (userId) {
    payload.user_id = userId;
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      payload.user_id = user.id;
    } else {
      throw new Error("Usuário não autenticado e userId não fornecido");
    }
  }

  const { data: inserted, error } = await supabase
    .from('agendamentos')
    .insert(payload)
    .select()
    .single();
  
  if (error) throw error;
  return mapToClient(inserted);
}

export async function updateClient(id: string, data: Partial<Client>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { error } = await supabase
    .from('agendamentos')
    .update(mapToDb(data))
    .eq('id', id)
    .eq('user_id', user.id);
  
  if (error) throw error;
}

export async function deleteClient(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { error } = await supabase
    .from('agendamentos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  
  if (error) throw error;
}

export async function getProfile(): Promise<Perfil | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('perfis')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  
  if (error) {
    console.error("Erro ao buscar perfil:", error);
    return null;
  }
  
  // Se não existir, criar um perfil básico para o usuário
  if (!data) {
    const newProfile = {
      id: user.id,
      slug: `studio-${user.id.substring(0, 5)}`,
      nome_exibicao: "Meu Novo Studio",
      logo_url: ""
    }
    const { data: created, error: createError } = await supabase
      .from('perfis')
      .insert(newProfile)
      .select()
      .single();
    
    if (createError) {
      console.error("Erro ao criar perfil inicial:", createError);
      return null;
    }
    return created;
  }

  return data;
}

export async function getProfileBySlug(slug: string): Promise<Perfil | null> {
  const { data, error } = await supabase
    .from('perfis')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  
  if (error) return null;
  return data;
}

export async function createProfile(perfil: Omit<Perfil, 'id'>): Promise<Perfil> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { data, error } = await supabase
    .from('perfis')
    .insert({ ...perfil, id: user.id })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateProfile(perfil: Partial<Perfil>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  // Removemos o ID do objeto de update para não tentar sobrescrever a PK se já enviada
  const { id, ...updateData } = perfil as any;

  const { error } = await supabase
    .from('perfis')
    .update(updateData)
    .eq('id', user.id);
  
  if (error) {
    console.error("Erro ao atualizar perfil:", error);
    throw error;
  }
}

export async function checkSlugAvailability(slug: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('perfis')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle();
  
  return !data && !error;
}

export async function getLastSummaryDate(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('configuracoes')
    .select('valor')
    .eq('nome', 'SUMMARY_STATE')
    .eq('user_id', user.id) // Add user_id to the query
    .maybeSingle();
  
  if (error || !data) return null;
  return data.valor;
}

export async function updateLastSummaryDate(dateStr: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('configuracoes')
    .upsert({ user_id: user.id, nome: 'SUMMARY_STATE', valor: dateStr }, { onConflict: 'user_id, nome' });
}

export async function setTelegramWebhook(token: string, url: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    // Webhook global, opcionalmente passamos o userId para facilitar logs, 
    // mas a identificação principal será pelo chat_id no corpo da mensagem.
    const webhookUrl = url ? `${url}/api/telegram/webhook` : "";
    
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl }),
    });
    const result = await response.json();
    return result.ok;
  } catch (error) {
    console.error('[Webhook Error]', error);
    return false;
  }
}

function mapToClient(db: any): Client {
  return {
    id: db.id,
    nome: db.nome,
    data: db.data,
    servico: db.servico,
    tipo: db.tipo,
    valor: db.valor,
    valorAplicacao: db.valor_aplicacao,
    valorManutencao: db.valor_manutencao,
    valorRemocao: db.valor_remocao,
    whatsapp: db.whatsapp,
    observacoes: db.observacoes,
    aniversario: db.aniversario,
    isUnifiedValue: db.is_unified_value,
    unifiedValue: db.unified_value,
    confirmado: db.confirmado,
    reminderSent: db.reminder_sent,
    anamnese: db.anamnese,
    servicosAdicionais: db.servicos_adicionais
  };
}

function mapToDb(client: any): any {
  const db: any = {};
  if (client.nome !== undefined) db.nome = client.nome;
  if (client.data !== undefined) db.data = client.data;
  if (client.servico !== undefined) db.servico = client.servico;
  if (client.tipo !== undefined) db.tipo = client.tipo;
  if (client.valor !== undefined) db.valor = client.valor;
  if (client.valorAplicacao !== undefined) db.valor_aplicacao = client.valorAplicacao;
  if (client.valorManutencao !== undefined) db.valor_manutencao = client.valorManutencao;
  if (client.valorRemocao !== undefined) db.valor_remocao = client.valorRemocao;
  if (client.whatsapp !== undefined) db.whatsapp = client.whatsapp;
  if (client.observacoes !== undefined) db.observacoes = client.observacoes;
  if (client.aniversario !== undefined) db.aniversario = client.aniversario;
  if (client.isUnifiedValue !== undefined) db.is_unified_value = client.isUnifiedValue;
  if (client.unifiedValue !== undefined) db.unified_value = client.unifiedValue;
  if (client.confirmado !== undefined) db.confirmado = client.confirmado;
  if (client.reminderSent !== undefined) db.reminder_sent = client.reminderSent;
  if (client.anamnese !== undefined) db.anamnese = client.anamnese;
  if (client.servicosAdicionais !== undefined) db.servicos_adicionais = client.servicosAdicionais;
  return db;
}