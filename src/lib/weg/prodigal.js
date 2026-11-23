// ─────────────────────────────────────────────────────────────
// Studie 1: Der verlorene Sohn (Lukas 15,11–32) – die ausführliche
// Vorlage. Sie führt vor, wie jede Studie am Ende aussehen kann: Fragen mit
// Auflösung, Symbolkarten, Gebet und eigener Wochenschritt.
//
// ENTWURF, siehe Hinweis in content.js. Schreibweise: [[Stelle]] oder
// [[Label|Stelle]] für antippbare Bibelstellen, Leerzeile = Absatz.
// ─────────────────────────────────────────────────────────────

const STEP_OPTIONS = [
  { label: 'Einen Bereich benennen, in dem ich weg war', text: 'Schreib ihn heute auf.' },
  { label: 'Jemanden um Vergebung bitten', text: 'Wähle einen Menschen und mach den ersten Schritt.' },
  { label: 'Für jemanden beten, der fern ist', text: 'Nimm dir eine Person aus deiner Oikos-Map und bete eine Woche täglich für sie.' },
  { label: 'Die Geschichte weitererzählen', text: 'Erzähl sie einem Menschen und sag, was sie in dir ausgelöst hat.' },
  { label: 'Eigenen Schritt erstellen', text: 'Formuliere ihn so konkret, dass du am Ende der Woche sagen kannst: erledigt oder nicht.', custom: true },
]

