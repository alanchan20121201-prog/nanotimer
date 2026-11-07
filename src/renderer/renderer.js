'use strict';

const bridge = window.capsuleTimer;

const widget = document.querySelector('.widget');
const setupView = document.getElementById('setup-view');
const timerView = document.getElementById('timer-view');
const timerForm = document.getElementById('timer-form');
const hoursInput = document.getElementById('hours-input');
const minutesInput = document.getElementById('minutes-input');
const secondsInput = document.getElementById('seconds-input');
const formMessage = document.getElementById('form-message');
const timeDisplay = document.getElementById('time-display');
const timerStatus = document.getElementById('timer-status');
const timerLabel = document.getElementById('timer-label');
const timerAnnouncer = document.getElementById('timer-announcer');
const footerStatus = document.getElementById('footer-status');
const pauseButton = document.getElementById('pause-button');
const resetButton = document.getElementById('reset-button');
const pinButton = document.getElementById('pin-button');
const muteButton = document.getElementById('mute-button');
const resetHint = document.getElementById('reset-hint');
const audioButton = document.getElementById('audio-button');
const audioResetButton = document.getElementById('audio-reset');
const backdrop = document.getElementById('backdrop');
const backgroundButton = document.getElementById('background-button');
const backgroundClearButton = document.getElementById('background-clear');
const minimizeButton = document.getElementById('minimize-button');
const closeButton = document.getElementById('close-button');
const capsuleMinimizeButton = document.getElementById('capsule-minimize-button');
const capsuleCloseButton = document.getElementById('capsule-close-button');
const exitFullscreenButton = document.getElementById('exit-fullscreen-button');
const helpButton = document.getElementById('help-button');
const helpSheet = document.getElementById('help-sheet');
const helpCloseButton = document.getElementById('help-close');
const updateButton = document.getElementById('update-button');
const runModeSelect = document.getElementById('run-mode-select');
const sessionNote = document.getElementById('session-note');
const noteClearButton = document.getElementById('note-clear');
const timerNote = document.getElementById('timer-note');
const exportButton = document.getElementById('export-button');
const extendRow = document.getElementById('extend-row');
const extendOneButton = document.getElementById('extend-one');
const extendFiveButton = document.getElementById('extend-five');
const undoButton = document.getElementById('undo-button');
const settingsSheet = document.getElementById('settings-sheet');
const settingsButton = document.getElementById('settings-button');
const settingsClose = document.getElementById('settings-close');
const edgeSnapToggle = document.getElementById('edge-snap-toggle');
const bgDim = document.getElementById('bg-dim');
const bgDimValue = document.getElementById('bg-dim-value');
const previewSoundButton = document.getElementById('preview-sound');
const exportSettingsButton = document.getElementById('export-settings');
const importSettingsButton = document.getElementById('import-settings');
const historySheet = document.getElementById('history-sheet');
const historyButton = document.getElementById('history-button');
const historyClose = document.getElementById('history-close');
const historyStats = document.getElementById('history-stats');
const historyList = document.getElementById('history-list');
const historyClear = document.getElementById('history-clear');
const historyExport = document.getElementById('history-export');
const durationSheet = document.getElementById('duration-sheet');
const durationClose = document.getElementById('duration-close');
const durationCancel = document.getElementById('duration-cancel');
const durationApply = document.getElementById('duration-apply');
const durationMinutes = document.getElementById('duration-minutes');
const durationSeconds = document.getElementById('duration-seconds');
const modeSelect = document.getElementById('mode-select');
const modeButtons = Array.from(
  document.querySelectorAll('[data-display-mode]')
);
const presetSelect = document.querySelector('[data-preset-select]');
const presetRenameButton = document.querySelector('#preset-rename');
const presetDeleteButton = document.querySelector('#preset-delete');
const presetSheet = document.querySelector('#preset-sheet');
const presetForm = document.querySelector('#preset-form');
const presetNameInput = document.querySelector('#preset-name');
const presetSheetClose = document.querySelector('#preset-sheet-close');
const presetCancelButton = document.querySelector('#preset-cancel');
const languageSelects = Array.from(
  document.querySelectorAll('[data-language-select]')
);

const TICK_MS = 1000;
// Setup card heights: the full form, or the shorter stopwatch form.
const SETUP_HEIGHT_FULL = 476;
const SETUP_HEIGHT_STOPWATCH = 398;
const STORAGE_KEY = 'nanotimer.language';
const PRESETS_KEY = 'nanotimer.presets';
const LAST_CONFIG_KEY = 'nanotimer.lastConfig';
const AUDIO_KEY = 'nanotimer.audioPath';
const BACKGROUND_KEY = 'nanotimer.background';
const MUTE_KEY = 'nanotimer.alarmMuted';
const LOGS_KEY = 'nanotimer.logs';
const STOPWATCH_KEY = 'nanotimer.runMode';
const STATS_KEY = 'nanotimer.stats';
const NOTE_KEY = 'nanotimer.note';
const POMODORO_ROUNDS = 4;
const POMODORO_SHORT_MS = 5 * 60 * 1000;
const POMODORO_LONG_MS = 15 * 60 * 1000;
const POMODORO_BREAK_DELAY_MS = 1500;
const DEFAULT_POMODORO_FOCUS_MS = 25 * 60 * 1000;
const EXTEND_MS = 5 * 60 * 1000;
const DISPLAY_MODE_ORDER = ['capsule', 'mini', 'fullscreen'];
const DISPLAY_MODES = new Set(['setup', ...DISPLAY_MODE_ORDER]);
const DEFAULT_LANGUAGE = 'en';
const MAX_PRESET_SECONDS = 99 * 3600 + 59 * 60 + 59;
const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'zh-TW', label: '繁體中文' },
  { id: 'zh-CN', label: '简体中文' },
  { id: 'ja', label: '日本語' }
];
const LANGUAGE_IDS = new Set(LANGUAGES.map(({ id }) => id));
const FIELDS = [
  {
    input: hoursInput,
    max: 99,
    labelKey: 'hours',
    errorKey: 'errorHoursRange'
  },
  {
    input: minutesInput,
    max: 59,
    labelKey: 'minutes',
    errorKey: 'errorMinutesRange'
  },
  {
    input: secondsInput,
    max: 59,
    labelKey: 'seconds',
    errorKey: 'errorSecondsRange'
  }
];

