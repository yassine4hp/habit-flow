"use strict";

const SUPABASE_URL = "https://lclsjhqdprftbnfvvlac.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_mVuwXWL431eWOWxPZQhXsQ_4c9G8jS-";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

const authScreen = document.getElementById("auth-screen");
const appShell = document.getElementById("app-shell");

const showLoginButton = document.getElementById("show-login");
const showSignupButton = document.getElementById("show-signup");

const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const verificationView = document.getElementById("verification-view");

const authHeading = document.getElementById("auth-heading");
const authSubtitle = document.getElementById("auth-subtitle");

const forgotPasswordButton = document.getElementById("forgot-password-button");
const forgotPasswordView = document.getElementById("forgot-password-view");
const forgotBackButton = document.getElementById("forgot-back-button");

const forgotPasswordForm = document.getElementById("forgot-password-form");
const forgotPasswordEmail = document.getElementById("forgot-password-email");
const forgotPasswordSubmit = document.getElementById("forgot-password-submit");

const forgotPasswordError = document.getElementById("forgot-password-error");
const forgotPasswordSuccess = document.getElementById("forgot-password-success");

const newPasswordView = document.getElementById("new-password-view");
const newPasswordForm = document.getElementById("new-password-form");
const newPasswordInput = document.getElementById("new-password");
const confirmNewPasswordInput = document.getElementById("confirm-new-password");
const newPasswordSubmit = document.getElementById("new-password-submit");
const newPasswordError = document.getElementById("new-password-error");
const newPasswordSuccess = document.getElementById("new-password-success");

async function checkExistingSession() {
  const rememberMe =
    localStorage.getItem("habitflow-remember-me") === "true";

  const sessionOnly =
    sessionStorage.getItem("habitflow-session-only") === "true";

  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (session && !rememberMe && !sessionOnly) {
    await supabaseClient.auth.signOut();

    authScreen.hidden = false;
    appShell.hidden = true;
    showLoginView();

    return;
  }

  if (session) {
    authScreen.hidden = true;
    appShell.hidden = false;
  } else {
    authScreen.hidden = false;
    appShell.hidden = true;
    showLoginView();
  }
}

supabaseClient.auth.onAuthStateChange((event, session) => {
  console.log("Auth event:", event);

  if (event === "PASSWORD_RECOVERY") {
    authScreen.hidden = false;
    appShell.hidden = true;

    showNewPasswordView();
  }
});

checkExistingSession();

function showLoginView() {
  loginForm.hidden = false;
  signupForm.hidden = true;
  verificationView.hidden = true;
  forgotPasswordView.hidden = true;
  newPasswordView.hidden = true;

  showLoginButton.classList.add("active");
  showSignupButton.classList.remove("active");

  authHeading.textContent = "Welcome back 👋";
  authSubtitle.textContent = "Sign in to continue your journey";
}

function showSignupView() {
  loginForm.hidden = true;
  signupForm.hidden = false;
  verificationView.hidden = true;
  forgotPasswordView.hidden = true;
  newPasswordView.hidden = true;

  showLoginButton.classList.remove("active");
  showSignupButton.classList.add("active");

  authHeading.textContent = "Create your account";
  authSubtitle.textContent = "Start building better habits today";
}

function showNewPasswordView() {
  loginForm.hidden = true;
  signupForm.hidden = true;
  verificationView.hidden = true;
  forgotPasswordView.hidden = true;
  newPasswordView.hidden = false;

  showLoginButton.classList.remove("active");
  showSignupButton.classList.remove("active");

  authHeading.textContent = "Create new password";
  authSubtitle.textContent = "Choose a new secure password for your account";

  newPasswordError.hidden = true;
  newPasswordSuccess.hidden = true;
}

showLoginButton.addEventListener("click", showLoginView);
showSignupButton.addEventListener("click", showSignupView);

forgotPasswordButton.addEventListener("click", showForgotPasswordView);
forgotBackButton.addEventListener("click", hideForgotPasswordView);

document.querySelectorAll(".auth-password-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    const targetId = button.dataset.passwordTarget;
    const input = document.getElementById(targetId);

    if (!input) return;

    const isPassword = input.type === "password";

    input.type = isPassword ? "text" : "password";
    button.setAttribute(
      "aria-label",
      isPassword ? "Hide password" : "Show password",
    );
  });
});

forgotPasswordForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  forgotPasswordError.hidden = true;
  forgotPasswordSuccess.hidden = true;

  const email = forgotPasswordEmail.value.trim().toLowerCase();

  if (!email) {
    forgotPasswordError.textContent = "Please enter your email address.";
    forgotPasswordError.hidden = false;
    return;
  }

  forgotPasswordSubmit.disabled = true;
  forgotPasswordSubmit.querySelector("span").textContent = "Sending...";

  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    if (error) {
      throw error;
    }

    forgotPasswordSuccess.textContent =
      "Password reset email sent. Check your inbox.";
    forgotPasswordSuccess.hidden = false;

  } catch (error) {
    console.error("Forgot password error:", error);

    forgotPasswordError.textContent =
      error.message || "Unable to send password reset email.";
    forgotPasswordError.hidden = false;

  } finally {
    forgotPasswordSubmit.disabled = false;
    forgotPasswordSubmit.querySelector("span").textContent =
      "Send reset email";
  }
});

// =========================================================
// HABITFLOW AUTH — SIGN UP + OTP
// =========================================================

const signupNameInput = document.getElementById("signup-name");
const signupEmailInput = document.getElementById("signup-email");
const signupPasswordInput = document.getElementById("signup-password");
const signupConfirmPasswordInput = document.getElementById(
  "signup-confirm-password",
);

const signupError = document.getElementById("signup-error");
const signupButton = document.getElementById("signup-button");

const verificationEmail = document.getElementById("verification-email");
const verificationForm = document.getElementById("verification-form");
const verificationCodeInput = document.getElementById("verification-code");
const verificationError = document.getElementById("verification-error");
const verifyCodeButton = document.getElementById("verify-code-button");
const resendCodeButton = document.getElementById("resend-code-button");
const verificationBackButton = document.getElementById(
  "verification-back-button",
);

let pendingVerificationEmail = "";

function showAuthError(element, message) {
  element.textContent = message;
  element.hidden = false;
}

function clearAuthError(element) {
  element.textContent = "";
  element.hidden = true;
}

function showVerificationView(email) {
  loginForm.hidden = true;
  signupForm.hidden = true;
  verificationView.hidden = false;

  showLoginButton.classList.remove("active");
  showSignupButton.classList.remove("active");

  authHeading.textContent = "Check your email";
  authSubtitle.textContent = "Enter the verification code we sent you";

  verificationEmail.textContent = email;
}

newPasswordForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  newPasswordError.hidden = true;
  newPasswordSuccess.hidden = true;

  const password = newPasswordInput.value;
  const confirmPassword = confirmNewPasswordInput.value;

  if (!password || !confirmPassword) {
    newPasswordError.textContent = "Please complete both password fields.";
    newPasswordError.hidden = false;
    return;
  }

  if (password.length < 8) {
    newPasswordError.textContent =
      "Your password must contain at least 8 characters.";
    newPasswordError.hidden = false;
    return;
  }

  if (password !== confirmPassword) {
    newPasswordError.textContent = "Passwords do not match.";
    newPasswordError.hidden = false;
    return;
  }

  newPasswordSubmit.disabled = true;
  newPasswordSubmit.querySelector("span").textContent = "Updating...";

  try {
    const { error } = await supabaseClient.auth.updateUser({
      password: password,
    });

    if (error) {
      throw error;
    }

    newPasswordSuccess.textContent =
      "Password updated successfully. You can now sign in.";
    newPasswordSuccess.hidden = false;

    newPasswordInput.value = "";
    confirmNewPasswordInput.value = "";

    setTimeout(async () => {
      await supabaseClient.auth.signOut();

      newPasswordView.hidden = true;
      authScreen.hidden = false;
      appShell.hidden = true;

      showLoginView();

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }, 1800);
  } catch (error) {
    console.error("Update password error:", error);

    newPasswordError.textContent =
      error.message || "Unable to update your password.";
    newPasswordError.hidden = false;
  } finally {
    newPasswordSubmit.disabled = false;
    newPasswordSubmit.querySelector("span").textContent = "Update Password";
  }
});

// =========================================================
// HABITFLOW AUTH — LOGIN
// =========================================================

