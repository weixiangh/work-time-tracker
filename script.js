// 常用 DOM 元素的引用
const clockElement = document.getElementById('clock');
const progressBarElement = document.getElementById('progressBar');
const progressElement = document.getElementById('progress');
const progressTextGroupElement = document.getElementById('progressTextGroup');
const progressPercentageElement = document.getElementById('progressPercentage');
const currentWorkTimeElement = document.getElementById('currentWorkTime');
const targetHoursGroupElement = document.getElementById('targetHoursGroup');
const workButton = document.getElementById('work');
const startBreakButton = document.getElementById('startBreak');
const getOffButton = document.getElementById('getOff');
const resetButton = document.getElementById('reset');
const clearRecordsButton = document.getElementById('clearRecords');
const toggleSwitch = document.querySelector('.theme-switch input[type="checkbox"]');

// 目標時間相關元素
const targetContainer = document.getElementById('targetContainer');
const targetTime = document.getElementById('targetTime');
const targetInput = document.getElementById('targetInput');
const hoursTensSpan = targetTime.querySelector('.hoursTens');
const hoursUnitsSpan = targetTime.querySelector('.hoursUnits');
const minutesTensSpan = targetTime.querySelector('.minutesTens');
const minutesUnitsSpan = targetTime.querySelector('.minutesUnits');
const separatorH = targetTime.querySelector('.separatorH');
const separatorM = targetTime.querySelector('.separatorM');
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

hoursSpan = (hoursTensSpan.textContent) * 10 + (hoursUnitsSpan.textContent) * 1 ;
minutesSpan = (minutesTensSpan.textContent) * 10 + (minutesUnitsSpan.textContent) * 1 ;

// 主題切換功能
function switchTheme(e) {
    if (e.target.checked) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
    }    
}

toggleSwitch.addEventListener('change', switchTheme, false);

// 應用用戶的主題偏好
const currentTheme = localStorage.getItem('theme');
if (currentTheme) {
    document.body.classList[currentTheme === 'dark' ? 'add' : 'remove']('dark-mode');
    toggleSwitch.checked = currentTheme === 'dark';
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
    
    targetHoursGroupElement.style.display = 'none';
    progressTextGroupElement.style.display = 'flex';
    
    const now = new Date();
    let elapsedTime = now - startTime - (totalBreakTime * 1000);
    if (isOnBreak) {
        elapsedTime -= (now - breakStartTime);
    }

    const elapsedHours = elapsedTime / 3600000;
    let percentage = Math.min((elapsedHours / targetHours) * 100, 100);
    
    updateProgressBar(percentage);
    updateTimeDisplay(elapsedHours);
    
    requestAnimationFrame(updateProgressAndTime);
}

// 重置進度顯示
function resetProgressDisplay() {
    targetHoursGroupElement.style.display = 'block';
    progressBarElement.style.width = '256px';
    progressElement.style.display = 'none';
    progressTextGroupElement.style.display = 'none';
}

// 更新進度條
function updateProgressBar(percentage) {
    progressElement.style.width = `${percentage}%`;
    progressPercentageElement.textContent = `${percentage.toFixed(1)}%`;
    
    if (percentage < 5) {
        progressElement.classList.add('pulsing');
        progressTextGroupElement.classList.add('pulsing');
    } else {
        progressElement.classList.remove('pulsing');
        progressTextGroupElement.classList.remove('pulsing');
    }
}

// 更新時間顯示
function updateTimeDisplay(elapsedHours) {
    const formatTime = (time) => time.toString().padStart(2, '0');
    const hours = Math.floor(elapsedHours);
    const minutes = Math.floor((elapsedHours * 60) % 60);
    const seconds = Math.floor((elapsedHours * 3600) % 60);
    
    currentWorkTimeElement.textContent = `${formatTime(hours)}:${formatTime(minutes)}:${formatTime(seconds)} / ${formatTime(Math.floor(targetHours))}:${formatTime(Math.round((targetHours % 1) * 60))}:00`;
}

// 開始工作
function work() {
    if (!startTime || isOnBreak) {
        updateTargetTime();
        if (isOnBreak) {
            endBreak();
        } else {
            startWork();
        }
        
        updateUIForWorkStart();
        startProgressUpdate();
    }
}

// 更新目標時間
function updateTargetTime() {
    let totalMinutes = parseInt(originalInput.slice(0, 2)) * 60 + parseInt(originalInput.slice(2, 4));
    totalMinutes = Math.min(totalMinutes, 99 * 60 + 60);

    targetHours = totalMinutes / 60;

    updateTimeDisplay();
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
    startBreakButton.classList.remove('disabled');
    startBreakButton.classList.add('normal');
    workButton.classList.remove('normal');
    workButton.classList.add('disabled');
    getOffButton.classList.remove('disabled');
    getOffButton.classList.add('normal');
    resetButton.classList.remove('disabled');
    resetButton.classList.add('normal');
    targetHoursGroupElement.style.display = 'none';
    progressBarElement.style.width = '100%';
    progressElement.style.display = 'block';
    progressElement.style.width = '2%';
    progressTextGroupElement.style.display = 'flex';
    updateButtonVisibility('working');
}

