// ─────────────────────────────────────────────────────────────
// Bibelstudien 2–14 (Kopf · Herz · Hand) – Rohinhalte.
//
// ENTWURF: Fragen stammen aus der Vorlage des Teams, die „Auflösungen“,
// Impulse, Wochenschritte und Gebete sind Textvorschläge und müssen noch mit
// den Glaubensgeschwistern durchgesehen werden.
//
// Schreibweise in Texten:
//   [[Römer 2,4]]            → antippbare Bibelstelle (Label = Stelle)
//   [[Röm 2,4|Römer 2,4]]    → Label | Stelle
//   Leerzeile                → neuer Absatz
// Stellen müssen so geschrieben sein, dass lib/bibleBooks#parseGermanReference
// sie versteht („Lukas 15,17-20“, nicht „Lk 15:17–20“; „5. Mose“ wird nicht
// erkannt und bleibt deshalb ohne Verweis).
// ─────────────────────────────────────────────────────────────

export const STATIONS = [
  { id: 'entdecken',  name: 'Entdecken',        sub: 'Wer ist Jesus, und was hat er für mich getan?' },
  { id: 'wurzeln',    name: 'Wurzeln schlagen', sub: 'Gottes Wort verstehen, Versuchung und Vergebung' },
  { id: 'nachfolgen', name: 'Nachfolgen',       sub: 'Alles halten, was Jesus gesagt hat' },
  { id: 'juenger',    name: 'Jünger machen',    sub: 'Weitergeben, dienen, Gemeinschaft leben' },
]

const K = 'Verständnis des Textes sichern.'
const H = 'Persönlichen Bezug herstellen, nicht bewerten.'
const X = 'Zu einem konkreten Handeln anstoßen.'

