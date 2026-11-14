import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Search from 'lucide-react-native/dist/cjs/icons/search';
import X from 'lucide-react-native/dist/cjs/icons/x';

import { useI18n } from '../i18n';
import { useMilogTheme } from '../theme/ThemeContext';

type Props = { onClose: () => void; onSelect: (value: string) => void };
type PickerTab = 'emoji' | 'icon';

const IconTile = memo(function IconTile({ color, item, onChoose }: { color: string; item: string; onChoose: (item: string) => void }) {
  return (
    <Pressable hitSlop={3} onPress={() => onChoose(item)} style={tileStyles.item}>
      {item.startsWith('mdi:') ? <MaterialCommunityIcons color={color} name={item.slice(4) as never} size={27} /> : <Text style={tileStyles.emoji}>{item.slice(6)}</Text>}
    </Pressable>
  );
});

const tileStyles = StyleSheet.create({
  emoji: { fontSize: 27 },
  item: { alignItems: 'center', aspectRatio: 1, borderRadius: 13, justifyContent: 'center', width: '16.666%' },
});

const emojiCategories: Record<string, string[]> = {
  Günlük: ['☕️', '💧', '🍽️', '🥗', '🍎', '🍺', '🚬', '💊', '🪥', '🚿', '🛏️', '😴'],
  Aktivite: ['🚶', '🏃', '🚴', '🏊', '🏋️', '🧘', '⚽️', '🏀', '🎾', '🎮', '📖', '✍️'],
  Duygu: ['😊', '😌', '🥰', '🤩', '😐', '😔', '😢', '😤', '😴', '🤒', '🫶', '✨'],
  Yerler: ['🏠', '🏢', '🏫', '☕️', '🌳', '🏖️', '✈️', '🚗', '🚆', '🏕️', '🏥', '🛒'],
};