const loginEmailInput = document.getElementById("login-email");
const loginPasswordInput = document.getElementById("login-password");
const loginError = document.getElementById("login-error");
const loginButton = document.getElementById("login-button");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  clearAuthError(loginError);

  const email = loginEmailInput.value.trim().toLowerCase();
  const password = loginPasswordInput.value;

  if (!email || !password) {
    showAuthError(loginError, "Please enter your email and password.");
    return;
  }

  loginButton.disabled = true;
  loginButton.querySelector("span").textContent = "Signing in...";

  try {
    const rememberMe = document.getElementById("remember-me").checked;
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      throw error;
    }

    if (rememberMe) {
  localStorage.setItem("habitflow-remember-me", "true");
  sessionStorage.removeItem("habitflow-session-only");
} else {
  localStorage.setItem("habitflow-remember-me", "false");
  sessionStorage.setItem("habitflow-session-only", "true");
}

    console.log("Logged in ✅", data.user?.email);

    authScreen.hidden = true;
    appShell.hidden = false;

    window.scrollTo(0, 0);
  } catch (error) {
    console.error("Login error:", error);

    showAuthError(
      loginError,
      error.message || "Invalid email or password.",
    );
  } finally {
    loginButton.disabled = false;
    loginButton.querySelector("span").textContent = "Sign In";
  }
});


async function logoutUser() {
  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      throw error;
    }

    // Clear Remember Me state
    localStorage.removeItem("habitflow-remember-me");
    sessionStorage.removeItem("habitflow-session-only");

    // Show login screen
    appShell.hidden = true;
    authScreen.hidden = false;

    showLoginView();
    window.scrollTo(0, 0);

    console.log("Logged out ✅");
  } catch (error) {
    console.error("Logout error:", error);
  }
}



    

 


// =========================================================
// CREATE ACCOUNT
// =========================================================

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  clearAuthError(signupError);

  const name = signupNameInput.value.trim();
  const email = signupEmailInput.value.trim().toLowerCase();
  const password = signupPasswordInput.value;
  const confirmPassword = signupConfirmPasswordInput.value;

  if (!name || !email || !password || !confirmPassword) {
    showAuthError(signupError, "Please complete all fields.");
    return;
  }

  if (password.length < 8) {
    showAuthError(
      signupError,
      "Your password must contain at least 8 characters.",
    );
    return;
  }

  if (password !== confirmPassword) {
    showAuthError(signupError, "Passwords do not match.");
    return;
  }

  signupButton.disabled = true;
  signupButton.querySelector("span").textContent = "Creating account...";

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,

      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      throw error;
    }

    pendingVerificationEmail = email;

    showVerificationView(email);

    verificationCodeInput.value = "";
    verificationCodeInput.focus();

    console.log("Signup created:", data.user?.id);
  } catch (error) {
    console.error("Signup error:", error);

    showAuthError(
      signupError,
      error.message || "Unable to create your account.",
    );
  } finally {
    signupButton.disabled = false;
    signupButton.querySelector("span").textContent = "Create Account";
  }
});


// =========================================================
// VERIFY OTP
// =========================================================

verificationForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  clearAuthError(verificationError);

  const token = verificationCodeInput.value.trim();

  if (!/^\d{8}$/.test(token)) {
    showAuthError(
      verificationError,
      "Enter the complete 8-digit verification code.",
    );
    return;
  }

  if (!pendingVerificationEmail) {
    showAuthError(
      verificationError,
      "Verification session expired. Create your account again.",
    );
    return;
  }

  verifyCodeButton.disabled = true;
  verifyCodeButton.querySelector("span").textContent = "Verifying...";

  try {
    const { data, error } = await supabaseClient.auth.verifyOtp({
      email: pendingVerificationEmail,
      token,
      type: "signup",
    });

    if (error) {
      throw error;
    }

    console.log("Email verified ✅", data.user?.email);

    authScreen.hidden = true;
    appShell.hidden = false;

    window.scrollTo({
      top: 0,
      behavior: "instant",
    });
  } catch (error) {
    console.error("OTP verification error:", error);

    showAuthError(
      verificationError,
      error.message || "The verification code is invalid or expired.",
    );
  } finally {
    verifyCodeButton.disabled = false;
    verifyCodeButton.querySelector("span").textContent = "Verify Email";
  }
});


// =========================================================
// RESEND OTP
// =========================================================

resendCodeButton.addEventListener("click", async () => {
  clearAuthError(verificationError);

  if (!pendingVerificationEmail) {
    showAuthError(
      verificationError,
      "No email address found. Please create your account again.",
    );
    return;
  }

  resendCodeButton.disabled = true;
  resendCodeButton.textContent = "Sending...";

  try {
    const { error } = await supabaseClient.auth.resend({
      type: "signup",
      email: pendingVerificationEmail,
    });

    if (error) {
      throw error;
    }

    resendCodeButton.textContent = "Code sent ✓";

    setTimeout(() => {
      resendCodeButton.textContent = "Resend code";
      resendCodeButton.disabled = false;
    }, 3000);
  } catch (error) {
    console.error("Resend OTP error:", error);

    showAuthError(
      verificationError,
      error.message || "Unable to resend the verification code.",
    );

    resendCodeButton.textContent = "Resend code";
    resendCodeButton.disabled = false;
  }
});


// =========================================================
// BACK FROM OTP
// =========================================================

verificationBackButton.addEventListener("click", () => {
  pendingVerificationEmail = "";

  verificationCodeInput.value = "";

  showSignupView();
});