const UI_TEXT = {
  en: {
    appLabel: 'NanoTimer floating timer',
    minimizeApp: 'Minimize NanoTimer',
    closeApp: 'Close NanoTimer',
    minimize: 'Minimize',
    close: 'Close',
    setupTitle: 'Set a focus capsule',
    language: 'Language',
    presets: 'Presets',
    presetNone: 'No presets',
    presetNameTitle: 'Preset name',
    presetSave: 'Save',
    presetCancel: 'Cancel',
    presetRename: 'Rename preset',
    presetDelete: 'Delete preset',
    presetDeleted: 'Preset deleted',
    presetRenamed: 'Preset renamed',
    savePreset: 'Save current…',
    presetSaved: 'Preset saved',
    hours: 'Hours',
    minutes: 'Minutes',
    seconds: 'Seconds',
    start: 'Start',
    startTitle: 'Start countdown',
    timerControls: 'Timer controls',
    hoverHint: 'Hover or focus for timer controls',
    focusCapsule: 'Focus capsule',
    focusing: 'Focusing',
    paused: 'Paused',
    resumed: 'Timer resumed',
    timesUp: "Time's up!",
    completeBody: 'Your focus capsule is complete.',
    ready: 'Ready when you are',
    pause: 'Pause',
    resume: 'Resume',
    reset: 'Reset',
    resetConfirm: 'Press Esc or R again to discard this timer.',
    again: 'Again',
    newTimer: 'New timer',
    pin: 'Pin',
    pinned: 'Pinned',
    pinTitle: 'Keep above other windows',
    unpinTitle: 'Unpin from other windows',
    pinUnavailable: 'Window pinning unavailable',
    pinnedStatus: 'Window pinned',
    unpinnedStatus: 'Window unpinned',
    couldNotPin: 'Could not change window pin state',
    errorHoursRange: 'Hours must be a whole number between 0 and 99.',
    errorMinutesRange: 'Minutes must be a whole number between 0 and 59.',
    errorSecondsRange: 'Seconds must be a whole number between 0 and 59.',
    errorMinimum: 'Set at least one second.',
    dragToMove: 'Drag to move',
    audio: 'Choose alarm sound',
    audioSet: 'Custom alarm sound ready',
    audioError: 'Could not load that audio file',
    mute: 'Mute',
    unmute: 'Unmute',
    mutedStatus: 'Alarm muted',
    unmutedStatus: 'Alarm unmuted',
    mode: 'Mode',
    modeCapsule: 'Capsule',
    modeMini: 'Mini',
    modePanel: 'Panel',
    modeFull: 'Full',
    exitFullscreen: 'Exit fullscreen',
    displayMode: 'Display mode',
    runMode: 'Timer mode',
    modeCountdown: 'Countdown',
    modeStopwatch: 'Stopwatch',
    modePomodoro: 'Pomodoro',
    helpTitle: 'HOW TO USE',
    help1: 'Pick countdown, stopwatch or Pomodoro, set a duration, then press Start.',
    help2: 'Drag the capsule pill or the mini ring to move the window.',
    help3: 'Hover the capsule to open the panel: pause, reset, mute, pin.',
    help4: 'When a countdown ends, click the time to add five minutes.',
    help5: 'Global keys: Ctrl+Alt+Space pauses, Ctrl+Alt+R resets.',
    help6: 'Background, language and presets live on the setup card.',
    updateCheck: 'Check for updates',
    updateChecking: 'Checking for updates...',
    updateLatest: 'You are on the latest version (v{v}).',
    updateFound: 'Version v{v} is available.',
    updateDownloading: 'Downloading update... {p}%',
    updateDiffDownloading: 'Downloading changes... {p}%',
    updateReady: 'Update downloaded. Press the update button again to install.',
    updateFailed: 'Could not check for updates.',
    updateInstalling: 'Starting the installer...',
    roundLabel: 'Round {n}/{total}',
    breakShortRunning: 'Short break',
    breakLongRunning: 'Long break',
    extendHint: 'tap the time for +5:00',
    statsToday: 'Today {n} · {m} min',
    statsStreak: '{n}-day streak',
    extended: 'Added five minutes',
    noteLabel: 'Focus note',
    updateChecksumFailed: 'The update file was damaged on the way down. Please try again.',
    audioReset: 'Use the default sound',
    audioResetDone: 'Back to the default sound',
    updateChecksumFailed: '更新檔下載後校驗失敗，請再試一次。',
    audioReset: '恢復預設音效',
    audioResetDone: '已恢復預設音效',
    updateChecksumFailed: '更新包下载后校验失败，请再试一次。',
    audioReset: '恢复默认音效',
    audioResetDone: '已恢复默认音效',
    updateChecksumFailed: '更新ファイルの検証に失敗しました。もう一度お試しください。',
    audioReset: '既定の音に戻す',
    audioResetDone: '既定の音に戻しました',
    noteClear: 'Clear the note',
    soundPreviewShort: 'Preview',
    editDuration: 'Edit duration',
    minutesShort: 'min',
    secondsShort: 'sec',
    addTime: 'Add time',
    endsAt: 'ends',
    elapsed: 'elapsed',
    undo: 'Undo',
    resetDone: 'Timer reset',
    settings: 'Settings & history',
    statsTitle: 'Focus stats',
    historyTitle: 'History',
    historyEmpty: 'No sessions yet.',
    historyClear: 'Clear history',
    settingsTitle: 'Preferences',
    edgeSnap: 'Snap to screen edges',
    backgroundDim: 'Background dim',
    exportSettings: 'Export settings…',
    importSettings: 'Import settings…',
    settingsExported: 'Settings exported.',
    settingsImported: 'Settings imported.',
    saveFailed: 'Could not save.',
    streakLabel: '{n}-day streak',
    weekLabel: 'This week · {m} min',
    notePlaceholder: 'What are you focusing on?',
    exportTxt: 'Export TXT',
    exported: 'Log exported',
    exportError: 'Could not export log',
    background: 'Background image',
    backgroundShort: 'Background',
    backgroundClear: 'Remove background',
    backgroundReset: 'Restore the default background',
    backgroundSet: 'Background image set',
    backgroundCleared: 'Background removed',
    backgroundError: 'Could not load that image',
    stopwatchRunning: 'Counting up'
  },
  'zh-TW': {
    appLabel: 'NanoTimer 浮動計時器',
    minimizeApp: '將 NanoTimer 最小化',
    closeApp: '關閉 NanoTimer',
    minimize: '最小化',
    close: '關閉',
    setupTitle: '設定專注膠囊',
    language: '語言',
    presets: '預設組合',
    presetNone: '無設定檔',
    presetNameTitle: '設定檔名稱',
    presetSave: '儲存',
    presetCancel: '取消',
    presetRename: '重新命名設定檔',
    presetDelete: '刪除設定檔',
    presetDeleted: '已刪除設定檔',
    presetRenamed: '已重新命名設定檔',
    savePreset: '儲存目前設定…',
    presetSaved: '預設組合已儲存',
    hours: '小時',
    minutes: '分鐘',
    seconds: '秒',
    start: '開始',
    startTitle: '開始倒數',
    timerControls: '計時器控制',
    hoverHint: '游標移入或聚焦以顯示計時器控制',
    focusCapsule: '專注膠囊',
    focusing: '專注中',
    paused: '已暫停',
    resumed: '計時器已繼續',
    timesUp: '時間到！',
    completeBody: '你的專注膠囊已完成。',
    ready: '準備好了',
    pause: '暫停',
    resume: '繼續',
    reset: '重設',
    resetConfirm: '再按一次 Esc 或 R 放棄目前計時。',
    again: '再來一次',
    newTimer: '新計時器',
    pin: '置頂',
    pinned: '已置頂',
    pinTitle: '保持在其他視窗之上',
    unpinTitle: '取消置頂',
    pinUnavailable: '無法使用視窗置頂',
    pinnedStatus: '視窗已置頂',
    unpinnedStatus: '視窗已取消置頂',
    couldNotPin: '無法變更視窗置頂狀態',
    errorHoursRange: '小時必須是 0 到 99 的整數。',
    errorMinutesRange: '分鐘必須是 0 到 59 的整數。',
    errorSecondsRange: '秒數必須是 0 到 59 的整數。',
    errorMinimum: '請至少設定一秒。',
    dragToMove: '拖曳以移動',
    audio: '選擇鬧鐘音效',
    audioSet: '自訂鬧鐘音效已就緒',
    audioError: '無法載入這個音訊檔',
    mute: '靜音鬧鐘',
    unmute: '取消靜音',
    mutedStatus: '鬧鐘已靜音',
    unmutedStatus: '鬧鐘已取消靜音',
    mode: '模式',
    modeCapsule: '膠囊',
    modeMini: '迷你',
    modePanel: '面板',
    modeFull: '全螢幕',
    exitFullscreen: '退出全螢幕',
    displayMode: '顯示模式',
    runMode: '計時模式',
    modeCountdown: '倒數計時',
    modeStopwatch: '正數計時',
    modePomodoro: '番茄鐘',
    helpTitle: '使用說明',
    help1: '選擇倒數、碼錶或番茄鐘，設定時間後按「開始」。',
    help2: '拖曳膠囊藥丸或迷你圓環即可移動視窗。',
    help3: '滑鼠移過膠囊會展開面板：暫停、重設、靜音、置頂。',
    help4: '倒數結束時，點一下時間可以再加 5 分鐘。',
    help5: '全域快捷鍵：Ctrl+Alt+Space 暫停／繼續，Ctrl+Alt+R 重設。',
    help6: '背景圖、語言與預設組合都在設定頁。',
    updateCheck: '檢查更新',
    updateChecking: '正在檢查更新…',
    updateLatest: '已是最新版本（v{v}）。',
    updateFound: '有新版本 v{v}。',
    updateDownloading: '下載更新… {p}%',
    updateDiffDownloading: '下載更新差異… {p}%',
    updateReady: '更新已下載，再按一次更新按鈕即可安裝。',
    updateFailed: '無法檢查更新。',
    updateInstalling: '正在啟動安裝程式…',
    roundLabel: '第 {n}/{total} 輪',
    breakShortRunning: '短休息',
    breakLongRunning: '長休息',
    extendHint: '點一下時間加 5 分鐘',
    statsToday: '今日 {n} 輪 · {m} 分',
    statsStreak: '連續 {n} 天',
    extended: '已加 5 分鐘',
    noteLabel: '專注筆記',
    noteClear: '清除筆記',
    soundPreviewShort: '試聽',
    editDuration: '調整時間',
    minutesShort: '分',
    secondsShort: '秒',
    addTime: '加時',
    endsAt: '結束',
    elapsed: '已專注',
    undo: '復原',
    resetDone: '已重設',
    settings: '設定與紀錄',
    statsTitle: '專注統計',
    historyTitle: '歷史紀錄',
    historyEmpty: '還沒有紀錄。',
    historyClear: '清除紀錄',
    settingsTitle: '偏好設定',
    edgeSnap: '吸附螢幕邊緣',
    backgroundDim: '背景暗度',
    exportSettings: '匯出設定…',
    importSettings: '匯入設定…',
    settingsExported: '設定已匯出。',
    settingsImported: '設定已匯入。',
    saveFailed: '無法儲存。',
    streakLabel: '連續 {n} 天',
    weekLabel: '本週 · {m} 分',
    notePlaceholder: '這次要專注什麼？',
    exportTxt: '匯出 TXT',
    exported: '紀錄已匯出',
    exportError: '無法匯出紀錄',
    background: '背景圖片',
    backgroundShort: '背景',
    backgroundClear: '移除背景',
    backgroundReset: '恢復預設背景',
    backgroundSet: '背景圖片已套用',
    backgroundCleared: '背景已移除',
    backgroundError: '無法載入這張圖片',
    stopwatchRunning: '正數計時中'
  },
  'zh-CN': {
    appLabel: 'NanoTimer 浮动计时器',
    minimizeApp: '最小化 NanoTimer',
    closeApp: '关闭 NanoTimer',
    minimize: '最小化',
    close: '关闭',
    setupTitle: '设定专注胶囊',
    language: '语言',
    presets: '预设组合',
    presetNone: '无预设',
    presetNameTitle: '预设名称',
    presetSave: '保存',
    presetCancel: '取消',
    presetRename: '重命名预设',
    presetDelete: '删除预设',
    presetDeleted: '已删除预设',
    presetRenamed: '已重命名预设',
    savePreset: '保存当前设置…',
    presetSaved: '预设组合已保存',
    hours: '小时',
    minutes: '分钟',
    seconds: '秒',
    start: '开始',
    startTitle: '开始倒计时',
    timerControls: '计时器控制',
    hoverHint: '悬停或聚焦以显示计时器控制',
    focusCapsule: '专注胶囊',
    focusing: '专注中',
    paused: '已暂停',
    resumed: '计时器已继续',
    timesUp: '时间到！',
    completeBody: '你的专注胶囊已完成。',
    ready: '准备好时开始',
    pause: '暂停',
    resume: '继续',
    reset: '重置',
    resetConfirm: '再按一次 Esc 或 R 放弃当前计时。',
    again: '再来一次',
    newTimer: '新计时器',
    pin: '置顶',
    pinned: '已置顶',
    pinTitle: '保持在其他窗口之上',
    unpinTitle: '取消置顶',
    pinUnavailable: '无法使用窗口置顶',
    pinnedStatus: '窗口已置顶',
    unpinnedStatus: '窗口已取消置顶',
    couldNotPin: '无法更改窗口置顶状态',
    errorHoursRange: '小时必须是 0 到 99 的整数。',
    errorMinutesRange: '分钟必须是 0 到 59 的整数。',
    errorSecondsRange: '秒数必须是 0 到 59 的整数。',
    errorMinimum: '请至少设置一秒。',
    dragToMove: '拖动以移动',
    audio: '选择闹钟音效',
    audioSet: '自定义闹钟音效已就绪',
    audioError: '无法加载这个音频文件',
    mute: '静音闹钟',
    unmute: '取消静音',
    mutedStatus: '闹钟已静音',
    unmutedStatus: '闹钟已取消静音',
    mode: '模式',
    modeCapsule: '胶囊',
    modeMini: '迷你',
    modePanel: '面板',
    modeFull: '全屏',
    exitFullscreen: '退出全屏',
    displayMode: '显示模式',
    runMode: '计时模式',
    modeCountdown: '倒计时',
    modeStopwatch: '正计时',
    modePomodoro: '番茄钟',
    helpTitle: '使用说明',
    help1: '选择倒数、秒表或番茄钟，设置时间后按「开始」。',
    help2: '拖动胶囊药丸或迷你圆环即可移动窗口。',
    help3: '鼠标移过胶囊会展开面板：暂停、重置、静音、置顶。',
    help4: '倒数结束时，点一下时间可以再加 5 分钟。',
    help5: '全局快捷键：Ctrl+Alt+Space 暂停／继续，Ctrl+Alt+R 重置。',
    help6: '背景图、语言与预设组合都在设置页。',
    updateCheck: '检查更新',
    updateChecking: '正在检查更新…',
    updateLatest: '已是最新版本（v{v}）。',
    updateFound: '有新版本 v{v}。',
    updateDownloading: '下载更新… {p}%',
    updateDiffDownloading: '下载更新差异… {p}%',
    updateReady: '更新已下载，再按一次更新按钮即可安装。',
    updateFailed: '无法检查更新。',
    updateInstalling: '正在启动安装程序…',
    roundLabel: '第 {n}/{total} 轮',
    breakShortRunning: '短休息',
    breakLongRunning: '长休息',
    extendHint: '点一下时间加 5 分钟',
    statsToday: '今日 {n} 轮 · {m} 分',
    statsStreak: '连续 {n} 天',
    extended: '已加 5 分钟',
    noteLabel: '专注笔记',
    noteClear: '清除笔记',
    soundPreviewShort: '试听',
    editDuration: '调整时间',
    minutesShort: '分',
    secondsShort: '秒',
    addTime: '加时',
    endsAt: '结束',
    elapsed: '已专注',
    undo: '撤销',
    resetDone: '已重置',
    settings: '设置与记录',
    statsTitle: '专注统计',
    historyTitle: '历史记录',
    historyEmpty: '还没有记录。',
    historyClear: '清除记录',
    settingsTitle: '偏好设置',
    edgeSnap: '吸附屏幕边缘',
    backgroundDim: '背景暗度',
    exportSettings: '导出设置…',
    importSettings: '导入设置…',
    settingsExported: '设置已导出。',
    settingsImported: '设置已导入。',
    saveFailed: '无法保存。',
    streakLabel: '连续 {n} 天',
    weekLabel: '本周 · {m} 分',
    notePlaceholder: '这次要专注什么？',
    exportTxt: '导出 TXT',
    exported: '记录已导出',
    exportError: '无法导出记录',
    background: '背景图片',
    backgroundShort: '背景',
    backgroundClear: '移除背景',
    backgroundReset: '恢复默认背景',
    backgroundSet: '背景图片已应用',
    backgroundCleared: '背景已移除',
    backgroundError: '无法加载这张图片',
    stopwatchRunning: '正计时中'
  },
  ja: {
    appLabel: 'NanoTimer フローティングタイマー',
    minimizeApp: 'NanoTimer を最小化',
    closeApp: 'NanoTimer を閉じる',
    minimize: '最小化',
    close: '閉じる',
    setupTitle: '集中カプセルを設定',
    language: '言語',
    presets: 'プリセット',
    presetNone: 'プリセットなし',
    presetNameTitle: 'プリセット名',
    presetSave: '保存',
    presetCancel: 'キャンセル',
    presetRename: 'プリセット名を変更',
    presetDelete: 'プリセットを削除',
    presetDeleted: 'プリセットを削除しました',
    presetRenamed: 'プリセット名を変更しました',
    savePreset: '現在の設定を保存…',
    presetSaved: 'プリセットを保存しました',
    hours: '時間',
    minutes: '分',
    seconds: '秒',
    start: '開始',
    startTitle: 'カウントダウンを開始',
    timerControls: 'タイマー操作',
    hoverHint: 'ホバーまたはフォーカスでタイマー操作を表示',
    focusCapsule: '集中カプセル',
    focusing: '集中中',
    paused: '一時停止中',
    resumed: 'タイマーを再開しました',
    timesUp: '時間です！',
    completeBody: '集中カプセルが完了しました。',
    ready: '準備ができたら開始',
    pause: '一時停止',
    resume: '再開',
    reset: 'リセット',
    resetConfirm: 'もう一度 Esc または R を押すと現在のタイマーを破棄します。',
    again: 'もう一度',
    newTimer: '新規作成',
    pin: 'ピン留め',
    pinned: 'ピン留め済み',
    pinTitle: '他のウィンドウの前面に固定',
    unpinTitle: 'ピン留めを解除',
    pinUnavailable: 'ウィンドウのピン留めを利用できません',
    pinnedStatus: 'ウィンドウをピン留めしました',
    unpinnedStatus: 'ウィンドウのピン留めを解除しました',
    couldNotPin: 'ウィンドウのピン留め状態を変更できませんでした',
    errorHoursRange: '時間は 0〜99 の整数で入力してください。',
    errorMinutesRange: '分は 0〜59 の整数で入力してください。',
    errorSecondsRange: '秒は 0〜59 の整数で入力してください。',
    errorMinimum: '1 秒以上設定してください。',
    dragToMove: 'ドラッグして移動',
    audio: 'アラーム音を選択',
    audioSet: 'カスタムアラーム音の準備ができました',
    audioError: 'この音声ファイルを読み込めません',
    mute: 'ミュート',
    unmute: 'ミュートを解除',
    mutedStatus: 'アラームをミュートしました',
    unmutedStatus: 'ミュートを解除しました',
    mode: 'モード',
    modeCapsule: 'カプセル',
    modeMini: 'ミニ',
    modePanel: 'パネル',
    modeFull: '全画面',
    exitFullscreen: '全画面を終了',
    displayMode: '表示モード',
    runMode: 'タイマーモード',
    modeCountdown: 'カウントダウン',
    modeStopwatch: 'ストップウォッチ',
    modePomodoro: 'ポモドーロ',
    helpTitle: '使い方',
    help1: 'カウントダウン・ストップウォッチ・ポモドーロを選び、時間を決めて「開始」を押します。',
    help2: 'カプセルやミニのリングをドラッグするとウィンドウが動きます。',
    help3: 'カプセルにマウスを乗せるとパネルが開きます：一時停止・リセット・ミュート・固定。',
    help4: 'カウントダウン終了後、時間をクリックすると 5 分追加できます。',
    help5: 'グローバルキー：Ctrl+Alt+Space で一時停止、Ctrl+Alt+R でリセット。',
    help6: '背景・言語・プリセットは設定カードにあります。',
    updateCheck: '更新を確認',
    updateChecking: '更新を確認しています…',
    updateLatest: '最新バージョンです（v{v}）。',
    updateFound: '新しいバージョン v{v} があります。',
    updateDownloading: 'ダウンロード中… {p}%',
    updateDiffDownloading: '差分をダウンロード中… {p}%',
    updateReady: 'ダウンロード完了。もう一度更新ボタンを押すとインストールします。',
    updateFailed: '更新を確認できませんでした。',
    updateInstalling: 'インストーラーを起動しています…',
    roundLabel: '{n}/{total} ラウンド',
    breakShortRunning: '短い休憩',
    breakLongRunning: '長い休憩',
    extendHint: '時間をクリックで +5 分',
    statsToday: '今日 {n} 回 · {m} 分',
    statsStreak: '{n} 日連続',
    extended: '5 分追加しました',
    noteLabel: 'フォーカスメモ',
    noteClear: 'メモを消去',
    soundPreviewShort: '試聴',
    editDuration: '時間を調整',
    minutesShort: '分',
    secondsShort: '秒',
    addTime: '時間を追加',
    endsAt: '終了',
    elapsed: '経過',
    undo: '元に戻す',
    resetDone: 'リセットしました',
    settings: '設定と履歴',
    statsTitle: '集中の記録',
    historyTitle: '履歴',
    historyEmpty: 'まだ記録がありません。',
    historyClear: '履歴を消す',
    settingsTitle: '環境設定',
    edgeSnap: '画面の端に吸着',
    backgroundDim: '背景の暗さ',
    exportSettings: '設定を書き出す…',
    importSettings: '設定を読み込む…',
    settingsExported: '設定を書き出しました。',
    settingsImported: '設定を読み込みました。',
    saveFailed: '保存できませんでした。',
    streakLabel: '{n} 日連続',
    weekLabel: '今週 · {m} 分',
    notePlaceholder: '何に集中しますか？',
    exportTxt: 'TXTを書き出す',
    exported: 'ログを書き出しました',
    exportError: 'ログを書き出せませんでした',
    background: '背景画像',
    backgroundShort: '背景',
    backgroundClear: '背景を削除',
    backgroundReset: 'デフォルトの背景に戻す',
    backgroundSet: '背景画像を設定しました',
    backgroundCleared: '背景を削除しました',
    backgroundError: '画像を読み込めませんでした',
    stopwatchRunning: 'カウントアップ中'
  }
};