const extendedEmoji = `😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🫣 🤭 🫢 🤫 🤥 😶 🫥 😐 🫤 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠 😈 👿 👻 💀 ☠️ 👽 🤖 💩 😺 😸 😹 😻 😼 😽 🙀 😿 😾 🙈 🙉 🙊 💋 💌 💘 💝 💖 💗 💓 💞 💕 💟 ❣️ 💔 ❤️ 🧡 💛 💚 💙 💜 🤎 🖤 🤍 💯 💢 💥 💫 💦 💨 🕳️ 💣 💬 👁️‍🗨️ 🗨️ 🗯️ 💭 💤 👋 🤚 🖐️ ✋ 🖖 🫱 🫲 🫳 🫴 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 🫵 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦿 🦵 🦶 👂 👃 🧠 🫀 🫁 🦷 🦴 👀 👁️ 👅 👄 🧑 👶 🧒 👦 👧 🧔 👵 👴 👮 👷 💂 🕵️ 🧑‍⚕️ 🧑‍🌾 🧑‍🍳 🧑‍🎓 🧑‍🎤 🧑‍🏫 🧑‍💻 🧑‍💼 🧑‍🔧 🧑‍🔬 🧑‍🎨 🧑‍🚒 🧑‍✈️ 🧑‍🚀 🧑‍⚖️ 🦸 🦹 🧙 🧚 🧛 🧜 🧝 🧞 🧟 💆 💇 🚶 🧍 🧎 🏃 💃 🕺 🧗 🤺 🏇 ⛷️ 🏂 🏌️ 🏄 🚣 🏊 ⛹️ 🏋️ 🚴 🚵 🤸 🤼 🤽 🤾 🤹 🧘 🛀 🛌 🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🦅 🦆 🦉 🐺 🐗 🐴 🦄 🐝 🪱 🐛 🦋 🐌 🐞 🐜 🪰 🪲 🪳 🦟 🦗 🕷️ 🦂 🐢 🐍 🦎 🐙 🦑 🦐 🦞 🦀 🐠 🐟 🐬 🐳 🦈 🐊 🐅 🐆 🦓 🦍 🦧 🐘 🦛 🦏 🐪 🦒 🦘 🦬 🐃 🐄 🐎 🐖 🐏 🐐 🦌 🐕 🐩 🦮 🐈 🪶 🐓 🦃 🦚 🦜 🪽 🐇 🦝 🦨 🦡 🦫 🦦 🦥 🐁 🐿️ 🦔 🌵 🎄 🌲 🌳 🌴 🪵 🌱 🌿 ☘️ 🍀 🎍 🪴 🎋 🍃 🍂 🍁 🍄 🐚 🪨 🌾 💐 🌷 🌹 🥀 🌺 🌸 🌼 🌻 🌞 🌝 🌛 🌜 🌚 🌕 🌖 🌗 🌘 🌑 🌒 🌓 🌔 🌙 🌎 ⭐️ 🌟 ✨ ⚡️ ☄️ 🔥 🌪️ 🌈 ☀️ 🌤️ ⛅️ 🌥️ ☁️ 🌧️ ⛈️ 🌩️ 🌨️ ❄️ ☃️ ⛄️ 🌬️ 💧 ☔️ 🌊 🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶️ 🫑 🌽 🥕 🫒 🧄 🧅 🥔 🍠 🫘 🌰 🥜 🍞 🥐 🥖 🫓 🥨 🥯 🥞 🧇 🧀 🍖 🍗 🥩 🥓 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🫔 🥙 🧆 🥚 🍳 🥘 🍲 🫕 🥣 🥗 🍿 🧈 🧂 🥫 🍱 🍘 🍙 🍚 🍛 🍜 🍝 🍣 🍤 🍥 🥮 🍢 🍡 🥟 🥠 🥡 🦪 🍦 🍧 🍨 🍩 🍪 🎂 🍰 🧁 🥧 🍫 🍬 🍭 🍮 🍯 🍼 🥛 ☕️ 🫖 🍵 🧃 🥤 🧋 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🧉 🍾 🧊 🥄 🍴 🍽️ 🥢 ⚽️ 🏀 🏈 ⚾️ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🪃 🥅 ⛳️ 🪁 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸️ 🥌 🎿 🎯 🪀 🎮 🕹️ 🎲 ♟️ 🧩 🧸 🪅 🪩 🎨 🎭 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🪕 🎻 🎬 🚗 🚕 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚜 🛵 🏍️ 🚲 ✈️ 🚀 🚁 🚆 🚇 🚊 🚉 🚢 ⛵️ 🚤 🛥️ 🗺️ 🗿 🗽 🗼 🏰 🏯 🏟️ 🎡 🎢 🎠 ⛲️ ⛱️ 🏖️ 🏝️ 🏜️ 🌋 ⛰️ 🏕️ ⛺️ 🏠 🏡 🏢 🏥 🏦 🏨 🏪 🏫 💒 ⛪️ 🕌 🛕 🕍 ⛩️ 🕋 ⛲️ 🌁 🌃 🏙️ 🌄 🌅 🌆 🌇 🌉 ⌚️ 📱 💻 ⌨️ 🖥️ 🖨️ 🖱️ 🖲️ 🕹️ 🗜️ 💽 💾 💿 📀 📷 📸 📹 🎥 📞 ☎️ 📺 📻 🎙️ ⏱️ ⏰ 🕰️ ⌛️ 🔋 🔌 💡 🔦 🕯️ 🧯 💸 💵 💳 💎 ⚖️ 🧰 🔧 🔨 ⚒️ 🛠️ ⛏️ 🪛 🔩 ⚙️ 🧱 ⛓️ 🧲 🔫 💣 🧨 🪓 🔪 🛡️ 🚬 ⚰️ ⚱️ 🏺 🔮 📿 🧿 💈 ⚗️ 🔭 🔬 🩹 🩺 💊 💉 🩸 🧬 🦠 🧫 🧪 🌡️ 🧹 🧺 🧻 🚽 🚿 🛁 🧼 🪥 🪒 🧽 🧴 🛎️ 🔑 🚪 🪑 🛋️ 🛏️ 🧸 🖼️ 🪞 🪟 🛍️ 🛒 🎁 🎈 🎏 🎀 🪄 🪅 🎊 🎉 🎎 🏮 🎐 🧧 ✉️ 📩 📨 📧 💌 📥 📤 📦 🏷️ 🪧 📪 📫 📬 📭 📮 📜 📃 📄 📑 🧾 📊 📈 📉 🗒️ 🗓️ 📆 📅 🗑️ 📇 🗃️ 🗳️ 🗄️ 📋 📁 📂 🗂️ 🗞️ 📰 📓 📔 📒 📕 📗 📘 📙 📚 📖 🔖 🧷 🔗 📎 🖇️ 📐 📏 🧮 📌 📍 ✂️ 🖊️ 🖋️ ✒️ 🖌️ 🖍️ ✏️ 🔍 🔎 🔒 🔓`.split(' ');

emojiCategories.Tümü = [...new Set([...Object.values(emojiCategories).flat(), ...extendedEmoji])];