// 判定輸入的數值是否有效
function updateWorkButtonState() {
    const isValid = originalInput.length === 4;
    workButton.disabled = !isValid;
    workButton.classList.toggle('disabled', !isValid);
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
        element.style.opacity = '0.4';
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
        startBreakButton.classList.remove('normal');
        startBreakButton.classList.add('disabled');
        workButton.classList.remove('disabled');
        workButton.classList.add('normal');
        addRecord('Start Break');
        updateProgressAndTime();
        updateButtonVisibility('break');
    }
}

// 結束工作
function getOff() {
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
    startBreakButton.classList.remove('normal');
    startBreakButton.classList.add('disabled');
    workButton.classList.remove('disabled');
    workButton.classList.add('normal');
    workButton.querySelector('span').textContent = 'Work';
    getOffButton.classList.remove('normal');
    getOffButton.classList.add('disabled');
    resetButton.classList.remove('normal');
    resetButton.classList.add('disabled');
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
    workButton.classList.remove('disabled');
    workButton.classList.add('normal');
    startBreakButton.classList.remove('normal');
    startBreakButton.classList.add('disabled');
    getOffButton.classList.remove('normal');
    getOffButton.classList.add('disabled');
    resetButton.classList.remove('normal');
    resetButton.classList.add('disabled');
}

// 清除所有記錄
function clearRecords() {
    records = [];
    localStorage.removeItem('workRecords');
    displayRecords();
    alert('All records have been cleared.');
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
        'initial': { work: true, startBreak: false, getOff: false, reset: false },
        'working': { work: false, startBreak: true, getOff: true, reset: true },
        'break': { work: true, startBreak: false, getOff: true, reset: true }
    };
    
    Object.entries(states[state]).forEach(([button, isVisible]) => {
        document.getElementById(button).style.display = isVisible ? 'inline-flex' : 'none';
    });
}

// 事件監聽器設置

targetInput.addEventListener('input', (e) => {
    setAllElementsToSemiTransparent(); // 將所有元素更改為半透明狀態
    setAllElementsToZero(); // 將所有數值規零

    originalInput = e.target.value.replace(/\D/g, '').padStart(4, '0').slice(-4);
    
    // 根據輸入的數字數量設置透明度
    if (e.target.value.length >= 1) {
        minutesUnitsSpan.style.opacity = '1';
        targetTime.querySelector('.separatorM').style.opacity = '1';
    }
    if (e.target.value.length >= 2) {
        minutesTensSpan.style.opacity = '1';
    }
    if (e.target.value.length >= 3) {
        hoursUnitsSpan.style.opacity = '1';
        targetTime.querySelector('.separatorH').style.opacity = '1';
    }
    if (e.target.value.length >= 4) {
        hoursTensSpan.style.opacity = '1';
    }
    
    hoursTensSpan.textContent = originalInput[0];
    hoursUnitsSpan.textContent = originalInput[1];
    minutesTensSpan.textContent = originalInput[2];
    minutesUnitsSpan.textContent = originalInput[3];
    
    updateWorkButtonState();
});

targetInput.addEventListener('blur', () => {
    isEditing = false;
    targetInput.style.display = 'none';
    blinkingCursor.style.display = 'none';
    setAllElementsToVisible() // 將所有元素更改為正常可見狀態

    // Update targetHours for other functions
    targetHours = parseFloat(hoursSpan) + parseFloat(minutesSpan) / 60;
});

progressBarElement.addEventListener('click', () => {
    if (!isEditing) {
        isEditing = true;
        setAllElementsToSemiTransparent(); // 將所有元素更改為半透明狀態
        blinkingCursor.style.display = 'block';
        targetInput.style.display = 'block';
        targetInput.value = "" ;
        targetInput.focus();
    }
});

document.body.addEventListener('click', function(event) {
    const target = event.target.closest('button');
    if (!target) return;

    const actions = {
        'work': work,
        'startBreak': startBreak,
        'getOff': () => { if (confirm("Do you want to get off?")) getOff(); },
        'reset': () => { if (confirm("Are you sure?")) reset(); },
        'clearRecords': () => { if (confirm('Are you sure?')) clearRecords(); }
    };

    if (actions[target.id]) actions[target.id]();
});

document.getElementById('exportData').addEventListener('click', exportData);

// 初始化
requestAnimationFrame(updateClock);
displayRecords();
updateProgressAndTime();
updateButtonVisibility('initial');

// 移除按鈕上的 onclick 屬性
['work', 'startBreak', 'getOff', 'reset', 'clearRecords'].forEach(id => {
    document.getElementById(id).removeAttribute('onclick');
});
