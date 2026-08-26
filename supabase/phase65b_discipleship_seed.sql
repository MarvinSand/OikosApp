-- ============================================================
-- Phase 65b: Jüngerschafts-Tab – Seed-Daten
-- Setzt phase65_discipleship_schema.sql voraus. Idempotent (on conflict
-- do nothing über die jeweiligen unique-Spalten), im Supabase SQL Editor
-- ausführbar. NICHT automatisch ausgeführt – erst zur Review vorgelegt.
-- ============================================================
-- Platzhalter-Inhalte, keine finalen Studientexte (Umfang laut Master-
-- Prompt). Buchcodes für bible_book entsprechen src/lib/bibleBooks.js
-- (YouVersion-USX-Codes, z.B. LUK, MRK, ACT, MAT, JHN, 2TI).
--
-- Konvention für Bekenntnis-Abschnitte (creed_lines): Da das vorgegebene
-- Schema keine eigene Sections-Spalte hat, markiert eine Zeile mit
-- bible_reference = NULL und body-Präfix "§ " einen Abschnittstitel; die
-- folgenden Zeilen bis zur nächsten "§ "-Zeile gehören zu diesem
-- Abschnitt. Der finale Wortlaut des offiziellen Bekenntnisses aus dem
-- Projektmaterial liegt nicht im Repo vor – hier nur eine plausible,
-- strukturell passende Platzhalterfassung mit echten Bibelstellen.

-- ─── 14 Stationen + Abschluss-Station "Wachsen & Senden" ───────────────
insert into public.discipleship_stations
  (order_index, slug, title, bible_reference, bible_book, bible_chapter, bible_verse_start, bible_verse_end, content_head, content_heart, content_hand, extra_content)
