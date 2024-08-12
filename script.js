// 常用 DOM 元素的引用
const clockElement = document.getElementById('clock');
const progressBoxElement = document.getElementById('progressBox');
const progressElement = document.getElementById('progress');
const progressTextGroupElement = document.getElementById('progressTextGroup');
const progressPercentageElement = document.getElementById('progressPercentage');
const currentWorkTimeElement = document.getElementById('currentWorkTime');
const timeInputContainerElement = document.getElementById('timeInputContainer');
const inputNumberH = document.getElementById('inputNumberH');
const inputNumberM = document.getElementById('inputNumberM');
const themeSwitch = document.getElementById('themeSwitch');

// 目標時間相關元素
const timeInputSurface = document.getElementById('timeInputSurface');
const timeInput = document.getElementById('timeInput');
const hoursTensSpan = timeInputSurface.querySelector('.hours-tens');
const hoursUnitsSpan = timeInputSurface.querySelector('.hours-units');
const minutesTensSpan = timeInputSurface.querySelector('.minutes-tens');
const minutesUnitsSpan = timeInputSurface.querySelector('.minutes-units');
const separatorH = timeInputSurface.querySelector('.separator-h');
const separatorM = timeInputSurface.querySelector('.separator-m');
const blinkingCursor = document.getElementById('blinkingCursor');

// 全局變量
let records = JSON.parse(localStorage.getItem('workRecords')) || [];
let startTime = null;
let isOnBreak = false;
let breakStartTime = null;
let totalBreakTime = 0;
let progressInterval;
let isEditing = false;
let originalInput = '';
let targetHours = 0;

let hoursSpan = parseInt(hoursTensSpan.textContent) * 10 + parseInt(hoursUnitsSpan.textContent);
let minutesSpan = parseInt(minutesTensSpan.textContent) * 10 + parseInt(minutesUnitsSpan.textContent);

// 主題切換功能
function switchTheme(e) {
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
}

themeSwitch.addEventListener('click', switchTheme, false);

// 應用用戶的主題偏好
const currentTheme = localStorage.getItem('theme');
if (currentTheme) {
    document.body.classList[currentTheme === 'dark' ? 'add' : 'remove']('dark-mode');
    if (currentTheme === 'dark') {
    }
}

// 更新時鐘顯示
function updateClock() {
    const now = new Date();
    const options = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    clockElement.textContent = now.toLocaleTimeString('en-US', options);
    requestAnimationFrame(updateClock);
}

// 格式化日期
function formatDate(date) {
    return date.getFullYear() + '-' + 
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0');
}

// 格式化時間
function formatTime(date) {
    return date.toTimeString().split(' ')[0];
}

