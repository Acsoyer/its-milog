const milogLanguage = localStorage.getItem('milog-web-language') === 'tr' ? 'tr' : 'en';
const milogLocale = milogLanguage === 'tr' ? 'tr-TR' : 'en-GB';
document.documentElement.lang = milogLanguage;
const languagePicker = document.querySelector('#profile-language');
languagePicker.value = milogLanguage;
languagePicker.addEventListener('change', () => {
  localStorage.setItem('milog-web-language', languagePicker.value);
  location.reload();
});
const milogTurkish = new Map(Object.entries({
  Today: 'Bugün', Journal: 'Günlük', Agenda: 'Ajanda', Calendar: 'Takvim',
  'New entry': 'Yeni kayıt', 'Plan an entry': 'Bir kayıt planla', 'New log': 'Yeni Log',
  'Agenda Entry': 'Ajanda Kaydı', 'Edit entry': 'Kaydı düzenle', 'Entry date': 'Kayıt tarihi',
  'Quick logs': 'Hızlı kayıtlar', 'All quick logs': 'Tüm hızlı kayıtlar ›',
  'All quick logs ›': 'Tüm hızlı kayıtlar ›', 'Manage quick logs': 'Hızlı kayıtları düzenle',
  'New quick log': 'Yeni hızlı kayıt', 'Loading quick logs…': 'Hızlı kayıtlar yükleniyor…',
  'Could not load quick logs.': 'Hızlı kayıtlar yüklenemedi.',
  Settings: 'Ayarlar', Profile: 'Profil', 'My account': 'Hesabım', Language: 'Dil',
  Location: 'Konum', Theme: 'Tema', Light: 'Açık', Dark: 'Koyu', 'Sign out': 'Çıkış yap',
  'Special days': 'Özel günler', Highlights: 'Öne çıkanlar', 'Recent activity': 'Son etkinlik',
  Save: 'Kaydet', Cancel: 'Vazgeç', Reset: 'Sıfırla', Done: 'Tamam', Now: 'Şu an',
  Edit: 'Düzenle', Delete: 'Sil', Share: 'Paylaş', Hide: 'Gizle', Show: 'Göster',
  'Highlight of the day': 'Günün öne çıkanı', 'Remove highlight': 'Öne çıkarmayı kaldır',
  'Set time manually': 'Saati elle gir', 'Add end time': 'Bitiş saati ekle',
  '+ End time': '+ Bitiş saati', 'START TIME': 'BAŞLANGIÇ SAATİ', 'END TIME': 'BİTİŞ SAATİ',
  'How long?': 'Ne kadar?', DATE: 'TARİH', TIME: 'SAAT', 'Search entries': 'Kayıtlarda ara',
  'What’s happening?': 'Şu anda ne oluyor?', 'What are you planning?': 'Ne planladın?',
  'Sign in': 'Giriş yap', 'Create account': 'Hesap aç', Email: 'E-posta', Password: 'Şifre',
}));
if (milogLanguage === 'tr') {
  const localize = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (!parent || parent.closest('#detail-body, #calendar-records, #desk-calendar-entries, #desk-search-results, .timeline .record, .agenda-record, #desk-shortcuts button, #quick-list, #quick-grid, #profile-name, #profile-email, #web-account-name, script, style')) return;
      const value = node.data.trim();
      const next = milogTurkish.get(value);
      if (next && next !== value) node.data = node.data.replace(value, next);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    for (const name of ['placeholder', 'aria-label', 'title']) {
      const next = milogTurkish.get(node.getAttribute(name));
      if (next) node.setAttribute(name, next);
    }
    for (const child of node.childNodes) localize(child);
  };
  localize(document.body);
  new MutationObserver((mutations) => {
    for (const change of mutations) {
      if (change.type === 'childList') change.addedNodes.forEach(localize);
      else if (change.type === 'attributes') localize(change.target);
      else localize(change.target);
    }
  }).observe(document.body, { childList: true, characterData: true, attributes: true, attributeFilter: ['placeholder'], subtree: true });
}