values
  (1, 'verlorener-sohn', 'Der verlorene Sohn', 'Lukas 15,11-32', 'LUK', 15, 11, 32,
   '{"intro": "Ein Sohn verlangt sein Erbe, verschwendet es und kehrt gebrochen zum Vater zurück - der ihm entgegenläuft, bevor er ein Wort sagen kann.", "observations": ["Was fällt dir am Verhalten des Vaters auf?", "Womit kannst du dich in der Geschichte am ehesten identifizieren - mit dem jüngeren oder dem älteren Sohn?"]}'::jsonb,
   '{"prompts": [{"key": "reflect_1", "question": "Gibt es einen Bereich in deinem Leben, in dem du dich von Gott entfernt hast?"}, {"key": "reflect_2", "question": "Wie fühlt es sich an zu wissen, dass Gott dir entgegenläuft, bevor du zu ihm zurückkehrst?"}]}'::jsonb,
   '{"steps": ["Sprich heute mit jemandem darüber, wo du gerade mit Gott stehst.", "Danke Gott konkret für einen Moment, in dem er dich angenommen hat, obwohl du es nicht verdient hattest."]}'::jsonb,
   null),

  (2, 'befreiung-des-besessenen', 'Die Befreiung des Besessenen', 'Markus 5,1-20', 'MRK', 5, 1, 20,
   '{"intro": "Jesus befreit einen Mann, der von einer Vielzahl böser Geister beherrscht wird und danach von seiner eigenen Gemeinschaft ausgestoßen lebt.", "observations": ["Was verändert sich beim Mann, nachdem Jesus ihm begegnet ist?", "Wie reagieren die Menschen aus der Umgebung auf das Wunder - und warum, denkst du, reagieren sie so?"]}'::jsonb,
   '{"prompts": [{"key": "reflect_1", "question": "Wo in deinem Leben brauchst du selbst Befreiung?"}, {"key": "reflect_2", "question": "Der Mann wollte bei Jesus bleiben, wurde aber losgeschickt, um zu erzählen. Wo könntest du erzählen, was Gott bei dir getan hat?"}]}'::jsonb,
   '{"steps": ["Schreibe auf, was Gott in deinem Leben schon verändert hat.", "Erzähle diese Woche einer Person davon."]}'::jsonb,
   null),

  (3, 'philippus-und-der-kaemmerer', 'Philippus und der Kämmerer', 'Apostelgeschichte 8,26-40', 'ACT', 8, 26, 40,
   '{"intro": "Philippus wird von Gott zu einem äthiopischen Hofbeamten geschickt, der die Schrift liest, sie aber nicht versteht - und lässt sich direkt im Anschluss taufen.", "observations": ["Wie geht Philippus mit der Frage des Kämmerers um?", "Was bringt den Kämmerer dazu, sich sofort taufen zu lassen?"]}'::jsonb,
   '{"prompts": [{"key": "reflect_1", "question": "Wer in deinem Umfeld sucht gerade - so wie der Kämmerer - nach Antworten?"}, {"key": "reflect_2", "question": "Was bedeutet dir deine eigene Taufe (oder: was hält dich bisher davon ab)?"}]}'::jsonb,
   '{"steps": ["Bete für eine Person, die noch sucht.", "Wenn du noch nicht getauft bist: sprich mit jemandem aus deiner Community darüber."]}'::jsonb,
   '{"title": "Was bedeuten Buße und Taufe?", "body": "Buße bedeutet Umkehr - eine bewusste Entscheidung, sich von der eigenen Richtung ab- und Gott zuzuwenden (Apostelgeschichte 3,19). Die Taufe ist das äußere Zeichen für das, was innerlich bereits geschehen ist: das alte Leben stirbt, ein neues beginnt (Römer 6,3-4). Wie beim Kämmerer in dieser Geschichte kann die Taufe direkt auf den Glauben folgen - sie ist kein späterer Bonus, sondern ein natürlicher, sichtbarer nächster Schritt."}'::jsonb),

  (4, 'versuchung-jesu', 'Die Versuchung Jesu', 'Lukas 4,1-13', 'LUK', 4, 1, 13,
   '{"intro": "Jesus wird 40 Tage in der Wüste vom Teufel versucht - und begegnet jeder Versuchung mit einem Wort aus der Schrift.", "observations": ["Worauf zielen die drei Versuchungen jeweils ab?", "Womit antwortet Jesus - und was sagt das über seine Vorbereitung aus?"]}'::jsonb,
   '{"prompts": [{"key": "reflect_1", "question": "In welchen Situationen wirst du besonders herausgefordert?"}, {"key": "reflect_2", "question": "Welcher Bibelvers hilft dir in solchen Momenten?"}]}'::jsonb,
   '{"steps": ["Such dir einen Vers aus, den du dir für herausfordernde Momente merkst.", "Schreib ihn dir sichtbar auf (Hintergrundbild, Zettel, ...)."]}'::jsonb,
   null),

  (5, 'gleichnis-vom-saemann', 'Das Gleichnis vom Sämann', 'Matthäus 13,1-23', 'MAT', 13, 1, 23,
   '{"intro": "Ein Sämann sät Samen auf vier verschiedene Bodenarten - nur einer davon bringt Frucht. Jesus erklärt es als Bild für das Wort Gottes und das Herz, das es hört.", "observations": ["Welche der vier Bodenarten beschreibt am ehesten, wie du gerade Gottes Wort aufnimmst?", "Was raubt in deinem Alltag am meisten Aufmerksamkeit vom Wort Gottes?"]}'::jsonb,
   '{"prompts": [{"key": "reflect_1", "question": "Was hindert dich manchmal daran, Gottes Wort wirklich wirken zu lassen?"}, {"key": "reflect_2", "question": "Wie könntest du deinem Herzen bewusst guten Boden geben?"}]}'::jsonb,
   '{"steps": ["Nimm dir diese Woche täglich 5 Minuten bewusst Zeit für die Bibel - ohne Ablenkung."]}'::jsonb,
   null),

  (6, 'unbarmherziger-knecht', 'Der unbarmherzige Knecht', 'Matthäus 18,21-35', 'MAT', 18, 21, 35,
   '{"intro": "Ein Knecht wird eine riesige Schuld erlassen - und verweigert kurz darauf selbst die Vergebung einer viel kleineren Schuld.", "observations": ["Was fällt dir am Kontrast zwischen den beiden Schulden auf?", "Was macht Vergebung so schwer, obwohl wir selbst so viel vergeben bekommen haben?"]}'::jsonb,
   '{"prompts": [{"key": "reflect_1", "question": "Gibt es jemanden, dem du noch nicht vergeben hast?"}, {"key": "reflect_2", "question": "Was würde sich verändern, wenn du diese Person heute vor Gott loslässt?"}]}'::jsonb,
   '{"steps": ["Bring die Person im Gebet konkret vor Gott.", "Wenn es möglich ist: such das Gespräch."]}'::jsonb,
   null),

  (7, 'reicher-junger-mann', 'Der reiche junge Mann', 'Markus 10,17-27', 'MRK', 10, 17, 27,
   '{"intro": "Ein wohlhabender Mann fragt Jesus nach dem ewigen Leben - und geht traurig weg, als Jesus ihn auffordert, seinen Besitz loszulassen.", "observations": ["Was hält den Mann letztlich zurück?", "Was sagt Jesus über Reichtum - und was nicht?"]}'::jsonb,
   '{"prompts": [{"key": "reflect_1", "question": "Woran hängt dein Herz mehr, als dir bewusst ist?"}, {"key": "reflect_2", "question": "Was würde es bedeuten, das loszulassen?"}]}'::jsonb,
   '{"steps": ["Nenne konkret eine Sache, an der du zu sehr hängst, im Gebet vor Gott."]}'::jsonb,
   null),

  (8, 'glaube-und-vergebung', 'Glaube und Vergebung', 'Markus 11,20-26', 'MRK', 11, 20, 26,
   '{"intro": "Der verdorrte Feigenbaum wird zum Anlass für Jesu Worte über Glauben, der Berge versetzt - und über Vergebung als Voraussetzung fürs Gebet.", "observations": ["Wie hängen Glaube und Vergebung in diesem Abschnitt zusammen?", "Was bedeutet es für dich, im Gebet zuerst zu vergeben?"]}'::jsonb,
   '{"prompts": [{"key": "reflect_1", "question": "Wofür betest du gerade mit wenig Glauben?"}, {"key": "reflect_2", "question": "Gibt es Unversöhntes, das dein Gebet gerade blockiert?"}]}'::jsonb,
   '{"steps": ["Sprich einen konkreten Glaubenssatz laut aus - als Gebet, nicht als Behauptung."]}'::jsonb,
   null),

  (9, 'gebet-von-jesus', 'Das Gebet von Jesus', 'Johannes 17,1-26', 'JHN', 17, 1, 26,
   '{"intro": "Kurz vor seiner Verhaftung betet Jesus für sich, für seine Jünger und für alle, die durch sie glauben werden - ein Blick in sein Herz.", "observations": ["Wofür betet Jesus für seine Jünger?", "Was wünscht sich Jesus für die Einheit der Glaubenden?"]}'::jsonb,
   '{"prompts": [{"key": "reflect_1", "question": "Wie fühlt es sich an zu wissen, dass Jesus schon vor 2000 Jahren für dich gebetet hat?"}, {"key": "reflect_2", "question": "Für wen in deinem Umfeld könntest du nach diesem Vorbild beten?"}]}'::jsonb,
   '{"steps": ["Bete heute konkret für die Einheit in deiner Community."]}'::jsonb,
   null),

  (10, 'kosten-der-nachfolge', 'Die Kosten der Nachfolge', 'Lukas 9,57-62', 'LUK', 9, 57, 62,
   '{"intro": "Drei Menschen wollen Jesus nachfolgen - Jesus macht jedem deutlich, was das wirklich kostet.", "observations": ["Was sind die drei Ausreden bzw. Bedingungen?", "Was macht Nachfolge so radikal, wie Jesus sie hier beschreibt?"]}'::jsonb,
   '{"prompts": [{"key": "reflect_1", "question": "Was würde dich am ehesten davon abhalten, Jesus konsequent nachzufolgen?"}, {"key": "reflect_2", "question": "Was müsstest du loslassen, um freier nachzufolgen?"}]}'::jsonb,
   '{"steps": ["Sprich mit einer Person aus deiner Community offen über deinen aktuellen Preis der Nachfolge."]}'::jsonb,
   null),

  (11, 'missionsbefehl', 'Der Missionsbefehl', 'Matthäus 28,16-20', 'MAT', 28, 16, 20,
   '{"intro": "Der auferstandene Jesus sendet seine Jünger mit einem klaren Auftrag: alle Völker zu Jüngern zu machen.", "observations": ["Was genau beauftragt Jesus seine Jünger zu tun?", "Was verspricht er ihnen dabei?"]}'::jsonb,
   '{"prompts": [{"key": "reflect_1", "question": "Wo siehst du deinen eigenen Platz in diesem Auftrag?"}, {"key": "reflect_2", "question": "Wer könnte die nächste Person sein, mit der du deinen Glauben teilst?"}]}'::jsonb,
   '{"steps": ["Nutze diese Woche eines der Werkzeuge (z.B. Drei Kreise) in einem echten Gespräch."]}'::jsonb,
   null),

  (12, 'jesus-waescht-die-fuesse', 'Jesus wäscht die Füße', 'Johannes 13,1-20', 'JHN', 13, 1, 20,
   '{"intro": "Beim letzten Abendmahl wäscht Jesus seinen Jüngern die Füße - eine Aufgabe für Sklaven - und macht sie zum Vorbild für ihren Umgang miteinander.", "observations": ["Warum ist diese Geste so ungewöhnlich für einen Rabbi?", "Was sagt Jesus über den Sinn dieser Handlung?"]}'::jsonb,
   '{"prompts": [{"key": "reflect_1", "question": "Wo fällt dir Dienen an anderen besonders schwer?"}, {"key": "reflect_2", "question": "Wem könntest du diese Woche ganz praktisch dienen?"}]}'::jsonb,
   '{"steps": ["Tu diese Woche bewusst einen kleinen, unbequemen Dienst an jemandem, ohne dass es auffällt."]}'::jsonb,
   null),

  (13, 'heiliger-geist-kommt', 'Der Heilige Geist kommt', 'Apostelgeschichte 2,1-13', 'ACT', 2, 1, 13,
   '{"intro": "An Pfingsten kommt der Heilige Geist auf die Jünger - mit Feuerzungen, Windrauschen und der Fähigkeit, in fremden Sprachen zu sprechen.", "observations": ["Was verändert sich bei den Jüngern durch den Heiligen Geist?", "Wie reagiert die Menge auf das, was passiert?"]}'::jsonb,
   '{"prompts": [{"key": "reflect_1", "question": "Wo erlebst du das Wirken des Heiligen Geistes in deinem Leben?"}, {"key": "reflect_2", "question": "Wonach sehnst du dich, wenn du an den Heiligen Geist denkst?"}]}'::jsonb,
   '{"steps": ["Bitte Gott heute bewusst um mehr von seinem Geist in deinem Alltag."]}'::jsonb,
   '{"title": "Was bedeuten Buße und Taufe?", "body": "Buße bedeutet Umkehr - eine bewusste Entscheidung, sich von der eigenen Richtung ab- und Gott zuzuwenden (Apostelgeschichte 3,19). Die Taufe ist das äußere Zeichen für das, was innerlich bereits geschehen ist: das alte Leben stirbt, ein neues beginnt (Römer 6,3-4). Auch an Pfingsten ruft Petrus die Zuhörer direkt zu Buße und Taufe auf (Apostelgeschichte 2,38) - beides gehört von Anfang an untrennbar zum Beginn des Glaubens dazu."}'::jsonb),

  (14, 'leben-der-ersten-christen', 'Das Leben der ersten Christen', 'Apostelgeschichte 2,42-47', 'ACT', 2, 42, 47,
   '{"intro": "Die erste Gemeinde lebt in enger Gemeinschaft: Lehre, Gebet, das Teilen von Besitz und tägliches gemeinsames Leben.", "observations": ["Welche Elemente prägen das Leben der ersten Gemeinde?", "Was davon fehlt dir in deiner eigenen Gemeinschaft am meisten?"]}'::jsonb,
   '{"prompts": [{"key": "reflect_1", "question": "Wie könnte dein Alltag mit anderen Christen noch mehr wie in Apostelgeschichte 2 aussehen?"}, {"key": "reflect_2", "question": "Was wärst du bereit zu teilen - Zeit, Besitz, dein Zuhause?"}]}'::jsonb,
   '{"steps": ["Lade diese Woche jemanden aus deiner Community zu dir nach Hause ein."]}'::jsonb,
   null),

  (15, 'wachsen-und-senden', 'Wachsen & Senden', '2. Timotheus 2,2', '2TI', 2, 2, 2,
   '{"intro": "Der Weg endet nicht beim eigenen Wachstum: Paulus fordert Timotheus auf, das Gelernte an andere weiterzugeben, die es wiederum weitergeben können.", "observations": ["Was bedeutet es, jemanden zu befähigen statt nur zu begleiten?", "Wen könntest du auf seinem Weg der Jüngerschaft begleiten?"]}'::jsonb,
   '{"prompts": [{"key": "reflect_1", "question": "Was hast du auf deinem Weg durch die 14 Stationen gelernt, das du weitergeben könntest?"}, {"key": "reflect_2", "question": "Wer in deinem Umfeld steht gerade am Anfang seines Glaubens?"}]}'::jsonb,
   '{"steps": ["Sprich mit deiner Community-Leitung darüber, jemanden zu begleiten.", "Nimm bewusst eine Rolle als Mentor für eine Person an."]}'::jsonb,
   null)