export const RAW = [
  {
    id: 'markus-5', nr: 2, station: 'entdecken',
    title: 'Die Befreiung des Besessenen', ref: 'Markus 5,1-20',
    teaser: 'Jesus befreit einen Mann, den niemand halten konnte.',
    goals: [
      'Sehen, dass Jesus Macht über alles hat, was uns gefangen hält',
      'Erleben, wie Jesus mit Menschen umgeht, die alle abgeschrieben haben',
      'Entdecken, dass unsere Geschichte andere erreichen kann',
    ],
    kopf: [
      ['Warum reagieren die Leute ängstlich, als sie den geheilten Mann sehen?',
        'Sie finden ihn „sitzend, bekleidet und vernünftig“ (V. 15). Die Veränderung macht ihnen mehr Angst als der Wahnsinn vorher. Mit dem alten Zustand hatten sie sich arrangiert, auch wenn er schlimm war.\n\nDazu kommt: Die Befreiung hat sie die Schweineherde gekostet (V. 14–16). Sie bitten Jesus zu gehen (V. 17). Echte Veränderung durch Jesus verunsichert, weil sie zeigt, dass hier eine Macht am Werk ist, die man nicht kontrollieren kann.'],
      ['Warum schickt Jesus ihn zurück zu seiner Familie, statt ihn als Jünger mitzunehmen?',
        'Der Mann will bei Jesus bleiben, und das ist verständlich (V. 18). Jesus gibt ihm einen anderen Auftrag: „Geh nach Hause zu den Deinen und erzähle ihnen, was der Herr für dich getan hat“ (V. 19).\n\nDort, wo man ihn nur als den Besessenen kannte, ist sein verändertes Leben der beste Beweis. Er erzählt es in der ganzen Dekapolis (V. 20), einem Gebiet, in dem noch niemand von Jesus gehört hatte. Nachfolge heißt nicht immer mitgehen. Manchmal heißt sie: genau dort bleiben und erzählen.'],
    ],
    herz: [
      ['Gibt es Bereiche in deinem Leben, in denen du noch Befreiung brauchst?',
        'Der Mann war äußerlich gefesselt. Viele Fesseln sind heute unsichtbar: Sucht, Angst, Scham, Bitterkeit, Gewohnheiten. Jesus fragte ihn nicht nach seiner Schuld, er sprach ihm Freiheit zu.\n\nNenne Jesus ehrlich einen Bereich. Wenn du magst, sprich auch mit einem Menschen darüber, dem du vertraust. Freiheit beginnt oft damit, es auszusprechen. [[Johannes 8,36]]'],
      ['Der Geheilte wird zum Evangelisten. Wie bereit bist du, deine Geschichte zu erzählen?',
        'Der Mann musste keine Theologie kennen. Er erzählte, was Jesus an ihm getan hat. Dein Zeugnis passt in drei Sätze:\n\n1. Wie war mein Leben vor Jesus?\n2. Wie habe ich Jesus erlebt?\n3. Was hat sich verändert?\n\nMehr braucht es nicht. Du darfst das aufschreiben und üben.'],
    ],
    hand: [
      ['Wo kannst du in dieser Woche von Jesus erzählen?',
        'Denke an einen konkreten Menschen und einen konkreten Ort: Kollegen, Familie, Nachbarn. Ein Satz reicht als Anfang: „Mir hat Jesus in … geholfen.“ Bitte Gott morgens um eine Gelegenheit und halte die Augen offen.'],
      ['Wie kannst du Menschen in deinem Umfeld helfen, frei zu werden?',
        'Jesus ging zu dem Menschen, den alle mieden. Du musst niemanden befreien, das tut Jesus. Du kannst aber zu ihm führen: zuhören, für den Menschen beten, ihn begleiten, ihm einen Mentor oder eine Gemeinde zeigen.'],
    ],
    steps: [
      ['Mein Zeugnis in drei Sätzen aufschreiben', 'Schreib es heute auf. Es muss nicht perfekt sein.'],
      ['Einer Person erzählen, was Jesus für mich getan hat', 'Such dir einen Menschen aus und erzähl es in zwei Minuten.'],
      ['Für jemanden beten, der gebunden ist', 'Bete täglich für ihn und frag ihn, wie du ihm helfen kannst.'],
    ],
    prayer: 'Jesus, du hast Macht über alles, was mich fesselt. Ich bringe dir den Bereich, in dem ich Befreiung brauche. Danke, dass du mich nicht aufgibst. Gib mir Mut zu erzählen, was du an mir getan hast.',
    verses: [['Johannes 8,36', 'Freiheit durch den Sohn'], ['Psalm 107,13-14', 'Gott führt aus der Finsternis']],
    m: [K, H, X],
  },

  {
    id: 'apostelgeschichte-8', nr: 3, station: 'wurzeln',
    title: 'Philippus und der Kämmerer', ref: 'Apostelgeschichte 8,26-40',
    teaser: 'Gott schickt einen Mann auf eine einsame Straße, um einen einzelnen Menschen zu finden.',
    goals: [
      'Erleben, wie Gott einen einzelnen Menschen sucht',
      'Sehen, wie man jemandem die Bibel erklärt',
      'Mut bekommen, auf Gottes Führung sofort zu reagieren',
    ],
    kopf: [
      ['Warum schickt Gott Philippus auf eine scheinbar einsame Straße?',
        'Philippus war gerade mitten in einer Erweckung in Samaria (V. 5–8). Gott zieht ihn heraus und schickt ihn auf eine öde Straße (V. 26), zu einem einzelnen Mann.\n\nFür Gott zählt der Einzelne. Der Kämmerer aus Äthiopien war ein hoher Beamter, er suchte Gott und las Jesaja, ohne es zu verstehen. Gott kennt die Menschen, die suchen, und sendet jemanden zu ihnen.'],
      ['Warum will der Kämmerer sich sofort taufen lassen?',
        'Philippus erklärt ihm die Stelle in [[Jesaja 53,7-8]] und verkündigt ihm Jesus (V. 35). Der Kämmerer erkennt: Das gilt mir.\n\nAls Ausländer, und vermutlich auch als Eunuch, war er vom Tempelgottesdienst ausgeschlossen. Hier hört er von einem, der für ihn gelitten hat und ihn annimmt. Die Taufe ist seine sichtbare Antwort auf das, was er verstanden hat. Er sieht keinen Grund zu warten (V. 36).'],
    ],
    herz: [
      ['Was hält dich davon ab, direkt zu tun, was Gott dir sagt?',
        'Philippus „stand auf und ging“ (V. 27), ohne Rückfragen. Was uns oft bremst: Angst, Bequemlichkeit, „Was denken die anderen?“, „Ich bin nicht gut genug“.\n\nBenenne deinen Grund ehrlich und bring ihn Gott. Gehorsam wächst durch kleine Schritte.'],
      ['Lässt du dir von anderen helfen, die Bibel zu verstehen?',
        'Der Kämmerer fragt: „Wie könnte ich es, wenn mich niemand anleitet?“ (V. 31). Er war nicht zu stolz, Hilfe zu holen. Die Bibel zu verstehen geht selten allein: ein Mentor, ein Hauskreis, ein Bibelstudium. Wer lernen will, darf fragen.'],
    ],
    hand: [
      ['Wie kannst du sensibler für Gottes Führung im Alltag werden?',
        'Philippus hörte auf den Engel und dann auf den Geist (V. 26 und 29). Praktisch: Morgens eine Minute still werden und fragen: „Wen soll ich heute sehen?“ Kleine Impulse ernst nehmen, an der Bibel prüfen und dann tun.'],
      ['Wen kannst du in dieser Woche zum Glauben einladen?',
        'Philippus begann bei dem, was der Mann gerade las. Frag den anderen nach seiner Frage, statt mit deiner Antwort anzufangen. Dann lade ein: zu einem Gespräch, zu einem gemeinsamen Bibelstudium, zu einem Treffen.'],
    ],
    steps: [
      ['Jeden Morgen fragen: Wen soll ich heute sehen?', 'Schreib dir die Frage als Erinnerung ins Handy.'],
      ['Eine Person zu einem Bibelgespräch einladen', 'Du kannst zum Beispiel „Der verlorene Sohn“ gemeinsam durchgehen.'],
      ['Eine Bibelstelle mit jemandem lesen und Fragen stellen', 'Frag: „Was fällt dir auf?“ und hör zu.'],
    ],
    prayer: 'Herr, du suchst jeden einzelnen Menschen. Mach mich bereit, auf deine Stimme zu hören und sofort zu gehorchen. Zeig mir, wem ich heute begegnen soll, und gib mir die Worte.',
    verses: [['Jesaja 53,7-8', 'Das Lamm, das geführt wird'], ['Römer 10,14-15', 'Wie sollen sie hören ohne einen Boten?']],
    m: [K, H, X],
  },

  {
    id: 'lukas-4', nr: 4, station: 'wurzeln',
    title: 'Die Versuchung Jesu', ref: 'Lukas 4,1-13',
    teaser: 'Wie Jesus dem Teufel mit Gottes Wort begegnet.',
    goals: [
      'Verstehen, wie Jesus Versuchung begegnet',
      'Gottes Wort als Waffe kennenlernen',
      'Wissen: Versuchung ist keine Sünde, das Nachgeben schon',
    ],
    kopf: [
      ['Warum versucht der Teufel Jesus direkt nach seiner Taufe?',
        'Gerade hat der Vater gesagt: „Du bist mein geliebter Sohn“ ([[Lukas 3,21-22]]). Der Teufel greift genau dort an: „Wenn du Gottes Sohn bist …“ (V. 3 und 9). Er stellt die Identität in Frage.\n\nWo Gott etwas Neues beginnt, kommt oft Widerstand. Und Jesus wird vom Geist in die Wüste geführt (V. 1): Versuchung bedeutet nicht, dass etwas falsch läuft.'],
      ['Wie wehrt sich Jesus gegen die Versuchungen?',
        'Jedes Mal mit „Es steht geschrieben“ (V. 4, 8 und 12). Alle drei Antworten stammen aus 5. Mose (8,3; 6,13; 6,16). Jesus diskutiert nicht, er stellt sich auf Gottes Wort.\n\nAuffällig: Der Teufel zitiert selbst die Bibel (V. 10–11, aus [[Psalm 91,11-12]]), aber er reißt sie aus dem Zusammenhang. Wir müssen Gottes Wort kennen, damit wir Verdrehungen erkennen.'],
    ],
    herz: [
      ['In welchen Bereichen deines Lebens erlebst du Versuchung?',
        'Versuchung ist nicht Sünde. Jesus wurde versucht und blieb ohne Sünde ([[Hebräer 4,15]]). Die drei Felder im Text sind uns vertraut: Genuss und Bequemlichkeit (Brot), Macht und Anerkennung (die Reiche der Welt), Gott auf die Probe stellen (Tempelzinne).\n\nBenenne deine Felder ehrlich. Hast du mit jemandem darüber gesprochen?'],
      ['Welche Bibelverse können dir helfen, Versuchungen zu widerstehen?',
        'Wie Jesus: Lerne Verse auswendig, die zu deinen Versuchungen passen.\n\n• [[1. Korinther 10,13]]: Gott lässt dich nicht über deine Kraft versuchen und schafft einen Ausweg.\n• [[Jakobus 4,7]]: Widersteht dem Teufel.\n• [[Psalm 119,11]]: Das Wort im Herzen bewahren.\n\nSchreib dir einen Vers auf, den du immer sehen kannst.'],
    ],
    hand: [
      ['Was kannst du konkret tun, um Versuchungen zu entkommen?',
        'Die Bibel sagt oft: Flieh ([[2. Timotheus 2,22]]). Praktisch heißt das: Auslöser erkennen und meiden, einen Vers bereit haben, jemandem Rechenschaft geben, beten, bevor es kritisch wird. Jesus ging übrigens nicht allein: Er war „voll des Heiligen Geistes“ (V. 1).'],
      ['Wie kannst du anderen helfen, in Versuchungen standhaft zu bleiben?',
        '„Tragt einander die Lasten“ ([[Galater 6,1-2]]). Frag nach, bete, ermutige mit einem Vers, sei Ansprechpartner ohne Verurteilung. Wer gefallen ist, braucht Wiederherstellung statt Zeigefinger.'],
    ],
    steps: [
      ['Einen Vers gegen meine Versuchung auswendig lernen', 'Such dir einen aus und wiederhole ihn jeden Tag.'],
      ['Meinen Auslöser aufschreiben und eine Sache ändern', 'Eine konkrete Änderung reicht für diese Woche.'],
      ['Jemanden als Rechenschaftspartner fragen', 'Frag einen Christen, dem du vertraust, ob ihr euch wöchentlich austauscht.'],
    ],
    prayer: 'Jesus, du kennst Versuchung und bist ihr nicht erlegen. Danke, dass du mir hilfst. Zeig mir meine schwachen Stellen und gib mir dein Wort, wenn es darauf ankommt.',
    verses: [['Hebräer 4,15-16', 'Jesus versteht uns'], ['1. Korinther 10,13', 'Gott schafft einen Ausweg']],
    m: [K, H, X],
  },

  {
    id: 'matthaeus-13', nr: 5, station: 'wurzeln',
    title: 'Der Sämann', ref: 'Matthäus 13,1-23',
    teaser: 'Vier Böden, vier Arten, Gottes Wort zu hören.',
    goals: [
      'Verstehen, wie Menschen auf Gottes Wort reagieren',
      'Ehrlich prüfen, wie es um das eigene Herz steht',
      'Großzügig säen, ohne vorher zu sortieren',
    ],
    kopf: [
      ['Welche verschiedenen Böden gibt es, und was bedeuten sie?',
        'Es sind vier: der Weg, der felsige Boden, der Boden mit Dornen und das gute Land. Sie stehen für vier Arten, wie Menschen auf Gottes Wort reagieren. Die Einzelheiten siehst du gleich auf den Karten.\n\nWichtig: Der Sämann sät großzügig auf alle Böden, er sortiert vorher nicht aus.'],
    ],
    cards: {
      title: 'Die vier Böden', intro: 'Tippe auf einen Boden.', layout: 'grid',
      items: [
        ['Der Weg', 'Ein hartes Herz. Man hört das Wort, versteht es aber nicht, und der Böse nimmt es weg (V. 19).'],
        ['Felsiger Boden', 'Begeisterung ohne Wurzeln. Man nimmt das Wort sofort mit Freude auf, aber bei Druck oder Verfolgung fällt man ab (V. 20–21).'],
        ['Dornen', 'Ein abgelenktes Herz. Die Sorgen der Welt und der Reiz des Reichtums ersticken das Wort (V. 22).'],
        ['Gutes Land', 'Ein offenes Herz. Man hört, versteht und bringt Frucht, hundert-, sechzig- oder dreißigfach (V. 23).'],
      ],
    },
    herz: [
      ['Welchen Boden beschreibt dein Leben am besten?',
        'Oft sind wir in verschiedenen Lebensphasen verschiedene Böden. Frag dich ehrlich: Wo ist mein Herz hart, wo flach, wo dornig, wo offen?\n\nDie gute Nachricht: Boden lässt sich bearbeiten. „Pflügt ein Neues“, heißt es in [[Hosea 10,12]].'],
      ['Was kannst du tun, damit dein Herz empfänglicher für Gottes Wort und seine Führung wird?',
        'Gottes Wort nicht nur hören, sondern darüber nachdenken, beten und die Gemeinschaft suchen. Konkret: eine feste Zeit, ein Bibelstudium wie dieses, jemandem erzählen, was du gelernt hast. Wurzeln wachsen in kleinen, täglichen Schritten.'],
    ],
    hand: [
      ['Mit wem kannst du das Evangelium diese Woche teilen?',
        'Der Sämann streut verschwenderisch, ohne vorher zu prüfen, wo guter Boden ist. Das ist unser Auftrag: säen, das Wachsen schenkt Gott ([[1. Korinther 3,6]]). Nenne zwei Namen aus deinem Umfeld, zum Beispiel aus deiner Oikos-Map, und beginne mit Gebet für sie.'],
      ['Welche Hindernisse (Dornengestrüpp, Felsen) musst du aus deinem Leben entfernen?',
        'Dornen sind Sorgen, Termine, Geld und Ablenkung (zum Beispiel das Handy). Felsen sind oberflächlicher Glaube ohne Wurzeln und die Angst vor Ablehnung. Wähle diese Woche eine Sache: einen Zeitfresser, eine Gewohnheit, eine ungeklärte Beziehung. Bitte Gott, dir die Steine zu zeigen.'],
    ],
    steps: [
      ['Täglich 10 Minuten in der Bibel lesen und eine Sache aufschreiben', 'Gute Wurzeln brauchen regelmäßiges Wasser.'],
      ['Eine Ablenkung für eine Woche streichen', 'Welche Dorne erstickt dich am meisten?'],
      ['Zwei Menschen aufschreiben und für sie beten', 'Bete täglich und halte die Augen nach einer Gelegenheit offen.'],
    ],
    prayer: 'Vater, mach mein Herz weich und offen für dein Wort. Zeig mir, was bei mir hart, flach oder dornig ist, und bearbeite es. Gib mir Mut, großzügig zu säen.',
    verses: [['Jakobus 1,22', 'Täter des Wortes sein'], ['Markus 4,26-29', 'Das Wachsen schenkt Gott']],
    m: [K, H, X],
  },

  {
    id: 'matthaeus-18', nr: 6, station: 'wurzeln',
    title: 'Der unbarmherzige Knecht', ref: 'Matthäus 18,21-35',
    teaser: 'Wer viel vergeben bekommen hat, kann vergeben.',
    goals: [
      'Verstehen, wie groß die Vergebung ist, die wir empfangen haben',
      'Erkennen, wo Unversöhnlichkeit uns bindet',
      'Vergebung als Entscheidung leben lernen',
    ],
    kopf: [
      ['Warum ist Vergebung so wichtig im Reich Gottes?',
        'Petrus fragt, ob siebenmal genug ist. Jesus antwortet: siebzigmal siebenmal (V. 21–22), also ohne Grenze.\n\nDer Knecht schuldet dem König 10.000 Talente, eine Summe, die er nie zurückzahlen kann (V. 24). Sein Mitknecht schuldet ihm 100 Denare, vergleichsweise ein Kleinbetrag (V. 28). Gott hat uns eine unbezahlbare Schuld erlassen. Wer das verstanden hat, kann nicht anders, als weiterzugeben. Unversöhnlichkeit zeigt, dass man die Gnade nicht wirklich begriffen hat.'],
      ['Was sagt die Einstellung des unbarmherzigen Knechts über seinen Charakter aus?',
        'Er bittet um Geduld und bekommt viel mehr: einen vollständigen Schuldenerlass. Statt dankbar zu sein, würgt er den Mitknecht und lässt ihn ins Gefängnis werfen (V. 28–30). Er ist undankbar und hart und hat die Gnade nicht auf sein Leben wirken lassen. Er will Gnade empfangen, aber nicht geben.'],
    ],
    herz: [
      ['Gibt es jemanden, dem du vergeben musst?',
        'Nimm dir Zeit. Wer fällt dir ein? Oft ist es jemand, an den man nicht gern denkt.\n\nVergebung ist eine Entscheidung, nicht zuerst ein Gefühl. Sie heißt nicht, dass das Unrecht gut war oder dass du wieder ungeschützt vertraust. Sie heißt: Ich lasse die Schuld los und übergebe sie Gott.'],
      ['Warum fällt es dir manchmal schwer, Vergebung anzunehmen oder zu geben?',
        'Beim Geben ist der Schmerz echt. Man fürchtet, dass das Unrecht kleingeredet wird, und der Stolz spielt mit. Beim Annehmen ist es oft Scham und das Gefühl, es nicht verdient zu haben. Gnade ist aber unverdient, sonst wäre sie keine.\n\n„Vergebt einander, wie auch Gott euch vergeben hat in Christus“ ([[Epheser 4,32]]).'],
    ],
    hand: [
      ['Wie kannst du diese Woche aktiv Vergebung leben?',
        'Schreib den Namen auf. Bete für die Person, segne sie, statt Groll zu pflegen. Wenn es möglich und sicher ist, suche das Gespräch oder schreib eine Nachricht. Wenn nicht, sprich die Vergebung im Gebet aus.\n\nBei schwerem Unrecht oder Missbrauch musst du dich nicht in Gefahr bringen. Hol dir dann Hilfe bei einem Seelsorger.'],
      ['Wie kannst du jemandem Gottes Vergebung erklären?',
        'Einfach gesagt: Jesus hat für unsere Schuld bezahlt ([[Kolosser 2,13-14]]). Wer ihn darum bittet, bekommt sie erlassen. Das Bild vom Knecht, dem alles erlassen wurde, hilft. Und erzähl, wie du selbst Vergebung erlebt hast.'],
    ],
    steps: [
      ['Einer Person vergeben und es im Gebet aussprechen', 'Nenne den Namen und übergib die Schuld Gott.'],
      ['Jemanden um Vergebung bitten', 'Beginne mit einem Satz: „Es tut mir leid, dass …“'],
      ['Ein Gespräch zur Versöhnung suchen', 'Wähle einen guten Zeitpunkt, wenn es sicher ist.'],
    ],
    prayer: 'Vater, danke, dass du mir meine große Schuld vergeben hast. Hilf mir, anderen zu vergeben, wie du mir vergeben hast. Ich übergebe dir den Schmerz und die Schuld, die ich festhalte.',
    verses: [['Epheser 4,31-32', 'Vergebt einander'], ['Matthäus 6,14-15', 'Vergeben und vergeben bekommen']],
    m: [K, H, X],
  },

  {
    id: 'markus-10', nr: 7, station: 'nachfolgen',
    title: 'Der reiche junge Mann', ref: 'Markus 10,17-27',
    teaser: 'Was uns davon abhält, Jesus ganz zu folgen.',
    goals: [
      'Erkennen, woran unser Herz hängt',
      'Verstehen, dass Rettung Gnade ist und keine Leistung',
      'Einen konkreten Schritt in die Nachfolge gehen',
    ],
    kopf: [
      ['Warum geht der junge Mann traurig weg?',
        'Er hat viel (V. 22), aber Jesus zeigt ihm, woran sein Herz hängt: „Eines fehlt dir“ (V. 21). Er wollte etwas tun, um das ewige Leben zu erben, aber er wollte nicht loslassen, um Jesus zu folgen.\n\nBemerkenswert: „Jesus sah ihn an und gewann ihn lieb“ (V. 21). Die Aufforderung kommt aus Liebe. Er geht traurig, weil er merkt: Sein Besitz hat ihn.'],
    ],
    herz: [
      ['Gibt es etwas, das dich daran hindert, Jesus ganz zu folgen?',
        'Es muss nicht Geld sein: Ansehen, Karriere, eine Beziehung, Sicherheit, Gewohnheiten. Frag dich: Wenn Jesus mich bitten würde, das aufzugeben, was würde mir am schwersten fallen? Genau dort hängt das Herz.'],
      ['Wie wichtig ist dir materieller Besitz im Vergleich zu Jesus?',
        'Jesus sagt nicht, dass Besitz böse ist, aber dass er uns binden kann ([[Matthäus 6,24]]). Ein Prüfstein: Könntest du etwas hergeben, wenn Gott es verlangt? Besitz ist anvertrautes Gut.\n\nDie Jünger fragen entsetzt: „Wer kann dann gerettet werden?“ Jesus antwortet: Für Menschen unmöglich, aber bei Gott ist alles möglich (V. 26–27). Rettung ist Gnade und keine Leistung.'],
    ],
    hand: [
      ['Welche konkreten Schritte kannst du tun, um Jesus nachzufolgen?',
        'Benenne eine Sache, die du Jesus ganz übergibst. Fang mit etwas Konkretem an: Zeit, Geld (zum Beispiel für jemanden in Not geben) oder eine Gewohnheit. Klein, aber konkret.'],
      ['Wem kannst du helfen, sich auf Jesus zu fokussieren statt auf Besitz?',
        'Durch dein Beispiel: großzügig und zufrieden leben. Frag Freunde, was sie wirklich trägt. Erzähl, was Jesus dir bedeutet. Verbringt Zeit gemeinsam in Gottes Wort statt im Konsum.'],
    ],
    steps: [
      ['Etwas Wertvolles bewusst verschenken oder spenden', 'Es soll spürbar sein, aber freiwillig und mit Freude.'],
      ['Eine Gewohnheit streichen, die mich von Jesus ablenkt', 'Eine Woche reicht für den Anfang.'],
      ['Jemanden fragen, was ihn wirklich trägt', 'Hör zu, ohne gleich zu antworten.'],
    ],
    prayer: 'Jesus, du siehst mich an und hast mich lieb. Zeig mir, woran mein Herz hängt, und hilf mir loszulassen. Ich will dir ganz folgen.',
    verses: [['Matthäus 6,19-21', 'Wo dein Schatz ist'], ['1. Timotheus 6,17-19', 'Reich sein an guten Werken']],
    m: [K, H, X],
  },

  {
    id: 'markus-11', nr: 8, station: 'nachfolgen',
    title: 'Glaube und Vergebung', ref: 'Markus 11,20-26',
    teaser: 'Warum Jesus Beten und Vergeben zusammen nennt.',
    goals: [
      'Verstehen, was Glaube im Gebet bedeutet',
      'Zweifel ehrlich zu Gott bringen',
      'Sehen, wie Vergebung und Gebet zusammenhängen',
    ],
    kopf: [
      ['Warum vertrocknet der Feigenbaum? Was zeigt uns das über den Glauben?',
        'Jesus hatte den Baum am Tag zuvor verflucht, weil er trotz Blättern keine Frucht trug (V. 12–14). Am nächsten Morgen ist er von den Wurzeln her verdorrt (V. 20–21). Petrus staunt.\n\nJesus lenkt den Blick auf den Glauben: „Habt Glauben an Gott“ (V. 22). Gottes Wort wirkt, und im Gebet dürfen wir mit Vertrauen bitten (V. 24). Der Baum steht auch als Bild für Schein ohne Frucht.'],
    ],
    herz: [
      ['Glaubst du, dass Gott deine Gebete hört? Oder hast du manchmal Zweifel?',
        'Zweifel gehört bei vielen zum Glauben dazu. Ein Vater ruft in [[Markus 9,24]]: „Ich glaube, hilf meinem Unglauben!“ Jesus weist ihn nicht ab. Bete ehrlich, auch mit Zweifel.'],
      ['Warum verbindet Jesus das Beten mit Vergebung? Gibt es jemanden, dem du vergeben solltest?',
        'In V. 25 sagt Jesus: Wenn du betest und etwas gegen jemanden hast, vergib. Wer selbst Vergebung empfangen hat, soll sie weitergeben ([[Matthäus 6,14-15]]). Unversöhnlichkeit belastet die Beziehung zu Gott und zu Menschen und lässt das Gebet schwer werden.'],
    ],
    hand: [
      ['Wie kannst du mutiger an Gottes Versprechen glauben?',
        'Sammle Versprechen aus der Bibel. Such dir eins aus, bete es konkret, und halte fest, wie Gott antwortet. In der App kannst du erhörte Gebete festhalten, das stärkt den Glauben.'],
      ['Gibt es jemanden, mit dem du Frieden schließen solltest?',
        'Mach den ersten Schritt, auch wenn du nicht der Verursacher bist ([[Matthäus 5,23-24]]). Eine kurze Nachricht kann reichen: „Ich möchte, dass wir Frieden haben.“'],
    ],
    steps: [
      ['Ein Versprechen aus der Bibel wählen und eine Woche dafür beten', 'Schreib das Versprechen und das Datum auf.'],
      ['Ein Gebet aufschreiben und die Antwort festhalten', 'Nutze dafür die erhörten Gebete in der App.'],
      ['Mit einer Person Frieden schließen', 'Beginne mit einer kurzen Nachricht.'],
    ],
    prayer: 'Vater, ich glaube, hilf meinem Unglauben. Danke, dass du mich hörst. Ich vergebe allen, die mir Unrecht getan haben, und bitte dich, mir mutigen Glauben zu schenken.',
    verses: [['Markus 9,23-24', 'Alles ist möglich dem, der glaubt'], ['Matthäus 5,23-24', 'Erst versöhnen, dann opfern']],
    m: [K, H, X],
  },

  {
    id: 'johannes-17', nr: 9, station: 'nachfolgen',
    title: 'Das Gebet von Jesus', ref: 'Johannes 17,1-26',
    teaser: 'Jesus betet für seine Jünger, auch für uns.',
    goals: [
      'Hören, wofür Jesus selbst betet',
      'Verstehen, warum Einheit unter Christen ein Zeugnis ist',
      'Lernen, für andere zu beten wie Jesus',
    ],
    kopf: [
      ['Für wen betet Jesus in diesem Kapitel?',
        'In drei Kreisen: für sich selbst (V. 1–5), dass der Vater ihn verherrlicht. Für seine Jünger (V. 6–19), dass sie bewahrt und geheiligt werden. Und für alle, die durch ihr Wort an ihn glauben werden (V. 20–26). Dazu gehören wir.'],
      ['Warum bittet Jesus darum, dass die Gläubigen eins sind?',
        '„Damit die Welt glaubt, dass du mich gesandt hast“ (V. 21). Die Einheit der Christen ist ein Zeugnis. Maßstab ist die Einheit von Vater und Sohn: Liebe, nicht Gleichförmigkeit. Zerstrittene Christen schwächen die Botschaft, eine liebende Gemeinschaft macht sie glaubwürdig ([[Johannes 13,35]]).'],
    ],
    herz: [
      ['Wie kannst du heute dazu beitragen, dass Christen zusammenhalten?',
        'Nicht über andere Christen reden, sondern mit ihnen. Unterschiede aushalten und das Gemeinsame suchen: Jesus und das Evangelium. Konkret: jemanden aus einer anderen Gemeinde einladen, für Einheit beten, einen Streit klären.'],
      ['Jesus sagt, wir sollen in der Welt leben, aber nicht so wie die Welt. Wo fällt dir das schwer?',
        'Jesus bittet nicht, uns aus der Welt zu nehmen, sondern uns vor dem Bösen zu bewahren (V. 15). Schwer wird es bei Anpassung im Freundeskreis, bei der Arbeit, bei Medien und Werten. Frag dich: Wo passe ich mich an, um nicht aufzufallen? Jesu Bitte lautet: „Heilige sie in der Wahrheit“ (V. 17).'],
    ],
    hand: [
      ['Jesus schickt seine Jünger los. Wie kannst du anderen von ihm erzählen?',
        '„Wie du mich in die Welt gesandt hast, so sende ich sie in die Welt“ (V. 18). Du bist nicht nur gerettet, sondern auch gesandt. Beginne mit deinem Zeugnis, einer Einladung oder einer Frage, dort, wo du lebst.'],
      ['Wie kannst du für andere Christen beten, so wie Jesus es getan hat?',
        'Jesus betet für ihre Bewahrung, Heiligung, Einheit und Freude. Mach dir eine Liste mit drei bis fünf Christen und bete diese vier Anliegen für sie. Sag ihnen Bescheid, dass du für sie betest.'],
    ],
    steps: [
      ['Täglich für drei Christen beten (Bewahrung, Einheit, Freude)', 'Schreib die Namen auf.'],
      ['Einem Christen sagen, dass ich für ihn bete', 'Eine kurze Nachricht genügt.'],
      ['Einen Christen aus einer anderen Gemeinde treffen', 'Lernt euch kennen, ohne zu diskutieren.'],
    ],
    prayer: 'Jesus, danke, dass du für mich gebetet hast. Mach uns eins, damit die Welt dich erkennt. Bewahre mich und alle, die dir gehören, und sende mich dorthin, wo du mich brauchst.',
    verses: [['Johannes 13,34-35', 'Daran erkennt man Jünger'], ['Epheser 4,3-6', 'Die Einheit des Geistes']],
    m: [K, H, X],
  },

  {
    id: 'lukas-9', nr: 10, station: 'nachfolgen',
    title: 'Die Kosten der Nachfolge', ref: 'Lukas 9,57-62',
    teaser: 'Drei Männer, drei Ausreden, ein Ruf.',
    goals: [
      'Verstehen, was Nachfolge kosten kann',
      'Die eigenen Ausreden ehrlich erkennen',
      'Sich entscheiden, Jesus Vorrang zu geben',
    ],
    kopf: [
      ['Warum sagt Jesus so harte Worte zu denen, die ihm nachfolgen wollen?',
        'Jesus wirbt nicht mit leichten Versprechen. Er will, dass Menschen mit offenen Augen folgen: Nachfolge hat Vorrang vor Komfort (V. 58), vor dem, was dringend wirkt (V. 59–60), und vor dem Blick zurück (V. 61–62). Die Worte sind nicht hart, um abzuschrecken, sondern ehrlich. Wer Jesus kennt, weiß, dass er alles wert ist.'],
      ['Was meint Jesus mit „kein fester Wohnsitz“ und „die Hand an den Pflug legen“?',
        '„Füchse haben Höhlen, Vögel haben Nester, aber der Menschensohn hat nichts, wo er sein Haupt hinlegen kann“ (V. 58). Nachfolge kann Unsicherheit und Verzicht auf Komfort bedeuten.\n\nWer pflügt und zurückschaut, zieht eine krumme Furche (V. 62). Gemeint ist die ungeteilte Ausrichtung auf Jesus, ohne Sehnsucht nach dem Alten.'],
    ],
    herz: [
      ['Gibt es Dinge in deinem Leben, die dich davon abhalten, Jesus ganz zu folgen?',
        'Komfort, Sicherheit, Erwartungen der Familie, alte Gewohnheiten. Die drei Männer im Text sagen sinngemäß: „Ich folge dir, wenn es bequem ist“, „… wenn ich zuerst noch etwas erledigt habe“ und „… wenn ich mich vorher verabschiedet habe“. Welcher davon bist du?'],
      ['Hast du schon mal gezögert, das zu tun, was Jesus von dir will? Warum?',
        'Zögern ist menschlich. Meist stecken Angst, Bequemlichkeit oder Unsicherheit dahinter. Jesus nimmt die Hand nicht weg. Aber „später“ wird leicht zu „nie“. Wenn du etwas weißt, geh noch heute einen kleinen ersten Schritt.'],
    ],
    hand: [
      ['Was kannst du loslassen, um Jesus treuer nachzufolgen?',
        'Wähle einen Bereich: Zeit, Gewohnheit, Besitz oder einen Plan. Gib ihn Jesus bewusst ab und sag es im Gebet. Füll die Lücke mit etwas, das dich näher zu ihm bringt.'],
      ['Wie kannst du jemanden ermutigen, sich ganz für Jesus zu entscheiden?',
        'Durch dein Beispiel und ehrliche Worte. Sag nicht nur, dass es sich lohnt, sondern erzähl, was Jesus dir wert ist. Frag: „Was hält dich zurück?“ Hör zu, bete, ermutige zum nächsten Schritt.'],
    ],
    steps: [
      ['Etwas bewusst loslassen und Jesus übergeben', 'Sag es ihm laut im Gebet.'],
      ['Eine aufgeschobene Entscheidung heute umsetzen', 'Welcher erste Schritt steht schon lange an?'],
      ['Jemanden ermutigen und für ihn beten', 'Teile ihm mit, was dich an seinem Glauben ermutigt.'],
    ],
    prayer: 'Jesus, du bist es wert, dass ich dir alles gebe. Zeig mir meine Ausreden und hilf mir, den ersten Schritt zu gehen, ohne zurückzuschauen.',
    verses: [['Lukas 14,27-33', 'Die Kosten überschlagen'], ['Philipper 3,7-8', 'Alles andere ist Verlust']],
    m: [K, H, X],
  },

  {
    id: 'matthaeus-28', nr: 11, station: 'juenger',
    title: 'Der Missionsbefehl', ref: 'Matthäus 28,16-20',
    teaser: 'Der Auftrag, der für jeden Christen gilt.',
    goals: [
      'Den Auftrag von Jesus genau verstehen',
      'Erkennen, dass wir ihn nicht in eigener Kraft erfüllen',
      'Einen ersten Schritt zum Jüngermachen gehen',
    ],
    kopf: [
      ['Welche drei Dinge befiehlt Jesus seinen Jüngern?',
        'In V. 19–20 stehen drei Dinge: gehen und zu Jüngern machen, taufen und lehren, alles zu halten, was Jesus geboten hat.\n\nIm Griechischen ist „macht zu Jüngern“ der eigentliche Befehl. Gehen, taufen und lehren beschreiben, wie das geschieht. Es geht also nicht um schnelle Entscheidungen, sondern um Menschen, die mit Jesus leben lernen.'],
      ['Warum sagt Jesus: „Mir gehört alle Macht“? Was bedeutet das für uns?',
        'V. 18 steht vor dem Auftrag: erst die Vollmacht, dann der Auftrag, am Ende die Zusage (V. 20). Wir gehen nicht in eigener Kraft, sondern unter der Autorität dessen, dem Himmel und Erde gehören. Das nimmt Angst. Er geht voraus.'],
    ],
    herz: [
      ['Bist du bereit, anderen von Jesus zu erzählen? Was hält dich zurück?',
        'Typische Bremsen: Angst vor Ablehnung, „Ich weiß nicht genug“, „Das ist Sache der Profis“. Selbst die Jünger zweifelten (V. 17), und Jesus beauftragte sie trotzdem. Die Bereitschaft wächst mit dem ersten Schritt.'],
      ['Wie fühlt es sich an zu wissen, dass Jesus immer bei dir ist?',
        'Die Zusage „Ich bin bei euch alle Tage“ steht am Ende des Auftrags (V. 20). Sie gilt allen, die gehen. Halte kurz inne und danke ihm. Erinnere dich an eine Situation, in der du seine Nähe erlebt hast.'],
    ],
    hand: [
      ['Wem könntest du diese Woche von Jesus erzählen?',
        'Nenne einen Namen. Bete heute für diese Person und für eine Gelegenheit. Ein möglicher erster Satz: „Darf ich dir erzählen, was Jesus in meinem Leben verändert hat?“'],
      ['Was wäre ein erster Schritt, um Menschen zu helfen, Jesus kennenzulernen?',
        'Einladen statt überzeugen: ein gemeinsames Bibelstudium in dieser App, ein Gespräch, ein Gebet. Das Ziel ist Jüngerschaft: begleiten und nicht nur einladen. Siehe auch [[2. Timotheus 2,2]].'],
    ],
    steps: [
      ['Einen Namen aufschreiben und täglich für ihn beten', 'Bete auch um eine Gelegenheit zum Gespräch.'],
      ['Mit jemandem das Bibelstudium „Der verlorene Sohn“ machen', 'Du kannst es gemeinsam durchgehen.'],
      ['Mein Zeugnis einer Person erzählen', 'Nutze die drei Sätze aus der Befreiung des Besessenen.'],
    ],
    prayer: 'Jesus, dir gehört alle Macht. Danke, dass du mich sendest und bei mir bist. Gib mir Mut und die richtigen Worte, und zeig mir die Menschen, zu denen du mich schickst.',
    verses: [['Apostelgeschichte 1,8', 'Zeugen bis an das Ende der Erde'], ['2. Timotheus 2,2', 'Weitergeben an treue Menschen']],
    m: [K, H, X],
  },

  {
    id: 'johannes-13', nr: 12, station: 'juenger',
    title: 'Jesus wäscht die Füße', ref: 'Johannes 13,1-20',
    teaser: 'Der König dient, und wir sollen es ihm nachtun.',
    goals: [
      'Sehen, wie Jesus Größe versteht',
      'Sich von Jesus dienen lassen',
      'Dienen im Verborgenen üben',
    ],
    kopf: [
      ['Warum wäscht Jesus den Jüngern die Füße? Was zeigt uns das?',
        'Fußwaschung war Sklavendienst. „Er liebte sie bis ans Ende“ (V. 1). Jesus weiß, dass der Vater ihm alles in die Hände gegeben hat (V. 3), und dient trotzdem. Wahre Größe zeigt sich im Dienen. Er gibt ein Beispiel (V. 15) und zeigt zugleich, dass er uns reinigt.'],
      ['Warum ist Petrus zuerst dagegen?',
        'Petrus empfindet es als unpassend, dass sein Herr ihm die Füße wäscht (V. 6–8). Er will nicht Empfänger sein. Jesus antwortet: „Wenn ich dich nicht wasche, hast du keinen Teil an mir.“ Wir müssen uns zuerst von Jesus dienen lassen, bevor wir dienen können: Gnade empfangen kommt vor Gnade geben.'],
    ],
    herz: [
      ['Fällt es dir leicht, anderen demütig zu helfen? Warum oder warum nicht?',
        'Dienen im Verborgenen ist schwerer als sichtbar zu helfen. Prüfe dich: Helfe ich aus Liebe oder für Anerkennung? Ehrlichkeit macht frei.'],
      ['Was bedeutet es für dich, dass Jesus dir dienen möchte?',
        'Der König dient. Er wäscht sogar Judas die Füße (V. 2 und 11). Wer sich von Jesus dienen lässt, muss nicht beweisen, wie gut er ist. Frag dich: Lasse ich mir von Jesus helfen? Und von anderen?'],
    ],
    hand: [
      ['Wie kannst du in den nächsten Tagen jemandem helfen, ohne dafür Anerkennung zu erwarten?',
        'Such Gelegenheiten, die niemand sieht: anonym helfen, den Einkauf tragen, den Abwasch machen, etwas Praktisches tun und es nicht erwähnen. Jesus sagt dazu: „Dein Vater, der ins Verborgene sieht, wird dir vergelten“ ([[Matthäus 6,3-4]]).'],
      ['Wo kannst du dein Herz für mehr Demut und Liebe öffnen?',
        'Bitte Gott, dir jemanden zu zeigen, dem du dienen kannst. Bitte um Vergebung für Stolz. Übernimm eine Aufgabe, die niemand machen will.'],
    ],
    steps: [
      ['Einer Person diese Woche im Verborgenen dienen', 'Erzähl niemandem davon.'],
      ['Jemanden, der mich nervt, segnen und ihm helfen', 'Ein kleiner Dienst verändert oft das Herz.'],
      ['Meinen Stolz bekennen und um Demut bitten', 'Sprich es ehrlich im Gebet aus.'],
    ],
    prayer: 'Jesus, danke, dass du mir dienst und mich reinigst. Mach mich demütig und gib mir ein Herz, das gern dient, ohne gesehen werden zu müssen.',
    verses: [['Philipper 2,3-8', 'Demut, wie Jesus sie hatte'], ['Markus 10,43-45', 'Der Größte ist der Diener']],
    m: [K, H, X],
  },

  {
    id: 'apostelgeschichte-2a', nr: 13, station: 'juenger',
    title: 'Der Heilige Geist kommt', ref: 'Apostelgeschichte 2,1-13',
    teaser: 'Aus furchtsamen Jüngern werden mutige Zeugen.',
    goals: [
      'Verstehen, was an Pfingsten geschieht',
      'Sich nach dem Wirken des Heiligen Geistes ausstrecken',
      'Mutiger über Jesus sprechen',
    ],
    kopf: [
      ['Was passiert am Pfingsttag?',
        'Die Jünger sind beieinander (V. 1). Es kommt ein Brausen vom Himmel, Feuerzungen setzen sich auf sie, und alle werden mit dem Heiligen Geist erfüllt und reden in anderen Sprachen (V. 2–4). Es ist die Erfüllung der Verheißung von Jesus ([[Apostelgeschichte 1,8]]).'],
      ['Warum wundern sich die Menschen, als die Jünger in anderen Sprachen reden?',
        'Menschen aus vielen Nationen hören einfache Galiläer in ihrer eigenen Sprache von Gottes großen Taten reden (V. 6–11). Die Botschaft wird für alle verständlich, ein Zeichen, dass das Evangelium allen Völkern gilt. Einige staunen, andere spotten (V. 13). Der Geist macht aus Furchtsamen Zeugen.'],
    ],
    herz: [
      ['Hast du schon erlebt, dass der Heilige Geist in deinem Leben wirkt?',
        'Der Geist zeigt sich in Überführung von Sünde, in Trost, Wahrheit, Mut, Liebe und Frucht ([[Galater 5,22-23]]). Denke an Momente: ein Vers, der lebendig wurde, Frieden im Sturm, Mut zu sprechen. Danke Gott dafür.'],
      ['Gibt es Bereiche, in denen du dir mehr von Gottes Geist wünschst?',
        'Du darfst darum bitten: „Wie viel mehr wird der Vater im Himmel den Heiligen Geist geben denen, die ihn bitten“ ([[Lukas 11,13]]). Benenne den Bereich: Mut, Liebe, Leitung, Kraft.'],
    ],
    hand: [
      ['Wie kannst du mehr auf den Heiligen Geist hören?',
        'Zeiten der Stille, Bibel lesen (der Geist spricht nie gegen sein Wort), das Gebet „Heiliger Geist, führe mich“, Impulse prüfen und gehorchen.'],
      ['Wie kannst du mutiger über Jesus sprechen, so wie die Jünger es taten?',
        'Die Jünger saßen vorher hinter verschlossenen Türen. Mut kommt durch den Geist, nicht durch Charakterstärke. Bitte um Mut, sprich den ersten Satz: „Ich habe etwas erlebt, das ich dir erzählen möchte.“'],
    ],
    steps: [
      ['Jeden Tag beten: Heiliger Geist, erfülle und führe mich', 'Mach daraus ein festes Morgengebet.'],
      ['Jemanden nach seinen Erfahrungen mit Gott fragen', 'Und danach selbst eine eigene erzählen.'],
      ['Um Mut beten und einen Mutschritt tun', 'Such dir eine Situation, in der du bisher geschwiegen hast.'],
    ],
    prayer: 'Heiliger Geist, komm und erfülle mich neu. Gib mir Mut, von Jesus zu reden, und lass mich auf dich hören. Danke, dass du in mir wohnst.',
    verses: [['Apostelgeschichte 1,8', 'Ihr werdet Kraft empfangen'], ['Johannes 14,26', 'Der Beistand lehrt und erinnert']],
    m: [K, H, X],
  },

  {
    id: 'apostelgeschichte-2b', nr: 14, station: 'juenger',
    title: 'Das Leben der ersten Christen', ref: 'Apostelgeschichte 2,42-47',
    teaser: 'Wie Gemeinschaft aussieht, die andere anzieht.',
    goals: [
      'Sehen, was die erste Gemeinde ausmachte',
      'Die eigene Gemeinschaft ehrlich prüfen',
      'Praktische Liebe leben',
    ],
    kopf: [
      ['Wie haben die ersten Christen gelebt?',
        'Sie blieben in der Lehre der Apostel, in der Gemeinschaft, im Brotbrechen und im Gebet (V. 42). Sie teilten, was sie hatten, mit den Bedürftigen (V. 44–45). Täglich waren sie im Tempel und in den Häusern zusammen und aßen mit Freude (V. 46). Sie fanden Gunst beim ganzen Volk, und der Herr fügte täglich hinzu (V. 47).\n\nLehre, Gemeinschaft, Gebet, Teilen, Freude: Das hat anziehend gewirkt.'],
    ],
    herz: [
      ['Wie sieht deine Gemeinschaft mit anderen Christen aus? Könnte sie enger sein?',
        'Sonntags im Gottesdienst zu sein ist ein Anfang. Die ersten Christen trafen sich in Häusern, täglich. Frag dich: Wer kennt mein Leben wirklich? Wer weiß, wofür ich bete? Nähe entsteht durch Zeit und Ehrlichkeit.'],
      ['Bist du bereit, mit anderen Christen dein Leben und deine Dinge zu teilen?',
        'Teilen ist mehr als Geld: Zeit, ein Zuhause, Mahlzeiten, Fähigkeiten. Im Text geschieht es „nach Bedarf“ (V. 45), freiwillig und aus Liebe. Wo könntest du heute etwas teilen?'],
    ],
    hand: [
      ['Was kannst du tun, um die Gemeinschaft in deiner Gemeinde zu stärken?',
        'Jemanden zum Essen einladen, in einen Hauskreis gehen, eine Aufgabe übernehmen, Neue begrüßen, einen Gebetspartner suchen.'],
      ['Wie kannst du heute jemandem Gottes Liebe zeigen?',
        'Wie die ersten Christen: mit praktischer Liebe. Zeit schenken, zuhören, helfen, einladen. Liebe, die man sehen kann, macht neugierig auf den, der dahintersteht.'],
    ],
    steps: [
      ['Jemanden zum Essen einladen', 'Plane es für diese Woche.'],
      ['Einen Gebetspartner aus der Gemeinde fragen', 'Trefft euch regelmäßig, zum Beispiel einmal pro Woche.'],
      ['Eine konkrete Aufgabe in der Gemeinde übernehmen', 'Frag nach, wo gerade Hilfe gebraucht wird.'],
    ],
    prayer: 'Vater, danke für die Gemeinschaft, die du schenkst. Mach mich bereit, mein Leben mit anderen zu teilen, und zeig mir, wie ich heute jemandem deine Liebe zeigen kann.',
    verses: [['Hebräer 10,24-25', 'Einander anspornen und nicht fernbleiben'], ['Johannes 13,34-35', 'Liebe als Erkennungszeichen']],
    m: [K, H, X],
  },
]
