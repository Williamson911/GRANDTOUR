import { Injectable, signal, Signal } from '@angular/core';

export type Lang = 'fr' | 'en';

const LANG_KEY = 'grandtour.lang.v1';

const FR: Record<string, string> = {
  // Topbar / nav
  'header.subtitle': 'DRAGON BALL SUPER CARD GAME MASTERS EU Circuit',
  'nav.map': 'Carte',
  'nav.calendar': 'Calendrier',
  'nav.season': 'Ma saison',
  'nav.budget': 'Budget',
  'nav.dashboard': 'Dashboard',
  'nav.login': 'Connexion',
  'nav.register': 'Inscription',
  'nav.logout': 'Déconnexion',
  'nav.greeting': 'Bonjour',
  'nav.profileTooltip': 'Voir mon profil',

  // Login page
  'login.title': 'Connexion',
  'login.subtitle': 'Reprends ton Grand Tour.',
  'login.usernameOrEmail': 'Username ou email',
  'login.password': 'Mot de passe',
  'login.submit': 'Se connecter',
  'login.busy': 'Connexion…',
  'login.switch': 'Pas encore inscrit ?',
  'login.switchLink': 'Créer un compte',
  'login.error': 'Identifiant ou mot de passe incorrect.',
  'login.errors.identifierRequired': 'Identifiant requis.',
  'login.errors.passwordRequired': 'Mot de passe requis.',

  // Register page
  'register.title': 'Inscription',
  'register.subtitle': 'Rejoins le Grand Tour.',
  'register.username': 'Username',
  'register.email': 'Email',
  'register.password': 'Mot de passe',
  'register.passwordConfirm': 'Confirmer le mot de passe',
  'register.bandai': 'Bandai TCG+',
  'register.bandaiOptional': 'Facultatif',
  'register.bandaiHint': 'Ton identifiant numérique sur l\'app Bandai TCG+.',
  'register.submit': 'Créer mon compte',
  'register.busy': 'Création…',
  'register.switch': 'Déjà inscrit ?',
  'register.switchLink': 'Se connecter',
  'register.errors.usernameRequired': 'Username requis.',
  'register.errors.usernameLength': 'Le username doit faire entre 3 et 20 caractères.',
  'register.errors.usernamePattern': 'Caractères autorisés : lettres, chiffres, _ et -.',
  'register.errors.usernameTaken': 'Ce username est déjà pris.',
  'register.errors.emailRequired': 'Email requis.',
  'register.errors.emailInvalid': 'Email invalide.',
  'register.errors.emailTaken': 'Cet email est déjà utilisé.',
  'register.errors.passwordRequired': 'Mot de passe requis.',
  'register.errors.passwordMinLength': 'Mot de passe d\'au moins 8 caractères.',
  'register.errors.confirmRequired': 'Confirmation requise.',
  'register.errors.passwordsMismatch': 'Les mots de passe ne correspondent pas.',
  'register.errors.bandaiInvalid': 'L\'ID Bandai TCG+ doit contenir entre 8 et 12 chiffres.',
  'register.errors.invalidFields': 'Champs invalides.',

  // Register success
  'register.success.title': 'Bienvenue {username} !',
  'register.success.body': 'Ton compte est créé.',
  'register.success.recoveryTitle': 'Code de récupération',
  'register.success.recoveryWarning': 'Sauvegarde ce code maintenant. C\'est le seul moyen de réinitialiser ton mot de passe si tu l\'oublies — il ne sera plus jamais affiché.',
  'register.success.copy': 'Copier',
  'register.success.copied': 'Copié !',
  'register.success.savedCheckbox': 'J\'ai sauvegardé mon code de récupération.',
  'register.success.emailSent': 'Un email avec ton code a été envoyé à {email}. Vérifie aussi tes spams.',
  'register.success.emailNotConfigured': 'Le service mail n\'est pas configuré sur cette installation.',
  'register.success.emailFailed': 'L\'email n\'a pas pu être envoyé. Copie bien ton code ci-dessus.',
  'register.success.continue': 'Continuer',

  // Login extras
  'login.remember': 'Rester connecté',
  'login.forgotLink': 'Mot de passe oublié ?',

  // Forgot password page
  'forgot.title': 'Mot de passe oublié',
  'forgot.subtitle': 'Utilise ton code de récupération pour définir un nouveau mot de passe.',
  'forgot.usernameOrEmail': 'Username ou email',
  'forgot.recoveryCode': 'Code de récupération',
  'forgot.recoveryHint': 'Format : GT-XXXX-XXXX-XXXX',
  'forgot.newPassword': 'Nouveau mot de passe',
  'forgot.newPasswordConfirm': 'Confirmer le nouveau mot de passe',
  'forgot.submit': 'Réinitialiser',
  'forgot.busy': 'Réinitialisation…',
  'forgot.backToLogin': 'Retour à la connexion',
  'forgot.errors.identifierRequired': 'Identifiant requis.',
  'forgot.errors.recoveryRequired': 'Code de récupération requis.',
  'forgot.errors.passwordRequired': 'Mot de passe requis.',
  'forgot.errors.passwordMinLength': 'Mot de passe d\'au moins 8 caractères.',
  'forgot.errors.confirmRequired': 'Confirmation requise.',
  'forgot.errors.passwordsMismatch': 'Les mots de passe ne correspondent pas.',
  'forgot.errors.invalidRecovery': 'Identifiant ou code de récupération incorrect.',
  'forgot.errors.invalidFields': 'Champs invalides.',
  'forgot.success.title': 'Mot de passe réinitialisé',
  'forgot.success.body': 'Voici ton NOUVEAU code de récupération. L\'ancien n\'est plus valable.',
  'forgot.success.continue': 'Se connecter',

  // Map view
  'map.legendTitle': 'Grand Tour',
  'map.eventsCount': '{count} events sur la saison',
  'map.legendRegional': 'Regional',
  'map.legendFinals': 'Finals',
  'map.legendRegistered': 'Inscrit',

  // Event card
  'event.date': 'Date',
  'event.city': 'Ville',
  'event.venue': 'Lieu',
  'event.register': '+ Je participe',
  'event.registered': '✓ J\'y participe',
  'event.officialLink': 'S\'inscrire sur le site officiel ↗',
  'event.close': 'Fermer',

  // Calendar page
  'calendar.title': 'Calendrier',
  'calendar.subtitle': 'Tous les events de la saison.',
  'calendar.count': '{count} event sur la sélection',
  'calendar.countPlural': '{count} events sur la sélection',
  'calendar.empty': 'Aucun event ne correspond à tes filtres.',
  'calendar.filter.type.label': 'Type',
  'calendar.filter.type.all': 'Tous',
  'calendar.filter.country.label': 'Pays',
  'calendar.filter.country.all': 'Tous les pays',
  'calendar.filter.period.label': 'Période',
  'calendar.filter.period.all': 'Tous',
  'calendar.filter.period.upcoming': 'À venir',
  'calendar.filter.period.past': 'Passés',
  'calendar.filter.reset': 'Réinitialiser',
  'calendar.search.label': 'Recherche',
  'calendar.search.placeholder': 'Nom d\'event ou ville…',
  'calendar.search.clear': 'Effacer',

  // My Season page
  'season.title': 'Ma saison',
  'season.subtitle': 'Les events que tu as marqués comme "je participe".',
  'season.upcoming.title': 'À venir',
  'season.past.title': 'Passés',
  'season.empty.upcoming': 'Aucun event à venir. Marque "Je participe" sur la carte ou le calendrier.',
  'season.empty.past': 'Aucun event passé pour l\'instant.',

  // Event detail page (Phase 3)
  'detail.back': '← Retour',
  'detail.detailButton': 'Détails',
  'detail.section.summary': 'Bilan',
  'detail.section.result': 'Résultat',
  'detail.section.matches': 'Matchs',
  'detail.section.expenses': 'Dépenses',
  'detail.notFound': 'Event introuvable.',
  'detail.summary.spent': 'Dépensé',
  'detail.summary.prizes': 'Gains',
  'detail.summary.net': 'Bilan net',
  'detail.summary.noResult': 'Aucun résultat enregistré pour cet event.',
  'detail.result.placement': 'Placement',
  'detail.result.totalPlayers': 'Joueurs au total',
  'detail.result.deckName': 'Nom du deck',
  'detail.result.leaderPlayed': 'Leader joué',
  'detail.result.prizes': 'Gains (€)',
  'detail.result.notes': 'Notes',
  'detail.result.save': 'Enregistrer',
  'detail.result.saving': 'Enregistrement…',
  'detail.result.saved': 'Résultat enregistré.',
  'detail.result.delete': 'Effacer le résultat',
  'detail.result.deleteConfirm': 'Effacer le résultat (et tous les matchs) ?',
  'detail.result.errors.required': 'Champs obligatoires manquants.',
  'detail.matches.empty': 'Aucun match enregistré pour l\'instant.',
  'detail.matches.add': 'Ajouter un match',
  'detail.matches.round': 'Round',
  'detail.matches.opponentLeader': 'Leader adverse',
  'detail.matches.opponentName': 'Pseudo adverse',
  'detail.matches.result': 'Résultat',
  'detail.matches.result.win': 'Victoire',
  'detail.matches.result.loss': 'Défaite',
  'detail.matches.result.draw': 'Égalité',
  'detail.matches.result.bye': 'Bye',
  'detail.matches.record': '{w}V – {l}D – {d}N – {b}B',
  'detail.matches.delete': 'Supprimer',
  'detail.matches.errors.required': 'Leader et résultat requis.',
  'detail.matches.cta': 'Ajouter',
  'detail.expenses.empty': 'Aucune dépense.',
  'detail.expenses.add': 'Ajouter une dépense',
  'detail.expenses.category': 'Catégorie',
  'detail.expenses.amount': 'Montant (€)',
  'detail.expenses.notes': 'Note',
  'detail.expenses.total': 'Total dépensé',
  'detail.expenses.delete': 'Supprimer',
  'detail.expenses.errors.required': 'Catégorie et montant requis.',
  'detail.expenses.cta': 'Ajouter',
  'detail.expenses.cat.Transport': 'Transport',
  'detail.expenses.cat.Hotel': 'Hôtel',
  'detail.expenses.cat.Entry': 'Inscription',
  'detail.expenses.cat.Food': 'Nourriture',
  'detail.expenses.cat.Other': 'Autre',

  // Profile page
  'profile.title': 'Mon profil',
  'profile.subtitle': 'Tes informations Grand Tour.',
  'profile.section.account': 'Compte',
  'profile.section.meta': 'Informations',
  'profile.section.danger': 'Zone sensible',
  'profile.username': 'Username',
  'profile.email': 'Email',
  'profile.bandai': 'Bandai TCG+',
  'profile.bandaiOptional': 'Facultatif',
  'profile.createdAt': 'Membre depuis',
  'profile.recoveryCodeUpdatedAt': 'Code de récupération généré le',
  'profile.changePassword': 'Changer mon mot de passe',
  'profile.save': 'Enregistrer',
  'profile.busy': 'Enregistrement…',
  'profile.successUpdated': 'Profil mis à jour.',
  'profile.delete': 'Supprimer mon compte',
  'profile.deleteConfirm': 'Supprimer définitivement ton compte ? Cette action est irréversible.',
  'profile.logout': 'Se déconnecter',
  'profile.errors.usernameRequired': 'Username requis.',
  'profile.errors.usernameLength': 'Le username doit faire entre 3 et 20 caractères.',
  'profile.errors.usernamePattern': 'Caractères autorisés : lettres, chiffres, _ et -.',
  'profile.errors.usernameTaken': 'Ce username est déjà pris.',
  'profile.errors.emailRequired': 'Email requis.',
  'profile.errors.emailInvalid': 'Email invalide.',
  'profile.errors.emailTaken': 'Cet email est déjà utilisé.',
  'profile.errors.bandaiInvalid': 'L\'ID Bandai TCG+ doit contenir entre 8 et 12 chiffres.',
  'profile.errors.invalidFields': 'Champs invalides.',

  // Placeholders (Phase 4)
  'placeholders.budget.title': 'Budget',
  'placeholders.budget.body': 'Vue agrégée arrivée en Phase 4. Pour saisir tes dépenses par event : ouvre la fiche d\'un event (bouton Détails sur Ma saison ou le Calendrier).',
  'placeholders.dashboard.title': 'Dashboard',
  'placeholders.dashboard.body': 'Arrivée prévue en Phase 4 : win rate, matchups, bilan financier, prochains events.',
};