on conflict (slug) do nothing;

-- ─── 5 Werkzeuge ────────────────────────────────────────────────────────
insert into public.tools (slug, title, description, image_path, steps, order_index)
values
  ('drei-kreise', 'Drei Kreise', 'Schritt-für-Schritt-Gesprächsleitfaden mit einer einfachen Zeichnung - zeigt den Unterschied zwischen Gottes Reich, unseren guten Absichten und der gebrochenen Welt.', '/assets/discipleship/drei-kreise.svg',
   '[{"title": "Gottes Reich", "text": "Zeichne einen Kreis: So wollte Gott, dass die Welt ist - vollständig, ohne Bruch."}, {"title": "Unsere gebrochene Welt", "text": "Zeichne einen zweiten, sich überschneidenden Kreis: die Welt, wie sie tatsächlich ist - von Leid und Trennung geprägt."}, {"title": "Unsere guten Absichten", "text": "Zeichne einen dritten Kreis: unsere eigenen Versuche, das Problem selbst zu lösen - die oft nicht ausreichen."}, {"title": "Der Weg zurück", "text": "Zeige den Pfeil: Jesus als der Weg, der uns zurück zu Gottes ursprünglichem Plan bringt."}, {"title": "Deine Einladung", "text": "Frage die Person: Wo siehst du dich gerade in diesem Bild?"}]'::jsonb,
   10),

  ('frohe-botschaft', 'Die Frohe Botschaft', 'Mehrstufige Präsentation des Evangeliums - von Gottes Liebe über die Trennung durch Sünde bis zur Einladung, Jesus nachzufolgen.', null,
   '[{"title": "Gott liebt dich", "text": "Gott hat dich geschaffen und liebt dich bedingungslos (Johannes 3,16)."}, {"title": "Die Trennung", "text": "Sünde trennt uns von Gott - aus eigener Kraft können wir diese Trennung nicht überwinden (Römer 3,23)."}, {"title": "Jesu Rettung", "text": "Jesus ist gestorben und auferstanden, um diese Trennung zu überwinden (Römer 5,8)."}, {"title": "Deine Antwort", "text": "Du kannst diese Rettung im Glauben annehmen - jetzt, an diesem Ort (Römer 10,9)."}]'::jsonb,
   20),

  ('uebergabegebet', 'Übergabegebet', 'Ein einzelner Screen zum gemeinsamen Vorlesen oder Mitsprechen - für den Moment, in dem jemand sein Leben Jesus übergeben möchte.', null,
   '[{"title": "Gebet", "text": "Herr Jesus, danke, dass du mich liebst. Ich erkenne, dass ich dich brauche. Ich glaube, dass du für mich gestorben und auferstanden bist. Ich übergebe dir heute mein Leben. Danke, dass ich ab jetzt dein Kind bin. Amen."}]'::jsonb,
   30),

  ('festes-fundament', 'Ein festes Fundament', 'Das Gleichnis vom Hausbau (Matthäus 7) als Bild dafür, worauf ein Leben wirklich trägt.', null,
   '[{"title": "Zwei Bauherren", "text": "Jesus erzählt von zwei Menschen, die ein Haus bauen - einer auf Fels, einer auf Sand."}, {"title": "Der Sturm kommt für beide", "text": "Regen, Sturm und Flut treffen beide Häuser gleichermaßen."}, {"title": "Der Unterschied liegt im Fundament", "text": "Nur das Haus auf dem Fels hält stand - nicht, weil der Sturm milder war, sondern wegen des Grundes."}, {"title": "Worauf baust du?", "text": "Frage die Person: Worauf baut dein Leben gerade?"}]'::jsonb,
   40),

  ('busse-und-taufe', 'Buße & Taufe erklären', 'Erklärt in einfachen Schritten, was Buße und Taufe bedeuten - als eigenständiges Gesprächswerkzeug.', null,
   '[{"title": "Was ist Buße?", "text": "Buße bedeutet Umkehr - eine bewusste Entscheidung, sich von der eigenen Richtung ab- und Gott zuzuwenden."}, {"title": "Warum Buße?", "text": "Nicht aus Angst, sondern weil Gottes Güte uns zur Umkehr einlädt (Römer 2,4)."}, {"title": "Was ist die Taufe?", "text": "Die Taufe ist das äußere Zeichen für das, was innerlich bereits geschehen ist: das alte Leben stirbt, ein neues beginnt (Römer 6,3-4)."}, {"title": "Wie geht es weiter?", "text": "Sprich mit deiner Gemeinde/Community darüber, dich taufen zu lassen."}]'::jsonb,
   50)