const translations = {
  en: {
    menu: "Menu",
    dashboard: "Dashboard",
    habits: "Habits",
    analytics: "Analytics",
    weeklyFocus: "Weekly focus",
    keepMomentum: "Keep the momentum",
    weeklyProgress: "72% completed",
    freePlan: "Free plan",
    overview: "Daily overview",
    greeting: "Good Morning 👋",
    motivation: "Build consistency, one day at a time.",
    manageHabits: "Manage Habits",
    todayProgress: "Today's Progress",
    currentStreak: "Current Streak",
    bestStreak: "Best Streak",
    monthlyScore: "Monthly Score",
    active: "Active",
    days: "Days",
    personalBestGap: "13 days to your best",
    record: "Record",
    setInJune: "Set in June 2026",
    vsLastMonth: "vs. last month",
    todaysHabits: "Today's Habits",
    habitsSubtitle: "Small actions, meaningful progress.",
    fiveTasks: "5 tasks",
    target: "Target",
    habitWorkout: "Workout",
    habitDeepWork: "Deep Work",
    habitReadBook: "Read Book",
    habitDrinkWater: "Drink Water",
    habitMeditation: "Meditation",
    targetWorkout: "45 minutes",
    targetDeepWork: "2 hours",
    targetReadBook: "20 pages",
    targetDrinkWater: "2 liters",
    targetMeditation: "10 minutes",
    allDay: "All day",
    consistencyOverview: "Consistency overview",
    habitTracker: "Habit Tracker",
    monthAugust: "August 2026",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    completed: "Completed",
    missed: "Missed",
    empty: "Empty",
    scrollHint: "Scroll horizontally to explore the month",
    habit: "Habit",
    footerNote: "Designed for steady progress.",

    settings: "Settings",
    profile: "Profile",
    profileDescription: "Personalize your HabitFlow experience.",
    habitflowUser: "HabitFlow user",
    yourName: "Your name",
    preferences: "Preferences",
    preferencesDescription: "Customize how HabitFlow works for you.",
    defaultLanguage: "Default language",
    weekStartsOn: "Week starts on",
    monday: "Monday",
    sunday: "Sunday",
    cancel: "Cancel",
    saveChanges: "Save changes",
    closeSettings: "Close settings",
    dataManagement: "Data Management",
    dataManagementDescription: "Backup or restore your HabitFlow data.",
    exportBackup: "Export Backup",
    importBackup: "Import Backup",
    resetData: "Reset Data",

    invalidBackup: "Invalid HabitFlow backup file.",
    importConfirm:
      "Importing this backup will replace your current HabitFlow data. Continue?",
    importSuccess: "Backup imported successfully.",
    importError: "Unable to import this backup file.",

    resetConfirm:
      "This will permanently reset all HabitFlow data. This action cannot be undone. Continue?",
    resetSuccess: "HabitFlow data has been reset.",
  },
  fr: {
    menu: "Menu",
    dashboard: "Tableau de bord",
    habits: "Habitudes",
    analytics: "Analyses",
    weeklyFocus: "Objectif de la semaine",
    keepMomentum: "Gardez le rythme",
    weeklyProgress: "72 % terminés",
    freePlan: "Plan gratuit",
    overview: "Aperçu quotidien",
    greeting: "Bonjour 👋",
    motivation: "Construisez votre régularité, un jour à la fois.",
    manageHabits: "Gérer les habitudes",
    todayProgress: "Progression du jour",
    currentStreak: "Série actuelle",
    bestStreak: "Meilleure série",
    monthlyScore: "Score mensuel",
    active: "Active",
    days: "Jours",
    personalBestGap: "13 jours avant votre record",
    record: "Record",
    setInJune: "Établi en juin 2026",
    vsLastMonth: "par rapport au mois dernier",
    todaysHabits: "Habitudes du jour",
    habitsSubtitle: "De petites actions, de vrais progrès.",
    fiveTasks: "5 tâches",
    target: "Objectif",
    habitWorkout: "Entraînement",
    habitDeepWork: "Travail profond",
    habitReadBook: "Lire un livre",
    habitDrinkWater: "Boire de l’eau",
    habitMeditation: "Méditation",
    targetWorkout: "45 minutes",
    targetDeepWork: "2 heures",
    targetReadBook: "20 pages",
    targetDrinkWater: "2 litres",
    targetMeditation: "10 minutes",
    allDay: "Toute la journée",
    consistencyOverview: "Aperçu de la régularité",
    habitTracker: "Suivi des habitudes",
    monthAugust: "Août 2026",
    previousMonth: "Mois précédent",
    nextMonth: "Mois suivant",
    completed: "Terminée",
    missed: "Manquée",
    empty: "Vide",
    scrollHint: "Faites défiler pour explorer le mois",
    habit: "Habitude",
    footerNote: "Conçu pour progresser durablement.",

    settings: "Paramètres",
    profile: "Profil",
    profileDescription: "Personnalisez votre expérience HabitFlow.",
    habitflowUser: "Utilisateur HabitFlow",
    yourName: "Votre nom",
    preferences: "Préférences",
    preferencesDescription: "Personnalisez le fonctionnement de HabitFlow.",
    defaultLanguage: "Langue par défaut",
    weekStartsOn: "La semaine commence le",
    monday: "Lundi",
    sunday: "Dimanche",
    cancel: "Annuler",
    saveChanges: "Enregistrer",
    closeSettings: "Fermer les paramètres",
    dataManagement: "Gestion des données",
    dataManagementDescription:
      "Sauvegardez ou restaurez vos données HabitFlow.",
    exportBackup: "Exporter la sauvegarde",
    importBackup: "Importer une sauvegarde",
    resetData: "Réinitialiser les données",

    invalidBackup: "Fichier de sauvegarde HabitFlow invalide.",
    importConfirm:
      "L’importation de cette sauvegarde remplacera vos données HabitFlow actuelles. Continuer ?",
    importSuccess: "Sauvegarde importée avec succès.",
    importError: "Impossible d’importer ce fichier de sauvegarde.",

    resetConfirm:
      "Toutes les données HabitFlow seront définitivement réinitialisées. Cette action est irréversible. Continuer ?",
    resetSuccess: "Les données HabitFlow ont été réinitialisées.",
  },
  ar: {
    menu: "القائمة",
    dashboard: "لوحة التحكم",
    habits: "العادات",
    analytics: "التحليلات",
    weeklyFocus: "تركيز الأسبوع",
    keepMomentum: "حافظ على استمراريتك",
    weeklyProgress: "اكتمل 72٪",
    freePlan: "الخطة المجانية",
    overview: "نظرة يومية",
    greeting: "صباح الخير 👋",
    motivation: "ابنِ استمراريتك، يوماً بعد يوم.",
    manageHabits: "إدارة العادات",
    todayProgress: "تقدّم اليوم",
    currentStreak: "السلسلة الحالية",
    bestStreak: "أفضل سلسلة",
    monthlyScore: "النتيجة الشهرية",
    active: "نشطة",
    days: "أيام",
    personalBestGap: "13 يوماً للوصول إلى رقمك",
    record: "الرقم الأفضل",
    setInJune: "تحقق في يونيو 2026",
    vsLastMonth: "مقارنة بالشهر الماضي",
    todaysHabits: "عادات اليوم",
    habitsSubtitle: "خطوات صغيرة، وتقدّم حقيقي.",
    fiveTasks: "5 مهام",
    target: "الهدف",
    habitWorkout: "التمارين الرياضية",
    habitDeepWork: "العمل العميق",
    habitReadBook: "قراءة كتاب",
    habitDrinkWater: "شرب الماء",
    habitMeditation: "التأمل",
    targetWorkout: "45 دقيقة",
    targetDeepWork: "ساعتان",
    targetReadBook: "20 صفحة",
    targetDrinkWater: "لتران",
    targetMeditation: "10 دقائق",
    allDay: "طوال اليوم",
    consistencyOverview: "نظرة على الاستمرارية",
    habitTracker: "متتبع العادات",
    monthAugust: "أغسطس 2026",
    previousMonth: "الشهر السابق",
    nextMonth: "الشهر التالي",
    completed: "مكتملة",
    missed: "فائتة",
    empty: "فارغة",
    scrollHint: "مرّر أفقياً لاستعراض الشهر",
    habit: "العادة",
    footerNote: "صُمّم لتحقيق تقدّم مستمر.",

    settings: "الإعدادات",
    profile: "الملف الشخصي",
    profileDescription: "خصّص تجربة HabitFlow بالطريقة التي تناسبك.",
    habitflowUser: "مستخدم HabitFlow",
    yourName: "اسمك",
    preferences: "التفضيلات",
    preferencesDescription: "خصّص طريقة عمل HabitFlow حسب تفضيلاتك.",
    defaultLanguage: "اللغة الافتراضية",
    weekStartsOn: "بداية الأسبوع",
    monday: "الاثنين",
    sunday: "الأحد",
    cancel: "إلغاء",
    saveChanges: "حفظ التغييرات",
    closeSettings: "إغلاق الإعدادات",
    dataManagement: "إدارة البيانات",
    dataManagementDescription:
      "أنشئ نسخة احتياطية من بيانات HabitFlow أو استعدها.",
    exportBackup: "تصدير نسخة احتياطية",
    importBackup: "استيراد نسخة احتياطية",
    resetData: "إعادة تعيين البيانات",

    invalidBackup: "ملف النسخة الاحتياطية لـ HabitFlow غير صالح.",
    importConfirm:
      "سيؤدي استيراد هذه النسخة الاحتياطية إلى استبدال بيانات HabitFlow الحالية. هل تريد المتابعة؟",
    importSuccess: "تم استيراد النسخة الاحتياطية بنجاح.",
    importError: "تعذر استيراد ملف النسخة الاحتياطية.",

    resetConfirm:
      "سيتم حذف وإعادة تعيين جميع بيانات HabitFlow نهائياً. لا يمكن التراجع عن هذا الإجراء. هل تريد المتابعة؟",
    resetSuccess: "تمت إعادة تعيين بيانات HabitFlow.",
  },
};

const defaultHabits = [
  {
    id: "workout",
    nameKey: "habitWorkout",
    targetKey: "targetWorkout",
    icon: "↗",
    color: "green",
    time: "07:00",
  },
  {
    id: "deep-work",
    nameKey: "habitDeepWork",
    targetKey: "targetDeepWork",
    icon: "⌁",
    color: "violet",
    time: "09:00",
  },
  {
    id: "read-book",
    nameKey: "habitReadBook",
    targetKey: "targetReadBook",
    icon: "▤",
    color: "amber",
    time: "18:30",
  },
  {
    id: "drink-water",
    nameKey: "habitDrinkWater",
    targetKey: "targetDrinkWater",
    icon: "◒",
    color: "blue",
    time: "all-day",
  },
  {
    id: "meditation",
    nameKey: "habitMeditation",
    targetKey: "targetMeditation",
    icon: "✦",
    color: "pink",
    time: "21:00",
  },
];

const defaultTrackerData = {
  workout: {},
  "deep-work": {},
  "read-book": {},
  "drink-water": {},
  meditation: {},
};

let habits = [];
let trackerData = {};

function getTodayDateKey() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isHabitCompletedToday(habitId) {
  const todayKey = getTodayDateKey();

  return trackerData[habitId]?.[todayKey] === "completed";
}

function loadAppData() {
  try {
    const savedHabits = localStorage.getItem("habitflow-habits");

    const savedTrackerData = localStorage.getItem("habitflow-tracker");

    habits = savedHabits
      ? JSON.parse(savedHabits)
      : defaultHabits.map((habit) => ({ ...habit }));

    trackerData = savedTrackerData
      ? JSON.parse(savedTrackerData)
      : { ...defaultTrackerData };

    habits = habits.map((habit) => ({
      ...habit,

      createdAt: habit.createdAt || getTodayDateKey(),

      schedule: habit.schedule || {
        type: "everyday",
        days: [],
      },
    }));
  } catch (error) {
    console.error("Failed to load HabitFlow data:", error);

    habits = defaultHabits.map((habit) => ({
      ...habit,

      createdAt: getTodayDateKey(),

      schedule: {
        type: "everyday",
        days: [],
      },
    }));

    trackerData = { ...defaultTrackerData };
  }
}

function saveAppData() {
  try {
    localStorage.setItem("habitflow-habits", JSON.stringify(habits));

    localStorage.setItem("habitflow-tracker", JSON.stringify(trackerData));
  } catch (error) {
    console.error("Failed to save HabitFlow data:", error);
  }
}

const languageRoot = document.getElementById("language");
const languageTrigger = document.getElementById("language-trigger");
const languageMenu = document.getElementById("language-menu");
const languageCode = document.getElementById("language-code");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const mobileMenuButton = document.getElementById("mobile-menu-button");
const habitList = document.getElementById("habit-list");
const manageHabitsButton = document.getElementById("manage-habits-button");
const manageHabitsModal = document.getElementById("manage-habits-modal");
const closeManageHabitsButton = document.getElementById("close-manage-habits");
const manageHabitsList = document.getElementById("manage-habits-list");
const addHabitButton = document.getElementById("add-habit-button");
const habitForm = document.getElementById("habit-form");
const cancelHabitForm = document.getElementById("cancel-habit-form");
const cancelHabitButton = document.getElementById("cancel-habit-button");

