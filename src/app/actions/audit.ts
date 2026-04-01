'use server';

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendTelegramNotification } from "./notifications";

export async function logAction(data: {
  user_id: string;
  acao: string;
  cliente_id: string;
  detalhes: any;
  antes?: any;
  depois?: any;
}) {
  const { error } = await supabaseAdmin
    .from('logs_acoes')
    .insert([{
      ...data,
      data: new Date().toISOString()
    }]);
  
  if (error) console.error("Erro ao registrar log:", error);

  // Enviar para Telegram também (PASSO 8)
  try {
    await sendTelegramNotification({
      tipo: data.acao === 'Remoção' ? 'Removido' : (data.acao === 'Confirmação' ? 'Confirmado' : 'Alterado'),
      cliente: data.depois || data.antes,
      antes: data.antes,
      depois: data.depois,
      userId: data.user_id
    });
  } catch (e) {
    console.error("Erro ao enviar log para Telegram:", e);
  }
}