on conflict (slug) do nothing;

-- ─── 7 Bibliothekseinträge ──────────────────────────────────────────────
insert into public.library_entries (type, title, bible_reference, tags, body)
select * from (values
  ('bibelstudium', 'Wenn die Angst regiert', 'Jesaja 41,10', array['Angst'],
    '{"text": "Ein kurzes Bibelstudium über Gottes Zusage angesichts von Angst und Sorge - und was es bedeutet, ihr konkret zu vertrauen."}'::jsonb),
  ('verssammlung', 'Bibelverse gegen die Angst', null, array['Angst'],
    '{"verses": ["Jesaja 41,10", "Philipper 4,6-7", "Psalm 23,4"]}'::jsonb),
  ('artikel', 'Streit klären, ohne zu verlieren', null, array['Streit'],
    '{"text": "Praktische Impulse für Konfliktgespräche nach biblischem Vorbild (Matthäus 18,15-17)."}'::jsonb),
  ('bibelstudium', 'Ehe & Familie: Fundament statt Fassade', 'Epheser 5,21-33', array['Ehe & Familie'],
    '{"text": "Ein Studium über Ehe als Abbild der Beziehung zwischen Christus und Gemeinde."}'::jsonb),
  ('verssammlung', 'Heilung - Bibelverse zum Festhalten', null, array['Heilung'],
    '{"verses": ["Jesaja 53,5", "Jakobus 5,14-15", "Psalm 103,2-3"]}'::jsonb),
  ('artikel', 'Was bedingungslose Liebe wirklich bedeutet', null, array['Liebe', 'Annahme'],
    '{"text": "Ein Artikel über 1. Korinther 13 und was Liebe im Alltag konkret heißt."}'::jsonb),
  ('bibelstudium', 'Frei von Schuld', 'Römer 8,1', array['Schuld', 'Annahme'],
    '{"text": "Ein Studium darüber, warum es für die, die in Christus sind, keine Verdammnis mehr gibt."}'::jsonb)
) as v(type, title, bible_reference, tags, body)
where not exists (select 1 from public.library_entries e where e.title = v.title);

