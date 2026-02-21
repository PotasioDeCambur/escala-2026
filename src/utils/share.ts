import { saveEscala, updateEscala } from '../supabaseClient';
import { EscalaData } from '../types';

export const linkCache = { currentLink: '', currentId: '' };

export async function saveAndReturnLink(escalaData: any, mes: number, ano: number, existingId?: string): Promise<{ link: string; savedOn: string, id?: string, success?: boolean }> {
  try {
    let row: any;
    const hasExistingId = !!(existingId && !existingId.startsWith('local-'));

    // Se temos um ID existente, tentamos atualizar primeiro
    if (hasExistingId) {
      console.log('🔄 Tentando atualizar escala existente:', existingId);
      row = await updateEscala(existingId, escalaData, mes, ano);

      if (!row) {
        console.error('❌ Falha ao atualizar e ID existente fornecido. Abortando para manter integridade do link.');
        return { link: linkCache.currentLink || `${window.location.origin}/mobile/${existingId}`, savedOn: new Date().toISOString(), id: existingId, success: false };
      }
    } else {
      // Apenas cria nova se NÃO tiver ID existente
      console.log('✨ Criando nova escala no Supabase');
      row = await saveEscala(escalaData, mes, ano);
    }

    // Se AINDA assim não temos row (falhou update E falhou create), aí sim retornamos erro/fallback
    if (!row && hasExistingId) {
      // Isso é um caso extremo onde nem criar novo funcionou
      console.warn('⚠️ Falha total ao salvar (update e insert).');
      const link = `${window.location.origin}/mobile/${existingId}`;
      return { link, savedOn: new Date().toISOString(), id: existingId, success: false };
    }

    if (row && row.id && String(row.id).startsWith('local-')) {
      // Fallback: dados embutidos na URL quando não há Supabase disponível
      const escalaJsonString = JSON.stringify(escalaData);
      const escalaEncoded = btoa(encodeURIComponent(escalaJsonString));
      console.log('⚠️ Encoded data length (fallback):', escalaEncoded.length);
      const link = `${window.location.origin}/mobile?data=${escalaEncoded}`;
      return { link, savedOn: new Date().toISOString(), id: row.id, success: false };
    }

    if (row && row.id) {
      const savedOn = row.inserted_at || new Date().toISOString();
      const link = `${window.location.origin}/mobile/${row.id}`;
      linkCache.currentLink = link;
      linkCache.currentId = row.id;
      return { link, savedOn, id: row.id, success: true };
    }

    // Caso inesperado: retornar fallback com dados embutidos
    const escalaJsonString = JSON.stringify(escalaData);
    const escalaEncoded = btoa(encodeURIComponent(escalaJsonString));
    return { link: `${window.location.origin}/mobile?data=${escalaEncoded}`, savedOn: new Date().toISOString(), success: false };
  } catch (err) {
    console.warn('❌ Erro em saveAndReturnLink:', err);
    const escalaJsonString = JSON.stringify(escalaData);
    const escalaEncoded = btoa(encodeURIComponent(escalaJsonString));
    return { link: `${window.location.origin}/mobile?data=${escalaEncoded}`, savedOn: new Date().toISOString(), success: false };
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.warn('navigator.clipboard.writeText falhou', e);
      // continuar para fallback
    }
  }

  // Fallback antigo
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textArea);
    return !!ok;
  } catch (e) {
    console.warn('Fallback copy failed', e);
    return false;
  }
}