const EN: Record<string, string> = {
  // Topbar / nav
  'header.subtitle': 'DRAGON BALL SUPER CARD GAME MASTERS EU Circuit',
  'nav.map': 'Map',
  'nav.calendar': 'Calendar',
  'nav.season': 'My season',
  'nav.budget': 'Budget',
  'nav.dashboard': 'Dashboard',
  'nav.login': 'Sign in',
  'nav.register': 'Sign up',
  'nav.logout': 'Sign out',
  'nav.greeting': 'Hi',
  'nav.profileTooltip': 'View my profile',

  // Login page
  'login.title': 'Sign in',
  'login.subtitle': 'Continue your Grand Tour.',
  'login.usernameOrEmail': 'Username or email',
  'login.password': 'Password',
  'login.submit': 'Sign in',
  'login.busy': 'Signing in…',
  'login.switch': 'No account yet?',
  'login.switchLink': 'Create one',
  'login.error': 'Invalid username or password.',
  'login.errors.identifierRequired': 'Identifier required.',
  'login.errors.passwordRequired': 'Password required.',

  // Register page
  'register.title': 'Sign up',
  'register.subtitle': 'Join the Grand Tour.',
  'register.username': 'Username',
  'register.email': 'Email',
  'register.password': 'Password',
  'register.passwordConfirm': 'Confirm password',
  'register.bandai': 'Bandai TCG+',
  'register.bandaiOptional': 'Optional',
  'register.bandaiHint': 'Your numeric ID on the Bandai TCG+ app.',
  'register.submit': 'Create account',
  'register.busy': 'Creating…',
  'register.switch': 'Already registered?',
  'register.switchLink': 'Sign in',
  'register.errors.usernameRequired': 'Username required.',
  'register.errors.usernameLength': 'Username must be 3 to 20 characters.',
  'register.errors.usernamePattern': 'Allowed: letters, digits, _ and -.',
  'register.errors.usernameTaken': 'This username is already taken.',
  'register.errors.emailRequired': 'Email required.',
  'register.errors.emailInvalid': 'Invalid email.',
  'register.errors.emailTaken': 'This email is already used.',
  'register.errors.passwordRequired': 'Password required.',
  'register.errors.passwordMinLength': 'Password must be at least 8 characters.',
  'register.errors.confirmRequired': 'Confirmation required.',
  'register.errors.passwordsMismatch': 'Passwords do not match.',
  'register.errors.bandaiInvalid': 'Bandai TCG+ ID must be 8 to 12 digits.',
  'register.errors.invalidFields': 'Invalid fields.',

  // Register success
  'register.success.title': 'Welcome {username}!',
  'register.success.body': 'Your account is ready.',
  'register.success.recoveryTitle': 'Recovery code',
  'register.success.recoveryWarning': 'Save this code now. It\'s the only way to reset your password if you forget it — it will never be shown again.',
  'register.success.copy': 'Copy',
  'register.success.copied': 'Copied!',
  'register.success.savedCheckbox': 'I have saved my recovery code.',
  'register.success.emailSent': 'An email with your code was sent to {email}. Check your spam too.',
  'register.success.emailNotConfigured': 'Email service is not configured on this installation.',
  'register.success.emailFailed': 'Email could not be sent. Make sure you copied your code above.',
  'register.success.continue': 'Continue',

  // Login extras
  'login.remember': 'Stay signed in',
  'login.forgotLink': 'Forgot password?',

  // Profile page
  'profile.title': 'My profile',
  'profile.subtitle': 'Your Grand Tour account.',
  'profile.section.account': 'Account',
  'profile.section.meta': 'Information',
  'profile.section.danger': 'Danger zone',
  'profile.username': 'Username',
  'profile.email': 'Email',
  'profile.bandai': 'Bandai TCG+',
  'profile.bandaiOptional': 'Optional',
  'profile.createdAt': 'Member since',
  'profile.recoveryCodeUpdatedAt': 'Recovery code generated on',
  'profile.changePassword': 'Change password',
  'profile.save': 'Save',
  'profile.busy': 'Saving…',
  'profile.successUpdated': 'Profile updated.',
  'profile.delete': 'Delete my account',
  'profile.deleteConfirm': 'Permanently delete your account? This cannot be undone.',
  'profile.logout': 'Sign out',
  'profile.errors.usernameRequired': 'Username required.',
  'profile.errors.usernameLength': 'Username must be 3 to 20 characters.',
  'profile.errors.usernamePattern': 'Allowed: letters, digits, _ and -.',
  'profile.errors.usernameTaken': 'This username is already taken.',
  'profile.errors.emailRequired': 'Email required.',
  'profile.errors.emailInvalid': 'Invalid email.',
  'profile.errors.emailTaken': 'This email is already used.',
  'profile.errors.bandaiInvalid': 'Bandai TCG+ ID must be 8 to 12 digits.',
  'profile.errors.invalidFields': 'Invalid fields.',

  // Forgot password page
  'forgot.title': 'Forgot password',
  'forgot.subtitle': 'Use your recovery code to set a new password.',
  'forgot.usernameOrEmail': 'Username or email',
  'forgot.recoveryCode': 'Recovery code',
  'forgot.recoveryHint': 'Format: GT-XXXX-XXXX-XXXX',
  'forgot.newPassword': 'New password',
  'forgot.newPasswordConfirm': 'Confirm new password',
  'forgot.submit': 'Reset password',
  'forgot.busy': 'Resetting…',
  'forgot.backToLogin': 'Back to sign in',
  'forgot.errors.identifierRequired': 'Identifier required.',
  'forgot.errors.recoveryRequired': 'Recovery code required.',
  'forgot.errors.passwordRequired': 'Password required.',
  'forgot.errors.passwordMinLength': 'Password must be at least 8 characters.',
  'forgot.errors.confirmRequired': 'Confirmation required.',
  'forgot.errors.passwordsMismatch': 'Passwords do not match.',
  'forgot.errors.invalidRecovery': 'Invalid identifier or recovery code.',
  'forgot.errors.invalidFields': 'Invalid fields.',
  'forgot.success.title': 'Password reset',
  'forgot.success.body': 'Here is your NEW recovery code. The old one no longer works.',
  'forgot.success.continue': 'Sign in',

  // Map view
  'map.legendTitle': 'Grand Tour',
  'map.eventsCount': '{count} events this season',
  'map.legendRegional': 'Regional',
  'map.legendFinals': 'Finals',
  'map.legendRegistered': 'Registered',

  // Event card
  'event.date': 'Date',
  'event.city': 'City',
  'event.venue': 'Venue',
  'event.register': '+ Register',
  'event.registered': '✓ Registered',
  'event.officialLink': 'Register on the official site ↗',
  'event.close': 'Close',

  // Calendar page
  'calendar.title': 'Calendar',
  'calendar.subtitle': 'All events of the season.',
  'calendar.count': '{count} event in selection',
  'calendar.countPlural': '{count} events in selection',
  'calendar.empty': 'No event matches your filters.',
  'calendar.filter.type.label': 'Type',
  'calendar.filter.type.all': 'All',
  'calendar.filter.country.label': 'Country',
  'calendar.filter.country.all': 'All countries',
  'calendar.filter.period.label': 'Period',
  'calendar.filter.period.all': 'All',
  'calendar.filter.period.upcoming': 'Upcoming',
  'calendar.filter.period.past': 'Past',
  'calendar.filter.reset': 'Reset',
  'calendar.search.label': 'Search',
  'calendar.search.placeholder': 'Event name or city…',
  'calendar.search.clear': 'Clear',

  // My Season page
  'season.title': 'My season',
  'season.subtitle': 'Events you marked as "I\'m going".',
  'season.upcoming.title': 'Upcoming',
  'season.past.title': 'Past',
  'season.empty.upcoming': 'No upcoming events. Hit "Register" on the map or calendar.',
  'season.empty.past': 'No past events yet.',

  // Event detail page (Phase 3)
  'detail.back': '← Back',
  'detail.detailButton': 'Details',
  'detail.section.summary': 'Recap',
  'detail.section.result': 'Result',
  'detail.section.matches': 'Matches',
  'detail.section.expenses': 'Expenses',
  'detail.notFound': 'Event not found.',
  'detail.summary.spent': 'Spent',
  'detail.summary.prizes': 'Prizes',
  'detail.summary.net': 'Net balance',
  'detail.summary.noResult': 'No result recorded for this event.',
  'detail.result.placement': 'Placement',
  'detail.result.totalPlayers': 'Total players',
  'detail.result.deckName': 'Deck name',
  'detail.result.leaderPlayed': 'Leader played',
  'detail.result.prizes': 'Prizes (€)',
  'detail.result.notes': 'Notes',
  'detail.result.save': 'Save',
  'detail.result.saving': 'Saving…',
  'detail.result.saved': 'Result saved.',
  'detail.result.delete': 'Clear result',
  'detail.result.deleteConfirm': 'Clear the result (and all matches)?',
  'detail.result.errors.required': 'Required fields missing.',
  'detail.matches.empty': 'No matches logged yet.',
  'detail.matches.add': 'Add a match',
  'detail.matches.round': 'Round',
  'detail.matches.opponentLeader': 'Opponent Leader',
  'detail.matches.opponentName': 'Opponent name',
  'detail.matches.result': 'Result',
  'detail.matches.result.win': 'Win',
  'detail.matches.result.loss': 'Loss',
  'detail.matches.result.draw': 'Draw',
  'detail.matches.result.bye': 'Bye',
  'detail.matches.record': '{w}W – {l}L – {d}D – {b}B',
  'detail.matches.delete': 'Delete',
  'detail.matches.errors.required': 'Leader and result required.',
  'detail.matches.cta': 'Add',
  'detail.expenses.empty': 'No expenses.',
  'detail.expenses.add': 'Add an expense',
  'detail.expenses.category': 'Category',
  'detail.expenses.amount': 'Amount (€)',
  'detail.expenses.notes': 'Note',
  'detail.expenses.total': 'Total spent',
  'detail.expenses.delete': 'Delete',
  'detail.expenses.errors.required': 'Category and amount required.',
  'detail.expenses.cta': 'Add',
  'detail.expenses.cat.Transport': 'Transport',
  'detail.expenses.cat.Hotel': 'Hotel',
  'detail.expenses.cat.Entry': 'Registration',
  'detail.expenses.cat.Food': 'Food',
  'detail.expenses.cat.Other': 'Other',

  // Placeholders (Phase 4)
  'placeholders.budget.title': 'Budget',
  'placeholders.budget.body': 'Aggregated view coming in Phase 4. To log expenses for a specific event: open its detail page (Details button on My Season or Calendar).',
  'placeholders.dashboard.title': 'Dashboard',
  'placeholders.dashboard.body': 'Coming in Phase 4: win rate, matchups, financial recap, upcoming events.',
};

const DICTS: Record<Lang, Record<string, string>> = { fr: FR, en: EN };

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly _lang = signal<Lang>(this.readLang());
  readonly lang: Signal<Lang> = this._lang.asReadonly();

  setLang(lang: Lang): void {
    this._lang.set(lang);
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* ignore */
    }
  }

  t(key: string, params?: Record<string, string | number>): string {
    const dict = DICTS[this._lang()];
    let value = dict[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(`{${k}}`, String(v));
      }
    }
    return value;
  }

  private readLang(): Lang {
    try {
      const raw = localStorage.getItem(LANG_KEY);
      if (raw === 'en' || raw === 'fr') return raw;
    } catch {
      /* ignore */
    }
    const navLang = typeof navigator !== 'undefined' ? navigator.language : '';
    return navLang.toLowerCase().startsWith('en') ? 'en' : 'fr';
  }
}
