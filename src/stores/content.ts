'use client';

import { create } from 'zustand';
import type { Lesson, Professor } from '@/core/domain/types';
import { api } from '@/services/api';

// Professores e aulas vêm do servidor (são iguais para todas as contas).
// Alunos recebem só o que está publicado; professores e admins recebem tudo.

export type LessonInput = Omit<Lesson, 'id' | 'createdAt'> & { id?: string };
export type ProfessorInput = Omit<Professor, 'id'> & { id?: string };

interface ContentState {
  professors: Professor[];
  lessons: Lesson[];
  /** O servidor guarda arquivos de vídeo? (na Cloudflare, não: só link) */
  uploads: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  saveLesson: (input: LessonInput) => Promise<Lesson>;
  removeLesson: (id: string) => Promise<void>;
  saveProfessor: (input: ProfessorInput) => Promise<Professor>;
  removeProfessor: (id: string) => Promise<void>;
}

const upsert = <T extends { id: string }>(list: T[], item: T) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];

export const useContentStore = create<ContentState>()((set) => ({
  professors: [],
  lessons: [],
  uploads: false,
  loaded: false,
  load: async () => {
    try {
      const data = await api<{ professors: Professor[]; lessons: Lesson[]; features?: { uploads?: boolean } }>('/api/content');
      set({ professors: data.professors, lessons: data.lessons, uploads: !!data.features?.uploads, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
  saveLesson: async (input) => {
    const { lesson } = await api<{ lesson: Lesson }>('/api/content/lessons', { body: input });
    set((s) => ({ lessons: upsert(s.lessons, lesson) }));
    return lesson;
  },
  removeLesson: async (id) => {
    await api(`/api/content/lessons/${id}`, { method: 'DELETE' });
    set((s) => ({ lessons: s.lessons.filter((l) => l.id !== id) }));
  },
  saveProfessor: async (input) => {
    const { professor } = await api<{ professor: Professor }>('/api/content/professors', { body: input });
    set((s) => ({ professors: upsert(s.professors, professor) }));
    return professor;
  },
  removeProfessor: async (id) => {
    await api(`/api/content/professors/${id}`, { method: 'DELETE' });
    set((s) => ({
      professors: s.professors.filter((p) => p.id !== id),
      lessons: s.lessons.filter((l) => l.professorId !== id),
    }));
  },
}));

/** Aulas de um professor, na ordem. */
export function lessonsOf(lessons: Lesson[], professorId: string, onlyPublished = true): Lesson[] {
  return lessons
    .filter((l) => l.professorId === professorId && (!onlyPublished || l.published))
    .sort((a, b) => a.number - b.number);
}