// 格式化持續時間
function formatDuration(milliseconds) {
    const hours = Math.floor(milliseconds / 3600000);
    const minutes = Math.floor((milliseconds % 3600000) / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// 添加記錄
function addRecord(type) {
    const now = new Date();
    records.push({ 
        type, 
        date: formatDate(now),
        time: formatTime(now)
    });
    localStorage.setItem('workRecords', JSON.stringify(records));
    displayRecords();
}

// 顯示記錄
function displayRecords() {
    const recordsDiv = document.getElementById('records');
    recordsDiv.innerHTML = '';
    records.slice().reverse().forEach(record => {
        const div = document.createElement('div');
        div.className = 'record-item';
        const timeSpan = document.createElement('span');
        timeSpan.className = 'record-time';
        timeSpan.textContent = `${record.date} ${record.time}`;
        const actionSpan = document.createElement('span');
        actionSpan.className = 'record-action';
        actionSpan.innerHTML = record.type.replace(/\n/g, '<br>');
        div.appendChild(timeSpan);
        div.appendChild(actionSpan);
        recordsDiv.appendChild(div);
    });
}

// 更新進度和時間顯示
function updateProgressAndTime() {
    if (!startTime) {
        resetProgressDisplay();
        return;
    }
    
    timeInputContainerElement.style.display = 'none';
    progressTextGroupElement.style.display = 'flex';
    
    const now = new Date();
    let elapsedTime = now - startTime - (totalBreakTime * 1000);
    if (isOnBreak) {
        elapsedTime -= (now - breakStartTime);
    }

    const elapsedHours = elapsedTime / 3600000;
    const targetHours = parseFloat(hoursSpan) + parseFloat(minutesSpan) / 60;
    let percentage = Math.min((elapsedHours / targetHours) * 100, 100);
    
    updateProgressBox(percentage);
    updateTimeDisplay(elapsedHours, targetHours);
    
    requestAnimationFrame(updateProgressAndTime);
}

// 重置進度顯示
function resetProgressDisplay() {
    timeInputContainerElement.style.display = 'block';
    timeInput.style.display = 'block';
    progressBoxElement.style.width = '256px';
    progressElement.style.display = 'none';
    progressTextGroupElement.style.display = 'none';
}

// 更新進度條
function updateProgressBox(percentage) {
    progressElement.style.width = `${percentage}%`;
    progressPercentageElement.textContent = `${percentage.toFixed(1)}%`;
    
    if (percentage < 1) {
        progressElement.classList.add('pulsing');
        progressTextGroupElement.classList.add('pulsing');
    } else {
        progressElement.classList.remove('pulsing');
        progressTextGroupElement.classList.remove('pulsing');
    }
}

let currentState = 'initial'; // 可能的值: 'initial', 'working', 'break'

// 開始工作
function work() {
    if (!startTime || isOnBreak) {
        if (originalInput === '') {
            // 若無輸入數值，使用預設值 01:00
            originalInput = '0100';
        } else {
            // 確保 originalInput 是 4 位數的字符串
            originalInput = originalInput.padStart(4, '0').slice(-4);
        }
        updateGoalTime();
        if (isOnBreak) {
            endBreak();
        } else {
            startWork();
        }
        
        updateUIForWorkStart();
        startProgressUpdate();
        currentState = 'working';
    }
}

// 更新目標時間
function updateGoalTime() {
    let totalMinutes = parseInt(originalInput.slice(0, 2)) * 60 + parseInt(originalInput.slice(2, 4));
    totalMinutes = Math.min(totalMinutes, 99 * 60 + 60); // 限制最大時間為 99 小時 60 分鐘

    let hours = Math.floor(totalMinutes / 60);
    let minutes = totalMinutes % 60;

    hoursSpan = hours;
    minutesSpan = minutes;

    updateTimeDisplay();
}

// 更新時間顯示
function updateTimeDisplay(elapsedHours, targetHours) {
    const formatTime = (time) => time.toString().padStart(2, '0');
    const hours = Math.floor(elapsedHours);
    const minutes = Math.floor((elapsedHours * 60) % 60);
    const seconds = Math.floor((elapsedHours * 3600) % 60);
    
    currentWorkTimeElement.textContent = `${formatTime(hours)}:${formatTime(minutes)}:${formatTime(seconds)} / ${formatTime(hoursSpan)}:${formatTime(minutesSpan)}:00`;
}

// 結束休息
function endBreak() {
    const breakEndTime = new Date();
    totalBreakTime += (breakEndTime - breakStartTime) / 1000;
    breakStartTime = null;
    isOnBreak = false;
    addRecord('End Break');
}

// 開始工作
function startWork() {
    startTime = new Date();
    addRecord('Work');
}

// 更新UI以開始工作
function updateUIForWorkStart() {
    timeInputContainerElement.style.display = 'none';
    timeInput.style.display = 'none';
    progressBoxElement.style.width = '100%';
    timeInput.style.cursor = 'default';
    progressElement.style.display = 'block';
    progressElement.style.width = '2%';
    progressTextGroupElement.style.display = 'flex';
    updateButtonVisibility('working');
}

// 將所有時間數值規零
function setAllElementsToZero() {
    const elements = [
        hoursTensSpan,
        hoursUnitsSpan,
        minutesTensSpan,
        minutesUnitsSpan,
    ];

    elements.forEach(element => {
        element.textContent = '0';
    });
}

// 將所有時間元素更改為半透明狀態
function setAllElementsToSemiTransparent() {
    const elements = [
        hoursTensSpan,
        hoursUnitsSpan,
        separatorH,
        minutesTensSpan,
        minutesUnitsSpan,
        separatorM,
    ];

    elements.forEach(element => {
        element.style.opacity = '0.2';
    });
}

// 將所有時間元素更改為正常可見狀態
function setAllElementsToVisible() {
    const elements = [
        hoursTensSpan,
        hoursUnitsSpan,
        separatorH,
        minutesTensSpan,
        minutesUnitsSpan,
        separatorM,
    ];

    elements.forEach(element => {
        element.style.opacity = '1';
    });
}

// 開始進度更新
function startProgressUpdate() {
    clearInterval(progressInterval);
    updateProgressAndTime();
    progressInterval = setInterval(updateProgressAndTime, 1000);
}

// 開始休息
function startBreak() {
    if (!isOnBreak && startTime) {
        isOnBreak = true;
        breakStartTime = new Date();
        addRecord('Start Break');
        updateProgressAndTime();
        updateButtonVisibility('break');
        currentState = 'break';
    }
}

// 結束工作
function end() {
    if (startTime) {
        const endTime = new Date();
        let totalWorkTime = endTime - startTime - (totalBreakTime * 1000);
        if (isOnBreak) {
            const breakEndTime = endTime;
            totalBreakTime += (breakEndTime - breakStartTime) / 1000;
            addRecord('End Break');
        }
        
        const workTimeFormatted = formatDuration(totalWorkTime);
        const breakTimeFormatted = formatDuration(totalBreakTime * 1000);
        
        const report = `Work Time: ${workTimeFormatted}\nBreak Time: ${breakTimeFormatted}`;
        
        addRecord('Get Off');
        addRecord(report);
        
        resetWorkSession();
        updateUIForWorkEnd();
    }
}

// 重置工作會話
function resetWorkSession() {
    startTime = null;
    isOnBreak = false;
    totalBreakTime = 0;
    clearInterval(progressInterval);
}

// 更新UI以結束工作
function updateUIForWorkEnd() {
    updateProgressAndTime();
    updateButtonVisibility('initial');
}

// 重置所有數據
function reset() {
    resetWorkSession();
    resetProgressDisplay();
    resetUIElements();
    addRecord('Reset');
    updateProgressAndTime();
    updateButtonVisibility('initial');
}

// 重置UI元素
function resetUIElements() {
    progressElement.style.width = '0%';
    progressPercentageElement.textContent = '0.0%';
    currentWorkTimeElement.textContent = '00:00:00';
    timeInput.style.cursor = 'pointer';
    inputNumberH.style.borderBottomColor = 'var(--primary)';
    inputNumberM.style.borderBottomColor = 'var(--primary)';
}

// 清除所有記錄
function clear() {
    records = [];
    localStorage.removeItem('workRecords');
    displayRecords();
}

// 導出數據
function exportData() {
    const dataStr = JSON.stringify(records);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'work_records.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// 更新按鈕可見性
function updateButtonVisibility(state) {
    const states = {
        'initial': { work: true, break: false, end: false, reset: false },
        'working': { work: false, break: true, end: true, reset: true },
        'break': { work: true, break: false, end: true, reset: true }
    };
    
    Object.entries(states[state]).forEach(([button, isVisible]) => {
        document.getElementById(button).style.display = isVisible ? 'inline-flex' : 'none';
    });

    currentState = state;
}

// 事件監聽器設置
timeInput.addEventListener('input', (e) => {
    setAllElementsToSemiTransparent(); // 將所有元素更改為半透明狀態
    setAllElementsToZero(); // 將所有數值規零
    updateUnderlineColor();

    originalInput = e.target.value.replace(/\D/g, '').padStart(4, '0').slice(-4);
    
    // 根據輸入的數字數量設置透明度
    if (e.target.value.length >= 1) {
        minutesUnitsSpan.style.opacity = '1';
        timeInputSurface.querySelector('.separator-m').style.opacity = '1';
    }
    if (e.target.value.length >= 2) {
        minutesTensSpan.style.opacity = '1';
    }
    if (e.target.value.length >= 3) {
        hoursUnitsSpan.style.opacity = '1';
        timeInputSurface.querySelector('.separator-h').style.opacity = '1';
    }
    if (e.target.value.length >= 4) {
        hoursTensSpan.style.opacity = '1';
    }
    
    hoursTensSpan.textContent = originalInput[0];
    hoursUnitsSpan.textContent = originalInput[1];
    minutesTensSpan.textContent = originalInput[2];
    minutesUnitsSpan.textContent = originalInput[3];
});

timeInput.addEventListener('blur', () => {
    isEditing = false;
    blinkingCursor.style.display = 'none';
    
    setAllElementsToVisible() // 將所有元素更改為正常可見狀態

    // Update targetHours for other functions
    targetHours = parseFloat(hoursSpan) + parseFloat(minutesSpan) / 60;
});

timeInput.addEventListener('click', () => {
    if (!isEditing) {
        isEditing = true;
        setAllElementsToSemiTransparent(); // 將所有元素更改為半透明狀態
        updateUIInput();
        updateUnderlineColor();
    }
});

//按下空格或 Enter 鍵執行 work 動作
timeInput.addEventListener('keydown', function(event) {
    if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault(); // 防止空格或 Enter 鍵的預設行為
        this.blur(); // 移除焦點
        work(); // 執行 work 函數
    }
});

// 更新底線顏色
function updateUnderlineColor() {
    inputNumberH.style.borderBottomColor = 'var(--gray)';
    inputNumberM.style.borderBottomColor = 'var(--gray)';
}

// 更新UI以開始輸入時間
function updateUIInput() {
    blinkingCursor.style.display = 'block';
    timeInput.value = "" ;
    timeInput.focus();
}

// 鍵盤事件監聽器
document.addEventListener('keydown', function(event) {
    if (event.key === ' ' && event.target === document.body) {
        event.preventDefault(); // 防止空格鍵滾動頁面
        if (currentState === 'initial' || currentState === 'break') {
            work();
        } else if (currentState === 'working') {
            startBreak();
        }
    }
});

// 確認對話框
function showCustomConfirm(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customConfirmDialog');
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');
        const cancelBtn = document.getElementById('modalCancel');
        const confirmBtn = document.getElementById('modalConfirm');

        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modal.style.display = 'block';

        let isResolved = false;

        const handleCancel = () => {
            if (isResolved) return;
            isResolved = true;
            modal.style.display = 'none';
            resolve(false);
        };

        const handleConfirm = () => {
            if (isResolved) return;
            isResolved = true;
            modal.style.display = 'none';
            resolve(true);
        };

        cancelBtn.onclick = handleCancel;
        confirmBtn.onclick = handleConfirm;

        // 添加鍵盤事件監聽
        const handleKeydown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                handleCancel();
            } else if (event.key === 'Enter') {
                event.preventDefault();
                handleConfirm();
            }
        };

        document.addEventListener('keydown', handleKeydown);

        // 在對話框關閉時移除事件監聽器
        const cleanup = () => {
            document.removeEventListener('keydown', handleKeydown);
        };

        cancelBtn.addEventListener('click', cleanup);
        confirmBtn.addEventListener('click', cleanup);
    });
}

// 確認對話框事件監聽器
document.body.addEventListener('click', async function(event) {
    const target = event.target.closest('button');
    if (!target) return;

    const actions = {
        'work': work,
        'break': startBreak,
        'end': async () => { 
            event.preventDefault(); // 防止按鈕的預設點擊行為
            if (await showCustomConfirm("End Session", "Are you sure you want to end the session and clear the timer?")) end(); 
        },
        'reset': async () => { 
            event.preventDefault(); // 防止按鈕的預設點擊行為
            if (await showCustomConfirm("Reset Timer", "Are you sure you want to reset the timer?")) reset(); 
        },
        'clear': async () => { 
            event.preventDefault(); // 防止按鈕的預設點擊行為
            if (await showCustomConfirm('Clear Records', 'Are you sure you want to clear all records?')) clear(); 
        }
    };

    if (actions[target.id]) await actions[target.id]();
});

document.getElementById('export').addEventListener('click', exportData);

// 初始化
requestAnimationFrame(updateClock);
displayRecords();
updateProgressAndTime();
updateButtonVisibility('initial');

// 移除按鈕上的 onclick 屬性
['work', 'break', 'end', 'reset', 'clear'].forEach(id => {
    document.getElementById(id).removeAttribute('onclick');
});
