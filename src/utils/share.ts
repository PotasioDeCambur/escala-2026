import { saveEscala } from '../supabaseClient';

export async function saveAndReturnLink(escalaData: any, mes: number, ano: number): Promise<{ link: string; savedOn: string }> {
  try {
    const row: any = await saveEscala(escalaData, mes, ano);
    if (row && row.id && String(row.id).startsWith('local-')) {
      // Fallback: dados embutidos na URL quando não há Supabase disponível
      const escalaJsonString = JSON.stringify(escalaData);
      const escalaEncoded = btoa(encodeURIComponent(escalaJsonString));
      console.log('Encoded data length:', escalaEncoded.length);
      return { link: `${window.location.origin}/mobile?data=${escalaEncoded}`, savedOn: new Date().toISOString() };
    }

    if (row && row.id) {
      const savedOn = row.inserted_at || new Date().toISOString();
      return { link: `${window.location.origin}/mobile/${row.id}`, savedOn };
    }

    // Caso inesperado: retornar fallback com dados embutidos
    const escalaJsonString = JSON.stringify(escalaData);
    const escalaEncoded = btoa(encodeURIComponent(escalaJsonString));
    console.log('Encoded data length (fallback):', escalaEncoded.length);
    return { link: `${window.location.origin}/mobile?data=${escalaEncoded}`, savedOn: new Date().toISOString() };
  } catch (err) {
    console.warn('Erro em saveAndReturnLink:', err);
    const escalaJsonString = JSON.stringify(escalaData);
    const escalaEncoded = btoa(encodeURIComponent(escalaJsonString));
    console.log('Encoded data length (catch):', escalaEncoded.length);
    return { link: `${window.location.origin}/mobile?data=${escalaEncoded}`, savedOn: new Date().toISOString() };
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
