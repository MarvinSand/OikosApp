-- ============================================================
-- Phase 65c: Jüngerschafts-Tab – finaler Wortlaut des offiziellen
-- Bekenntnisses (ersetzt den Platzhaltertext aus phase65b)
-- ============================================================
-- Ersetzt Titel + alle Zeilen des offiziellen Bekenntnisses (user_id is
-- null) durch den vom Nutzer vorgegebenen, exakten Wortlaut. Idempotent:
-- löscht vorhandene Zeilen des offiziellen Bekenntnisses und fügt sie neu
-- ein, legt das Bekenntnis an, falls es noch nicht existiert.
--
-- Konvention (wie in phase65b_discipleship_seed.sql): eine Zeile mit
-- bible_reference = NULL und body-Präfix "§ " ist ein Abschnittstitel.

do $$
declare
  official_creed_id uuid;
begin
  select id into official_creed_id from public.creeds where user_id is null limit 1;

  if official_creed_id is null then
    insert into public.creeds (user_id, title, visibility)
    values (null, 'Mein tägliches Glaubensbekenntnis mit Bibelstellen', 'public')
    returning id into official_creed_id;
  else
    update public.creeds
      set title = 'Mein tägliches Glaubensbekenntnis mit Bibelstellen', updated_at = now()
      where id = official_creed_id;
    delete from public.creed_lines where creed_id = official_creed_id;
  end if;

  insert into public.creed_lines (creed_id, order_index, body, bible_reference) values
    (official_creed_id, 10, '§ Jesus Christus ist mein Herr', null),
    (official_creed_id, 20, 'Heute bin ich mir bewusst, dass ich nicht mehr selbst lebe, sondern Christus mein Leben ist.', 'Galater 2,20'),
    (official_creed_id, 30, 'Ich definiere mich nur noch über das, was Christus gemacht hat, und lebe durch seine Kraft.', 'Philipper 4,13'),
    (official_creed_id, 40, 'Jesus Christus ist mein König, dem ich mich in jedem Lebensbereich unterordne.', 'Psalm 47,8'),

    (official_creed_id, 50, '§ Der Herr ist mein Leben', null),
    (official_creed_id, 60, 'Sein Leben ist mein Leben geworden.', 'Johannes 14,19'),
    (official_creed_id, 70, 'Heute gehört mir alles, was in ihm ist: jede geistliche Segnung der Himmelswelt.', 'Epheser 1,3'),
    (official_creed_id, 80, 'Er wird sich mir immer mehr zeigen, wie er ist. Ich erfreue mich an seinem Wesen.', 'Johannes 14,21'),
    (official_creed_id, 90, 'Ich weiß, dass er mich bedingungslos liebt und mich annimmt, egal was passiert.', 'Römer 8,38-39'),
    (official_creed_id, 100, 'Ich kann mit derselben Liebe andere lieben, mit der er mich liebt.', 'Johannes 13,34'),

    (official_creed_id, 110, '§ Der Herr hat mir seinen Geist gegeben', null),
    (official_creed_id, 120, 'Ich habe die Salbung von dem heiligen Gott.', '1. Johannes 2,20'),
    (official_creed_id, 130, 'Heute füllt er mich mit Kraft und führt mich in alle Wahrheit.', 'Johannes 16,13'),
    (official_creed_id, 140, 'Ich widerstehe dem Teufel, und er flieht von mir.', 'Jakobus 4,7'),
    (official_creed_id, 150, 'Ich überwinde ihn durch das Blut des Lammes und durch das Wort meines Zeugnisses.', 'Offenbarung 12,11'),
    (official_creed_id, 160, '„Durch Christus habe ich Autorität und lebe in Freiheit, denn der Feind hat keine Macht über mich.', 'Lukas 10,19'),
    (official_creed_id, 170, 'Ich habe keine Angst vor dem Teufel, sondern er vor mir.', '2. Timotheus 1,7'),

    (official_creed_id, 180, '§ Der Herr ist mein Friede', null),
    (official_creed_id, 190, 'Heute brauche ich mich um nichts zu sorgen.', 'Philipper 4,6-7'),
    (official_creed_id, 200, 'Ich trage seine Ruhe in mir und gebe alles bei ihm ab, denn er will für mich sorgen.', '1. Petrus 5,7'),
    (official_creed_id, 210, 'Er wird mich niemals verlassen oder aufgeben.', 'Hebräer 13,5'),
    (official_creed_id, 220, 'Heute geht seine Gegenwart mit mir und gibt mir Ruhe.', '2. Mose 33,14'),

    (official_creed_id, 230, '§ Die Freude am Herrn ist meine Stärke', null),
    (official_creed_id, 240, 'Heute werde ich mich in ihm freuen und in allen Umständen dankbar sein.', 'Nehemia 8,10; 1. Thessalonicher 5,18'),
    (official_creed_id, 250, 'Sein Lobpreis wird auf meinen Lippen sein.', 'Psalm 34,2'),
    (official_creed_id, 260, 'Ich liebe meinen Ehepartner und andere Menschen so, wie Gott mich liebt.“', 'Epheser 5,25'),

    (official_creed_id, 270, '§ Der Herr ist mein Arzt', null),
    (official_creed_id, 280, 'Durch seine Striemen bin ich geheilt, denn er hat meine Schwachheiten und Krankheiten getragen.', 'Jesaja 53,5'),
    (official_creed_id, 290, 'Er ist meine Gesundheit und mein Heil. Deshalb spreche ich heute seine Gesundheit und seine Heilung über mein Leben aus.', 'Matthäus 8,16-17'),
    (official_creed_id, 300, 'In seinem Namen widerstehe ich aller Krankheit.', 'Jakobus 5,14-15'),
    (official_creed_id, 310, 'Ich habe keine Angst mehr, sondern vertraue Gott, dass er sich um mich kümmert.', 'Psalm 91,10'),

    (official_creed_id, 320, '§ Der Herr ist mein Versorger', null),
    (official_creed_id, 330, 'Er ist mein Hirte und mir wird nichts mangeln.', 'Psalm 23,1'),
    (official_creed_id, 340, 'Heute lässt er seine Gnade auf mich überfließen, sodass ich jederzeit alles habe, was ich brauche und noch mehr, sodass mein Umfeld dies merkt und davon abbekommt.', '2. Korinther 9,8'),
    (official_creed_id, 350, 'Der Herr füllt jedes Bedürfnis in mir aus. Dadurch bewirkt er göttliche Werke durch mich, die nicht mehr von meiner menschlichen Kraft abhängig sind.', 'Philipper 4,19'),
    (official_creed_id, 360, 'Heute erlebe ich, wo der Herr auf mich wartet, was er vorbereitet hat, damit ich dort hineintreten kann.', 'Epheser 2,10'),

    (official_creed_id, 370, '§ Der Herr ist mein Sieg', null),
    (official_creed_id, 380, 'Er führt mich allezeit im Triumphzug in Christus umher.', '2. Korinther 2,14'),
    (official_creed_id, 390, 'Heute werde ich als Überwinder leben. Angst, Stolz, Wut und Selbstgerechtigkeit haben in meinem Leben keinen Platz mehr. Stattdessen regiert die Freude, die Liebe, die Geduld und der Friede durch den Heiligen Geist in mir.', 'Galater 5,22-23'),
    (official_creed_id, 400, 'Auch in alltäglichen Lebensbereichen überwinde ich: Hunger, Müdigkeit.', 'Jesaja 40,31'),

    (official_creed_id, 410, '§ Der Herr ist meine Gerechtigkeit', null),
    (official_creed_id, 420, 'Durch sein Blut hat er mich von meinen Sünden gereinigt und mich in seinen Augen vollkommen annehmbar gemacht.', '1. Johannes 1,7'),
    (official_creed_id, 430, 'Heute werde ich nicht mehr auf die Sünde schauen, sondern auf den Vater im Himmel.', 'Kolosser 3,1-2'),
    (official_creed_id, 440, 'Die Gerechtigkeit ist nicht abhängig von meinen Taten, sondern von dem, was der Herr getan hat. Das sind unverdiente Geschenke, Gnade, die ich gerne annehme und anwende.', 'Römer 3,22-24');
end $$;