let mode = 'setup';
let totalMs = 0;
let remainingMs = 0;
let endAt = 0;
let tickId = null;
let pinned = false;
let pinBusy = false;
let pinAvailable = true;
let currentLanguage = DEFAULT_LANGUAGE;
let errorDescriptor = null;
let formNoticeKey = null;
let resetArmed = false;
let resetNoticeTimer = null;
let presets = [];
let displayMode = 'setup';
// Which mode the current native window footprint belongs to. Null until the
// first successful resize, so a boot after a reload always re-syncs the window
// even when the renderer already believes it is in "setup".
let sizedMode = null;
// Set when the capsule was opened by clicking the mini circle; leaving the
// capsule then collapses back to mini ("peek" behaviour).
let peekFromMini = false;
let customAudioPath = '';
let backgroundToken = '';
let customAudioUrl = '';
let audioContext = null;
let alarmId = null;
let alarmAudio = null;
let alarmAudioSource = '';
let alarmMuted = false;
let lastTickSecond = null;
let runMode = 'countdown';
let pomodoroRound = 1;
let pomodoroPhase = 'focus';
let pomodoroFocusMs = DEFAULT_POMODORO_FOCUS_MS;
let pomodoroTimer = null;
let stats = {};
let elapsedBase = 0;
let startedAt = 0;
let activeNote = '';
let sessionRecorded = false;
let logs = [];

function readNoteDraft() {
  try {
    return localStorage.getItem(NOTE_KEY) || '';
  } catch {
    return '';
  }
}

function syncNoteControls() {
  const value = sessionNote ? sessionNote.value : '';

  if (noteClearButton) {
    noteClearButton.disabled = value.length === 0;
  }
}

let noteSaveTimer = null;

function saveNoteDraft() {
  if (!sessionNote) {
    return;
  }

  syncNoteControls();

  if (noteSaveTimer !== null) {
    window.clearTimeout(noteSaveTimer);
  }

  noteSaveTimer = window.setTimeout(() => {
    noteSaveTimer = null;
    try {
      localStorage.setItem(NOTE_KEY, sessionNote.value);
    } catch {
      /* storage full or disabled — the note still works for this session */
    }
  }, 300);
}

function clearNoteDraft() {
  if (!sessionNote) {
    return;
  }

  sessionNote.value = '';
  sessionNote.focus({ preventScroll: true });
  saveNoteDraft();
}

function applyNoteDraft() {
  if (!sessionNote) {
    return;
  }

  sessionNote.value = readNoteDraft();
  syncNoteControls();
}

function renderTimerNote() {
  if (!timerNote) {
    return;
  }

  const note = (activeNote || '').trim();

  if (!note || mode === 'setup') {
    timerNote.hidden = true;
    timerNote.textContent = '';
    return;
  }

  timerNote.textContent = note;
  timerNote.hidden = false;
}

function t(key, vars) {
  const table = UI_TEXT[currentLanguage] || UI_TEXT[DEFAULT_LANGUAGE];
  let text = table[key] ?? UI_TEXT[DEFAULT_LANGUAGE][key] ?? key;

  if (vars && typeof text === 'string') {
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }

  return text;
}

function detectLanguage() {
  const stored = readStoredLanguage();

  if (stored) {
    return stored;
  }

  const languages =
    typeof navigator !== 'undefined' && Array.isArray(navigator.languages)
      ? navigator.languages
      : typeof navigator !== 'undefined' && navigator.language
        ? [navigator.language]
        : [];

  for (const language of languages) {
    const tag = String(language || '').toLowerCase();

    if (
      tag === 'zh-tw' ||
      tag === 'zh-hk' ||
      tag === 'zh-mo' ||
      tag === 'zh-hant' ||
      tag.startsWith('zh-hant-')
    ) {
      return 'zh-TW';
    }

    if (
      tag === 'zh-cn' ||
      tag === 'zh-sg' ||
      tag === 'zh-hans' ||
      tag.startsWith('zh-hans-')
    ) {
      return 'zh-CN';
    }

    if (tag === 'zh' || tag.startsWith('zh-')) {
      return 'zh-CN';
    }

    if (tag === 'ja' || tag.startsWith('ja-')) {
      return 'ja';
    }

    if (tag === 'en' || tag.startsWith('en-')) {
      return 'en';
    }
  }

  return DEFAULT_LANGUAGE;
}

function readStoredLanguage() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return LANGUAGE_IDS.has(stored) ? stored : null;
  } catch (error) {
    return null;
  }
}

function persistLanguage(language) {
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch (error) {
    // Storage is optional; the app still works without persistence.
  }
}

// A preset is { name, seconds }. Older builds stored bare seconds, so both
// shapes are accepted and normalised on read; nothing is preinstalled.
function presetLabel(preset) {
  const name = typeof preset?.name === 'string' ? preset.name.trim() : '';
  const duration = formatDuration(Number(preset?.seconds || 0) * 1000);

  // Always show the duration; the name is the part the user recognises, the
  // time is the part they actually need at a glance.
  return name ? `${duration} ${name}` : duration;
}

function normalizePreset(entry) {
  if (Number.isInteger(entry)) {
    if (entry <= 0 || entry > MAX_PRESET_SECONDS) {
      return null;
    }

    return { name: '', seconds: entry };
  }

  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const seconds = Number(entry.seconds);

  if (!Number.isInteger(seconds) || seconds <= 0 || seconds > MAX_PRESET_SECONDS) {
    return null;
  }

  const name = typeof entry.name === 'string' ? entry.name.slice(0, 24).trim() : '';

  return { name, seconds };
}

function loadPresets() {
  try {
    const raw = window.localStorage.getItem(PRESETS_KEY);

    if (raw === null) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    const seen = new Set();

    return parsed.reduce((accumulator, entry) => {
      const preset = normalizePreset(entry);

      if (!preset) {
        return accumulator;
      }

      const key = `${preset.seconds}|${presetLabel(preset)}`;

      if (seen.has(key)) {
        return accumulator;
      }

      seen.add(key);
      accumulator.push(preset);
      return accumulator;
    }, []);
  } catch (error) {
    // Corrupted storage simply means "no presets".
  }

  return [];
}

function persistPresets() {
  try {
    window.localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  } catch (error) {
    // Storage is optional.
  }
}

function loadLogs() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOGS_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter(
          (entry) =>
            entry &&
            typeof entry.date === 'string' &&
            typeof entry.note === 'string' &&
            Number.isFinite(entry.seconds)
        ).slice(0, 100)
      : [];
  } catch (error) {
    return [];
  }
}

function persistLogs() {
  try {
    window.localStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(0, 100)));
  } catch (error) {
    // Storage is optional.
  }
}

/**
 * Local wall-clock stamp (YYYY-MM-DDTHH:MM:SS). Log rows are read by humans, so
 * they must not be shifted into UTC — a session that ended at 20:13 should not
 * be exported as 12:13.
 */
function localStamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

function recordSession(seconds, countTowardStats = true) {
  if (sessionRecorded || !Number.isFinite(seconds) || seconds < 1) {
    return;
  }

  logs.unshift({
    date: localStamp(),
    mode: runMode,
    seconds: Math.round(seconds),
    note: activeNote
  });
  logs = logs.slice(0, 100);
  sessionRecorded = true;

  if (countTowardStats) {
    recordStats(seconds);
  }

  persistLogs();
}

/**
 * Log rows written before the local-time fix are ISO/UTC strings ending in "Z".
 * Convert them on the way out so one export never mixes UTC and local rows.
 */
function displayStamp(value) {
  if (typeof value === 'string' && value.endsWith('Z')) {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return localStamp(parsed);
    }
  }

  return value;
}

