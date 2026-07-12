-- Status „ersetzt“: ältere Angebotsversionen derselben Anfrage (kein eigener Pipeline-Eintrag)

comment on column public.angebote.status_einfach is
  'entwurf | gesendet | angenommen | abgelehnt | abgelaufen | ersetzt';