const habitNameInput = document.getElementById("habit-name");
const habitTargetInput = document.getElementById("habit-target");
const habitTimeInput = document.getElementById("habit-time");
const habitIconInput = document.getElementById("habit-icon");
const habitColorInput = document.getElementById("habit-color");
const habitScheduleInput = document.getElementById("habit-schedule");

const customDaysContainer = document.getElementById("custom-days");

const customDayInputs = document.querySelectorAll(
  "#custom-days input[type='checkbox']",
);
const currentMonthLabel = document.getElementById("current-month-label");
const todayProgressValue = document.getElementById("today-progress-value");

const todayProgressPercent = document.getElementById("today-progress-percent");

const todayProgressRing = document.getElementById("today-progress-ring");

const monthlyScoreValue = document.getElementById("monthly-score-value");

const todayTasksCount = document.getElementById("today-tasks-count");

const weeklyProgressText = document.getElementById("weekly-progress-text");

const weeklyProgressBar = document.getElementById("weekly-progress-bar");

const currentStreakValue = document.getElementById("current-streak-value");

const bestStreakValue = document.getElementById("best-streak-value");

const openSettingsButton = document.getElementById("open-settings-button");

const settingsModal = document.getElementById("settings-modal");

const closeSettingsButton = document.getElementById("close-settings-button");

const cancelSettingsButton = document.getElementById("cancel-settings-button");

const saveSettingsButton = document.getElementById("save-settings-button");

const settingsNameInput = document.getElementById("settings-name");

const settingsNamePreview = document.getElementById("settings-name-preview");

const settingsAvatarPreview = document.getElementById(
  "settings-avatar-preview",
);

const settingsLanguage = document.getElementById("settings-language");

const settingsWeekStart = document.getElementById("settings-week-start");

const exportDataButton = document.getElementById("export-data-button");

const importDataButton = document.getElementById("import-data-button");

const importDataInput = document.getElementById("import-data-input");

const resetDataButton = document.getElementById("reset-data-button");

const logoutButton = document.getElementById("logout-button");

const profileName = document.getElementById("profile-name");

const profileAvatar = document.getElementById("profile-avatar");

const appToast = document.getElementById("app-toast");

const toastIcon = document.getElementById("toast-icon");

const toastTitle = document.getElementById("toast-title");

const toastMessage = document.getElementById("toast-message");

const confirmModal = document.getElementById("confirm-modal");

const confirmTitle = document.getElementById("confirm-title");

const confirmMessage = document.getElementById("confirm-message");

const confirmOkButton = document.getElementById("confirm-ok-button");

const confirmCancelButton = document.getElementById("confirm-cancel-button");

const closeConfirmButton = document.getElementById("close-confirm-button");



/*=========================================================================================================== */
let userProfile = {
  name: "Yassine",
};

let confirmResolver = null;
let confirmPreviousFocus = null;

let userPreferences = {
  language: "en",
  weekStart: "monday",
};

let toastTimeout = null;

function showForgotPasswordView() {
  loginForm.hidden = true;
  signupForm.hidden = true;
  verificationView.hidden = true;
  forgotPasswordView.hidden = false;

  showLoginButton.classList.remove("active");
  showSignupButton.classList.remove("active");

  authHeading.textContent = "Reset your password";
  authSubtitle.textContent = "We'll help you get back into your account";

  forgotPasswordError.hidden = true;
  forgotPasswordSuccess.hidden = true;
}

function hideForgotPasswordView() {
  forgotPasswordView.hidden = true;

  showLoginView();
}

function openConfirmModal(message, title = "Confirm action") {
  if (!confirmModal || !confirmTitle || !confirmMessage) {
    return Promise.resolve(false);
  }

  confirmTitle.textContent = title;
  confirmMessage.textContent = message;

  confirmPreviousFocus = document.activeElement;

  confirmModal.classList.add("is-open");
  confirmModal.setAttribute("aria-hidden", "false");

  document.body.classList.add("modal-open");

  return new Promise((resolve) => {
    confirmResolver = resolve;

    setTimeout(() => {
      confirmOkButton?.focus();
    }, 0);
  });
}

function closeConfirmModal(result = false) {
  if (!confirmModal) {
    return;
  }

  confirmModal.classList.remove("is-open");
  confirmModal.setAttribute("aria-hidden", "true");

  document.body.classList.remove("modal-open");

  if (confirmResolver) {
    confirmResolver(result);
    confirmResolver = null;
  }
  if (
    confirmPreviousFocus &&
    typeof confirmPreviousFocus.focus === "function"
  ) {
    confirmPreviousFocus.focus();
  }

  confirmPreviousFocus = null;
}

function showToast(message, type = "success") {
  if (!appToast || !toastIcon || !toastTitle || !toastMessage) {
    return;
  }

  clearTimeout(toastTimeout);

  const isError = type === "error";

  appToast.setAttribute("role", isError ? "alert" : "status");

  appToast.classList.toggle("is-error", isError);

  toastIcon.textContent = isError ? "!" : "✓";

  toastTitle.textContent = isError ? "Error" : "Success";

  toastMessage.textContent = message;

  appToast.classList.add("is-visible");

  appToast.setAttribute("aria-hidden", "false");

  toastTimeout = setTimeout(() => {
    appToast.classList.remove("is-visible");

    appToast.setAttribute("aria-hidden", "true");
  }, 3200);
}

function isValidHabitFlowBackup(backup) {
  if (!backup || typeof backup !== "object") {
    return false;
  }

  if (backup.app !== "HabitFlow") {
    return false;
  }

  if (!backup.data || typeof backup.data !== "object") {
    return false;
  }

  const {
    habits: backupHabits,
    trackerData: backupTrackerData,
    userProfile: backupUserProfile,
    userPreferences: backupUserPreferences,
  } = backup.data;

  if (!Array.isArray(backupHabits)) {
    return false;
  }

  if (
    !backupTrackerData ||
    typeof backupTrackerData !== "object" ||
    Array.isArray(backupTrackerData)
  ) {
    return false;
  }

  if (!backupUserProfile || typeof backupUserProfile !== "object") {
    return false;
  }

  if (typeof backupUserProfile.name !== "string") {
    return false;
  }

  if (!backupUserPreferences || typeof backupUserPreferences !== "object") {
    return false;
  }

  if (!["en", "fr", "ar"].includes(backupUserPreferences.language)) {
    return false;
  }

  if (!["monday", "sunday"].includes(backupUserPreferences.weekStart)) {
    return false;
  }

  if (backup.version && typeof backup.version !== "string") {
    return false;
  }

  if (backup.exportedAt && Number.isNaN(Date.parse(backup.exportedAt))) {
    return false;
  }

  const habitsAreValid = backupHabits.every((habit) => {
    if (!habit || typeof habit !== "object") {
      return false;
    }

    if (typeof habit.id !== "string" || !habit.id.trim()) {
      return false;
    }

    if (habit.name !== undefined && typeof habit.name !== "string") {
      return false;
    }

    if (habit.target !== undefined && typeof habit.target !== "string") {
      return false;
    }

    return true;
  });

  if (!habitsAreValid) {
    return false;
  }

  const trackerIsValid = Object.values(backupTrackerData).every((habitData) => {
    return (
      habitData && typeof habitData === "object" && !Array.isArray(habitData)
    );
  });

  if (!trackerIsValid) {
    return false;
  }

  return true;
}

function applyImportedBackup(backup) {
  habits = backup.data.habits;
  trackerData = backup.data.trackerData;

  userProfile = {
    ...backup.data.userProfile,
  };

  userPreferences = {
    ...backup.data.userPreferences,
  };

  saveAppData();
  saveUserProfile();
  saveUserPreferences();

  renderProfile();

  setLanguage(userPreferences.language);

  renderManageHabits(currentLanguage);
}

async function resetHabitFlowData() {
  const confirmed = await openConfirmModal(
    translations[currentLanguage].resetConfirm,
    "Confirm reset",
  );

  if (!confirmed) {
    return;
  }

  habits = defaultHabits.map((habit) => ({
    ...habit,
    createdAt: getTodayDateKey(),
    schedule: {
      type: "everyday",
      days: [],
    },
  }));

  trackerData = {};

  habits.forEach((habit) => {
    trackerData[habit.id] = {};
  });

  userProfile = {
    name: "Yassine",
  };

  userPreferences = {
    language: "en",
    weekStart: "monday",
  };

  saveAppData();
  saveUserProfile();
  saveUserPreferences();

  localStorage.setItem("habitflow-language", "en");

  renderProfile();

  setLanguage("en");

  renderManageHabits(currentLanguage);

  closeSettingsModal();

  showToast(translations[currentLanguage].resetSuccess);
}

