-- Erweiterung ki_visualisierungen: gleiche Session-Felder wie Website gpt_raum_sessions

alter table public.ki_visualisierungen
  add column if not exists wunsch_text text,
  add column if not exists raum_analyse jsonb,
  add column if not exists inspiration_analyse jsonb,
  add column if not exists viz_brief jsonb,
  add column if not exists gpt_erklaerung jsonb,
  add column if not exists render_prompt text;