const iconCategories: Record<string, string[]> = {
  Sosyal: ['instagram', 'facebook', 'youtube', 'twitter', 'linkedin', 'whatsapp', 'reddit', 'pinterest', 'twitch', 'spotify'],
  Günlük: ['coffee', 'cup-water', 'food-apple', 'food', 'glass-wine', 'smoking', 'toothbrush', 'pill', 'sleep', 'shower'],
  Aktivite: ['walk', 'run', 'bike', 'swim', 'weight-lifter', 'yoga', 'soccer', 'basketball', 'book-open-page-variant', 'gamepad-variant'],
  Yaşam: ['home', 'briefcase', 'school', 'store', 'car', 'train', 'airplane', 'heart', 'account-group', 'map-marker'],
};

const emojiKeywords: Record<string, string> = {
  '☕️': 'coffee cafe kahve içecek sabah', '💧': 'water drink su içmek', '🍽️': 'meal food yemek öğün', '🥗': 'salad lunch salata öğle yemek', '🍎': 'apple fruit elma meyve', '🍺': 'beer drink bira içecek', '🚬': 'cigarette smoking sigara', '💊': 'pill medicine medication tablet capsule drug ilaç hap ilaçlar', '🪥': 'toothbrush teeth brush diş fırçalama', '🚿': 'shower duş', '🛏️': 'bed sleep yatak uyku', '😴': 'sleep tired uyku yorgun', '🚶': 'walk walking yürüyüş adım', '🏃': 'run running koşu', '🚴': 'bike cycling bisiklet', '🏊': 'swim swimming yüzme', '🏋️': 'gym weight workout spor ağırlık', '🧘': 'yoga meditation meditasyon', '⚽️': 'football soccer futbol', '🏀': 'basketball basketbol', '🎾': 'tennis tenis', '🎮': 'game gaming oyun', '📖': 'book read kitap okuma', '✍️': 'write writing yazı yazmak', '😊': 'happy smile mutlu iyi', '😌': 'calm peaceful huzur sakin', '🥰': 'love sevgi', '🤩': 'excited heyecan', '😐': 'neutral normal nötr', '😔': 'sad üzgün', '😢': 'cry sad ağlamak', '😤': 'angry kızgın', '🤒': 'sick ill hasta', '🫶': 'love support sevgi destek', '✨': 'sparkles special özel güzel', '🏠': 'home house ev', '🏢': 'office work iş ofis', '🏫': 'school okul', '🌳': 'park tree nature doğa', '🏖️': 'beach holiday plaj tatil', '✈️': 'plane travel uçak seyahat', '🚗': 'car auto araba', '🚆': 'train tren', '🏕️': 'camp camping kamp', '🏥': 'hospital hastane', '🛒': 'shopping cart alışveriş',
};

const glyphMap = (MaterialCommunityIcons as unknown as { glyphMap: Record<string, number> }).glyphMap;

// Category data keys (see emojiCategories/iconCategories above) mapped to catalog keys where available.
const categoryLabelKeys: Record<string, string> = {
  Günlük: 'iconPicker.categoryDaily',
  Yaşam: 'iconPicker.categoryLife',
  Aktivite: 'iconPicker.categoryActivity',
  Duygu: 'iconPicker.categoryMood',
  Yerler: 'iconPicker.categoryPlaces',
  Sosyal: 'iconPicker.categorySocial',
};
const iconKeywords: Record<string, string> = {
  coffee: 'kahve içecek', 'cup-water': 'su bardak içecek', food: 'yemek öğün', 'food-apple': 'elma meyve',
  smoking: 'sigara', toothbrush: 'diş fırçalama', pill: 'ilaç hap', sleep: 'uyku', shower: 'duş',
  walk: 'yürüyüş adım', run: 'koşu', bike: 'bisiklet', swim: 'yüzme', yoga: 'meditasyon',
  home: 'ev', briefcase: 'iş ofis', store: 'market alışveriş', car: 'araba', airplane: 'uçak seyahat',
  instagram: 'sosyal medya', facebook: 'sosyal medya', youtube: 'video sosyal medya', twitter: 'x sosyal medya', spotify: 'müzik',
  computer: 'bilgisayar ordinateur computador computer 컴퓨터 コンピューター حاسوب', laptop: 'bilgisayar dizüstü laptop ordinateur computador 컴퓨터 パソコン حاسوب', desktop: 'bilgisayar masaüstü computer ordinateur computador 컴퓨터 デスクトップ حاسوب',
};