function getInitials(name) {
  const cleanName = name.trim();

  if (!cleanName) {
    return "HF";
  }

  const parts = cleanName.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function renderProfile() {
  const name = userProfile.name || "HabitFlow User";

  const initials = getInitials(name);

  if (profileName) {
    profileName.textContent = name;
  }

  if (profileAvatar) {
    profileAvatar.textContent = initials;
  }

  if (settingsNamePreview) {
    settingsNamePreview.textContent = name;
  }

  if (settingsAvatarPreview) {
    settingsAvatarPreview.textContent = initials;
  }
}

function exportHabitFlowData() {
  const backup = {
    app: "HabitFlow",
    version: "1.0.0",
    exportedAt: new Date().toISOString(),

    data: {
      habits,
      trackerData,
      userProfile,
      userPreferences,
    },
  };

  const json = JSON.stringify(backup, null, 2);

  const blob = new Blob([json], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  const date = new Date().toISOString().slice(0, 10);

  link.href = url;

  link.download = `habitflow-backup-${date}.json`;

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);
}

function loadUserPreferences() {
  try {
    const savedPreferences = localStorage.getItem("habitflow-preferences");

    if (savedPreferences) {
      const parsedPreferences = JSON.parse(savedPreferences);

      userPreferences = {
        language: ["en", "fr", "ar"].includes(parsedPreferences.language)
          ? parsedPreferences.language
          : currentLanguage,

        weekStart:
          parsedPreferences.weekStart === "sunday" ? "sunday" : "monday",
      };
    } else {
      userPreferences = {
        language: currentLanguage,
        weekStart: "monday",
      };
    }
  } catch (error) {
    console.error("Failed to load HabitFlow preferences:", error);

    userPreferences = {
      language: currentLanguage,
      weekStart: "monday",
    };
  }
}
function saveUserPreferences() {
  try {
    localStorage.setItem(
      "habitflow-preferences",
      JSON.stringify(userPreferences),
    );
  } catch (error) {
    console.error("Failed to save HabitFlow preferences:", error);
  }
}
function loadUserProfile() {
  try {
    const savedProfile = localStorage.getItem("habitflow-profile");

    if (savedProfile) {
      const parsedProfile = JSON.parse(savedProfile);

      if (parsedProfile && typeof parsedProfile.name === "string") {
        userProfile = {
          name: parsedProfile.name.trim() || "Yassine",
        };
      }
    }
  } catch (error) {
    console.error("Failed to load HabitFlow profile:", error);

    userProfile = {
      name: "Yassine",
    };
  }
}
function saveUserProfile() {
  try {
    localStorage.setItem("habitflow-profile", JSON.stringify(userProfile));
  } catch (error) {
    console.error("Failed to save HabitFlow profile:", error);
  }
}
/*=========================================================================================================== */

let currentLanguage = localStorage.getItem("habitflow-language") || "en";

const today = new Date();

const analyticsCompletionRate = document.getElementById(
  "analytics-completion-rate",
);

const analyticsStrongestHabit = document.getElementById(
  "analytics-strongest-habit",
);

const analyticsStrongestRate = document.getElementById(
  "analytics-strongest-rate",
);

const analyticsWeakestHabit = document.getElementById(
  "analytics-weakest-habit",
);

const analyticsWeakestRate = document.getElementById("analytics-weakest-rate");

const analyticsCompletedTotal = document.getElementById(
  "analytics-completed-total",
);

const weeklyChart = document.getElementById("weekly-chart");

const habitPerformanceChart = document.getElementById(
  "habit-performance-chart",
);

let displayedYear = today.getFullYear();
let displayedMonth = today.getMonth();
let editingHabitId = null;

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function createDateKey(year, month, day) {
  const monthNumber = String(month + 1).padStart(2, "0");
  const dayNumber = String(day).padStart(2, "0");

  return `${year}-${monthNumber}-${dayNumber}`;
}

function isPastDate(year, month, day) {
  const date = new Date(year, month, day);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  return date < today;
}

function isBeforeHabitStart(habit, dateKey) {
  if (!habit.createdAt) {
    return false;
  }

  return dateKey < habit.createdAt;
}

function getSelectedCustomDays() {
  return [...customDayInputs]
    .filter((input) => input.checked)
    .map((input) => Number(input.value));
}

function isHabitScheduledOnDate(habit, year, month, day) {
  const date = new Date(year, month, day);
  const dayOfWeek = date.getDay();

  const schedule = habit.schedule || {
    type: "everyday",
    days: [],
  };

  if (schedule.type === "everyday") {
    return true;
  }

  if (schedule.type === "weekdays") {
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }

  if (schedule.type === "custom") {
    return schedule.days.includes(dayOfWeek);
  }

  return true;
}

function shouldCountHabitOnDate(habit, year, month, day) {
  const dateKey = createDateKey(year, month, day);

  if (isBeforeHabitStart(habit, dateKey)) {
    return false;
  }

  return isHabitScheduledOnDate(habit, year, month, day);
}

function getDayCompletionStatus(year, month, day) {
  const scheduledHabits = habits.filter((habit) =>
    shouldCountHabitOnDate(habit, year, month, day),
  );

  if (scheduledHabits.length === 0) {
    return {
      hasHabits: false,
      completed: false,
    };
  }

  const dateKey = createDateKey(year, month, day);

  const allCompleted = scheduledHabits.every(
    (habit) => trackerData[habit.id]?.[dateKey] === "completed",
  );

  return {
    hasHabits: true,
    completed: allCompleted,
  };
}

function getCurrentStreak() {
  if (habits.length === 0) {
    return 0;
  }

  const createdDates = habits
    .map((habit) => habit.createdAt)
    .filter(Boolean)
    .sort();

  if (createdDates.length === 0) {
    return 0;
  }

  const [startYear, startMonth, startDay] = createdDates[0]
    .split("-")
    .map(Number);

  const earliestDate = new Date(startYear, startMonth - 1, startDay);

  earliestDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  const cursor = new Date(today);

  const todayStatus = getDayCompletionStatus(
    cursor.getFullYear(),
    cursor.getMonth(),
    cursor.getDate(),
  );

  if (!todayStatus.completed) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (cursor >= earliestDate) {
    const status = getDayCompletionStatus(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate(),
    );

    if (!status.hasHabits) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    if (!status.completed) {
      break;
    }

    streak += 1;

    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getBestStreak() {
  if (habits.length === 0) {
    return 0;
  }

  const createdDates = habits
    .map((habit) => habit.createdAt)
    .filter(Boolean)
    .sort();

  if (createdDates.length === 0) {
    return 0;
  }

  const [year, month, day] = createdDates[0].split("-").map(Number);

  const cursor = new Date(year, month - 1, day);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let current = 0;
  let best = 0;

  while (cursor <= today) {
    const status = getDayCompletionStatus(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate(),
    );

    if (!status.hasHabits) {
      cursor.setDate(cursor.getDate() + 1);
      continue;
    }

    if (status.completed) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return best;
}

function getTodayStats() {
  const today = new Date();

  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();

  const scheduledHabits = habits.filter((habit) =>
    shouldCountHabitOnDate(habit, year, month, day),
  );

  const completedHabits = scheduledHabits.filter((habit) =>
    isHabitCompletedToday(habit.id),
  );

  const total = scheduledHabits.length;
  const completed = completedHabits.length;

  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return {
    total,
    completed,
    percentage,
  };
}

function getMonthlyScore(year, month) {
  const today = new Date();

  const daysInMonth = getDaysInMonth(year, month);

  let scheduledCount = 0;
  let completedCount = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const currentDate = new Date(year, month, day);

    currentDate.setHours(0, 0, 0, 0);

    const todayDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    if (currentDate > todayDate) {
      continue;
    }

    habits.forEach((habit) => {
      if (!shouldCountHabitOnDate(habit, year, month, day)) {
        return;
      }

      scheduledCount += 1;

      const dateKey = createDateKey(year, month, day);

      if (trackerData[habit.id]?.[dateKey] === "completed") {
        completedCount += 1;
      }
    });
  }

  const percentage =
    scheduledCount === 0
      ? 0
      : Math.round((completedCount / scheduledCount) * 100);

  return {
    scheduled: scheduledCount,
    completed: completedCount,
    percentage,
  };
}

function getWeeklyStats() {
  const today = new Date();

  const currentDay = today.getDay();

  const daysSinceWeekStart =
    userPreferences.weekStart === "sunday"
      ? currentDay
      : currentDay === 0
        ? 6
        : currentDay - 1;

  const weekStartDate = new Date(today);

  weekStartDate.setDate(today.getDate() - daysSinceWeekStart);

  weekStartDate.setHours(0, 0, 0, 0);

  let scheduledCount = 0;
  let completedCount = 0;

  for (let offset = 0; offset <= daysSinceWeekStart; offset += 1) {
    const date = new Date(weekStartDate);

    date.setDate(weekStartDate.getDate() + offset);

    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    habits.forEach((habit) => {
      if (!shouldCountHabitOnDate(habit, year, month, day)) {
        return;
      }

      scheduledCount += 1;

      const dateKey = createDateKey(year, month, day);

      if (trackerData[habit.id]?.[dateKey] === "completed") {
        completedCount += 1;
      }
    });
  }

  const percentage =
    scheduledCount === 0
      ? 0
      : Math.round((completedCount / scheduledCount) * 100);

  return {
    scheduled: scheduledCount,
    completed: completedCount,
    percentage,
  };
}

function getWeeklyChartData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentDay = today.getDay();

  const daysSinceWeekStart =
    userPreferences.weekStart === "sunday"
      ? currentDay
      : currentDay === 0
        ? 6
        : currentDay - 1;

  const weekStartDate = new Date(today);

  weekStartDate.setDate(today.getDate() - daysSinceWeekStart);

  weekStartDate.setHours(0, 0, 0, 0);

  const days = [];

  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(weekStartDate);

    date.setDate(weekStartDate.getDate() + offset);

    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    let scheduled = 0;
    let completed = 0;

    habits.forEach((habit) => {
      if (!shouldCountHabitOnDate(habit, year, month, day)) {
        return;
      }

      scheduled += 1;

      const dateKey = createDateKey(year, month, day);

      if (trackerData[habit.id]?.[dateKey] === "completed") {
        completed += 1;
      }
    });

    const percentage =
      scheduled === 0 ? 0 : Math.round((completed / scheduled) * 100);

    days.push({
      date,
      scheduled,
      completed,
      percentage,
    });
  }

  return days;
}

function renderWeeklyChart() {
  const data = getWeeklyChartData();

  weeklyChart.innerHTML = "";

  const localeMap = {
    en: "en-US",
    fr: "fr-FR",
    ar: "ar-MA",
  };

  data.forEach((item) => {
    const dayName = new Intl.DateTimeFormat(
      localeMap[currentLanguage] || "en-US",
      {
        weekday: "short",
      },
    ).format(item.date);

    const column = document.createElement("div");

    column.className = "weekly-chart__item";

    column.innerHTML = `
      <span class="weekly-chart__value">
        ${item.percentage}%
      </span>

      <div class="weekly-chart__track">
        <span
          class="weekly-chart__bar"
          style="height: ${item.percentage}%"
        ></span>
      </div>

      <span class="weekly-chart__day">
        ${dayName}
      </span>
    `;

    weeklyChart.appendChild(column);
  });
}

function renderHabitPerformanceChart() {
  habitPerformanceChart.innerHTML = "";

  const today = new Date();

  const year = today.getFullYear();
  const month = today.getMonth();

  const dictionary = translations[currentLanguage];

  habits.forEach((habit) => {
    const stats = getHabitMonthlyStats(habit, year, month);

    if (stats.scheduled === 0) {
      return;
    }

    const habitName = habit.name || dictionary[habit.nameKey] || "Habit";

    const row = document.createElement("div");

    row.className = "habit-performance-chart__row";

    row.innerHTML = `
      <div class="habit-performance-chart__top">
        <span>${habitName}</span>
        <strong>${stats.percentage}%</strong>
      </div>

      <div class="habit-performance-chart__track">
        <span
          style="width: ${stats.percentage}%"
        ></span>
      </div>
    `;

    habitPerformanceChart.appendChild(row);
  });

  if (!habitPerformanceChart.children.length) {
    habitPerformanceChart.innerHTML = `<p class="analytics-empty">No data yet.</p>`;
  }
}

function renderAnalyticsCharts() {
  renderWeeklyChart();
  renderHabitPerformanceChart();
}

function getHabitMonthlyStats(habit, year, month) {
  const today = new Date();
  const daysInMonth = getDaysInMonth(year, month);

  let scheduled = 0;
  let completed = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);

    const todayDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    if (date > todayDate) {
      continue;
    }

    if (!shouldCountHabitOnDate(habit, year, month, day)) {
      continue;
    }

    scheduled += 1;

    const dateKey = createDateKey(year, month, day);

    if (trackerData[habit.id]?.[dateKey] === "completed") {
      completed += 1;
    }
  }

  const percentage =
    scheduled === 0 ? 0 : Math.round((completed / scheduled) * 100);

  return {
    scheduled,
    completed,
    percentage,
  };
}