function escapeTsv(value) {
  return String(value ?? '')
    .replace(/\t/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildExportText() {
  const rows = logs.map((entry) => {
    const modeLabel = entry.mode === 'stopwatch' ? t('modeStopwatch') : t('modeCountdown');
    return [
      displayStamp(entry.date),
      modeLabel,
      formatDuration(entry.seconds * 1000),
      entry.note || ''
    ].map(escapeTsv).join('\t');
  });

  return [
    'NanoTimer log',
    `Exported: ${localStamp()}`,
    `Entries: ${rows.length}`,
    '',
    'Date\tMode\tDuration\tNote',
    ...(rows.length > 0 ? rows : ['(no saved sessions yet)'])
  ].join('\r\n');
}

async function exportLog() {
  if (typeof bridge?.exportLog !== 'function') {
    setFormMessage({ key: 'exportError' });
    return;
  }

  try {
    const result = await bridge.exportLog(
      buildExportText(),
      `NanoTimer-log-${localStamp().slice(0, 10)}.txt`
    );

    if (result && result.canceled === false) {
      setFormNotice('exported');
    } else if (result && result.error) {
      setFormMessage({ key: 'exportError' });
    }
  } catch (error) {
    setFormMessage({ key: 'exportError' });
  }
}

function loadLastConfig() {
  try {
    const raw = window.localStorage.getItem(LAST_CONFIG_KEY);

    if (raw === null) {
      return null;
    }

    const parsed = JSON.parse(raw);
    const config = {
      hours: Number(parsed?.hours),
      minutes: Number(parsed?.minutes),
      seconds: Number(parsed?.seconds)
    };
    const { hours, minutes, seconds } = config;

    if (
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      !Number.isInteger(seconds) ||
      hours < 0 ||
      hours > 99 ||
      minutes < 0 ||
      minutes > 59 ||
      seconds < 0 ||
      seconds > 59 ||
      (hours === 0 && minutes === 0 && seconds === 0)
    ) {
      return null;
    }

    return config;
  } catch (error) {
    return null;
  }
}

function persistLastConfig(values) {
  try {
    const [hours, minutes, seconds] = values;
    window.localStorage.setItem(
      LAST_CONFIG_KEY,
      JSON.stringify({ hours, minutes, seconds })
    );
  } catch (error) {
    // Storage is optional.
  }
}

function applyLastConfig() {
  const config = loadLastConfig();

  if (!config) {
    return;
  }

  hoursInput.value = String(config.hours);
  minutesInput.value = String(config.minutes);
  secondsInput.value = String(config.seconds);
}

function setRunMode(nextMode) {
  runMode =
    nextMode === 'stopwatch'
      ? 'stopwatch'
      : nextMode === 'pomodoro'
        ? 'pomodoro'
        : 'countdown';
  widget.classList.toggle('is-stopwatch', runMode === 'stopwatch');
  widget.classList.toggle('is-pomodoro', runMode === 'pomodoro');
  pomodoroRound = 1;
  pomodoroPhase = 'focus';
  stopPomodoroTimer();

  if (runModeSelect) {
    runModeSelect.value = runMode;
  }

  for (const { input } of FIELDS) {
    input.disabled = runMode === 'stopwatch';
  }

  try {
    window.localStorage.setItem(STOPWATCH_KEY, runMode);
  } catch (error) {
    // Storage is optional.
  }

  // Stopwatch hides the duration fields, so the card has to shrink with it.
  syncSetupHeight();
}

function buildLanguageOptions() {
  for (const select of languageSelects) {
    const fragment = document.createDocumentFragment();

    for (const { id, label } of LANGUAGES) {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = label;
      option.lang = id;
      fragment.append(option);
    }

    select.replaceChildren(fragment);
    select.value = currentLanguage;
  }
}

function buildPresetOptions() {
  if (!presetSelect) {
    return;
  }

  const previous = presetSelect.value;
  const fragment = document.createDocumentFragment();
  const placeholder = document.createElement('option');

  placeholder.value = '';
  placeholder.textContent = presets.length > 0 ? t('presets') : t('presetNone');
  fragment.append(placeholder);

  presets.forEach((preset, index) => {
    const option = document.createElement('option');

    option.value = `preset:${index}`;
    option.textContent = presetLabel(preset);
    fragment.append(option);
  });

  const saveOption = document.createElement('option');

  saveOption.value = 'action:save';
  saveOption.textContent = t('savePreset');
  fragment.append(saveOption);

  presetSelect.replaceChildren(fragment);

  if (previous && presetSelect.querySelector(`option[value="${previous}"]`)) {
    presetSelect.value = previous;
  } else {
    presetSelect.value = '';
  }

  syncPresetButtons();
}

function currentPresetIndex() {
  const value = presetSelect?.value || '';

  if (!value.startsWith('preset:')) {
    return -1;
  }

  const index = Number(value.slice('preset:'.length));

  return Number.isInteger(index) && presets[index] ? index : -1;
}

function syncPresetButtons() {
  const index = currentPresetIndex();

  if (presetRenameButton) {
    presetRenameButton.hidden = index < 0;
  }

  if (presetDeleteButton) {
    presetDeleteButton.hidden = index < 0;
  }
}

function buildModeOptions() {
  if (!modeSelect) {
    return;
  }

  const previous = modeSelect.value;
  const labels = {
    capsule: 'modeCapsule',
    mini: 'modeMini',
    fullscreen: 'modeFull'
  };
  const fragment = document.createDocumentFragment();

  for (const id of DISPLAY_MODE_ORDER) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = t(labels[id]);
    fragment.append(option);
  }

  modeSelect.replaceChildren(fragment);
  modeSelect.value = DISPLAY_MODE_ORDER.includes(previous)
    ? previous
    : DISPLAY_MODE_ORDER.includes(displayMode)
      ? displayMode
      : 'capsule';
}

function syncLanguageSelectors() {
  for (const select of languageSelects) {
    select.value = currentLanguage;
  }
}

function setLanguage(nextLanguage) {
  if (!LANGUAGE_IDS.has(nextLanguage)) {
    syncLanguageSelectors();
    return;
  }

  if (nextLanguage === currentLanguage) {
    return;
  }

  currentLanguage = nextLanguage;
  persistLanguage(nextLanguage);
  applyLanguage();
}

function applyLanguage() {
  const table = UI_TEXT[currentLanguage] || UI_TEXT[DEFAULT_LANGUAGE];

  if (typeof bridge?.setLanguage === 'function') {
    bridge.setLanguage(currentLanguage);
  }

  for (const element of document.querySelectorAll('[data-i18n]')) {
    const value = table[element.dataset.i18n];

    if (typeof value === 'string') {
      element.textContent = value;
    }
  }

  for (const element of document.querySelectorAll('[data-i18n-aria-label]')) {
    const value = table[element.dataset.i18nAriaLabel];

    if (typeof value === 'string') {
      element.setAttribute('aria-label', value);
    }
  }

  for (const element of document.querySelectorAll('[data-i18n-title]')) {
    const value = table[element.dataset.i18nTitle];

    if (typeof value === 'string') {
      element.title = value;
    }
  }

  for (const element of document.querySelectorAll('[data-i18n-placeholder]')) {
    const value = table[element.dataset.i18nPlaceholder];

    if (typeof value === 'string') {
      element.setAttribute('placeholder', value);
    }
  }

  document.documentElement.lang = currentLanguage;
  buildPresetOptions();
  buildModeOptions();
  syncLanguageSelectors();
  renderMuteState();

  if (formNoticeKey) {
    formMessage.textContent = t(formNoticeKey);
    formMessage.classList.remove('is-error');
  } else {
    setFormMessage(errorDescriptor);
  }

  renderRemaining(remainingMs);
  renderModeLabels();
  renderPinState();
  timerAnnouncer.textContent = '';
}

/**
 * Every display mode has its own layout *and* its own native window size, and
 * the two cannot change on the same frame: the CSS layout snaps instantly while
 * the window is eased over ~220 ms by the main process. Resizing a transparent
 * window while it still paints the previous frame is what made the old build
 * show stretched or clipped content, so the scene is faded out first, the
 * layout and the window are changed while nothing is visible, and the new scene
 * fades in once the window has settled.
 */
const MODE_FADE_MS = 120;
/* The fullscreen exit waits for the OS to hand the window back (up to 700 ms on
   Windows) and only then animates the bounds, so this net has to be generous.
   A premature reveal is what let the old layout show up stretched. */
const MODE_SETTLE_TIMEOUT_MS = 3000;
let modeTransitionToken = 0;

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function nextPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function syncDisplayModeControls(nextMode) {
  if (modeSelect) {
    modeSelect.value = DISPLAY_MODE_ORDER.includes(nextMode) ? nextMode : '';
  }

  for (const button of modeButtons) {
    button.setAttribute(
      'aria-pressed',
      String(button.dataset.displayMode === nextMode)
    );
  }
}

function setupHeight() {
  return runMode === 'stopwatch' ? SETUP_HEIGHT_STOPWATCH : SETUP_HEIGHT_FULL;
}

/**
 * The setup card is shorter for stopwatch (no duration fields). Called when the
 * run mode changes while the setup view is on screen.
 */
function syncSetupHeight() {
  if (displayMode !== 'setup') {
    return;
  }

  bridge.setDisplayMode('setup', { height: setupHeight() }).catch(() => {});
}

async function applyDisplayMode(nextMode) {
  if (!DISPLAY_MODES.has(nextMode)) {
    return;
  }

  syncDisplayModeControls(nextMode);

  if (nextMode === displayMode && widget.dataset.mode === nextMode && sizedMode === nextMode) {
    return;
  }

  // Any explicit mode change cancels a pending mini "peek": otherwise a stale
  // peek (e.g. mini -> capsule -> fullscreen -> capsule) would bounce the
  // window back to mini as soon as the pointer leaves the restored capsule.
  if (nextMode !== 'capsule') {
    peekFromMini = false;
  }

  const token = ++modeTransitionToken;
  const animate =
    !prefersReducedMotion() && Boolean(widget.dataset.mode) && !document.hidden;

  if (animate) {
    widget.classList.add('is-mode-switching');
    await wait(MODE_FADE_MS);

    if (token !== modeTransitionToken) {
      return;
    }

    // Submit at least one fully transparent frame before the window changes
    // size. Without it the compositor can reuse the last (partially faded)
    // frame and stretch it across the new bounds.
    await nextPaint();

    if (token !== modeTransitionToken) {
      return;
    }
  }

  displayMode = nextMode;
  widget.dataset.mode = nextMode;

  if (typeof bridge?.setDisplayMode === 'function') {
    try {
      await Promise.race([
        bridge.setDisplayMode(
          nextMode,
          nextMode === 'setup' ? { height: setupHeight() } : undefined
        ),
        wait(MODE_SETTLE_TIMEOUT_MS)
      ]);
      // The main process keeps its own idea of the window footprint; after a
      // renderer reload it is still on the old mode, so remember which mode the
      // current window actually matches instead of trusting `displayMode`.
      sizedMode = nextMode;
    } catch (error) {
      console.error('NanoTimer: could not resize for display mode.', error);
    }
  }

  if (token !== modeTransitionToken) {
    return;
  }

  if (animate) {
    // Paint one frame at the final size before revealing it, so the fade-in
    // never starts on a half-resized window.
    await nextPaint();

    if (token !== modeTransitionToken) {
      return;
    }

    widget.classList.remove('is-mode-switching');
  }
}

function exitFullscreen() {
  if (displayMode !== 'fullscreen') {
    return;
  }

  applyDisplayMode('capsule');
  announce(t('modeCapsule'));
}

function setMode(nextMode) {
  mode = nextMode;
  widget.dataset.state = nextMode;
}

function showSetupView() {
  setupView.hidden = false;
  timerView.hidden = true;
  timerView.dataset.alert = 'normal';
  setMode('setup');
  applyDisplayMode('setup');
  renderModeLabels();
}

function showTimerView() {
  setupView.hidden = true;
  timerView.hidden = false;
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const paddedHours = String(hours).padStart(2, '0');
  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');

  return hours > 0
    ? `${paddedHours}:${paddedMinutes}:${paddedSeconds}`
    : `${paddedMinutes}:${paddedSeconds}`;
}

function renderRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const nextDisplay = formatDuration(ms);
  let alert = 'normal';

  if (mode !== 'setup' && runMode !== 'stopwatch') {
    if (totalSeconds === 0) {
      alert = 'complete';
    } else if (totalSeconds < 10) {
      alert = 'critical';
    } else if (totalSeconds < 60) {
      alert = 'warning';
    }
  }

  timerView.dataset.alert = alert;

  const progress =
    mode !== 'setup' && runMode !== 'stopwatch' && totalMs > 0
      ? Math.max(0, Math.min(1, ms / totalMs))
      : 0;
  timerView.style.setProperty(
    '--progress',
    `${(progress * 100).toFixed(2)}%`
  );

  if (timeDisplay.textContent !== nextDisplay) {
    timeDisplay.textContent = nextDisplay;

    if (typeof bridge?.updateTray === 'function') {
      const suffix =
        runMode === 'pomodoro' && mode !== 'setup'
          ? ` · ${pomodoroRoundText()}`
          : '';
      bridge.updateTray(`NanoTimer — ${nextDisplay}${suffix}`);
    }
  }
}

function stopTicking() {
  if (tickId !== null) {
    window.clearInterval(tickId);
    tickId = null;
  }
}

function openHelp() {
  if (!helpSheet) {
    return;
  }

  helpSheet.hidden = false;
  helpCloseButton?.focus();
}

function closeHelp() {
  if (!helpSheet || helpSheet.hidden) {
    return;
  }

  helpSheet.hidden = true;
  helpButton?.focus();
}

function isHelpOpen() {
  return Boolean(helpSheet) && !helpSheet.hidden;
}

let updateState = 'idle';
let downloadedUpdate = null;

function showNotice(text, tone = 'info') {
  if (!formMessage) {
    return;
  }

  formMessage.textContent = text;
  formMessage.classList.toggle('is-error', tone === 'error');
  formMessage.classList.toggle('is-ok', tone === 'ok');
}

