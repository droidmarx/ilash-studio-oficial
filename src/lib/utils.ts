import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO, isValid, parse } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Client } from "./api"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Tenta parsear uma data de nascimento que pode estar em vários formatos (ISO ou DD/MM/AAAA)
 */
export function parseBirthday(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  
  // Tenta formato ISO (YYYY-MM-DD)
  const isoDate = parseISO(dateStr);
  if (isValid(isoDate)) return isoDate;

  // Tenta formato brasileiro (DD/MM/YYYY)
  const brDate = parse(dateStr, 'dd/MM/yyyy', new Date());
  if (isValid(brDate)) return brDate;

  // Tenta formato simples YYYY-MM-DD
  const simpleDate = parse(dateStr, 'yyyy-MM-dd', new Date());
  if (isValid(simpleDate)) return simpleDate;

  return null;
}

/**
 * Gera a mensagem de lembrete personalizada para o WhatsApp
 * @param studioAddress - Endereço do estúdio (para clientes novos)
 * @param isNewClient - Se true, inclui o link do Google Maps
 */
export function generateWhatsAppMessage(
  event: Client,
  customTemplate?: string,
  tipoOverride?: string,
  origin?: string,
  studioAddress?: string,
  isNewClient?: boolean
) {
  const getEventDate = (dataStr: string) => {
    try {
      if (dataStr.includes('T')) return parseISO(dataStr);
      return parse(dataStr, 'dd/MM/yyyy', new Date());
    } catch (e) { return new Date(); }
  };

  let dateObj = getEventDate(event.data);
  if (!isValid(dateObj)) dateObj = new Date();

  const dayOfWeek = format(dateObj, "EEEE", { locale: ptBR });
  const formattedDate = format(dateObj, "dd/MM/yyyy", { locale: ptBR });
  const formattedTime = format(dateObj, "HH:mm");
  
  const parseCurrency = (val?: string) => {
    if (!val) return 0;
    const clean = val.replace(/[^\d,.-]/g, "").replace(",", ".");
    return parseFloat(clean) || 0;
  };

  const tipo = tipoOverride || event.tipo;
  
  let valorBaseStr = event.valor || '0,00';
  if (tipo === 'Aplicação' && event.valorAplicacao) valorBaseStr = event.valorAplicacao;
  if (tipo === 'Manutenção' && event.valorManutencao) valorBaseStr = event.valorManutencao;
  if (tipo === 'Remoção' && event.valorRemocao) valorBaseStr = event.valorRemocao;

  const valorBase = parseCurrency(valorBaseStr);
  const adicionais = event.servicosAdicionais || [];
  
  let valorAdicionais = 0;
  let msgAdicionais = "";

  if (event.isUnifiedValue) {
    valorAdicionais = parseCurrency(event.unifiedValue);
    if (adicionais.length > 0) {
      const nomesUnificados = adicionais.map(a => a.nome).join("+");
      msgAdicionais = `\n✨ *Adicionais (Valor Único):* ${nomesUnificados}: R$ ${event.unifiedValue || '0,00'}`;
    }
  } else {
    valorAdicionais = adicionais.reduce((acc, curr) => acc + parseCurrency(curr.valor), 0);
    if (adicionais.length > 0) {
      const listaAdicionais = adicionais.map(a => `${a.nome} (R$ ${a.valor})`).join(", ");
      msgAdicionais = `\n✨ *Adicionais:* ${listaAdicionais}`;
    }
  }

  const total = valorBase + valorAdicionais;

  // Link de confirmação/assinatura da anamnese
  const isAnamneseFilled = !!event.anamnese?.assinatura;
  let anamneseLinkMsg = "";
  if (!isAnamneseFilled && origin) {
    const link = `${origin}/anamnese/${event.id}`;
    anamneseLinkMsg = `\n\n📋 *Ficha de Anamnese:*\nPor favor, acesse o link abaixo para confirmar seus dados e assinar digitalmente:\n🔗 ${link}`;
  }

  // Link do Google Maps para clientes novos (primeiro agendamento)
  let mapsLinkMsg = "";
  if (isNewClient && studioAddress && studioAddress.trim()) {
    const encodedAddress = encodeURIComponent(studioAddress.trim());
    mapsLinkMsg = `\n\n📍 *Como chegar ao I Lash Studio:*\nhttps://maps.google.com/?q=${encodedAddress}`;
  }

  if (customTemplate) {
    let msg = customTemplate;
    msg = msg.replace(/{{cliente}}/g, event.nome.trim());
    msg = msg.replace(/{{tipo}}/g, tipo.toLowerCase());
    msg = msg.replace(/{{dia_semana}}/g, dayOfWeek);
    msg = msg.replace(/{{data}}/g, formattedDate);
    msg = msg.replace(/{{hora}}/g, formattedTime);
    msg = msg.replace(/{{tecnica}}/g, event.servico);
    msg = msg.replace(/{{valor_base}}/g, valorBaseStr);
    msg = msg.replace(/{{valor_total}}/g, total.toFixed(2).replace(".", ","));
    msg = msg.replace(/{{adicionais}}/g, msgAdicionais);
    msg = msg.replace(/{{link_anamnese}}/g, anamneseLinkMsg);
    return msg + mapsLinkMsg;
  }

  const message = `💖*Lembrete de agendamento*

Olá *${event.nome.trim()}*, tudo bem?

✨ Sua *${tipo.toLowerCase()}* de cílios está agendada para *${dayOfWeek}*, dia *${formattedDate}*.

Confira os detalhes abaixo:

⏰ Horário: ${formattedTime}
🎨 Técnica: ${event.servico} (R$ ${valorBaseStr})${msgAdicionais}
💰 *Total: R$ ${total.toFixed(2).replace(".", ",")}*

📌 Em caso de atraso, por favor avise com pelo menos 2 horas de antecedência.

📌 Se houver necessidade de remarcar, peço que avise com no mínimo 1 dia de antecedência.

Em caso de dúvidas ou imprevistos, é só me chamar! 💬
Agradeço pela confiança 💕${anamneseLinkMsg}${mapsLinkMsg}`;

  return message;
}