function trapFocusInsideModal(event) {
  if (event.key !== "Tab" || !confirmModal?.classList.contains("is-open")) {
    return;
  }

  const focusableElements = confirmModal.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );

  if (!focusableElements.length) {
    return;
  }

  const firstElement = focusableElements[0];

  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
    return;
  }

  if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

function getAnalyticsData() {
  const today = new Date();

  const year = today.getFullYear();
  const month = today.getMonth();

  const monthlyStats = getMonthlyScore(year, month);

  const dictionary = translations[currentLanguage];

  const habitStats = habits.map((habit) => {
    const stats = getHabitMonthlyStats(habit, year, month);

    const name = habit.name || dictionary[habit.nameKey] || "Habit";

    return {
      habit,
      name,
      ...stats,
    };
  });

  const measurableHabits = habitStats.filter((item) => item.scheduled > 0);

  let strongest = null;
  let weakest = null;

  if (measurableHabits.length > 0) {
    strongest = measurableHabits.reduce((best, current) =>
      current.percentage > best.percentage ? current : best,
    );

    weakest = measurableHabits.reduce((worst, current) =>
      current.percentage < worst.percentage ? current : worst,
    );
  }

  return {
    completionRate: monthlyStats.percentage,

    completedTotal: monthlyStats.completed,

    strongest,
    weakest,
  };
}

function renderAnalytics() {
  const data = getAnalyticsData();

  analyticsCompletionRate.textContent = `${data.completionRate}%`;

  analyticsCompletedTotal.textContent = data.completedTotal;

  if (data.strongest) {
    analyticsStrongestHabit.textContent = data.strongest.name;

    analyticsStrongestRate.textContent = `${data.strongest.percentage}%`;
  } else {
    analyticsStrongestHabit.textContent = "—";
    analyticsStrongestRate.textContent = "0%";
  }

  if (data.weakest) {
    analyticsWeakestHabit.textContent = data.weakest.name;

    analyticsWeakestRate.textContent = `${data.weakest.percentage}%`;
  } else {
    analyticsWeakestHabit.textContent = "—";
    analyticsWeakestRate.textContent = "0%";
  }
}

function renderStats(language) {
  const todayStats = getTodayStats();

  const today = new Date();

  const monthlyStats = getMonthlyScore(today.getFullYear(), today.getMonth());

  const weeklyStats = getWeeklyStats();

  const currentStreak = getCurrentStreak();

  const bestStreak = getBestStreak();

  todayProgressValue.innerHTML = `${todayStats.completed} <span>/ ${todayStats.total}</span>`;

  todayProgressPercent.textContent = `${todayStats.percentage}%`;

  todayProgressRing.setAttribute(
    "aria-label",
    `${todayStats.percentage} percent`,
  );

  monthlyScoreValue.textContent = monthlyStats.percentage;

  if (language === "fr") {
    todayTasksCount.textContent = `${todayStats.total} tâches`;
  } else if (language === "ar") {
    todayTasksCount.textContent = `${todayStats.total} مهام`;
  } else {
    todayTasksCount.textContent = `${todayStats.total} tasks`;
  }

  if (language === "fr") {
    weeklyProgressText.textContent = `${weeklyStats.percentage} % terminés`;
  } else if (language === "ar") {
    weeklyProgressText.textContent = `اكتمل ${weeklyStats.percentage}٪`;
  } else {
    weeklyProgressText.textContent = `${weeklyStats.percentage}% completed`;
  }

  weeklyProgressBar.style.width = `${weeklyStats.percentage}%`;

  currentStreakValue.textContent = currentStreak;

  bestStreakValue.textContent = bestStreak;
}