-- ─── Offizielles Bekenntnis ─────────────────────────────────────────────
do $$
declare
  official_creed_id uuid;
begin
  select id into official_creed_id from public.creeds where user_id is null and title = 'Mein tägliches Bekenntnis';

  if official_creed_id is null then
    insert into public.creeds (user_id, title, visibility)
    values (null, 'Mein tägliches Bekenntnis', 'public')
    returning id into official_creed_id;

    insert into public.creed_lines (creed_id, order_index, body, bible_reference) values
      (official_creed_id, 10, '§ Jesus Christus ist mein Herr', null),
      (official_creed_id, 20, 'Ich glaube, dass Jesus Christus der Sohn Gottes ist, gestorben und auferstanden für mich.', '1. Korinther 15,3-4'),
      (official_creed_id, 30, 'Ich unterstelle mein Leben seiner Herrschaft, nicht meinen eigenen Plänen.', 'Römer 10,9'),
      (official_creed_id, 40, '§ Der Herr ist mein Leben', null),
      (official_creed_id, 50, 'Ich lebe nicht mehr für mich selbst, sondern für den, der für mich gestorben und auferstanden ist.', '2. Korinther 5,15'),
      (official_creed_id, 60, 'Mein Leben ist mit Christus verborgen in Gott.', 'Kolosser 3,3'),
      (official_creed_id, 70, '§ Der Herr ist meine Kraft', null),
      (official_creed_id, 80, 'Ich kann alles durch den, der mich stark macht.', 'Philipper 4,13'),
      (official_creed_id, 90, 'Seine Kraft wird in meiner Schwachheit vollkommen.', '2. Korinther 12,9'),
      (official_creed_id, 100, '§ Der Herr sendet mich', null),
      (official_creed_id, 110, 'Wie der Vater mich gesandt hat, sende ich euch.', 'Johannes 20,21'),
      (official_creed_id, 120, 'Ich bin Botschafter an Christi statt.', '2. Korinther 5,20');
  end if;