const computerAliases: Record<string, string> = {
  tr: 'bilgisayar masaüstü dizüstü ekran', en: 'computer desktop laptop monitor screen', fr: 'ordinateur portable écran', pt: 'computador portátil tela', it: 'computer portatile schermo', de: 'computer laptop bildschirm rechner', es: 'ordenador computadora portátil pantalla',
};

// The icon catalogue is named in English. These compact locale dictionaries turn
// the most common life-log searches into English concepts while still searching
// the user's original term. Adding a locale never requires duplicating glyphs.
const queryAliases: Record<string, Record<string, string>> = {
  tr: { bilgisayar: 'computer laptop desktop monitor', hap: 'pill medicine medication', ilac: 'pill medicine medication', kahve: 'coffee', kosu: 'run running', su: 'water drink', uyku: 'sleep bed', yuruyus: 'walk walking', yemek: 'food meal' },
  de: { computer: 'computer laptop desktop monitor', kaffee: 'coffee', laufen: 'run walking', medizin: 'pill medicine medication', schlaf: 'sleep bed', tablette: 'pill medicine medication', wasser: 'water drink' },
  es: { agua: 'water drink', cafe: 'coffee', caminar: 'walk walking', comida: 'food meal', medicamento: 'pill medicine medication', ordenador: 'computer laptop desktop', pastilla: 'pill medicine medication', sueno: 'sleep bed' },
  fr: { eau: 'water drink', marche: 'walk walking', medicament: 'pill medicine medication', nourriture: 'food meal', ordinateur: 'computer laptop desktop', sommeil: 'sleep bed' },
  it: { acqua: 'water drink', caffe: 'coffee', camminare: 'walk walking', cibo: 'food meal', computer: 'computer laptop desktop', medicina: 'pill medicine medication', pillola: 'pill medicine medication', sonno: 'sleep bed' },
  pt: { agua: 'water drink', cafe: 'coffee', caminhar: 'walk walking', comida: 'food meal', computador: 'computer laptop desktop', medicamento: 'pill medicine medication', pilula: 'pill medicine medication', sono: 'sleep bed' },
};

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en-US').trim();
}

const glyphSearchIndex = Object.keys(glyphMap).map((name) => ({
  name,
  search: normalizeSearch(`${name.replace(/-/g, ' ')} ${iconKeywords[name] ?? ''}`),
}));

const emojiSearchIndex = emojiCategories.Tümü.map((emoji) => ({
  emoji,
  search: normalizeSearch(`${emoji} ${emojiKeywords[emoji] ?? ''}`),
}));