async function runUpdateFlow() {
  if (!bridge?.checkForUpdate) {
    return;
  }

  if (updateState === 'downloaded' && downloadedUpdate) {
    showNotice(t('updateInstalling'));
    const started = await bridge.installUpdate(downloadedUpdate.path);
    updateState = started ? 'installing' : 'idle';

    if (!started) {
      showNotice(t('updateFailed'), 'error');
    }
    return;
  }

  if (updateState === 'checking' || updateState === 'downloading') {
    return;
  }

  updateState = 'checking';
  updateButton?.classList.add('is-busy');
  showNotice(t('updateChecking'));

  let result = null;

  try {
    result = await bridge.checkForUpdate();
  } catch (error) {
    result = null;
  }

  updateButton?.classList.remove('is-busy');

  if (!result || result.status !== 'ok') {
    updateState = 'idle';
    showNotice(t('updateFailed'), 'error');
    return;
  }

  if (!result.newer || !result.url) {
    updateState = 'idle';
    showNotice(t('updateLatest').replace('{v}', result.current), 'ok');
    return;
  }

  showNotice(t('updateFound').replace('{v}', result.latest));
  updateState = 'downloading';

  const download = await bridge.downloadUpdate(result.url, result.name);

  if (!download || !download.ok) {
    updateState = 'idle';
    showNotice(
      t(download?.message === 'checksum' ? 'updateChecksumFailed' : 'updateFailed'),
      'error'
    );
    return;
  }

  downloadedUpdate = download;
  updateState = 'downloaded';
  showNotice(t('updateReady'), 'ok');
}

function setFormMessage(descriptor) {
  formNoticeKey = null;

  if (!descriptor) {
    formMessage.textContent = '';
    formMessage.classList.remove('is-error');
    return;
  }

  const message =
    typeof descriptor === 'string' ? descriptor : t(descriptor.key);

  formMessage.textContent = message;
  formMessage.classList.add('is-error');
}

function announce(message) {
  timerAnnouncer.textContent = message;
}

function notifyCompletion() {
  if (typeof bridge?.notifyComplete !== 'function') {
    return;
  }

  bridge
    .notifyComplete({
      title: t('timesUp'),
      body: t('completeBody')
    })
    .catch((error) => {
      console.error('NanoTimer: completion notification failed.', error);
    });
}

function primeAudio() {
  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  try {
    audioContext ||= new AudioContextClass();

    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
  } catch (error) {
    console.warn('NanoTimer: Web Audio unavailable.', error);
  }
}

function playDefaultChime() {
  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  try {
    audioContext ||= new AudioContextClass();
    const now = audioContext.currentTime;
    const notes = [880, 1174.66, 1567.98];

    notes.forEach((frequency, index) => {
      const start = now + index * 0.16;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.16, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.36);
    });
  } catch (error) {
    console.warn('NanoTimer: default chime failed.', error);
  }
}

function playTick() {
  primeAudio();

  if (!audioContext) {
    return;
  }

  try {
    const start = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1046.5, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.075, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.085);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.09);
  } catch (error) {
    console.warn('NanoTimer: countdown tick failed.', error);
  }
}

function ensureAlarmAudio() {
  if (!customAudioUrl) {
    return null;
  }

  if (!alarmAudio) {
    alarmAudio = new Audio();
    alarmAudio.loop = true;
    alarmAudio.volume = 0.75;
  }

  if (alarmAudioSource !== customAudioUrl) {
    alarmAudio.pause();
    alarmAudio.src = customAudioUrl;
    alarmAudioSource = customAudioUrl;
    alarmAudio.currentTime = 0;
  }

  return alarmAudio;
}

async function playCompletionSound() {
  if (alarmMuted) {
    return;
  }

  primeAudio();

  if (customAudioUrl) {
    try {
      const audio = ensureAlarmAudio();
      if (audio && audio.paused) {
        audio.currentTime = 0;
        await audio.play();
      }
      return;
    } catch (error) {
      console.warn('NanoTimer: custom alarm failed; using chime.', error);
    }
  }

  playDefaultChime();
}

function stopAlarm() {
  if (alarmId !== null) {
    window.clearInterval(alarmId);
    alarmId = null;
  }

  if (alarmAudio) {
    alarmAudio.pause();
    alarmAudio.currentTime = 0;
  }
}

function renderMuteState() {
  if (!muteButton) {
    return;
  }

  // A constant, short label in every language (the capsule row only has ~63px
  // per button, and "ミュートを解除" is 77px wide). Like the pin button, the
  // mute state is carried by aria-pressed and the accent styling; the tooltip
  // says what the next click will do.
  const label = t('mute');
  muteButton.textContent = label;
  muteButton.title = alarmMuted ? t('unmute') : t('mute');
  muteButton.setAttribute('aria-label', label);
  muteButton.setAttribute('aria-pressed', String(alarmMuted));
}

function setAlarmMuted(nextMuted, announceChange = true) {
  alarmMuted = Boolean(nextMuted);

  try {
    window.localStorage.setItem(MUTE_KEY, String(alarmMuted));
  } catch (error) {
    // Storage is optional.
  }

  if (alarmMuted) {
    stopAlarm();
  }

  renderMuteState();

  if (alarmMuted) {
    if (announceChange) {
      announce(t('mutedStatus'));
    }
    return;
  }

  if (announceChange) {
    announce(t('unmutedStatus'));
  }

  if (mode === 'complete') {
    startAlarmLoop();
  }
}

function toggleMute() {
  setAlarmMuted(!alarmMuted);
}

function startAlarmLoop() {
  stopAlarm();

  if (alarmMuted) {
    renderMuteState();
    return;
  }

  playCompletionSound().catch((error) => {
    console.warn('NanoTimer: completion sound failed.', error);
  });
  alarmId = window.setInterval(() => {
    playCompletionSound().catch((error) => {
      console.warn('NanoTimer: repeating alarm failed.', error);
    });
  }, 1000);
}

async function loadAudioPreference() {
  const savedToken = localStorage.getItem(AUDIO_KEY);

  if (!savedToken || typeof bridge?.loadAudio !== 'function') {
    return;
  }

  try {
    const loaded = await bridge.loadAudio(savedToken);

    if (loaded?.dataUrl && loaded.token) {
      customAudioPath = loaded.token;
      customAudioUrl = loaded.dataUrl;
      localStorage.setItem(AUDIO_KEY, loaded.token);
      alarmAudio = null;
      syncAudioReset();
    } else {
      localStorage.removeItem(AUDIO_KEY);
      customAudioPath = '';
      customAudioUrl = '';
      alarmAudio = null;
    }
  } catch (error) {
    console.warn('NanoTimer: custom alarm could not be restored.', error);
    localStorage.removeItem(AUDIO_KEY);
    customAudioPath = '';
    customAudioUrl = '';
    alarmAudio = null;
  }
}

/**
 * Custom background image. The token lives in localStorage; the pixels come
 * back from the main process as a data URL, so nothing outside the app's own
 * userData folder can be read.
 */
function applyBackground(dataUrl) {
  if (!backdrop || typeof dataUrl !== 'string' || dataUrl.length === 0) {
    return;
  }

  // One custom property feeds every surface (card, capsule pill, mini circle,
  // fullscreen) so a single image works in all display modes.
  widget.style.setProperty('--bg-image', `url("${dataUrl}")`);
  widget.classList.add('has-background');

  if (backgroundClearButton) {
    backgroundClearButton.hidden = false;
  }
}

function clearBackground() {
  backgroundToken = '';

  widget.style.removeProperty('--bg-image');
  widget.classList.remove('has-background');

  if (backgroundClearButton) {
    backgroundClearButton.hidden = true;
  }

  try {
    localStorage.removeItem(BACKGROUND_KEY);
  } catch (error) {
    // Storage is optional.
  }
}

async function loadBackgroundPreference() {
  let savedToken = '';

  try {
    savedToken = localStorage.getItem(BACKGROUND_KEY) || '';
  } catch (error) {
    return;
  }

  if (!savedToken || typeof bridge?.loadBackground !== 'function') {
    return;
  }

  try {
    const loaded = await bridge.loadBackground(savedToken);

    if (loaded?.dataUrl && loaded.token) {
      backgroundToken = loaded.token;
      applyBackground(loaded.dataUrl);
    } else {
      clearBackground();
    }
  } catch (error) {
    console.warn('NanoTimer: background could not be restored.', error);
    clearBackground();
  }
}

async function pickBackground() {
  if (typeof bridge?.pickBackground !== 'function') {
    return;
  }

  if (backgroundButton) {
    backgroundButton.disabled = true;
  }

  try {
    const picked = await bridge.pickBackground();

    if (picked?.dataUrl && picked.token) {
      backgroundToken = picked.token;
      applyBackground(picked.dataUrl);

      try {
        localStorage.setItem(BACKGROUND_KEY, picked.token);
      } catch (error) {
        // Storage is optional.
      }

      if (mode === 'setup') {
        setFormNotice('backgroundSet');
      } else {
        announce(t('backgroundSet'));
      }
    }
  } catch (error) {
    console.error('NanoTimer: choosing a background failed.', error);

    if (mode === 'setup') {
      setFormMessage({ key: 'backgroundError' });
    } else {
      announce(t('backgroundError'));
    }
  } finally {
    if (backgroundButton) {
      backgroundButton.disabled = false;
    }
  }
}

async function pickAudio() {
  if (typeof bridge?.pickAudio !== 'function') {
    return;
  }

  audioButton.disabled = true;

  try {
    const picked = await bridge.pickAudio();

    if (picked?.dataUrl && picked.token) {
      customAudioPath = picked.token;
      customAudioUrl = picked.dataUrl;
      alarmAudio = null;
      localStorage.setItem(AUDIO_KEY, picked.token);

      syncAudioReset();

      if (mode === 'setup') {
        setFormNotice('audioSet');
      } else {
        announce(t('audioSet'));
      }
    }
  } catch (error) {
    console.error('NanoTimer: choosing an alarm failed.', error);

    if (mode === 'setup') {
      setFormMessage({ key: 'audioError' });
    } else {
      announce(t('audioError'));
    }
  } finally {
    audioButton.disabled = false;
  }
}

function renderPinState() {
  pinButton.textContent = pinned ? t('pinned') : t('pin');
  pinButton.setAttribute('aria-pressed', String(pinned));
  pinButton.title = pinAvailable
    ? pinned
      ? t('unpinTitle')
      : t('pinTitle')
    : t('pinUnavailable');
  widget.dataset.pinned = String(pinned);
}

async function refreshPinState() {
  if (typeof bridge?.getAlwaysOnTop !== 'function') {
    pinAvailable = false;
    pinButton.disabled = true;
    renderPinState();
    return;
  }

  try {
    pinButton.disabled = true;
    pinned = Boolean(await bridge.getAlwaysOnTop());
    pinAvailable = true;
    pinButton.disabled = false;
    renderPinState();
  } catch (error) {
    pinAvailable = false;
    pinButton.disabled = true;
    renderPinState();
    console.error('NanoTimer: could not read window pin state.', error);
  }
}

async function togglePin() {
  if (
    pinBusy ||
    !pinAvailable ||
    typeof bridge?.setAlwaysOnTop !== 'function'
  ) {
    return;
  }

  pinBusy = true;
  pinButton.disabled = true;

  try {
    const nextPinned = !pinned;
    const applied = await bridge.setAlwaysOnTop(nextPinned);
    pinned = Boolean(applied);
    renderPinState();

    if (pinned !== nextPinned) {
      announce(t('couldNotPin'));
      return;
    }

    announce(pinned ? t('pinnedStatus') : t('unpinnedStatus'));
  } catch (error) {
    console.error('NanoTimer: could not change window pin state.', error);
    announce(t('couldNotPin'));
  } finally {
    pinBusy = false;
    pinButton.disabled = !pinAvailable;
  }
}

function readField({ input, max, errorKey }) {
  const raw = input.value.trim();

  if (raw === '') {
    return { value: 0 };
  }

  const value = Number(raw);

  if (!Number.isInteger(value) || value < 0 || value > max) {
    return { errorKey, input };
  }

  return { value };
}

function readDuration() {
  const values = [];

  for (const field of FIELDS) {
    const result = readField(field);

    if (result.errorKey) {
      return result;
    }

    values.push(result.value);
  }

  const [hours, minutes, seconds] = values;
  const durationMs = ((hours * 60 + minutes) * 60 + seconds) * 1000;

  if (durationMs < 1000) {
    return { errorKey: 'errorMinimum', input: hoursInput };
  }

  return { durationMs, values };
}

function setFormNotice(key) {
  errorDescriptor = null;
  formNoticeKey = key;
  formMessage.textContent = t(key);
  formMessage.classList.remove('is-error');
}

function applyPreset(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const values = [hours, minutes, remainingSeconds];

  FIELDS.forEach((field, index) => {
    field.input.value = String(values[index]);
  });

  errorDescriptor = null;
  setFormMessage(null);
  persistLastConfig(values);
}

let presetSheetMode = 'create';
let presetSheetIndex = -1;
let presetSheetSeconds = 0;

function openPresetSheet(mode, index = -1) {
  if (!presetSheet || !presetNameInput) {
    return;
  }

  presetSheetMode = mode;
  presetSheetIndex = index;

  let suggested = '';

  if (mode === 'rename' && presets[index]) {
    suggested = presetLabel(presets[index]);
  } else {
    const result = readDuration();

    if (result.errorKey) {
      errorDescriptor = { key: result.errorKey };
      setFormMessage(errorDescriptor);
      result.input.focus({ preventScroll: true });
      result.input.select();
      return;
    }

    presetSheetSeconds = Math.round(result.durationMs / 1000);
    suggested = formatDuration(presetSheetSeconds * 1000);
  }

  presetNameInput.value = suggested;
  presetSheet.hidden = false;
  presetNameInput.focus({ preventScroll: true });
  presetNameInput.select();
}

