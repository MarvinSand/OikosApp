// Englische Übersetzungen. Schlüssel = deutscher Originaltext (siehe index.jsx).
// Pro Bereich eine eigene Datei, damit parallel daran gearbeitet werden kann.
import settings from './en.settings'
import home from './en.home'
import map from './en.map'
import bible from './en.bible'
import pickers from './en.pickers'
import weg from './en.weg'
import overrides from './en.overrides'

export default { ...settings, ...home, ...map, ...bible, ...pickers, ...weg, ...overrides }
