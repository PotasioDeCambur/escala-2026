import { EscalaData } from '../types';

export interface HistoryMetadata {
    id: string;
    mes: number;
    ano: number;
    timestamp: number;
    funcionariosCount: number;
    name?: string; // Optional custom name
}

const INDEX_KEY = 'escala_history_index';
const SNAPSHOT_PREFIX = 'escala_snapshot_';

// Gera um ID único curto
const generateId = () => Math.random().toString(36).substr(2, 9);

export const getHistoryIndex = (): HistoryMetadata[] => {
    try {
        const raw = localStorage.getItem(INDEX_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

export const saveSnapshot = (escala: EscalaData, mes: number, ano: number, name?: string): HistoryMetadata => {
    const id = generateId();
    const metadata: HistoryMetadata = {
        id,
        mes,
        ano,
        timestamp: Date.now(),
        funcionariosCount: escala.funcionarios.length,
        name
    };

    // 1. Salvar Snapshot
    localStorage.setItem(`${SNAPSHOT_PREFIX}${id}`, JSON.stringify(escala));

    // 2. Atualizar Index
    const index = getHistoryIndex();
    // Adiciona no início
    const newIndex = [metadata, ...index];
    localStorage.setItem(INDEX_KEY, JSON.stringify(newIndex));

    return metadata;
};

export const loadSnapshot = (id: string): EscalaData | null => {
    try {
        const raw = localStorage.getItem(`${SNAPSHOT_PREFIX}${id}`);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

export const deleteSnapshot = (id: string) => {
    // 1. Remove do Index
    const index = getHistoryIndex();
    const newIndex = index.filter(item => item.id !== id);
    localStorage.setItem(INDEX_KEY, JSON.stringify(newIndex));

    // 2. Remove Dado Bruto
    localStorage.removeItem(`${SNAPSHOT_PREFIX}${id}`);
};

export const formatHistoryDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};