function closePresetSheet() {
  if (!presetSheet) {
    return;
  }

  presetSheet.hidden = true;
  presetSheetMode = 'create';
  presetSheetIndex = -1;
  setFormMessage(null);
}

function cleanPresetName(name, seconds) {
  const trimmed = (name || '').trim().slice(0, 24);

  // Saving with the duration typed in as the name (or no name at all) should
  // leave the label as the bare duration instead of "30:00 30:00".
  if (!trimmed || trimmed === formatDuration(seconds * 1000)) {
    return '';
  }

  return trimmed;
}

function submitPresetSheet(event) {
  event.preventDefault();

  const rawName = (presetNameInput?.value || '').trim().slice(0, 24);

  if (presetSheetMode === 'rename') {
    const name = rawName;
    const preset = presets[presetSheetIndex];

    if (preset && name) {
      preset.name = name;
      persistPresets();
      buildPresetOptions();
      presetSelect.value = `preset:${presetSheetIndex}`;
      syncPresetButtons();
      setFormNotice('presetRenamed');
    }

    closePresetSheet();
    return;
  }

  if (presetSheetSeconds <= 0) {
    closePresetSheet();
    return;
  }

  presets.push({
    name: cleanPresetName(rawName, presetSheetSeconds),
    seconds: presetSheetSeconds
  });
  persistPresets();
  buildPresetOptions();
  presetSelect.value = `preset:${presets.length - 1}`;
  syncPresetButtons();
  setFormNotice('presetSaved');
  closePresetSheet();
}

function saveCurrentPreset() {
  openPresetSheet('create');
}

function renameSelectedPreset() {
  const index = currentPresetIndex();

  if (index >= 0) {
    openPresetSheet('rename', index);
  }
}

function deleteSelectedPreset() {
  const index = currentPresetIndex();

  if (index < 0) {
    return;
  }

  presets.splice(index, 1);
  persistPresets();
  buildPresetOptions();
  presetSelect.value = '';
  syncPresetButtons();
  setFormNotice('presetDeleted');
}

function handlePresetChange() {
  const value = presetSelect.value;

  if (!value) {
    syncPresetButtons();
    return;
  }

  if (value === 'action:save') {
    presetSelect.value = '';
    syncPresetButtons();
    saveCurrentPreset();
    return;
  }

  const index = currentPresetIndex();

  if (index >= 0) {
    applyPreset(presets[index].seconds);
    syncPresetButtons();
    return;
  }

  presetSelect.value = '';
  syncPresetButtons();
}

function tick() {
  if (mode !== 'running') {
    return;
  }

  if (runMode === 'stopwatch') {
    remainingMs = elapsedBase + Math.max(0, Date.now() - startedAt);
    renderRemaining(remainingMs);
    return;
  }

  remainingMs = Math.max(0, endAt - Date.now());
  renderRemaining(remainingMs);

  const displayedSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

  if (
    displayedSeconds > 0 &&
    displayedSeconds <= 10 &&
    displayedSeconds !== lastTickSecond
  ) {
    lastTickSecond = displayedSeconds;
    playTick();
  }

  if (remainingMs <= 0) {
    finishCountdown();
  }
}

function startCountdown(durationMs) {
  stopAlarm();
  stopTicking();
  totalMs = durationMs;
  remainingMs = durationMs;
  endAt = Date.now() + durationMs;
  activeNote = sessionNote ? sessionNote.value.trim() : '';
  sessionRecorded = false;
  lastTickSecond = null;

  setMode('running');
  showTimerView();
  applyDisplayMode('capsule');
  primeAudio();

  // The Start button lives in the now-hidden setup view. Drop its focus so
  // Space/R shortcuts are handled by the timer instead of an invisible button.
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  renderRemaining(durationMs);
  renderModeLabels();
  renderTimerNote();
  announce(t('focusing'));

  tickId = window.setInterval(tick, TICK_MS);
}

function startStopwatch() {
  stopAlarm();
  stopTicking();
  totalMs = 0;
  remainingMs = 0;
  endAt = 0;
  elapsedBase = 0;
  startedAt = Date.now();
  activeNote = sessionNote ? sessionNote.value.trim() : '';
  sessionRecorded = false;
  lastTickSecond = null;

  setMode('running');
  showTimerView();
  applyDisplayMode('capsule');
  primeAudio();

  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  renderRemaining(0);
  renderModeLabels();
  renderTimerNote();
  announce(t('stopwatchRunning'));
  tickId = window.setInterval(tick, TICK_MS);
}

function finishCountdown() {
  stopTicking();

  const isPomodoroBreak = runMode === 'pomodoro' && pomodoroPhase !== 'focus';

  if (!isPomodoroBreak) {
    recordSession(totalMs / 1000);
  }

  remainingMs = 0;
  renderRemaining(0);
  setMode('complete');
  renderModeLabels();
  announce(t('timesUp'));
  notifyCompletion();
  startAlarmLoop();

  if (runMode === 'pomodoro') {
    schedulePomodoroNext();
  }
}

function pomodoroRoundText() {
  return t('roundLabel')
    .replace('{n}', String(pomodoroRound))
    .replace('{total}', String(POMODORO_ROUNDS));
}

function stopPomodoroTimer() {
  if (pomodoroTimer !== null) {
    window.clearTimeout(pomodoroTimer);
    pomodoroTimer = null;
  }
}

function dayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function loadStats() {
  try {
    const raw = window.localStorage.getItem(STATS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    stats = parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    stats = {};
  }
  return stats;
}

function persistStats() {
  try {
    window.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (error) {
    // Storage is optional.
  }
}

function recordStats(seconds) {
  if (!Number.isFinite(seconds) || seconds < 1) {
    return;
  }

  const key = dayKey();
  const entry = stats[key] || { sessions: 0, seconds: 0 };
  entry.sessions += 1;
  entry.seconds += Math.round(seconds);
  stats[key] = entry;
  // Keep a year of history; anything older is dropped on write.
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 365);
  const cutoffKey = dayKey(cutoff);
  for (const stored of Object.keys(stats)) {
    if (stored < cutoffKey) {
      delete stats[stored];
    }
  }
  persistStats();
}

function currentStreak() {
  let streak = 0;
  const cursor = new Date();

  if (!stats[dayKey(cursor)] || !stats[dayKey(cursor)].sessions) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (true) {
    const entry = stats[dayKey(cursor)];
    if (!entry || !entry.sessions) {
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function statsFooterText() {
  const entry = stats[dayKey()];
  const sessions = entry ? entry.sessions : 0;
  const minutes = entry ? Math.round(entry.seconds / 60) : 0;
  const streak = currentStreak();

  if (!sessions) {
    return streak > 1
      ? t('statsStreak').replace('{n}', String(streak))
      : t('ready');
  }

  let text = t('statsToday')
    .replace('{n}', String(sessions))
    .replace('{m}', String(minutes));

  if (streak > 1) {
    text += ` · ${t('statsStreak').replace('{n}', String(streak))}`;
  }

  return text;
}

function schedulePomodoroNext() {
  stopPomodoroTimer();
  pomodoroTimer = window.setTimeout(() => {
    pomodoroTimer = null;

    if (runMode !== 'pomodoro') {
      return;
    }

    let nextMs;

    if (pomodoroPhase === 'focus') {
      pomodoroPhase = pomodoroRound >= POMODORO_ROUNDS ? 'long' : 'short';
      nextMs = pomodoroPhase === 'long' ? POMODORO_LONG_MS : POMODORO_SHORT_MS;
    } else {
      pomodoroRound =
        pomodoroPhase === 'long'
          ? 1
          : Math.min(POMODORO_ROUNDS, pomodoroRound + 1);
      pomodoroPhase = 'focus';
      nextMs = pomodoroFocusMs;
    }

    stopAlarm();
    startCountdown(nextMs);
  }, POMODORO_BREAK_DELAY_MS);
}

function extendTimer() {
  if (mode !== 'complete' || runMode === 'stopwatch') {
    return;
  }

  stopAlarm();
  stopPomodoroTimer();
  announce(t('extended'));
  startCountdown(EXTEND_MS);
}

function togglePause() {
  if (mode === 'complete') {
    stopAlarm();
    startCountdown(totalMs);
    return;
  }

  if (mode === 'paused') {
    if (runMode === 'stopwatch') {
      startedAt = Date.now();
      setMode('running');
      renderModeLabels();
      announce(t('resumed'));
      tickId = window.setInterval(tick, TICK_MS);
      tick();
      return;
    }

    if (remainingMs <= 0) {
      finishCountdown();
      return;
    }

    endAt = Date.now() + remainingMs;
    lastTickSecond = null;
    setMode('running');
    renderModeLabels();
    announce(t('resumed'));
    tickId = window.setInterval(tick, TICK_MS);
    tick();
    return;
  }

  if (mode === 'running') {
    if (runMode === 'stopwatch') {
      remainingMs = elapsedBase + Math.max(0, Date.now() - startedAt);
      elapsedBase = remainingMs;
      stopTicking();
      setMode('paused');
      renderRemaining(remainingMs);
      renderModeLabels();
      announce(t('paused'));
      return;
    }

    remainingMs = Math.max(0, endAt - Date.now());
    stopTicking();
    stopAlarm();

    if (remainingMs <= 0) {
      finishCountdown();
      return;
    }

    setMode('paused');
    renderRemaining(remainingMs);
    renderModeLabels();
    announce(t('paused'));
  }
}

function clearResetConfirmation() {
  resetArmed = false;

  if (resetNoticeTimer !== null) {
    window.clearTimeout(resetNoticeTimer);
    resetNoticeTimer = null;
  }

  if (formNoticeKey === 'resetConfirm') {
    setFormMessage(null);
  }

  if (resetHint) {
    resetHint.hidden = true;
    resetHint.textContent = '';
  }
}

function requestResetConfirmation() {
  if (mode !== 'running' && mode !== 'paused') {
    return true;
  }

  if (resetArmed) {
    clearResetConfirmation();
    return true;
  }

  resetArmed = true;
  const hint = t('resetConfirm');
  setFormNotice('resetConfirm');
  timerStatus.textContent = hint;
  if (resetHint) {
    resetHint.textContent = hint;
    resetHint.hidden = false;
  }
  announce(hint);

  resetNoticeTimer = window.setTimeout(() => {
    resetNoticeTimer = null;
    resetArmed = false;

    if (mode !== 'setup') {
      renderModeLabels();
    }

    if (formNoticeKey === 'resetConfirm') {
      setFormMessage(null);
    }

    if (resetHint) {
      resetHint.hidden = true;
      resetHint.textContent = '';
    }
  }, 3000);

  return false;
}

function resetToSetup() {
  const snapshot =
    mode === 'running' || mode === 'paused'
      ? {
          runMode,
          totalMs,
          remainingMs,
          elapsedBase,
          note: activeNote,
          round: pomodoroRound,
          phase: pomodoroPhase
        }
      : null;

  clearResetConfirmation();
  stopAlarm();
  stopTicking();

  if (
    (mode === 'running' || mode === 'paused') &&
    remainingMs > 0
  ) {
    // Abandoning a timer still writes a log row (the export should show the
    // time that was actually spent), but it never counts as a completed round.
    recordSession(
      runMode === 'stopwatch'
        ? remainingMs / 1000
        : (totalMs - remainingMs) / 1000,
      false
    );
  }

  totalMs = 0;
  remainingMs = 0;
  endAt = 0;
  elapsedBase = 0;
  startedAt = 0;
  lastTickSecond = null;
  activeNote = '';
  sessionRecorded = false;
  errorDescriptor = null;
  setFormMessage(null);

  renderTimerNote();
  renderRemaining(0);
  showSetupView();

  if (snapshot && snapshot.remainingMs > 0) {
    armUndo(snapshot);
  } else {
    clearUndo();
  }

  announce(snapshot ? t('resetDone') : '');

  if (!hoursInput.disabled) {
    hoursInput.focus({ preventScroll: true });
    hoursInput.select();
  }
}

function clockTime(timestamp) {
  if (!timestamp) {
    return '';
  }

  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

function elapsedMs() {
  if (runMode === 'stopwatch') {
    return remainingMs;
  }

  return Math.max(0, totalMs - remainingMs);
}

function statusText(key) {
  const base = t(key);

  if (mode === 'running' && runMode !== 'stopwatch' && endAt > 0) {
    return `${base} · ${clockTime(endAt)} ${t('endsAt')}`;
  }

  if (mode === 'paused' && remainingMs > 0) {
    return `${base} · ${formatDuration(elapsedMs())} ${t('elapsed')}`;
  }

  return base;
}

function syncExtendRow() {
  if (!extendRow) {
    return;
  }

  const active = mode === 'running' || mode === 'paused';
  extendRow.hidden = !(active && runMode !== 'stopwatch');
}

function extendActive(minutes) {
  if (mode !== 'running' && mode !== 'paused') {
    return;
  }

  if (runMode === 'stopwatch') {
    return;
  }

  const delta = minutes * 60 * 1000;
  totalMs += delta;
  remainingMs += delta;

  if (mode === 'running') {
    endAt += delta;
  }

  renderRemaining(remainingMs);
  renderModeLabels();
  announce(t('addTime'));
}

let undoSnapshot = null;
let undoTimer = null;

function clearUndo() {
  undoSnapshot = null;

  if (undoTimer !== null) {
    window.clearTimeout(undoTimer);
    undoTimer = null;
  }

  if (undoButton) {
    undoButton.hidden = true;
  }
}

function restoreUndo() {
  if (!undoSnapshot) {
    return;
  }

  const snapshot = undoSnapshot;
  clearUndo();

  runMode = snapshot.runMode;
  totalMs = snapshot.totalMs;
  remainingMs = snapshot.remainingMs;
  elapsedBase = snapshot.elapsedBase;
  activeNote = snapshot.note;
  pomodoroRound = snapshot.round;
  pomodoroPhase = snapshot.phase;
  sessionRecorded = true;

  setRunMode(runMode);
  setMode('paused');
  showTimerView();
  applyDisplayMode('capsule');
  renderRemaining(remainingMs);
  renderModeLabels();
  renderTimerNote();
  announce(t('paused'));
}

function armUndo(snapshot) {
  undoSnapshot = snapshot;

  if (undoButton) {
    undoButton.hidden = false;
  }

  if (undoTimer !== null) {
    window.clearTimeout(undoTimer);
  }

  undoTimer = window.setTimeout(() => {
    undoTimer = null;
    clearUndo();
    renderModeLabels();
  }, 5000);
}

function renderModeLabels() {
  if (timerLabel) {
    timerLabel.textContent =
      runMode === 'pomodoro' && mode !== 'setup'
        ? pomodoroRoundText()
        : t('focusCapsule');
  }

  renderTimerNote();
  syncExtendRow();

  if (mode === 'setup') {
    pauseButton.textContent = t('pause');
    resetButton.textContent = t('reset');
    timerStatus.textContent = t('focusing');
    footerStatus.textContent = statsFooterText();
    return;
  }

  if (mode === 'running') {
    pauseButton.textContent = t('pause');
    resetButton.textContent = t('reset');
    const runningKey =
      runMode === 'stopwatch'
        ? 'stopwatchRunning'
        : runMode === 'pomodoro' && pomodoroPhase === 'short'
          ? 'breakShortRunning'
          : runMode === 'pomodoro' && pomodoroPhase === 'long'
            ? 'breakLongRunning'
            : 'focusing';
    timerStatus.textContent = statusText(runningKey);
    footerStatus.textContent = t(runningKey);
    return;
  }

  if (mode === 'paused') {
    pauseButton.textContent = t('resume');
    resetButton.textContent = t('reset');
    timerStatus.textContent = statusText('paused');
    footerStatus.textContent = t('paused');
    return;
  }

  pauseButton.textContent = t('again');
  resetButton.textContent = t('newTimer');
  timerStatus.textContent = `${t('timesUp')} · ${t('extendHint')}`;
  footerStatus.textContent = t('timesUp');
}

for (const { input } of FIELDS) {
  input.addEventListener('input', () => {
    presetSelect.value = '';

    if (errorDescriptor !== null || formMessage.textContent) {
      errorDescriptor = null;
      setFormMessage(null);
    }
  });

  input.addEventListener('focus', () => {
    input.select();
  });
}

for (const select of languageSelects) {
  select.addEventListener('change', () => {
    setLanguage(select.value);
  });
}

if (presetSelect) {
  presetSelect.addEventListener('change', handlePresetChange);
}

if (presetRenameButton) {
  presetRenameButton.addEventListener('click', renameSelectedPreset);
}

if (presetDeleteButton) {
  presetDeleteButton.addEventListener('click', deleteSelectedPreset);
}

if (presetForm) {
  presetForm.addEventListener('submit', submitPresetSheet);
}

for (const button of [presetSheetClose, presetCancelButton]) {
  button?.addEventListener('click', closePresetSheet);
}

if (presetSheet) {
  presetSheet.addEventListener('pointerdown', (event) => {
    if (event.target === presetSheet) {
      closePresetSheet();
    }
  });
}

if (runModeSelect) {
  runModeSelect.addEventListener('change', () => {
    setRunMode(runModeSelect.value);
  });
}

if (exportButton) {
  exportButton.addEventListener('click', exportLog);
}

if (extendOneButton) {
  extendOneButton.addEventListener('click', () => extendActive(1));
}

if (extendFiveButton) {
  extendFiveButton.addEventListener('click', () => extendActive(5));
}

if (undoButton) {
  undoButton.addEventListener('click', restoreUndo);
}

timerForm.addEventListener('submit', (event) => {
  event.preventDefault();

  if (runMode === 'stopwatch') {
    errorDescriptor = null;
    setFormMessage(null);
    startStopwatch();
    return;
  }

  const result = readDuration();

  if (result.errorKey) {
    errorDescriptor = { key: result.errorKey };
    setFormMessage(errorDescriptor);
    result.input.focus({ preventScroll: true });
    result.input.select();
    return;
  }

  errorDescriptor = null;
  setFormMessage(null);

  FIELDS.forEach((field, index) => {
    field.input.value = String(result.values[index]);
  });

  persistLastConfig(result.values);

  if (runMode === 'pomodoro') {
    pomodoroFocusMs = result.durationMs;
    pomodoroRound = 1;
    pomodoroPhase = 'focus';
  }

  startCountdown(result.durationMs);
});

if (timeDisplay) {
  timeDisplay.addEventListener('click', extendTimer);
}

if (typeof bridge?.onGlobalAction === 'function') {
  bridge.onGlobalAction((action) => {
    if (action === 'toggle') {
      togglePause();
    } else if (action === 'reset') {
      resetToSetup();
    }
  });
}

pauseButton.addEventListener('click', togglePause);
resetButton.addEventListener('click', resetToSetup);
pinButton.addEventListener('click', togglePin);
if (muteButton) {
  muteButton.addEventListener('click', toggleMute);
}

if (typeof bridge?.onExitFullscreen === 'function') {
  bridge.onExitFullscreen(exitFullscreen);
}

if (audioButton) {
  audioButton.addEventListener('click', pickAudio);
}

/**
 * Show the "back to the built-in chime" chip only while a custom sound is set,
 * and let it clear the stored choice.
 */
function syncAudioReset() {
  if (!audioResetButton) {
    return;
  }

  audioResetButton.hidden = !customAudioPath;
}

function resetAudioPreference() {
  customAudioPath = '';
  customAudioUrl = '';
  alarmAudio = null;
  localStorage.removeItem(AUDIO_KEY);
  syncAudioReset();

  if (mode === 'setup') {
    setFormNotice('audioResetDone');
  } else {
    announce(t('audioResetDone'));
  }
}

if (audioResetButton) {
  audioResetButton.addEventListener('click', resetAudioPreference);
}

if (backgroundButton) {
  backgroundButton.addEventListener('click', () => {
    pickBackground().catch((error) => {
      console.error('NanoTimer: background pick failed.', error);
    });
  });
}

if (backgroundClearButton) {
  backgroundClearButton.addEventListener('click', () => {
    clearBackground();
    setFormNotice('backgroundCleared');
  });
}

if (minimizeButton && typeof bridge?.minimize === 'function') {
  minimizeButton.addEventListener('click', () => bridge.minimize());
}

if (closeButton && typeof bridge?.close === 'function') {
  closeButton.addEventListener('click', () => bridge.close());
}

if (capsuleMinimizeButton && typeof bridge?.minimize === 'function') {
  capsuleMinimizeButton.addEventListener('click', () => bridge.minimize());
}

if (capsuleCloseButton && typeof bridge?.close === 'function') {
  capsuleCloseButton.addEventListener('click', () => bridge.close());
}

let dragState = null;
// Set synchronously on pointerdown and cleared on pointerup/cancel. The window
// origin has to be fetched over IPC before the drag can start, so without this
// flag a fast click (pointerup before the IPC round-trip finished) left a stale
// dragState behind and the next mouse move dragged the window with no button
// held.
let dragPressPointerId = null;
// True once a press actually moved the window. The mini "peek" opens on click,
// and a click still fires after a drag, so the click handler has to know the
// press was a drag rather than a tap.
let dragMoved = false;

function isWindowControl(target) {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        'button, input, select, textarea, a, [role="button"], [contenteditable="true"]'
      )
    )
  );
}

function stopWindowDrag() {
  const wasDragging = dragPressPointerId !== null || dragState !== null;

  dragState = null;
  dragPressPointerId = null;
  document.body.classList.remove('is-dragging');

  if (wasDragging && typeof bridge?.setDragging === 'function') {
    bridge.setDragging(false);
  }
}

document.addEventListener('pointerdown', (event) => {
  const pressTarget = event.target;

  // Only a press that lands on the visible widget starts a drag. The capsule
  // and mini windows are deliberately larger than the pill/circle so the
  // capsule can expand on hover; that transparent margin belongs to the
  // desktop, so pressing it must not move the window.
  if (
    event.button !== 0 ||
    !(pressTarget instanceof Element) ||
    !pressTarget.closest('.widget') ||
    dragState ||
    displayMode === 'fullscreen' ||
    isWindowControl(pressTarget) ||
    (pressTarget instanceof Element && pressTarget.closest('.help-sheet')) ||
    typeof bridge?.getWindowPosition !== 'function' ||
    typeof bridge?.setWindowPosition !== 'function'
  ) {
    return;
  }

  dragMoved = false;

  const pointerId = event.pointerId;
  const startX = event.screenX;
  const startY = event.screenY;
  const captureTarget = event.target;
  dragPressPointerId = pointerId;

  const beginDrag = async () => {
    try {
      const bounds =
        typeof bridge.getWindowBounds === 'function'
          ? await bridge.getWindowBounds()
          : null;
      const origin =
        bounds &&
        Number.isFinite(bounds.x) &&
        Number.isFinite(bounds.y) &&
        Number.isFinite(bounds.width) &&
        Number.isFinite(bounds.height)
          ? bounds
          : await bridge.getWindowPosition();

      const originX = Array.isArray(origin) ? origin[0] : origin.x;
      const originY = Array.isArray(origin) ? origin[1] : origin.y;

      // Released (or a newer press started) while the bounds were in flight.
      if (dragPressPointerId !== pointerId) {
        return;
      }

      if (!Number.isFinite(originX) || !Number.isFinite(originY)) {
        return;
      }

      dragState = {
        pointerId,
        startX,
        startY,
        windowX: originX,
        windowY: originY,
        width: Array.isArray(origin) ? undefined : origin.width,
        height: Array.isArray(origin) ? undefined : origin.height
      };

      document.body.classList.add('is-dragging');

      if (typeof bridge.setDragging === 'function') {
        bridge.setDragging(true);
      }

      if (typeof captureTarget?.setPointerCapture === 'function') {
        try {
          captureTarget.setPointerCapture(pointerId);
        } catch (error) {
          // Capture is a nicety: drags still work without it.
        }
      }
    } catch (error) {
      stopWindowDrag();
    }
  };

  beginDrag();
});

document.addEventListener('pointermove', (event) => {
  if (!dragState || event.pointerId !== dragState.pointerId) {
    return;
  }

  // The button can be released outside the window without a pointerup landing
  // here; trust the button state over the last event we saw.
  if ((event.buttons & 1) !== 1) {
    stopWindowDrag();
    return;
  }

  const dx = event.screenX - dragState.startX;
  const dy = event.screenY - dragState.startY;

  if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
    return;
  }

  event.preventDefault();
  dragMoved = true;
  bridge.setWindowPosition(
    dragState.windowX + dx,
    dragState.windowY + dy,
    dragState.width,
    dragState.height
  );
});

function endWindowDrag(event) {
  if (event && dragState && event.pointerId !== dragState.pointerId) {
    return;
  }

  if (event && dragPressPointerId !== null && event.pointerId !== dragPressPointerId) {
    return;
  }

  stopWindowDrag();
}

document.addEventListener('pointerup', endWindowDrag);
document.addEventListener('pointercancel', endWindowDrag);
window.addEventListener('blur', stopWindowDrag);

if (exitFullscreenButton) {
  exitFullscreenButton.addEventListener('click', exitFullscreen);
}

for (const button of modeButtons) {
  button.addEventListener('click', () => {
    applyDisplayMode(button.dataset.displayMode);
  });
}

if (modeSelect) {
  modeSelect.addEventListener('change', () => {
    applyDisplayMode(modeSelect.value);
    const key = {
      capsule: 'modeCapsule',
      mini: 'modeMini',
      fullscreen: 'modeFull'
    }[modeSelect.value];

    if (key) {
      announce(t(key));
    }
  });
}

// Clicking the mini circle opens the capsule control panel; when the pointer
// leaves that panel we go back to mini, so the click feels like "peek" rather
// than a permanent mode change.
timerView.addEventListener('click', (event) => {
  const target = event.target;

  // A drag that started on the circle also ends with a click event; moving the
  // window should not count as "open the capsule".
  if (dragMoved) {
    dragMoved = false;
    return;
  }

  if (
    displayMode === 'mini' &&
    !(target instanceof Element && target.closest('button, select'))
  ) {
    peekFromMini = true;
    applyDisplayMode('capsule');
  }
});

widget.addEventListener('pointerleave', () => {
  if (peekFromMini && displayMode === 'capsule') {
    peekFromMini = false;
    applyDisplayMode('mini');
  }
});

function isInteractiveTarget(target) {
  return (
    target instanceof Element &&
    target.offsetParent !== null &&
    Boolean(target.closest('button, input, select, textarea, a'))
  );
}

helpButton?.addEventListener('click', () => {
  if (durationSheet && !durationSheet.hidden) {
    closeDurationSheet();
    return;
  }

  if (settingsSheet && !settingsSheet.hidden) {
    closeSettingsSheet();
    return;
  }

  if (historySheet && !historySheet.hidden) {
    closeHistorySheet();
    return;
  }

  if (isHelpOpen()) {
    closeHelp();
  } else {
    openHelp();
  }
});

helpCloseButton?.addEventListener('click', () => closeHelp());

helpSheet?.addEventListener('click', (event) => {
  if (event.target === helpSheet) {
    closeHelp();
  }
});

updateButton?.addEventListener('click', () => {
  runUpdateFlow();
});

if (typeof bridge?.onUpdateProgress === 'function') {
  bridge.onUpdateProgress((progress) => {
    if (updateState !== 'downloading' || !progress) {
      return;
    }

    const percent = progress.total
      ? Math.min(100, Math.round((progress.received / progress.total) * 100))
      : 0;

    showNotice(
      t(progress.differential ? 'updateDiffDownloading' : 'updateDownloading').replace(
        '{p}',
        percent
      )
    );
  });
}

window.addEventListener('keydown', (event) => {
  if (presetSheet && !presetSheet.hidden) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      closePresetSheet();
    }

    return;
  }


  if (isHelpOpen()) {
    if (event.key === 'Escape' || event.key === 'Esc') {
      event.preventDefault();
      event.stopPropagation();
      closeHelp();
    }
    return;
  }

  if (
    event.key.toLowerCase() === 'm' &&
    event.shiftKey &&
    !isInteractiveTarget(event.target)
  ) {
    event.preventDefault();
    toggleMute();
    return;
  }

  if ((event.key === 'Escape' || event.key === 'Esc') && displayMode === 'fullscreen') {
    event.preventDefault();
    exitFullscreen();
    return;
  }

  if ((event.key === 'Escape' || event.key === 'Esc') && mode !== 'setup') {
    event.preventDefault();

    if (requestResetConfirmation()) {
      resetToSetup();
    }

    return;
  }

  if (
    event.defaultPrevented ||
    event.repeat ||
    mode === 'setup' ||
    isInteractiveTarget(event.target)
  ) {
    return;
  }

  if (event.code === 'Space') {
    event.preventDefault();
    togglePause();
    return;
  }

  if (event.key.toLowerCase() === 'r') {
    event.preventDefault();

    if (requestResetConfirmation()) {
      resetToSetup();
    }

    return;
  }

  if (event.key.toLowerCase() === 'f') {
    event.preventDefault();
    applyDisplayMode(
      displayMode === 'fullscreen' ? 'capsule' : 'fullscreen'
    );
    return;
  }

  if (event.key.toLowerCase() === 'm') {
    event.preventDefault();
    applyDisplayMode(displayMode === 'mini' ? 'capsule' : 'mini');
  }
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && mode === 'running') {
    tick();
  }
});

