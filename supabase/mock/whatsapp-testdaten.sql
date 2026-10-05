-- NUR STAGING: WhatsApp-Testverlauf zum Anschauen im CRM (Testmodus).
-- Alle Zeilen tragen ist_mock = true und werden in Einstellungen → WhatsApp → „Testnachrichten löschen“
-- bzw. per  delete from whatsapp_nachrichten where ist_mock;  wieder entfernt.
-- Setzt den Test-Partnern (@example.test) eine Handynummer, damit WhatsApp für sie aktiv ist.

do $$
declare
  hw_elektro uuid := (select id from handwerker where email = 'partner-elektro@example.test');
  hw_sanitaer uuid := (select id from handwerker where email = 'partner-sanitaer@example.test');
  e_elektro uuid;
  a_elektro uuid;
  k_elektro uuid;
  k_tel text;
begin
  if hw_elektro is null then
    raise notice 'Test-Partner fehlen — nichts angelegt.';
    return;
  end if;

  update handwerker set whatsapp = '0159 0000 0001' where email = 'partner-elektro@example.test' and whatsapp is null;
  update handwerker set whatsapp = '0159 0000 0002' where email = 'partner-maler@example.test' and whatsapp is null;
  update handwerker set whatsapp = '0159 0000 0003' where email = 'partner-sanitaer@example.test' and whatsapp is null;
  update handwerker set whatsapp = '0159 0000 0004' where email = 'partner-dach@example.test' and whatsapp is null;
  update handwerker set whatsapp = '0159 0000 0005' where email = 'partner-boden@example.test' and whatsapp is null;

  select e.id, e.auftrag_id, a.kunde_id into e_elektro, a_elektro, k_elektro
  from einsaetze e join auftraege a on a.id = e.auftrag_id
  where e.handwerker_id = hw_elektro and e.status in ('angenommen', 'gesendet')
  order by e.gesendet_at desc limit 1;

  delete from whatsapp_nachrichten where ist_mock;

  -- Elektro: Einsatz per WhatsApp, angenommen, dann Fotos und eine Regie-Frage (noch ungelesen)
  if e_elektro is not null then
    insert into whatsapp_nachrichten
      (created_at, richtung, kontakt_typ, handwerker_id, telefon, auftrag_id, einsatz_id, art, text, knoepfe, vorlage, status, wa_id, gelesen_at, knopf_id, media_url, media_name, media_mime, ist_mock)
    values
      (now() - interval '2 days 3 hours', 'aus', 'handwerker', hw_elektro, '4915900000001', a_elektro, e_elektro, 'vorlage',
       E'Hallo Elektro Muster GmbH, Bärenwald hat einen neuen Einsatz für Sie:\n\n*Fugenlose Badsanierung – Elektro*\nTermin: 07.10.2026 bis 09.10.2026\nOrt: Musterstraße 12, 80331\nEK: 1.450,00 € netto\n\nSteckdosen und Spiegelleuchte im Bad neu setzen, Leitungen unter Putz.\n\nBitte nehmen Sie den Einsatz an oder lehnen Sie ihn ab.',
       jsonb_build_array(jsonb_build_object('id', 'einsatz:' || e_elektro || ':annehmen', 'titel', 'Annehmen'),
                         jsonb_build_object('id', 'einsatz:' || e_elektro || ':ablehnen', 'titel', 'Ablehnen')),
       'bw_einsatz_neu', 'gelesen', 'mock-seed-1', null, null, null, null, null, true),
      (now() - interval '2 days 2 hours', 'ein', 'handwerker', hw_elektro, '4915900000001', a_elektro, e_elektro, 'antwort',
       'Annehmen', null, null, 'empfangen', 'mock-seed-2', now() - interval '2 days', 'einsatz:' || e_elektro || ':annehmen', null, null, null, true),
      (now() - interval '2 days 2 hours' + interval '5 seconds', 'aus', 'handwerker', hw_elektro, '4915900000001', a_elektro, e_elektro, 'text',
       'Danke, der Einsatz „Fugenlose Badsanierung – Elektro“ ist angenommen. Fotos und Updates können Sie einfach hier schicken.',
       null, null, 'gelesen', 'mock-seed-3', null, null, null, null, null, true),
      (now() - interval '1 day 5 hours', 'ein', 'handwerker', hw_elektro, '4915900000001', a_elektro, e_elektro, 'text',
       'Bin morgen ab 8 Uhr vor Ort. Liegt der Schlüssel beim Hausmeister?', null, null, 'empfangen', 'mock-seed-4', now() - interval '1 day', null, null, null, null, true),
      (now() - interval '1 day 4 hours', 'aus', 'handwerker', hw_elektro, '4915900000001', a_elektro, e_elektro, 'text',
       'Guten Morgen! Der Schlüssel liegt bei der Nachbarin im EG links (Frau Berger).', null, null, 'gelesen', 'mock-seed-5', null, null, null, null, null, true),
      (now() - interval '3 hours', 'ein', 'handwerker', hw_elektro, '4915900000001', a_elektro, e_elektro, 'bild',
       'Schlitze gestemmt, Leitungen liegen. Morgen Dosen setzen.', null, null, 'empfangen', 'mock-seed-6', null, null,
       '/mock/whatsapp/baustelle-wand.svg', 'IMG-Wand.jpg', 'image/svg+xml', true),
      (now() - interval '40 minutes', 'ein', 'handwerker', hw_elektro, '4915900000001', a_elektro, e_elektro, 'text',
       'Hinter der alten Dose war eine Abzweigdose mit Altleitung, mussten 2 Std. extra Wand öffnen. Geht das als Regie?',
       null, null, 'empfangen', 'mock-seed-7', null, null, null, null, null, true);
  end if;

  -- Sanitär: allgemeiner Chat ohne laufenden Einsatz → nicht zugeordnet
  if hw_sanitaer is not null then
    insert into whatsapp_nachrichten
      (created_at, richtung, kontakt_typ, handwerker_id, telefon, art, text, status, wa_id, media_url, media_name, media_mime, ist_mock)
    values
      (now() - interval '5 hours', 'ein', 'handwerker', hw_sanitaer, '4915900000003', 'text',
       'Hallo, hätten Sie nächste Woche noch was für mich? Mittwoch und Donnerstag sind frei.', 'empfangen', 'mock-seed-8', null, null, null, true),
      (now() - interval '4 hours', 'ein', 'handwerker', hw_sanitaer, '4915900000003', 'dokument',
       'Aufmaß vom letzten Bad, falls Sie es noch brauchen.', 'empfangen', 'mock-seed-9', '/mock/whatsapp/aufmass.pdf', 'Aufmass.pdf', 'application/pdf', true);
  end if;

  -- Kunde des Elektro-Auftrags: Bautagebuch-Info per WhatsApp + Antwort
  if k_elektro is not null then
    select regexp_replace(regexp_replace(coalesce(telefon, ''), '[^0-9]', '', 'g'), '^0', '49') into k_tel from kunden where id = k_elektro;
    if coalesce(k_tel, '') <> '' then
      insert into whatsapp_nachrichten
        (created_at, richtung, kontakt_typ, kunde_id, telefon, auftrag_id, art, text, vorlage, status, wa_id, gelesen_at, ist_mock)
      values
        (now() - interval '1 day 2 hours', 'aus', 'kunde', k_elektro, k_tel, a_elektro, 'vorlage',
         E'Guten Tag, es gibt ein neues Update zu Ihrem Projekt „Fugenlose Badsanierung“:\n\nElektro: Leitungen verlegt, Spiegelleuchte vorbereitet.\n\nFotos und alle Details: https://baerenwald-backend.netlify.app/projekt/…',
         'bw_bautagebuch', 'gelesen', 'mock-seed-10', null, true),
        (now() - interval '1 day 1 hour', 'ein', 'kunde', k_elektro, k_tel, a_elektro, 'text',
         'Danke für das Update, sieht gut aus! Wann kommen die Fliesen?', null, 'empfangen', 'mock-seed-11', now() - interval '1 day', true);
    end if;
  end if;
end $$;