end $$;

-- ─── 6 offizielle Challenges ────────────────────────────────────────────
insert into public.challenges (station_id, created_by, is_official, type, title, description, goal_type, goal_value)
select s.id, null, true, v.type, v.title, v.description, v.goal_type, v.goal_value
from (values
  ('verlorener-sohn', 'personal', '7 Tage für eine Person aus der Oikos Map beten', 'Wähle eine Person aus deiner Oikos Map und bete 7 Tage lang bewusst für sie.', 'days', 7),
  ('unbarmherziger-knecht', 'personal', 'Jemandem bewusst vergeben', 'Bring eine Person, der du noch nicht vergeben hast, im Gebet vor Gott und sprich - wenn möglich - mit ihr.', 'once', null),
  ('missionsbefehl', 'social', '5 Menschen auf der Straße evangelisieren', 'Sprich 5 Menschen aktiv auf ihren Glauben an und teile die Frohe Botschaft mit ihnen.', 'count', 5),
  ('leben-der-ersten-christen', 'social', 'Community-Mahlzeit organisieren', 'Organisiere ein gemeinsames Essen mit Menschen aus deiner Community - so wie die erste Gemeinde.', 'once', null)
) as v(station_slug, type, title, description, goal_type, goal_value)
join public.discipleship_stations s on s.slug = v.station_slug
where not exists (select 1 from public.challenges c where c.title = v.title);

insert into public.challenges (station_id, created_by, is_official, type, title, description, goal_type, goal_value)
select null, null, true, v.type, v.title, v.description, v.goal_type, v.goal_value
from (values
  ('personal', '30 Tage Bibellese-Streak', 'Lies 30 Tage am Stück in der Bibel - egal wie kurz der Abschnitt ist.', 'days', 30),
  ('social', 'Jemanden zur Community einladen', 'Lade eine Person ein, die noch keine Community-Anbindung hat.', 'count', 1)
) as v(type, title, description, goal_type, goal_value)
where not exists (select 1 from public.challenges c where c.title = v.title);