function getMonthLabel(year, month, language) {
  const localeMap = {
    en: "en-US",
    fr: "fr-FR",
    ar: "ar-MA",
  };

  return new Intl.DateTimeFormat(localeMap[language] || "en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1));
}

function renderTodayHabits(language) {
  const dictionary = translations[language];

  habitList.innerHTML = "";

  if (habits.length === 0) {
    habitList.innerHTML = `
    <div class="empty-state">
      <strong>No habits yet</strong>
      <p>Create your first habit to start building consistency.</p>
    </div>
  `;

    return;
  }

  const realToday = new Date();

  const todaysScheduledHabits = habits.filter((habit) =>
    isHabitScheduledOnDate(
      habit,
      realToday.getFullYear(),
      realToday.getMonth(),
      realToday.getDate(),
    ),
  );

  todaysScheduledHabits.forEach((habit) => {
    const isCompleted = isHabitCompletedToday(habit.id);

    const article = document.createElement("article");
    article.className = `habit-row${isCompleted ? " is-complete" : ""}`;

    const habitName = habit.name || dictionary[habit.nameKey] || "Habit";

    const habitTarget = habit.target || dictionary[habit.targetKey] || "";

    const timeText =
      habit.time === "all-day"
        ? dictionary.allDay
        : habit.time || dictionary.allDay;

    article.innerHTML = `
      <div class="habit-row__icon habit-row__icon--${habit.color}" aria-hidden="true">
        ${habit.icon}
      </div>

      <div class="habit-row__copy">
        <h3>${habitName}</h3>

        <p>
          <span>${dictionary.target}</span>
          ·
          <span>${habitTarget}</span>
        </p>
      </div>

      <span class="habit-row__time">${timeText}</span>

      <button
        class="habit-check${isCompleted ? " is-checked" : ""}"
        type="button"
        aria-label="Mark ${habitName} complete"
        aria-pressed="${isCompleted}"
        data-habit-id="${habit.id}"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 12 4 4 8-9"></path>
        </svg>
      </button>
    `;

    habitList.appendChild(article);
  });
}

function renderTracker(language) {
  const daysRow = document.getElementById("tracker-days");
  const trackerBody = document.getElementById("tracker-body");
  const dictionary = translations[language];

  const daysInMonth = getDaysInMonth(displayedYear, displayedMonth);

  const realToday = new Date();

  const isCurrentMonth =
    realToday.getFullYear() === displayedYear &&
    realToday.getMonth() === displayedMonth;

  currentMonthLabel.textContent = getMonthLabel(
    displayedYear,
    displayedMonth,
    language,
  );

  daysRow.innerHTML = `<th>${dictionary.habit}</th>`;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const heading = document.createElement("th");

    heading.textContent = day;
    heading.scope = "col";

    if (isCurrentMonth && day === realToday.getDate()) {
      heading.classList.add("is-today");
    }

    daysRow.appendChild(heading);
  }

  trackerBody.innerHTML = "";

  habits.forEach((habit) => {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");

    const habitName = habit.name || dictionary[habit.nameKey] || "Habit";

    nameCell.textContent = habitName;

    row.appendChild(nameCell);

    for (let day = 1; day <= daysInMonth; day += 1) {
      const cell = document.createElement("td");

      const dateKey = createDateKey(displayedYear, displayedMonth, day);

      const state = trackerData[habit.id]?.[dateKey];

      const isPast = isPastDate(displayedYear, displayedMonth, day);

      const isBeforeStart = isBeforeHabitStart(habit, dateKey);
      const isScheduled = isHabitScheduledOnDate(
        habit,
        displayedYear,
        displayedMonth,
        day,
      );

      cell.classList.add("tracker-cell");

      if (state === "completed") {
        cell.classList.add("is-complete");
      } else if (isPast && !isBeforeStart && isScheduled) {
        cell.classList.add("is-missed");
      }

      if (isCurrentMonth && day === realToday.getDate()) {
        cell.classList.add("is-today");
      }

      let stateText = dictionary.empty;

      if (state === "completed") {
        stateText = dictionary.completed;
      } else if (isPast && !isBeforeStart && isScheduled) {
        stateText = dictionary.missed;
      }

      cell.setAttribute("aria-label", `${habitName}, ${day}: ${stateText}`);

      cell.innerHTML = '<span aria-hidden="true"></span>';

      row.appendChild(cell);
    }

    trackerBody.appendChild(row);
  });
}

function closeLanguageMenu() {
  languageRoot.classList.remove("is-open");
  languageTrigger.setAttribute("aria-expanded", "false");
}

function setLanguage(language) {
  const safeLanguage = translations[language] ? language : "en";
  const dictionary = translations[safeLanguage];
  currentLanguage = safeLanguage;
  userPreferences.language = safeLanguage;
  document.documentElement.lang = safeLanguage;
  document.documentElement.dir = safeLanguage === "ar" ? "rtl" : "ltr";
  languageCode.textContent = safeLanguage.toUpperCase();

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (dictionary[key]) element.textContent = dictionary[key];
  });

  document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
    const key = element.dataset.i18nAria;
    if (dictionary[key]) element.setAttribute("aria-label", dictionary[key]);
  });

  document.querySelectorAll("[data-lang]").forEach((button) => {
    button.setAttribute(
      "aria-selected",
      String(button.dataset.lang === safeLanguage),
    );
  });

  localStorage.setItem("habitflow-language", safeLanguage);

  saveUserPreferences();
  renderTodayHabits(safeLanguage);
  renderTracker(safeLanguage);
  renderStats(safeLanguage);
  renderAnalytics();
  renderAnalyticsCharts();

  closeLanguageMenu();
}

function openSidebar() {
  sidebar.classList.add("is-open");
  sidebarOverlay.classList.add("is-visible");
  mobileMenuButton.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
}

function closeSidebar() {
  sidebar.classList.remove("is-open");
  sidebarOverlay.classList.remove("is-visible");
  mobileMenuButton.setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
}

function renderManageHabits(language) {
  const dictionary = translations[language];

  manageHabitsList.innerHTML = "";

  if (habits.length === 0) {
    manageHabitsList.innerHTML = `
    <div class="empty-state">
      <strong>No habits yet</strong>
      <p>Add a habit to start tracking your progress.</p>
    </div>
  `;

    return;
  }

  habits.forEach((habit) => {
    const row = document.createElement("div");
    row.className = "manage-habit-row";

    const habitName = habit.name || dictionary[habit.nameKey] || "Habit";

    const habitTarget = habit.target || dictionary[habit.targetKey] || "";

    const timeText =
      habit.time === "all-day"
        ? dictionary.allDay
        : habit.time || dictionary.allDay;

    row.innerHTML = `
      <div class="manage-habit-row__icon">
        ${habit.icon}
      </div>

      <div class="manage-habit-row__copy">
        <h3>${habitName}</h3>

        <p>
          ${habitTarget} · ${timeText}
        </p>
      </div>

      <div class="manage-habit-row__actions">
        <button
          type="button"
          class="edit-habit"
          data-habit-id="${habit.id}"
        >
          Edit
        </button>

        <button
          type="button"
          class="delete-habit"
          data-habit-id="${habit.id}"
        >
          Delete
        </button>
      </div>
    `;

    manageHabitsList.appendChild(row);
  });
}

function openManageHabitsModal() {
  renderManageHabits(currentLanguage);
  manageHabitsModal.classList.add("is-open");
  manageHabitsModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeManageHabitsModal() {
  manageHabitsModal.classList.remove("is-open");
  manageHabitsModal.setAttribute("aria-hidden", "true");

  closeHabitForm();

  document.body.style.overflow = "";
}
function openSettingsModal() {
  if (!settingsModal) {
    return;
  }

  settingsModal.classList.add("is-open");
  settingsModal.setAttribute("aria-hidden", "false");

  document.body.classList.add("modal-open");

  if (settingsNameInput) {
    settingsNameInput.value = userProfile.name;

    settingsNameInput.focus();
  }
  if (settingsLanguage) {
    settingsLanguage.value = userPreferences.language;
  }

  if (settingsWeekStart) {
    settingsWeekStart.value = userPreferences.weekStart;
  }
}
if (saveSettingsButton) {
  saveSettingsButton.addEventListener("click", () => {
    const name = settingsNameInput.value.trim();

    if (!name) {
      settingsNameInput.focus();
      return;
    }

    userProfile.name = name;
    userPreferences.language = settingsLanguage.value;

    userPreferences.weekStart = settingsWeekStart.value;

    saveUserProfile();
    saveUserPreferences();
    renderProfile();
    setLanguage(userPreferences.language);

    closeSettingsModal();
  });
}
if (settingsNameInput) {
  settingsNameInput.addEventListener("input", () => {
    const name = settingsNameInput.value.trim();

    const previewName = name || "HabitFlow User";

    settingsNamePreview.textContent = previewName;

    settingsAvatarPreview.textContent = getInitials(previewName);
  });
}
function closeSettingsModal() {
  if (!settingsModal) {
    return;
  }

  settingsModal.classList.remove("is-open");
  settingsModal.setAttribute("aria-hidden", "true");

  document.body.classList.remove("modal-open");

  if (openSettingsButton) {
    openSettingsButton.focus();
  }
}

addHabitButton.addEventListener("click", openHabitForm);

cancelHabitForm.addEventListener("click", closeHabitForm);

cancelHabitButton.addEventListener("click", closeHabitForm);

habitScheduleInput.addEventListener("change", () => {
  const isCustom = habitScheduleInput.value === "custom";

  customDaysContainer.hidden = !isCustom;

  if (!isCustom) {
    customDayInputs.forEach((input) => {
      input.checked = false;
    });
  }
});

if (openSettingsButton) {
  openSettingsButton.addEventListener("click", openSettingsModal);
}

if (closeSettingsButton) {
  closeSettingsButton.addEventListener("click", closeSettingsModal);
}

if (cancelSettingsButton) {
  cancelSettingsButton.addEventListener("click", closeSettingsModal);
}

if (exportDataButton) {
  exportDataButton.addEventListener("click", exportHabitFlowData);
}

if (importDataButton && importDataInput) {
  importDataButton.addEventListener("click", () => {
    importDataInput.click();
  });

  if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    const confirmed = await openConfirmModal(
      "Are you sure you want to log out?",
      "Log out",
    );

    if (!confirmed) return;

    await logoutUser();
  });
}
}