export function IconPickerModal({ onClose, onSelect }: Props) {
  const { locale, t } = useI18n();
  const { palette } = useMilogTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<PickerTab>('emoji');
  const [category, setCategory] = useState('Tümü');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const items = useMemo(() => {
    const normalized = normalizeSearch(deferredQuery);
    if (normalized) {
      const translated = queryAliases[locale]?.[normalized] ?? '';
      const searchTerms = [normalized, ...normalizeSearch(translated).split(' ').filter(Boolean)];
      const matchesSearch = (search: string) => searchTerms.some((term) => search.includes(term));
      const emojiMatches = emojiSearchIndex.filter(({ search }) => matchesSearch(search)).slice(0, 72).map(({ emoji }) => `emoji:${emoji}`);
      const iconMatches = glyphSearchIndex.filter(({ name, search }) => {
        const familyAliases = /^(desktop|laptop|monitor)/.test(name) ? `${computerAliases.en} ${computerAliases[locale] ?? ''}` : '';
        return matchesSearch(search) || matchesSearch(normalizeSearch(familyAliases));
      }).sort((a, b) => Number(b.name === normalized) - Number(a.name === normalized)).slice(0, 96).map(({ name }) => `mdi:${name}`);
      return [...emojiMatches, ...iconMatches];
    }
    return tab === 'emoji' ? (emojiCategories[category] ?? []).map((value) => `emoji:${value}`) : (iconCategories[category] ?? []).map((value) => `mdi:${value}`);
  }, [category, deferredQuery, locale, tab]);

  const categories = tab === 'emoji' ? ['Tümü', ...Object.keys(emojiCategories).filter((item) => item !== 'Tümü')] : Object.keys(iconCategories);

  const styles = useMemo(() => StyleSheet.create({
    categories: { alignItems: 'center', gap: 18, paddingHorizontal: 18 }, category: { borderBottomColor: 'transparent', borderBottomWidth: 2, minHeight: 38, paddingHorizontal: 2, paddingTop: 10 }, categoryActive: { borderBottomColor: palette.accent }, categoryList: { flexGrow: 0, height: 42 }, categoryText: { color: palette.muted, fontSize: 12, fontWeight: '600' }, categoryTextActive: { color: palette.accent, fontWeight: '800' }, close: { alignItems: 'center', borderRadius: 20, height: 40, justifyContent: 'center', width: 40 }, emoji: { fontSize: 27 }, grid: { paddingHorizontal: 12, paddingTop: 8 }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 6 }, item: { alignItems: 'center', aspectRatio: 1, borderRadius: 13, justifyContent: 'center', width: '16.666%' }, noIcon: { alignSelf: 'flex-start', marginHorizontal: 18, marginTop: 3, paddingVertical: 7 }, noIconText: { color: palette.accent, fontSize: 12, fontWeight: '700' }, screen: { backgroundColor: palette.canvas, flex: 1 }, search: { color: palette.ink, flex: 1, fontSize: 14, lineHeight: 19, paddingVertical: 5 }, searchWrap: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.divider, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 12, marginBottom: 7, paddingHorizontal: 13, paddingVertical: 8 }, tab: { alignItems: 'center', borderRadius: 10, flex: 1, padding: 9 }, tabActive: { backgroundColor: palette.card }, tabs: { backgroundColor: palette.divider, borderRadius: 13, flexDirection: 'row', marginHorizontal: 18, marginTop: 10, padding: 3 }, tabText: { color: palette.ink, fontSize: 13, fontWeight: '700' }, title: { color: palette.ink, fontSize: 22, fontWeight: '700' },
  }), [palette]);

  function changeTab(next: PickerTab) {
    setTab(next);
    setCategory(next === 'emoji' ? 'Tümü' : 'Günlük');
    setQuery('');
  }

  const chooseItem = useCallback((item: string) => {
    onSelect(item.startsWith('mdi:') ? item : item.slice(6));
    onClose();
  }, [onClose, onSelect]);

  const renderIcon = useCallback(({ item }: { item: string }) => (
    <IconTile color={palette.ink} item={item} onChoose={chooseItem} />
  ), [chooseItem, palette.ink]);

  return (
      <View style={[styles.screen, { paddingBottom: insets.bottom, paddingTop: insets.top }]}> 
        <View style={styles.header}>
          <Text style={styles.title}>{t('iconPicker.title')}</Text>
          <Pressable accessibilityLabel={t('common.close')} onPress={onClose} style={styles.close}><X color={palette.ink} size={22} /></Pressable>
        </View>
        <View style={styles.tabs}>
          <Pressable onPress={() => changeTab('emoji')} style={[styles.tab, tab === 'emoji' && styles.tabActive]}><Text style={styles.tabText}>{t('iconPicker.tabEmoji')}</Text></Pressable>
          <Pressable onPress={() => changeTab('icon')} style={[styles.tab, tab === 'icon' && styles.tabActive]}><Text style={styles.tabText}>{t('iconPicker.tabIcons')}</Text></Pressable>
        </View>
        <View style={styles.searchWrap}><Search color={palette.muted} size={18} /><TextInput onChangeText={setQuery} placeholder={locale === 'tr' ? 'Emoji ve ikon ara' : 'Search emoji and icons'} placeholderTextColor={palette.mutedSoft} style={styles.search} value={query} /></View>
        {!query && <FlatList contentContainerStyle={styles.categories} data={categories} horizontal keyboardShouldPersistTaps="always" keyExtractor={(item) => item} renderItem={({ item }) => <Pressable onPress={() => setCategory(item)} style={[styles.category, category === item && styles.categoryActive]}><Text style={[styles.categoryText, category === item && styles.categoryTextActive]}>{item === 'Tümü' ? (locale === 'tr' ? 'Tümü' : 'All') : categoryLabelKeys[item] ? t(categoryLabelKeys[item]) : item}</Text></Pressable>} showsHorizontalScrollIndicator={false} style={styles.categoryList} />}
        <Pressable onPress={() => { onSelect(''); onClose(); }} style={styles.noIcon}><Text style={styles.noIconText}>{t('iconPicker.noIcon')}</Text></Pressable>
        <FlatList
          contentContainerStyle={styles.grid}
          data={items}
          initialNumToRender={36}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
          key={`${tab}-grid`}
          keyExtractor={(item) => item}
          maxToRenderPerBatch={24}
          numColumns={6}
          removeClippedSubviews
          renderItem={renderIcon}
          updateCellsBatchingPeriod={32}
          windowSize={5}
        />
      </View>
  );
}