export const PRODIGAL = {
  id: 'lukas-15', nr: 1, station: 'entdecken',
  title: 'Der verlorene Sohn', ref: 'Lukas 15,11-32',
  teaser: 'Ein Vater, der wartet, und ein Sohn, der umkehrt.',
  goals: [
    'Parallelen zu deinem Leben entdecken',
    'Sehen, wer Gott wirklich ist',
    'Merken: Umkehren geht jederzeit',
  ],
  verses: [
    ['Matthäus 11,28', 'Jesus lädt alle ein, die müde und beladen sind. Wie der Vater, der wartet.'],
    ['1. Johannes 1,9', 'Gott vergibt, wenn wir ehrlich zu ihm kommen.'],
  ],
  steps: [
    { p: 'e', t: 'intro' },
    { p: 'e', t: 'read' },

    { p: 'k', t: 'choice', q: 'Konntest du der Geschichte folgen?',
      o: [
        { label: 'Ja, alles klar', text: 'Super. Dann geht es jetzt etwas tiefer.' },
        { label: 'Zum Teil', text: 'Kein Problem. Tippe oben auf die Bibelstelle und lies die Szene, die offen ist, noch einmal.' },
        { label: 'Nein, nochmal lesen', text: 'Nimm dir Zeit. Der Text ist oben jederzeit nur einen Tipp entfernt.' },
      ],
      m: 'Verständnis sichern, bevor es tiefer geht.' },

    { p: 'k', t: 'cards', layout: 'list', title: 'Ein Begriff vorab',
      lead: { title: 'Tagelöhner', text: 'Jemand, der für den täglichen Lebensunterhalt arbeitet, ohne langfristige Sicherheit. Er hat kein Zuhause und keine Rechte im Haus.' },
      intro: 'Wichtige Beobachtungen. Tippe zum Aufklappen.',
      items: [
        ['Er will weg', 'Er fordert sein Erbe. Das ist der Wunsch nach Unabhängigkeit und ein Bruch mit dem Vater.'],
        ['Er verliert alles', 'Er verprasst alles, dann kommt die Hungersnot. Sünde hat Folgen.'],
        ['Der Schweinestall', 'Tiefste Erniedrigung und Verzweiflung. Für einen Juden gab es nichts Unreineres.'],
        ['Der Wendepunkt', 'Er erinnert sich an die Güte des Vaters: „Ich will zu meinem Vater gehen.“ ([[Lukas 15,17-20]])'],
      ],
      m: 'Wortklärung und erste Beobachtungen.' },

    { p: 'k', t: 'text', q: 'Warum verlässt der Sohn sein Zuhause? Was sagt das über seinen Charakter aus?', lbl: 'Auflösung',
      hint: 'Er fordert sein Erbe, solange der Vater noch lebt (V. 12). Das war ein tiefer Bruch. Er will Unabhängigkeit und glaubt, das Leben beim Vater schränke ihn ein.\n\nDas zeigt einen Charakter, der ungeduldig, undankbar und auf sich selbst bezogen ist. Dahinter steht die Grundhaltung hinter jeder Sünde: Ich weiß besser, was gut für mich ist.',
      m: 'Charakter des Sohnes erkennen, ohne ihn zu verurteilen. Wir erkennen uns darin.' },

    { p: 'k', t: 'text', q: 'Was ist der Unterschied zwischen dem Schweinebauern und dem Vater?', lbl: 'Auflösung',
      hint: 'Beide nehmen den Sohn auf, und doch ist es grundverschieden. Der Bauer gibt ihm Arbeit, aber niemand gibt ihm zu essen (V. 16). Er bleibt ein Fremder, der gebraucht wird. Der Vater gibt ihm keine Arbeit, sondern Ring, Gewand und Schuhe: den Platz als Sohn.\n\nDer eine fragt, was du leisten kannst. Der andere fragt nicht danach, wer du warst, sondern freut sich, dass du da bist.',
      m: 'Äußerlich ähnlich, im Kern grundverschieden: Arbeit zum Überleben gegen Zugehörigkeit.' },

    { p: 'k', t: 'text', q: 'Warum ist der Sohn zum Vater zurückgekehrt?', lbl: 'Auflösung',
      hint: 'Der Hunger war der Anlass, aber nicht der Grund. Der Sohn „ging in sich“ und erinnerte sich, dass selbst die Tagelöhner seines Vaters genug zu essen haben ([[Lukas 15,17]]). Er kehrt um, weil er weiß, wie sein Vater ist.\n\nDas ist das Muster jeder Umkehr: Sie beginnt mit der Erinnerung an die Güte des Vaters. Paulus sagt es so: Gottes Güte führt dich zur Umkehr ([[Römer 2,4]]).',
      m: 'Verständnis aufbauen: Er kehrt wegen der Güte des Vaters um, nicht nur wegen des Hungers.' },

    { p: 'h', t: 'choice', q: 'Wo siehst du dich in dieser Geschichte?', lbl: 'Gedanke dazu',
      o: [
        { label: 'Noch zu Hause', text: 'Du bist nah dran, aber Nähe zeigt sich im Herzen, nicht am Ort. Frag dich: Bin ich beim Vater, weil ich ihn liebe, oder aus Gewohnheit und Pflicht? Auch der ältere Bruder war zu Hause und innerlich weit weg.' },
        { label: 'In der Ferne', text: 'Du gehst deinen eigenen Weg, und vielleicht fühlt es sich gut an. Im Gleichnis kippt es irgendwann: Das Geld ist weg, die Freunde auch. Noch bist du nicht am Tiefpunkt, und die Tür zum Vater steht offen.' },
        { label: 'Im Schweinestall', text: 'Du spürst, dass es so nicht weitergeht: Leere, Einsamkeit, fehlender Sinn. Das ist kein Ende, sondern der Moment, in dem der Sohn zu sich kommt. Ehrlich hinzusehen ist der Anfang der Umkehr.' },
        { label: 'Auf dem Weg zurück', text: 'Der Sohn war noch weit weg, da sah ihn der Vater schon und lief ihm entgegen ([[Lukas 15,20]]). Du musst nicht erst sauber ankommen, du musst dich nur auf den Weg machen.' },
        { label: 'Beim Fest', text: 'Du hast erlebt, was der Vater schenkt: Annahme ohne Vorwürfe. Wer so angenommen wurde, gibt es weiter. Wer sitzt in deinem Umfeld noch im Schweinestall?' },
        { label: 'Beim älteren Bruder', text: 'Er arbeitet treu, kann sich aber nicht mitfreuen. Auch ihm geht der Vater entgegen ([[Lukas 15,28-32]]). Er braucht nicht mehr Leistung, sondern das Herz des Vaters.' },
      ],
      m: 'Persönlichen Bezug zum eigenen Leben herstellen.' },

    { p: 'h', t: 'text', q: 'Wann hast du dich weit weg von Gott gefühlt? Fällt es dir leicht, seine Vergebung anzunehmen, oder trägst du Schuld lange mit dir herum?', lbl: 'Gedanke dazu',
      hint: 'Der Sohn hatte eine Rede vorbereitet: „Mach mich zu einem deiner Tagelöhner“ (V. 18–19). Er konnte nicht glauben, dass er wieder Sohn sein darf. Viele tragen Schuld mit sich herum, weil sie meinen, sie müssten es erst wiedergutmachen.\n\nDer Vater lässt die Rede nicht zu Ende sprechen, er schenkt. Wenn wir unsere Schuld bekennen, ist Gott treu und gerecht, sie zu vergeben ([[1. Johannes 1,9]]). Bekennen, empfangen, nicht länger tragen.',
      m: 'Ehrlichkeit ermöglichen, nicht bewerten. Gegebenenfalls später im Gespräch darauf zurückkommen.' },

    { p: 'h', t: 'choice', q: 'Wann hat der Vater den Sohn am meisten geliebt?',
      o: [
        { label: 'Bevor er ging', text: 'Naheliegend, da war noch alles in Ordnung.' },
        { label: 'Als er alles verprasste', text: 'Das fühlt sich selten so an.' },
        { label: 'Im Schweinestall', text: 'Da hat er die Liebe am nötigsten gebraucht.' },
        { label: 'Als er zurückkam', text: 'Da wurde die Liebe sichtbar.' },
        { label: 'Immer gleich', text: 'Genau.' },
      ],
      all: 'Die Liebe des Vaters hing nie an dem, was der Sohn tat. Als er ging, hat der Vater ihn nicht verstoßen. Als er alles verprasste, hörte er nicht auf, Vater zu sein. Und als der Sohn zurückkam, liebte er ihn nicht mehr als vorher. Er konnte sie nur endlich zeigen.\n\nDer Sohn dachte, er müsse sich die Liebe verdienen: „Mach mich zu einem deiner Tagelöhner.“ Dieses Leistungsdenken kennen wir auch. Gott liebt dich nicht mehr, wenn du mehr leistest, und nicht weniger, wenn du versagst.',
      m: 'Leistungsdenken aufdecken. Die richtige Antwort ist immer „gleich“, aus Sicht des Sohnes aber oft nicht.' },

    { p: 'h', t: 'choice', q: 'War der Vater schuld, dass es dem Sohn schlecht ging?',
      o: [
        { label: 'Ja', text: 'Das denken viele, wenn es hart wird.' },
        { label: 'Nein', text: 'Richtig.' },
        { label: 'Teils, teils', text: 'Ein ehrlicher Gedanke.' },
      ],
      all: 'Der Vater hat den Sohn nicht gedrängt und nicht festgehalten. Er gab ihm das Erbe, weil der Sohn es verlangte. Die Folgen entstanden aus der Entscheidung des Sohnes, nicht aus der Härte des Vaters. Und trotzdem war der Vater nie weg: Er hat gewartet.\n\nDas beantwortet nicht jedes Leid, denn nicht alles Schlimme ist selbst verschuldet. Aber es zeigt, wie Gott zu uns steht: nie mit Strafe im Blick, sondern mit einer Liebe, die auf Umkehr wartet.',
      m: 'Dem Gedanken „Warum lässt Gott das zu?“ und „Warum passiert mir Schlechtes?“ begegnen.' },

    { p: 'h', t: 'text', q: 'Wie reagiert der Vater auf die Rückkehr des Sohnes? Was zeigt das über Gottes Herz?', lbl: 'Auflösung',
      hint: 'Er sieht den Sohn schon von weitem, hat Mitleid, läuft ihm entgegen, umarmt und küsst ihn (V. 20). Das alles geschieht, bevor der Sohn seine Rede halten kann. Dann gibt er ihm Gewand, Ring und Schuhe und feiert ein Fest (V. 22–24).\n\nDas zeigt Gottes Herz: Er wartet, er läuft, er nimmt an ohne Vorwürfe, er macht den Sohn nicht zum Knecht. Er freut sich.',
      m: 'Gottes Identität klar zeigen.' },

    { p: 'h', t: 'text', q: 'Was hättest du in seiner Situation getan?', lbl: 'Gedanke dazu',
      hint: 'Wahrscheinlich dasselbe: Wenn nichts mehr geht, will man dorthin, wo es gut war. Und doch ist es eine Entscheidung. Er hätte auch bleiben, schweigen oder aufgeben können. Scham und Stolz halten viele davon ab.\n\nDer Sohn geht trotz seiner Scham. Das Bild dahinter: Du kannst jederzeit gehen, und du musst nicht erst besser werden.',
      m: 'Sich in die Geschichte hineinversetzen. Die Antwort ist klar.' },

    { p: 'h', t: 'reveal', title: 'Das Bild dahinter',
      items: [
        { text: 'Wir alle haben alles von Gott bekommen und unseren eigenen Willen verfolgt. Irgendwann merkt man: Es geht so nicht weiter. Falsche Freunde, Leere, fehlende Richtung.', note: 'Wann hat der Sohn an den Vater gedacht: in der Stadt oder erst ganz unten?' },
        { text: 'Der Vater kam nicht in den Schweinestall. Der Sohn musste sich auf den Weg machen.' },
        { text: 'Doch als die Umkehr begann, lief der Vater ihm entgegen: ohne Vorwürfe, nur mit Liebe und Annahme.' },
      ] },

    { p: 'h', t: 'cards', layout: 'grid', title: 'Was der Vater ihm schenkt', intro: 'Tippe auf ein Geschenk.',
      items: [
        ['Mastkalb', 'Jemand musste stellvertretend sterben und bezahlen. Ein Bild für das Opfer von Jesus.'],
        ['Ring', 'Wiederherstellung der Beziehung, Zugehörigkeit und Autorität. Ein Bild für die Versiegelung mit dem Heiligen Geist.'],
        ['Gewand', 'Gerechtigkeit, die man sich nicht verdient. Siehe [[Galater 3,27]]: Christus angezogen.'],
        ['Schuhe', 'Freiheit und Stand als Sohn, nicht als Knecht. Auch ein Bild für das Evangelium weitertragen.'],
      ] },

    { p: 'x', t: 'choice', q: 'Bist du bereit, zum Vater zurückzugehen und seine Liebe zu erfahren?',
      o: [
        { label: 'Ja, ich will', text: 'Dann lass uns jetzt beten. Du musst nichts Perfektes sagen, der Vater läuft dir entgegen, bevor du ankommst.' },
        { label: 'Ich bin unsicher', text: 'Das ist in Ordnung. Unsicherheit ist ehrlich, und du kannst jederzeit wiederkommen.' },
        { label: 'Noch nicht', text: 'Kein Druck. Die Tür bleibt offen, der Vater wartet nicht beleidigt, sondern liebevoll.' },
      ],
      m: 'Zum Nachdenken bringen, nicht drängen. Die Antwort ist eigentlich klar.' },

    { p: 'x', t: 'prayer',
      text: 'Vater, ich habe oft meinen eigenen Weg gewählt. Ich merke, dass es ohne dich nicht trägt. Danke, dass du mir entgegenkommst und mich nicht verurteilst. Ich komme zu dir zurück. Hilf mir, dir zu vertrauen.' },

    { p: 'x', t: 'text', q: 'Der Vater vergibt sofort. Wie kannst du in deinem Alltag jemandem so vergeben?', lbl: 'Impuls',
      hint: 'Der Vater wartete nicht, bis sich der Sohn genug entschuldigt hatte. Er lief los. So kannst du vergeben: nicht abwarten, bis der andere den ersten Schritt macht, ohne Vorwurf annehmen, ein Zeichen setzen (eine Umarmung, ein Essen, ein Wort).\n\n„Vergebt einander, wie auch Gott euch vergeben hat“ ([[Epheser 4,32]]).',
      m: 'Von der eigenen Erfahrung der Vergebung zum Weitergeben führen.' },

    { p: 'x', t: 'choice', q: 'Dein Schritt für diese Woche', o: STEP_OPTIONS,
      m: 'Ein konkreter Schritt statt vieler guter Vorsätze.' },

    { p: 'v', t: 'more' },
  ],
}