if (importDataInput) {
  importDataInput.addEventListener("change", async () => {
    const file = importDataInput.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();

      const backup = JSON.parse(text);

      if (!isValidHabitFlowBackup(backup)) {
        showToast(translations[currentLanguage].invalidBackup, "error");
        return;
      }

      const confirmed = await openConfirmModal(
        translations[currentLanguage].importConfirm,
        "Confirm import",
      );
      if (!confirmed) {
        return;
      }

      applyImportedBackup(backup);

      showToast(translations[currentLanguage].importSuccess);
    } catch (error) {
      console.error("Failed to import HabitFlow backup:", error);

      showToast(translations[currentLanguage].importError, "error");
    } finally {
      importDataInput.value = "";
    }
  });
}

if (resetDataButton) {
  resetDataButton.addEventListener("click", resetHabitFlowData);
}

if (confirmOkButton) {
  confirmOkButton.addEventListener("click", () => {
    closeConfirmModal(true);
  });
}

if (confirmCancelButton) {
  confirmCancelButton.addEventListener("click", () => {
    closeConfirmModal(false);
  });
}

if (closeConfirmButton) {
  closeConfirmButton.addEventListener("click", () => {
    closeConfirmModal(false);
  });
}

if (confirmModal) {
  confirmModal.addEventListener("click", (event) => {
    if (event.target === confirmModal) {
      closeConfirmModal(false);
    }
  });
}

if (settingsModal) {
  settingsModal.addEventListener("click", (event) => {
    if (event.target === settingsModal) {
      closeSettingsModal();
    }
  });
}

habitForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = habitNameInput.value.trim();
  const target = habitTargetInput.value.trim();
  const time = habitTimeInput.value || "all-day";
  const icon = habitIconInput.value;
  const color = habitColorInput.value;
  const scheduleType = habitScheduleInput.value;

  const scheduleDays = scheduleType === "custom" ? getSelectedCustomDays() : [];

  if (!name || !target) {
    return;
  }

  if (scheduleType === "custom" && scheduleDays.length === 0) {
    return;
  }

  if (editingHabitId) {
    const habitIndex = habits.findIndex((habit) => habit.id === editingHabitId);

    if (habitIndex !== -1) {
      const oldHabit = habits[habitIndex];

      habits[habitIndex] = {
        ...oldHabit,
        name,
        target,
        icon,
        color,
        time,

        schedule: {
          type: scheduleType,
          days: scheduleDays,
        },
      };
    }
  } else {
    const newHabit = {
      id: createHabitId(name),
      name,
      target,
      icon,
      color,
      time,
      createdAt: getTodayDateKey(),

      schedule: {
        type: scheduleType,
        days: scheduleDays,
      },
    };

    habits.push(newHabit);

    trackerData[newHabit.id] = {};
  }

  saveAppData();

  renderTodayHabits(currentLanguage);
  renderManageHabits(currentLanguage);
  renderTracker(currentLanguage);
  renderStats(currentLanguage);
  renderAnalytics();
  renderAnalyticsCharts();

  closeHabitForm();
});

manageHabitsButton.addEventListener("click", openManageHabitsModal);

closeManageHabitsButton.addEventListener("click", closeManageHabitsModal);

manageHabitsModal.addEventListener("click", (event) => {
  if (event.target === manageHabitsModal) {
    closeManageHabitsModal();
  }
});

manageHabitsList.addEventListener("click", (event) => {
  const editButton = event.target.closest(".edit-habit");

  const deleteButton = event.target.closest(".delete-habit");

  if (editButton) {
    const habitId = editButton.dataset.habitId;

    const habit = habits.find((item) => item.id === habitId);

    if (habit) {
      openHabitForm(habit);
    }

    return;
  }

  if (deleteButton) {
    const habitId = deleteButton.dataset.habitId;

    deleteHabit(habitId);
  }
});

function openHabitForm(habit = null) {
  habitForm.hidden = false;
  addHabitButton.hidden = true;

  editingHabitId = habit ? habit.id : null;

  if (habit) {
    const dictionary = translations[currentLanguage];

    habitNameInput.value = habit.name || dictionary[habit.nameKey] || "";

    habitTargetInput.value = habit.target || dictionary[habit.targetKey] || "";

    habitTimeInput.value = habit.time === "all-day" ? "" : habit.time || "";

    habitIconInput.value = habit.icon || "✦";
    habitColorInput.value = habit.color || "green";

    const schedule = habit.schedule || {
      type: "everyday",
      days: [],
    };

    habitScheduleInput.value = schedule.type;

    const isCustom = schedule.type === "custom";

    customDaysContainer.hidden = !isCustom;

    customDayInputs.forEach((input) => {
      input.checked = isCustom && schedule.days.includes(Number(input.value));
    });
  } else {
    habitNameInput.focus();
  }
}

function closeHabitForm() {
  habitForm.hidden = true;
  addHabitButton.hidden = false;

  editingHabitId = null;

  habitForm.reset();

  habitScheduleInput.value = "everyday";
  customDaysContainer.hidden = true;

  customDayInputs.forEach((input) => {
    input.checked = false;
  });
}

function createHabitId(name) {
  const cleanName = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const baseId = cleanName || "habit";

  return `${baseId}-${Date.now()}`;
}

function deleteHabit(habitId) {
  habits = habits.filter((habit) => habit.id !== habitId);

  delete trackerData[habitId];

  saveAppData();

  renderManageHabits(currentLanguage);
  renderTodayHabits(currentLanguage);
  renderTracker(currentLanguage);
  renderStats(currentLanguage);
  renderAnalytics();
  renderAnalyticsCharts();
}

languageTrigger.addEventListener("click", (event) => {
  event.stopPropagation();
  const isOpen = languageRoot.classList.toggle("is-open");
  languageTrigger.setAttribute("aria-expanded", String(isOpen));
});

languageMenu.addEventListener("click", (event) => {
  const button = event.target.closest("[data-lang]");
  if (button) setLanguage(button.dataset.lang);
});

document.addEventListener("click", (event) => {
  if (!languageRoot.contains(event.target)) closeLanguageMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  if (confirmModal?.classList.contains("is-open")) {
    closeConfirmModal(false);
    return;
  }

  if (settingsModal?.classList.contains("is-open")) {
    closeSettingsModal();
    return;
  }

  if (manageHabitsModal?.classList.contains("is-open")) {
    closeManageHabitsModal();
  }
});

document.addEventListener("keydown", trapFocusInsideModal);

mobileMenuButton.addEventListener("click", openSidebar);
sidebarOverlay.addEventListener("click", closeSidebar);

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    document
      .querySelectorAll(".nav-link")
      .forEach((item) => item.classList.remove("active"));
    link.classList.add("active");
    closeSidebar();
  });
});

habitList.addEventListener("click", (event) => {
  const button = event.target.closest(".habit-check");

  if (!button) {
    return;
  }

  const habitId = button.dataset.habitId;
  const todayKey = getTodayDateKey();

  if (!trackerData[habitId] || typeof trackerData[habitId] !== "object") {
    trackerData[habitId] = {};
  }

  const isCurrentlyCompleted = trackerData[habitId][todayKey] === "completed";

  if (isCurrentlyCompleted) {
    delete trackerData[habitId][todayKey];
  } else {
    trackerData[habitId][todayKey] = "completed";
  }

  saveAppData();

  renderTodayHabits(currentLanguage);
  renderTracker(currentLanguage);
  renderStats(currentLanguage);
  renderAnalytics();
  renderAnalyticsCharts();

  /*==================== */
});

document.querySelectorAll("[data-month-action]").forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.monthAction;

    if (action === "previous") {
      displayedMonth -= 1;

      if (displayedMonth < 0) {
        displayedMonth = 11;
        displayedYear -= 1;
      }
    }

    if (action === "next") {
      displayedMonth += 1;

      if (displayedMonth > 11) {
        displayedMonth = 0;
        displayedYear += 1;
      }
    }

    renderTracker(currentLanguage);
  });
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 820) closeSidebar();
});

loadAppData();
loadUserProfile();
loadUserPreferences();

renderProfile();

setLanguage(userPreferences.language);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then(() => {
        console.log("Service Worker registered ✅");
      })
      .catch((error) => {
        console.error("Service Worker registration failed:", error);
      });
  });
}

let deferredInstallPrompt = null;

const installAppBtn = document.getElementById("install-app-btn");

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();

  deferredInstallPrompt = event;

  if (installAppBtn) {
    installAppBtn.hidden = false;
  }
});

if (installAppBtn) {
  installAppBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;

    deferredInstallPrompt.prompt();

    const { outcome } = await deferredInstallPrompt.userChoice;

    if (outcome === "accepted") {
      installAppBtn.hidden = true;
    }

    deferredInstallPrompt = null;
  });
}

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;

  if (installAppBtn) {
    installAppBtn.hidden = true;
  }

  console.log("HabitFlow installed ✅");
});