if (sessionNote) {
  sessionNote.addEventListener('input', saveNoteDraft);
}

if (noteClearButton) {
  noteClearButton.addEventListener('click', () => {
    clearNoteDraft();
  });
}


// --- settings & history sheets ------------------------------------------------

const EDGE_SNAP_KEY = 'nanotimer.edgeSnap';
const BG_DIM_KEY = 'nanotimer.bgDim';

function readSetting(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : raw;
  } catch (error) {
    return fallback;
  }
}

function writeSetting(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // storage full or blocked: the UI still reflects the change
  }
}

function applyBackgroundDim(value) {
  const dim = Math.min(90, Math.max(0, Number(value) || 0));

  widget.style.setProperty('--bg-dim', String(dim));

  if (bgDim) {
    bgDim.value = String(dim);
  }

  if (bgDimValue) {
    bgDimValue.textContent = `${Math.round(dim)}%`;
  }
}

function openSettingsSheet() {
  if (!settingsSheet) {
    return;
  }

  if (edgeSnapToggle) {
    edgeSnapToggle.checked = readSetting(EDGE_SNAP_KEY, 'true') !== 'false';
  }

  
function openDurationSheet() {
  if (!durationSheet || (mode !== 'running' && mode !== 'paused')) {
    return;
  }

  const totalSeconds = Math.max(0, Math.round(remainingMs / 1000));
  durationMinutes.value = String(Math.floor(totalSeconds / 60));
  durationSeconds.value = String(totalSeconds % 60);
  closeHelp();
  durationSheet.hidden = false;
  durationMinutes.focus();
  durationMinutes.select();
}

function closeDurationSheet() {
  if (durationSheet) {
    durationSheet.hidden = true;
  }
}

function applyDurationSheet() {
  if (mode !== 'running' && mode !== 'paused') {
    closeDurationSheet();
    return;
  }

  const minutes = Math.max(0, Math.min(999, Math.round(Number(durationMinutes.value) || 0)));
  const seconds = Math.max(0, Math.min(59, Math.round(Number(durationSeconds.value) || 0)));
  const next = (minutes * 60 + seconds) * 1000;

  if (next <= 0) {
    return;
  }

  if (runMode === 'stopwatch') {
    totalMs = next;
    remainingMs = next;
  } else {
    const elapsed = Math.max(0, totalMs - remainingMs);
    totalMs = Math.max(next, elapsed);
    remainingMs = next;

    if (mode === 'running') {
      endAt = Date.now() + next;
    }
  }

  closeDurationSheet();
  renderRemaining(remainingMs);
  renderModeLabels();
  announce(t('editDuration'));
}

if (timeDisplay) {
  timeDisplay.addEventListener('click', () => {
    if (mode === 'running' || mode === 'paused') {
      openDurationSheet();
    }
  });
}

if (durationClose) {
  durationClose.addEventListener('click', closeDurationSheet);
}

if (durationCancel) {
  durationCancel.addEventListener('click', closeDurationSheet);
}

if (durationApply) {
  durationApply.addEventListener('click', applyDurationSheet);
}

if (durationSheet) {
  durationSheet.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyDurationSheet();
    }
  });
}

applyBackgroundDim(readSetting(BG_DIM_KEY, '0'));
  closeHelp();
  settingsSheet.hidden = false;
  announce(t('settingsTitle'));
}

function closeSettingsSheet() {
  if (settingsSheet) {
    settingsSheet.hidden = true;
  }
}

function renderHistorySheet() {
  if (!historyList || !historyStats) {
    return;
  }

  const today = dayKey(new Date());
  const entry = stats[today] || { sessions: 0, seconds: 0 };
  const weekSeconds = Object.entries(stats)
    .filter(([key]) => {
      const date = new Date(`${key}T00:00:00`);
      return (Date.now() - date.getTime()) / 86400000 < 7;
    })
    .reduce((total, [, value]) => total + (Number(value?.seconds) || 0), 0);

  historyStats.textContent = [
    t('statsToday', { n: entry.sessions || 0, m: Math.round((entry.seconds || 0) / 60) }),
    t('weekLabel', { m: Math.round(weekSeconds / 60) }),
    t('streakLabel', { n: currentStreak() })
  ].join(' · ');

  historyList.textContent = '';

  if (logs.length === 0) {
    const empty = document.createElement('li');
    empty.textContent = t('historyEmpty');
    historyList.appendChild(empty);
    return;
  }

  logs.slice(0, 20).forEach((item) => {
    const row = document.createElement('li');
    const when = document.createElement('span');
    const amount = document.createElement('span');
    const date = new Date(item.date);

    when.textContent = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}${item.note ? ` · ${item.note}` : ''}`;
    amount.textContent = formatDuration((item.seconds || 0) * 1000);
    row.append(when, amount);
    historyList.appendChild(row);
  });
}

function openHistorySheet() {
  if (!historySheet) {
    return;
  }

  renderHistorySheet();
  closeHelp();
  historySheet.hidden = false;
  announce(t('historyTitle'));
}

function closeHistorySheet() {
  if (historySheet) {
    historySheet.hidden = true;
  }
}

function settingsPayload() {
  const data = {};

  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);

      if (key && key.startsWith('nanotimer.')) {
        data[key] = window.localStorage.getItem(key);
      }
    }
  } catch (error) {
    return null;
  }

  return JSON.stringify({ app: 'nanotimer', version: 1, data }, null, 2);
}

async function exportSettings() {
  if (typeof bridge?.exportSettings !== 'function') {
    return;
  }

  const payload = settingsPayload();

  if (!payload) {
    setFormMessage({ key: 'saveFailed' });
    return;
  }

  const result = await bridge.exportSettings(payload);

  if (result && result.ok) {
    announce(t('settingsExported'));
  } else if (result && result.error) {
    setFormMessage({ key: 'saveFailed' });
  }
}

async function importSettings() {
  if (typeof bridge?.importSettings !== 'function') {
    return;
  }

  const result = await bridge.importSettings();

  if (!result || !result.ok || typeof result.text !== 'string') {
    return;
  }

  try {
    const parsed = JSON.parse(result.text);
    const data = parsed && typeof parsed.data === 'object' ? parsed.data : null;

    if (!data) {
      setFormMessage({ key: 'saveFailed' });
      return;
    }

    Object.entries(data).forEach(([key, value]) => {
      if (key.startsWith('nanotimer.') && typeof value === 'string') {
        window.localStorage.setItem(key, value);
      }
    });

    announce(t('settingsImported'));
    window.location.reload();
  } catch (error) {
    setFormMessage({ key: 'saveFailed' });
  }
}

if (settingsButton) {
  settingsButton.addEventListener('click', openSettingsSheet);
}

if (settingsClose) {
  settingsClose.addEventListener('click', closeSettingsSheet);
}

if (historyButton) {
  historyButton.addEventListener('click', openHistorySheet);
}

if (historyClose) {
  historyClose.addEventListener('click', closeHistorySheet);
}

if (edgeSnapToggle) {
  edgeSnapToggle.addEventListener('change', () => {
    const enabled = Boolean(edgeSnapToggle.checked);

    writeSetting(EDGE_SNAP_KEY, enabled ? 'true' : 'false');

    if (typeof bridge?.setPrefs === 'function') {
      bridge.setPrefs({ edgeSnap: enabled });
    }
  });
}

if (bgDim) {
  bgDim.addEventListener('input', () => {
    applyBackgroundDim(bgDim.value);
    writeSetting(BG_DIM_KEY, bgDim.value);
  });
}

if (previewSoundButton) {
  previewSoundButton.addEventListener('click', () => {
    playCompletionSound();
  });
}

if (exportSettingsButton) {
  exportSettingsButton.addEventListener('click', exportSettings);
}

if (importSettingsButton) {
  importSettingsButton.addEventListener('click', importSettings);
}

if (historyClear) {
  historyClear.addEventListener('click', () => {
    logs = [];
    persistLogs();
    stats = {};
    persistStats();
    renderHistorySheet();
    renderModeLabels();
  });
}

if (historyExport) {
  historyExport.addEventListener('click', exportLog);
}

applyBackgroundDim(readSetting(BG_DIM_KEY, '0'));

if (typeof bridge?.setPrefs === 'function') {
  bridge.setPrefs({ edgeSnap: readSetting(EDGE_SNAP_KEY, 'true') !== 'false' });
}

window.addEventListener('beforeunload', stopTicking);

currentLanguage = detectLanguage();
presets = loadPresets();
logs = loadLogs();
try {
  alarmMuted = window.localStorage.getItem(MUTE_KEY) === 'true';
} catch (error) {
  alarmMuted = false;
}
runMode = (() => {
  try {
    const stored = window.localStorage.getItem(STOPWATCH_KEY);
    return stored === 'stopwatch' || stored === 'pomodoro'
      ? stored
      : 'countdown';
  } catch (error) {
    return 'countdown';
  }
})();
buildLanguageOptions();
applyLastConfig();
applyNoteDraft();
loadStats();
applyLanguage();
setRunMode(runMode);
buildModeOptions();
showSetupView();
renderRemaining(0);
loadAudioPreference();
loadBackgroundPreference();
refreshPinState();
