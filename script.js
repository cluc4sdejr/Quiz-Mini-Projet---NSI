if (typeof window.Konami === 'undefined') {
    window.Konami = function (callback) {
        var pattern = "38384040373937396665";
        var input = "";
        var keydownHandler = function (e) {
            var code = e.keyCode || e.which;
            input += code;
            if (input.length > pattern.length) {
                input = input.substr(input.length - pattern.length);
            }
            if (input === pattern) {
                if (typeof callback === 'function') {
                    callback();
                }
                input = "";
            }
        };
        document.addEventListener('keydown', keydownHandler);
        return {
            unload: function () {
                document.removeEventListener('keydown', keydownHandler);
            }
        };
    };
}

var questions = [];
var index = 0;
var answers = {};
var score = 0;
var skippedIndices = [];
var isFinishing = false;
var toastTimer = null;
var toastCount = 1;

function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

function shuffleQuizData(questionsArray) {
    questionsArray.forEach(function (q) {
        if (q.answers && q.answerArray) {
            var correctIndex = parseInt(q.answerArray) - 1;
            var correctText = q.answers[correctIndex];
            shuffleArray(q.answers);
            q.answerArray = String(q.answers.indexOf(correctText) + 1);
        }
    });
    shuffleArray(questionsArray);
}

function getSystemInfo() {
    var userAgent = navigator.userAgent;

    var osName = 'Unknown OS';
    if (userAgent.indexOf('Win') > -1) osName = 'Windows';
    else if (userAgent.indexOf('Mac') > -1) osName = 'macOS';
    else if (userAgent.indexOf('X11') > -1) osName = 'Unix';
    else if (userAgent.indexOf('Linux') > -1) osName = 'Linux';
    else if (userAgent.indexOf('Android') > -1) osName = 'Android';
    else if (userAgent.indexOf('iPhone') > -1 || userAgent.indexOf('iPad') > -1) osName = 'iOS';

    var browserName = 'Unknown Browser';
    var browserVersion = 'Unknown';
    if (userAgent.indexOf('Chrome') > -1 && userAgent.indexOf('Edge') === -1) {
        browserName = 'Chrome';
        var chromeMatch = userAgent.match(/Chrome\/(\d+)/);
        browserVersion = chromeMatch ? chromeMatch[1] : 'Unknown';
    } else if (userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1) {
        browserName = 'Safari';
        var safariMatch = userAgent.match(/Version\/(\d+)/);
        browserVersion = safariMatch ? safariMatch[1] : 'Unknown';
    } else if (userAgent.indexOf('Firefox') > -1) {
        browserName = 'Firefox';
        var firefoxMatch = userAgent.match(/Firefox\/(\d+)/);
        browserVersion = firefoxMatch ? firefoxMatch[1] : 'Unknown';
    } else if (userAgent.indexOf('Edge') > -1) {
        browserName = 'Edge';
        var edgeMatch = userAgent.match(/Edg\/(\d+)/);
        browserVersion = edgeMatch ? edgeMatch[1] : 'Unknown';
    } else if (userAgent.indexOf('Trident') > -1) {
        browserName = 'IE';
        var ieMatch = userAgent.match(/Trident.*rv:(\d+)/);
        browserVersion = ieMatch ? ieMatch[1] : 'Unknown';
    }

    var screenWidth = window.screen.width;
    var screenHeight = window.screen.height;
    var screenDPI = window.devicePixelRatio ? window.devicePixelRatio : 1;
    var screenInfo = screenWidth + 'x' + screenHeight + ' @ ' + Math.round(screenDPI * 100) + '%';

    var language = navigator.language || navigator.userLanguage || 'Unknown';

    var timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return {
        osName: osName,
        browserName: browserName,
        browserVersion: browserVersion,
        screenInfo: screenInfo,
        language: language,
        timezone: timezone,
        userAgent: userAgent
    };
}

$(document).ready(function () {
    var jsonUrl = 'questions.json';

    var importedData = localStorage.getItem('importedQuizData');
    var dataSource = 'original';
    var dataToLoad = null;

    if (importedData) {
        try {
            dataToLoad = JSON.parse(importedData);
            dataSource = 'imported';
        } catch (e) {
            dataToLoad = null;
        }
    }

    if (!window.currentQuizId && $('.q-container').length > 0) {
        if (dataToLoad) {
            processQuizData(dataToLoad, dataSource);
        } else {
            $.getJSON(jsonUrl, function (data) {
                processQuizData(data, 'original');
            });
        }
    }

    function processQuizData(data, source) {
        questions = [];
        index = 0;
        answers = {};
        score = 0;
        skippedIndices = [];
        isFinishing = false;

        window.quizData = data;
        dataSource = source;
        var allQuestions = data.questions;
        var metaTitle = data.meta.title;
        var metaDescription = data.meta.description;
        var metaAuthor = data.meta.author;
        var metaDifficulty = data.meta.difficulty;
        var metaCreationDate = data.meta.creationDate;
        var metaVersion = data.meta.version;
        var userAgent = navigator.userAgent;
        var keys = Object.keys(allQuestions);

        var timestampInMilliSeconds = metaCreationDate * 1000;
        var date = new Date(timestampInMilliSeconds);

        var day = (date.getDate() < 10 ? '0' : '') + date.getDate();
        var month = (date.getMonth() < 9 ? '0' : '') + (date.getMonth() + 1);
        var year = date.getFullYear();

        var hours = ((date.getHours() % 12 || 12) < 10 ? '0' : '') + (date.getHours() % 12 || 12);
        var minutes = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
        var meridiem = (date.getHours() >= 12) ? 'PM' : 'AM';

        var formattedDate = day + '-' + month + '-' + year + ' at ' + hours + ':' + minutes + ' ' + meridiem;

        var sourceLabel = dataSource === 'imported' ? ' (IMPORTED)' : '';
        $('#debugTitle').html('Source : ' + '<span class="debugFileName">' + jsonUrl + '</span>' + sourceLabel);
        $('#metaTitle').text('Titre : ' + metaTitle);
        $('#metaDescription').text('Description : ' + metaDescription);
        $('#metaAuthor').text('Auteur : ' + metaAuthor);
        $('#metaDifficulty').text('Difficulté : ' + metaDifficulty);
        $('#metaVersion').text('Version : ' + metaVersion)
        $('#metaCreationDate').text('Créé le : ' + formattedDate)

        var systemInfo = getSystemInfo();
        $('#osInfo').text('OS: ' + systemInfo.osName);
        $('#browserInfo').text('Browser: ' + systemInfo.browserName + ' v' + systemInfo.browserVersion);
        $('#screenInfo').text('Screen: ' + systemInfo.screenInfo);
        $('#languageInfo').text('Language: ' + systemInfo.language);
        $('#timezoneInfo').text('Timezone: ' + systemInfo.timezone);
        $('#userAgent').text('UserAgent: ' + systemInfo.userAgent)

        console.log(userAgent);

        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var item = allQuestions[key];
            questions.push(item);
        }

        shuffleQuizData(questions);

        $('#totalQuestions').text('Questions: ' + questions.length);
        $('#gameState').text('State: INITIALIZED');
        $('#currentQuestion').text('Current: -');
        $('#answered').text('Answered: 0');
        $('#skipped').text('Skipped: 0');
        $('#currentScore').text('Score: 0');
        updateDebugInfo();

        var savedData = localStorage.getItem('quiz');

        if (savedData != null) {
            var parsedData = JSON.parse(savedData);

            if (parsedData.index > 0 && (parsedData.index < questions.length || (parsedData.skippedIndices && parsedData.skippedIndices.length > 0))) {
                $('.recovery-alert').removeClass('hidden');

                $('#btn-recovery').off('click').click(function () {
                    index = parsedData.index;
                    answers = parsedData.answers;
                    score = parsedData.score;
                    skippedIndices = parsedData.skippedIndices || [];
                    isFinishing = parsedData.isFinishing || false;
                    $('.recovery-alert').addClass('hidden');
                    showQuizStep();
                });
            } else if (parsedData.index >= questions.length && (!parsedData.skippedIndices || parsedData.skippedIndices.length === 0)) {
                localStorage.removeItem('quiz');
            }
        }

        var imagesToLoad = [];
        for (var j = 0; j < questions.length; j++) {
            var q = questions[j];
            var mediaUrl = q.media || q.image;
            var mediaType = q.mediaType || 'image';
            if (mediaUrl && mediaType !== 'video') {
                imagesToLoad.push(mediaUrl);
            }
        }

        var loadedImagesCount = 0;

        function finishLoading() {
            $('#loader').addClass('hide');

            if (index == 0) {
                showStartScreen();
            } else {
                showQuizStep();
            }
        }

        if (imagesToLoad.length === 0) {
            finishLoading();
        } else {
            for (var k = 0; k < imagesToLoad.length; k++) {
                var img = new Image();
                img.onload = function () {
                    loadedImagesCount++;
                    if (loadedImagesCount === imagesToLoad.length) finishLoading();
                };
                img.onerror = function () {
                    loadedImagesCount++;
                    if (loadedImagesCount === imagesToLoad.length) finishLoading();
                };
                img.src = imagesToLoad[k];
            }
        }
    }

    var currentZoom = 1;
    var isDragging = false;
    var startX, startY;
    var translateX = 0, translateY = 0;

    function updateZoomTransform() {
        $('#zoomImage').css('transform', `translate(${translateX}px, ${translateY}px) scale(${currentZoom})`);
    }

    function resetZoom() {
        currentZoom = 1;
        translateX = 0;
        translateY = 0;
        updateZoomTransform();
    }

    window.bindQuizEvents = function () {
        $('#closeZoom').off('click').click(function () {
            $('#zoomModal').addClass('hidden');
            setTimeout(resetZoom, 400);
        });

        $('#zoomModal').off('click').click(function (e) {
            if (e.target === this || $(e.target).hasClass('zoom-wrapper') || $(e.target).closest('.zoom-modal-content').length === 0 && e.target.id !== 'zoomImage' && !$(e.target).closest('.zoom-controls').length && e.target.id !== 'closeZoom') {
                $('#zoomModal').addClass('hidden');
                setTimeout(resetZoom, 400);
            }
        });

        $(document).off('keydown.zoommodal').on('keydown.zoommodal', function (e) {
            if (e.key === 'Escape') {
                $('#zoomModal').addClass('hidden');
                setTimeout(resetZoom, 400);
            }
        });

        $('#zoomInBtn').off('click').click(function (e) {
            e.stopPropagation();
            currentZoom = Math.min(currentZoom + 0.5, 5);
            updateZoomTransform();
        });

        $('#zoomOutBtn').off('click').click(function (e) {
            e.stopPropagation();
            currentZoom = Math.max(currentZoom - 0.5, 0.5);
            updateZoomTransform();
        });

        $('#zoomResetBtn').off('click').click(function (e) {
            e.stopPropagation();
            resetZoom();
        });

        $('#zoomImage').off('wheel').on('wheel', function (e) {
            e.preventDefault();
            if (e.originalEvent.deltaY < 0) {
                currentZoom = Math.min(currentZoom + 0.2, 5);
            } else {
                currentZoom = Math.max(currentZoom - 0.2, 0.5);
            }
            updateZoomTransform();
        });

        $('#zoomImage').off('mousedown touchstart').on('mousedown touchstart', function (e) {
            e.preventDefault();
            isDragging = true;
            var clientX = e.type === 'touchstart' ? e.originalEvent.touches[0].clientX : e.clientX;
            var clientY = e.type === 'touchstart' ? e.originalEvent.touches[0].clientY : e.clientY;

            startX = clientX - translateX;
            startY = clientY - translateY;
        });

        $(window).off('mousemove touchmove').on('mousemove touchmove', function (e) {
            if (!isDragging) return;
            var clientX = e.type === 'touchmove' ? e.originalEvent.touches[0].clientX : e.clientX;
            var clientY = e.type === 'touchmove' ? e.originalEvent.touches[0].clientY : e.clientY;

            translateX = clientX - startX;
            translateY = clientY - startY;
            updateZoomTransform();
        });

        $(window).off('mouseup touchend').on('mouseup touchend', function () {
            isDragging = false;
        });

        var quizDataForSave = null;

        $('#btn-save-quiz').off('click').click(function () {
            var quizId = window.currentQuizId;
            var quizData = window.quizData;

            if (!quizData) {
                showToast('Aucun quiz chargé', 'error');
                return;
            }

            var filename = 'quiz-backup-' + new Date().getTime() + '.json';
            if (quizData.meta && quizData.meta.title) {
                filename = quizData.meta.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.json';
            }

            var dataStr = JSON.stringify(quizData, null, 2);
            var dataBlob = new Blob([dataStr], { type: 'application/json' });
            var url = URL.createObjectURL(dataBlob);
            var $link = $('<a>', {
                href: url,
                download: filename
            }).appendTo('body');
            $link[0].click();
            $link.remove();
            URL.revokeObjectURL(url);
            showToast('Quiz téléchargé: ' + filename, 'success');
        });

        $('#btn-theme').off('click').click(function () {
            toggleTheme();
        });

        $('#theme-checkbox').on('change', function () {
            toggleTheme();
        });

        function toggleTheme() {
            if ($('body').hasClass("dark")) {
                $('body').attr('class', '');
                $('#theme-checkbox').prop('checked', false);
                localStorage.setItem('quiz-theme', 'light');
            }
            else {
                $('body').attr('class', 'dark');
                $('#theme-checkbox').prop('checked', true);
                localStorage.setItem('quiz-theme', 'dark');
            }
        }

        var savedTheme = localStorage.getItem('quiz-theme');
        if (savedTheme === 'dark') {
            $('body').addClass('dark');
            $('#theme-checkbox').prop('checked', true);
        }

        $('#btn-settings').off('click').click(function () {
            $('#settingsModal').removeClass('hidden');
        });

        $('#closeSettings, #saveSettingsBtn').off('click').click(function () {
            $('#settingsModal').addClass('hidden');
        });

        $(window).off('click.settings').on('click.settings', function (event) {
            if (event.target.id === 'settingsModal') {
                $('#settingsModal').addClass('hidden');
            }
        });

        $('#btn-import-quiz').off('click').click(function () {
            $('#quiz-file-input').click();
        });

        $('#quiz-file-input').off('change').on('change', function (e) {
            var file = e.target.files[0];
            if (file) {
                var reader = new FileReader();
                reader.onload = function (event) {
                    try {
                        var importedData = JSON.parse(event.target.result);
                        if (importedData.questions && importedData.meta) {
                            localStorage.setItem('importedQuizData', JSON.stringify(importedData));
                            showToast('Quiz Importé ! Actualise pour appliquer.', 'success');
                        } else {
                            showToast('Format de quizz invalide.', 'error');
                        }
                    } catch (err) {
                        showToast('Erreur lors de la lecture du fichier.', 'error');
                    }
                };
                reader.readAsText(file);
            }
            this.value = '';
        });

        $('#btn-reset-quiz').off('click').click(function () {
            localStorage.removeItem('importedQuizData');
            showToast('Les données ont étées supprimées avec succès !', 'success');
        });

        checkAndSetupDevMode();
    };
    window.bindQuizEvents();
});

function saveProgress() {
    var quizId = window.currentQuizId || "default";
    var status = {
        index: index,
        answers: answers,
        score: score,
        skippedIndices: skippedIndices,
        isFinishing: isFinishing,
        totalQuestions: questions.length
    };
    var jsonString = JSON.stringify(status);
    localStorage.setItem('quiz_progress_' + quizId, jsonString);
}

function updateDebugInfo() {
    var answerCount = Object.keys(answers).length;
    var gameState = 'IDLE';
    var currentQIndex = '-';

    if (questions.length === 0) {
        gameState = 'LOADING';
    } else if (index === 0 && answerCount === 0 && skippedIndices.length === 0) {
        gameState = 'WAITING TO START';
    } else if (index < questions.length || (index >= questions.length && skippedIndices.length > 0)) {
        gameState = 'PLAYING';
        currentQIndex = (index + 1) + '/' + questions.length;
    } else if (index >= questions.length && skippedIndices.length === 0) {
        gameState = 'FINISHED';
    }

    $('#gameState').text('État : ' + gameState);
    $('#currentQuestion').text('Question : ' + currentQIndex);
    $('#answered').text('Répondu : ' + answerCount);
    $('#skipped').text('Ignoré : ' + skippedIndices.length);
    $('#currentScore').text('Score : ' + score);
}

function showToast(message, variant = "default") {
    var iconHTML = '';
    var variantClass = 'toast-' + variant;

    if (variant === 'success') {
        iconHTML = '<i class="hgi hgi-stroke hgi-tick-02"></i>';
    } else if (variant === 'error') {
        iconHTML = '<i class="hgi hgi-stroke hgi-cancel-01"></i>';
    } else if (variant === 'warn') {
        iconHTML = '<i class="hgi hgi-stroke hgi-alert-02"></i>';
    } else if (variant === 'skip') {
        iconHTML = '<i class="hgi hgi-stroke hgi-next"></i>';
    } else {
        iconHTML = '<i class="hgi hgi-stroke hgi-information-circle"></i>';
    }

    var $existingToast = $('#toast-container .toast');

    if ($existingToast.length > 0) {
        var existingText = $existingToast.find('.toast-message').text();
        if (existingText === message) {
            toastCount++;
            var $countLabel = $existingToast.find('.toast-count');
            if ($countLabel.length === 0) {
                $countLabel = $('<span>', { class: 'toast-count' });
                $existingToast.append($countLabel);
            }
            $countLabel.text('x' + toastCount);

            clearTimeout(toastTimer);
            toastTimer = setTimeout(function () {
                $existingToast.removeClass('show');
                setTimeout(function () {
                    $existingToast.remove();
                }, 400);
            }, 3000);
            return;
        } else {
            $existingToast.remove();
            clearTimeout(toastTimer);
        }
    }

    toastCount = 1;
    var $toast = $('<div>', { class: 'toast ' + variantClass });
    var $iconSpan = $('<span>', { class: 'toast-icon' }).html(iconHTML);
    var $messageSpan = $('<span>', { class: 'toast-message' }).text(message);

    $toast.append($iconSpan).append($messageSpan);

    $('#toast-container').empty().append($toast);

    setTimeout(function () {
        $toast.addClass('show');
    }, 10);

    toastTimer = setTimeout(function () {
        $toast.removeClass('show');
        setTimeout(function () {
            $toast.remove();
        }, 400);
    }, 3000);
}

function updateScoreDisplay() {
    var total = questions.length;
    var currentScore = 0;

    for (var i = 0; i < total; i++) {
        if (answers[i] && answers[i] == questions[i].answerArray) {
            currentScore++;
        }
    }

    score = currentScore;
    $('#score').text(currentScore);
}

function showStartScreen() {
    $('.q-c-progress').addClass('hidden');
    $('.p-thing').css('width', '0%').text('0%');

    var welcomeTitle = 'Bienvenue !';
    var welcomeDescription = "Bienvenue dans ce Quiz, ce dernier a été réalisé par l'utilisateur " + window.quizData.meta.author + '.';

    if (window.quizData && window.quizData.meta && window.quizData.meta.welcome) {
        welcomeTitle = window.quizData.meta.welcome.title || welcomeTitle;
        welcomeDescription = window.quizData.meta.welcome.description || welcomeDescription;
    }

    $('.q-question').text(welcomeTitle);
    $('.q-options').text(welcomeDescription);
    $('#p-count').text('Question 0/' + questions.length);
    $('#p-percent').text('0%');
    $('#score').text('0');
    $('.q-progress').empty();
    $('#btn-validate').text('Commencer le quizz').removeClass('hidden');
    $('#btn-skip').addClass('hidden');
    $('.q-container').addClass('start-screen');

    $('#btn-validate').off('click').click(function () {
        index = 0;
        answers = {};
        score = 0;
        skippedIndices = [];
        $('.recovery-alert').addClass('hidden');
        saveProgress();
        updateDebugInfo();
        showQuizStep();
    });

    updateDebugInfo();
}

function showQuizStep() {
    var totalQuestions = questions.length;

    if (index >= totalQuestions && skippedIndices.length === 0) {
        showFinalResults();
        return;
    }

    if (index >= totalQuestions && skippedIndices.length > 0) {
        index = skippedIndices.shift();
    }

    $('.q-container').removeClass('start-screen');
    $('.q-c-progress').removeClass('hidden');
    $('#btn-validate').addClass('hidden');
    
    var currentQuestion = questions[index];

    // Handle skip option visibility
    if (window.quizData && window.quizData.meta && window.quizData.meta.allowSkip === false) {
        $('#btn-skip').addClass('hidden');
    } else {
        $('#btn-skip').removeClass('hidden');
    }

    // Handle countdown timer
    startQuestionTimer();

    var hadMedia = $('.q-media').length > 0 && $('.q-media').css('opacity') !== '0';
    $('.q-media').remove();

    $('.q-progress').empty();
    for (var k = 0; k < totalQuestions; k++) {
        var $step = $('<div>', { class: 'p-step' });
        if (answers[k]) {
            $step.addClass('filled');
        } else if (k === index) {
            $step.addClass('current');
            if (isFinishing) $step.addClass('skipped');
        } else if (skippedIndices.includes(k)) {
            $step.addClass('skipped');
        }
        $('.q-progress').append($step);
    }

    var answeredCount = Object.keys(answers).length;
    var progressPercent = Math.round((answeredCount / totalQuestions) * 100);

    $('#p-count').text('Question ' + answeredCount + '/' + totalQuestions);
    $('#p-percent').text(progressPercent + '%');
    updateScoreDisplay();

    var questionText = currentQuestion.question;
    $('.q-question').html(questionText);

    if (currentQuestion.media || currentQuestion.image) {
        var mediaUrl = currentQuestion.media || currentQuestion.image;
        var mediaType = currentQuestion.mediaType || 'image';
        var $newMedia = $('<div>', { class: 'q-media' });

        if (mediaType === 'video') {
            if (mediaUrl.includes('youtube.com') || mediaUrl.includes('youtu.be') || /^[a-zA-Z0-9_-]{11}$/.test(mediaUrl)) {
                var videoId = '';
                var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                var match = mediaUrl.match(regExp);
                if (match && match[2].length == 11) {
                    videoId = match[2];
                } else if (/^[a-zA-Z0-9_-]{11}$/.test(mediaUrl)) {
                    videoId = mediaUrl;
                }
                
                if (videoId) {
                    var $iframe = $('<iframe>', {
                        src: 'https://www.youtube.com/embed/' + videoId,
                        frameborder: '0',
                        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
                        allowfullscreen: true
                    }).css({
                        'width': '100%',
                        'height': '280px',
                        'border-radius': '6px',
                        'display': 'block',
                        'margin': '0 auto'
                    });
                    $newMedia.append($iframe);
                } else {
                    var $video = $('<video>', { src: mediaUrl, playsinline: true, controls: true });
                    $newMedia.append($video);
                }
            } else {
                var $video = $('<video>', {
                    src: mediaUrl,
                    playsinline: true,
                    controls: true
                }).css({
                    'max-width': '100%',
                    'max-height': '280px',
                    'border-radius': '6px',
                    'outline': 'none',
                    'display': 'block',
                    'margin': '0 auto'
                });
                $newMedia.append($video);
            }
        } else {
            var $img = $('<img>', { src: mediaUrl, alt: 'Question media' });
            var $zoomBtn = $('<button>', { class: 'zoom-btn' });

            var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            $(svg).attr({
                width: '18',
                height: '18',
                viewBox: '0 0 24 24',
                fill: 'none',
                stroke: 'currentColor',
                'stroke-width': '2',
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round'
            });

            var polyline1 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            polyline1.setAttribute('points', '15 3 21 3 21 9');
            var polyline2 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            polyline2.setAttribute('points', '9 21 3 21 3 15');
            var line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            $(line1).attr({ x1: '21', y1: '3', x2: '14', y2: '10' });
            var line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            $(line2).attr({ x1: '3', y1: '21', x2: '10', y2: '14' });

            svg.appendChild(polyline1);
            svg.appendChild(polyline2);
            svg.appendChild(line1);
            svg.appendChild(line2);

            $zoomBtn.append(svg).append($('<span>').text(' Agrandir'));
            $newMedia.append($img).append($zoomBtn);
        }

        if (!hadMedia) {
            $newMedia.css({
                'max-height': '0px',
                'opacity': '0',
                'margin': '0',
                'padding': '0',
                'border-width': '0px'
            });
        }

        $('.q-question').after($newMedia);

        if (!hadMedia) {
            setTimeout(function () {
                $newMedia.css({
                    'max-height': '300px',
                    'opacity': '1',
                    'margin': '',
                    'padding': '',
                    'border-width': ''
                });
            }, 10);
        }

        if (mediaType !== 'video') {
            $('.q-media img, .zoom-btn').off('click').click(function (e) {
                e.stopPropagation();
                $('#zoomImage').attr('src', mediaUrl);
                $('#zoomModal').removeClass('hidden');
            });
        }
    }

    $('.q-options').empty();
    for (var j = 0; j < currentQuestion.answers.length; j++) {
        var answerId = j + 1;
        var answerLabel = currentQuestion.answers[j];

        var $button = $('<button>', {
            class: 'q-option',
            'data-ans': answerId
        });
        $button.append($('<span>', { class: 'code' }).html(answerLabel));

        if (answers[index] == answerId) {
            $button.addClass('selected');
        }

        $('.q-options').append($button);
    }

    $('.q-option').off('click').click(function () {
        var selectedValue = $(this).attr('data-ans');
        answers[index] = selectedValue;

        $('.q-option').removeClass('selected');
        $(this).addClass('selected');

        var total = questions.length;
        var answeredCount = Object.keys(answers).length;
        var percent = Math.round((answeredCount / total) * 100);
        $('#p-count').text('Question ' + answeredCount + '/' + total);
        $('#p-percent').text(percent + '%');
        updateScoreDisplay();
        updateDebugInfo();
        $('.q-progress .p-step').eq(index).addClass('filled').removeClass('current pulse-step skipped');

        saveProgress();

        setTimeout(function () {
            goToNextStep();
        }, 300);
    });

    $('#btn-skip').off('click').click(function () {
        skippedIndices.push(index);
        saveProgress();
        showToast('Question mise de côté', 'skip');
        updateDebugInfo();
        goToNextStep();
    });

    updateDebugInfo();
}

function goToNextStep() {
    var $media = $('.q-media');
    var totalQuestions = questions.length;

    var nextIndexRequested = -1;
    var nextIsReview = isFinishing;

    if (index < totalQuestions - 1 && !isFinishing) {
        nextIndexRequested = index + 1;
    } else if (skippedIndices.length > 0) {
        isFinishing = true;
        nextIndexRequested = skippedIndices[0];
    }

    var nextQuestion = nextIndexRequested !== -1 ? questions[nextIndexRequested] : null;
    var nextHasMedia = nextQuestion && (nextQuestion.media || nextQuestion.image);

    var transitionAndShow = function () {
        if (index < totalQuestions - 1 && !isFinishing) {
            index = index + 1;
            showQuizStep();
        } else if (skippedIndices.length > 0) {
            isFinishing = true;
            index = skippedIndices.shift();
            showQuizStep();
        } else {
            index = totalQuestions;
            saveProgress();
            showFinalResults();
        }
    };

    if ($media.length > 0 && !nextHasMedia) {
        $media.css({
            'max-height': '0px',
            'opacity': '0',
            'margin': '0',
            'padding': '0',
            'border-width': '0px'
        });

        setTimeout(transitionAndShow, 300);
        updateScoreDisplay();
        var total = questions.length;

        score = 0;
        for (var i = 0; i < total; i++) {
            if (answers[i] == questions[i].answerArray) {
                score++;
            }
        }

        var finalRatio = score / total;
    } else {
        transitionAndShow();
        updateScoreDisplay();
        var total = questions.length;

        score = 0;
        for (var i = 0; i < total; i++) {
            if (answers[i] == questions[i].answerArray) {
                score++;
            }
        }

        var finalRatio = score / total;
    }
}

function showFinalResults() {
    stopQuestionTimer();
    var total = questions.length;

    score = 0;
    for (var i = 0; i < total; i++) {
        if (answers[i] == questions[i].answerArray) {
            score++;
        }
    }

    var finalRatio = score / total;
    var finalPercent = Math.round(finalRatio * 100);

    var quizId = window.currentQuizId || "default";
    localStorage.setItem('quiz_completed_' + quizId, 'true');
    localStorage.removeItem('quiz_progress_' + quizId);

    var message = '';

    if (finalPercent === 100) {
        message = 'MAIS QUEL GOAT LUI';
    } else if (finalPercent >= 80) {
        message = 'Quasi perfect ça je reconnais ^^';
    } else if (finalPercent >= 60) {
        message = 'Ehh t\'es bon, t\'es bon ! (mais pas assez)';
    } else if (finalPercent >= 50) {
        message = "Alors, c'est ni mauvais, ni bon (abruti)";
    } else if (finalPercent >= 20) {
        message = 'Bro pensait cook, il a burn.';
    } else {
        message = 'Fréro.. t\'abuses franchement.';
    }

    var $resultsContainer = $('<div>', { class: 'results-container' });
    var $resultsTitle = $('<h2>', { class: 'results-title' }).text('Quiz terminé!');
    var $resultsCard = $('<div>', { class: 'results-card' });
    var $scoreDisplay = $('<div>', { class: 'score-display' });
    var $scoreBig = $('<div>', { class: 'score-big' });
    var $scoreValue = $('<div>', { class: 'score-item-value' }).text(score + '/' + total);
    var $scoreLabel = $('<div>', { class: 'score-label' }).text('Bonnes réponses');
    var $resultsMessage = $('<p>', { class: 'results-message' }).text(message);

    $scoreBig.append($scoreValue).append($scoreLabel);
    $scoreDisplay.append($scoreBig);
    $resultsCard.append($scoreDisplay).append($resultsMessage);
    $resultsContainer.append($resultsTitle).append($resultsCard);

    $('.q-question').html('').append($resultsContainer);
    $('.q-options').html('');
    $('.q-media').remove();
    $('.q-option').remove();

    $('#p-count').text('Question ' + total + '/' + total);
    $('#p-percent').text('100%');
    $('.q-progress .p-step').removeClass('current pulse-step').addClass('filled');

    $('.p-thing').css('width', '100%').text('100%');
    $('#btn-validate').text('Recommencer').removeClass('hidden');
    $('#btn-skip').text('Quiz suivant →').removeClass('hidden');

    $('#btn-validate').off('click');
    $('#btn-validate').click(function () {
        var quizId = window.currentQuizId || "default";
        localStorage.removeItem('quiz_progress_' + quizId);
        if (window.quizData) {
            initializeQuizFromData(window.quizData);
        }
    });

    $('#btn-skip').off('click');
    $('#btn-skip').click(function () {
        var currentQuizId = window.currentQuizId || "default";
        getNextQuizAndLoad(currentQuizId);
    });

    updateDebugInfo();

    // Trigger the parody ad popup at the end of the quiz
    setTimeout(function () {
        // Ne pas afficher le conteneur si les cookies ont déjà été acceptés
        if (localStorage.getItem('urssaf_popup_shown') === 'true') {
            return;
        }
        
        var $adContainer = $('#adContainer');
        if ($adContainer.length === 0 && window.savedLandingPage) {
            // Find/extract the adContainer from the savedLandingPage clone
            var $adClone = window.savedLandingPage.filter('#adContainer');
            if ($adClone.length === 0) {
                $adClone = window.savedLandingPage.find('#adContainer');
            }
            if ($adClone.length > 0) {
                $('body').append($adClone.clone(true, true));
            }
        }
        
        // Reset steps and states inside the ad popup in case it was opened before
        $('#adCookieBanner').show();
        $('#adPopup').hide();
        $('.declaredonc').show();
        $('.formcringe').hide();
        $('#formStep1').show();
        $('#formStep2').hide();
        $('#stepIndicator2').removeClass('active');
        $('#subscribeUrssafPlus').prop('checked', true);
        $('#cardNumber').val('4970 8273 9918 0041');
        $('#cardExpiry').val('12/32');
        $('#cardCvv').val('404');
        
        // Marquer la popup comme affichée
        localStorage.setItem('urssaf_popup_shown', 'true');
        
        // Display the ad wrapper
        $('#adContainer').fadeIn(400);
    }, 1500); // 1.5 seconds delay so the user can see their final score first before being tax-slammed!
}

function checkAndSetupDevMode() {
    var devActive = localStorage.getItem('developer-mode') === 'true';
    if (!$('.debug-toggle-btn').length) {
        $('<button class="debug-toggle-btn">🔧 Debug</button>').appendTo('body');
    }
    if (devActive) {
        $('.debug-toggle-btn').show();
        $(document).off('keydown.cheatcode').on('keydown.cheatcode', function (event) {
            if (event.key === 'Escape') {
                $('.debug-container').hide();
            }
            if (event.key === 'c' || event.key === 'C') {
                $('.debug-cheats').show();
            }
        });
    } else {
        $('.debug-toggle-btn').hide();
    }
}

var easter_egg = new Konami(function () {
    localStorage.setItem('developer-mode', 'true');
    checkAndSetupDevMode();
    $('.debug-container').show();
    if (typeof showToast === 'function') {
        showToast('Mode Développeur Activé 🔧', 'success');
    }
});

$(document).ready(function () {
    checkAndSetupDevMode();

    $(document).on('click', '.debug-toggle-btn', function () {
        var $debugContainer = $('.debug-container');
        if ($debugContainer.is(':visible')) {
            $debugContainer.hide();
        } else {
            $debugContainer.show();
        }
    });
});

function initializeQuizFromData(quizData) {
    questions = [];
    index = 0;
    answers = {};
    score = 0;
    skippedIndices = [];
    isFinishing = false;
    stopQuestionTimer();

    window.quizData = quizData;

    var allQuestions = quizData.questions;
    var metaTitle = quizData.meta.title;
    var metaDescription = quizData.meta.description;
    var metaAuthor = quizData.meta.author;
    var metaDifficulty = quizData.meta.difficulty;
    var metaCreationDate = quizData.meta.creationDate;
    var metaVersion = quizData.meta.version;
    var dataSource = 'loaded';
    var keys = Object.keys(allQuestions);

    var timestampInMilliSeconds = metaCreationDate * 1000;
    var date = new Date(timestampInMilliSeconds);
    var day = (date.getDate() < 10 ? '0' : '') + date.getDate();
    var month = (date.getMonth() < 9 ? '0' : '') + (date.getMonth() + 1);
    var year = date.getFullYear();
    var hours = ((date.getHours() % 12 || 12) < 10 ? '0' : '') + (date.getHours() % 12 || 12);
    var minutes = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
    var meridiem = (date.getHours() >= 12) ? 'PM' : 'AM';
    var formattedDate = day + '-' + month + '-' + year + ' at ' + hours + ':' + minutes + ' ' + meridiem;

    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var item = allQuestions[key];
        questions.push(JSON.parse(JSON.stringify(item)));
    }

    var shuffleQ = quizData.meta.shuffleQuestions !== false;
    var shuffleA = quizData.meta.shuffleQuestions !== false; // or separate shuffleAnswers if we want

    if (shuffleA) {
        questions.forEach(function (q) {
            if (q.answers && q.answerArray) {
                var correctIndex = parseInt(q.answerArray) - 1;
                var correctText = q.answers[correctIndex];
                shuffleArray(q.answers);
                q.answerArray = String(q.answers.indexOf(correctText) + 1);
            }
        });
    }

    if (shuffleQ) {
        shuffleArray(questions);
    }

    console.log('Quiz initialisé avec ' + questions.length + ' questions');

    try {
        $('#debugTitle').html('Quiz Chargé: ' + '<span class="debugFileName">' + metaTitle + '</span>');
        $('#metaTitle').text('Title: ' + metaTitle);
        $('#metaDescription').text('Description: ' + metaDescription);
        $('#metaAuthor').text('Author: ' + metaAuthor);
        $('#metaDifficulty').text('Difficulty (id): ' + metaDifficulty);
        $('#metaVersion').text('Version: ' + metaVersion);
        $('#metaCreationDate').text('[UNIX] Created on: ' + formattedDate);

        var systemInfo = getSystemInfo();
        $('#osInfo').text('OS: ' + systemInfo.osName);
        $('#browserInfo').text('Browser: ' + systemInfo.browserName + ' v' + systemInfo.browserVersion);
        $('#screenInfo').text('Screen: ' + systemInfo.screenInfo);
        $('#languageInfo').text('Language: ' + systemInfo.language);
        $('#timezoneInfo').text('Timezone: ' + systemInfo.timezone);
        $('#userAgent').text('UserAgent: ' + systemInfo.userAgent);

        $('#totalQuestions').text('Questions: ' + questions.length);
        $('#gameState').text('State: INITIALIZED');
        $('#currentQuestion').text('Current: -');
        $('#answered').text('Answered: 0');
        $('#skipped').text('Skipped: 0');
        $('#currentScore').text('Score: 0');
        updateDebugInfo();
    } catch (e) {
        console.warn('⚠️ Impossible de mettre à jour le debug:', e);
    }

    var quizIdKey = window.currentQuizId || "default";
    var savedData = localStorage.getItem('quiz_progress_' + quizIdKey);
    if (savedData != null) {
        var parsedData = JSON.parse(savedData);
        if (parsedData.index > 0 && (parsedData.index < questions.length || (parsedData.skippedIndices && parsedData.skippedIndices.length > 0))) {
            $('.recovery-alert').removeClass('hidden');
            $('#btn-recovery').off('click').click(function () {
                index = parsedData.index;
                answers = parsedData.answers;
                score = parsedData.score;
                skippedIndices = parsedData.skippedIndices || [];
                isFinishing = parsedData.isFinishing || false;
                $('.recovery-alert').addClass('hidden');
                showQuizStep();
            });
        } else if (parsedData.index >= questions.length && (!parsedData.skippedIndices || parsedData.skippedIndices.length === 0)) {
            localStorage.removeItem('quiz_progress_' + quizIdKey);
        }
    }

    var imagesToLoad = [];
    for (var j = 0; j < questions.length; j++) {
        var q = questions[j];
        var mediaUrl = q.media || q.image;
        var mediaType = q.mediaType || 'image';
        if (mediaUrl && mediaType !== 'video') {
            imagesToLoad.push(mediaUrl);
        }
    }

    var loadedImagesCount = 0;

    function finishLoading() {
        $('#loader').addClass('hide');
        if (index == 0) {
            showStartScreen();
        } else {
            showQuizStep();
        }
    }

    if (imagesToLoad.length === 0) {
        finishLoading();
    } else {
        for (var k = 0; k < imagesToLoad.length; k++) {
            var img = new Image();
            img.onload = function () {
                loadedImagesCount++;
                if (loadedImagesCount === imagesToLoad.length) finishLoading();
            };
            img.onerror = function () {
                loadedImagesCount++;
                if (loadedImagesCount === imagesToLoad.length) finishLoading();
            };
            img.src = imagesToLoad[k];
        }
    }
};

function openCreateQuizModal() {
    $('#createQuizModal').removeClass('hidden');
    $('.creator-tab-btn').removeClass('active').first().addClass('active');
    $('.creator-tab-content').hide().first().show();
    $('#questionsContainer').empty();
    addQuestion();
}

function closeCreateQuizModal() {
    $('#createQuizModal').addClass('hidden');
    $('#quizCreatorForm')[0].reset();
}

function addQuestion() {
    var questionCount = $('#questionsContainer .question-card').length + 1;
    var questionId = 'q-' + questionCount;

    var questionHTML = '<div class="question-card" data-question-id="' + questionId + '">' +
        '<div class="question-card-header">' +
        '<span class="question-card-number">Question ' + questionCount + '</span>' +
        '<button type="button" class="btn-remove-question" onclick="$(this).closest(\'.question-card\').remove(); updateQuestionNumbers();">' +
        'Supprimer' +
        '</button>' +
        '</div>' +
        '<div class="question-card-body">' +
        '<div class="form-group">' +
        '<label>Énoncé de la question <span class="required">*</span></label>' +
        '<input type="text" class="question-text" placeholder="Ex: Quelle est la valeur de 10 % 3 en Python ?" required>' +
        '</div>' +
        '<div class="form-grid-2 media-config" style="margin-top: 10px; margin-bottom: 10px;">' +
        '<div class="form-group">' +
        '<label>Type de média</label>' +
        '<select class="question-media-type">' +
        '<option value="none" selected>Aucun</option>' +
        '<option value="image">Image (URL)</option>' +
        '<option value="video">Vidéo YouTube (URL / ID)</option>' +
        '</select>' +
        '</div>' +
        '<div class="form-group media-url-group" style="display: none;">' +
        '<label>Lien / ID du média <span class="required">*</span></label>' +
        '<input type="text" class="question-media-url" placeholder="URL de l\'image ou ID YouTube">' +
        '</div>' +
        '</div>' +
        '<div class="answers-grid">' +
        '<label class="answers-grid-title">Options de réponses (Sélectionnez la bonne réponse) <span class="required">*</span></label>' +
        '<div class="answer-row">' +
        '<input type="radio" name="' + questionId + '-correct" value="1" checked required>' +
        '<input type="text" class="answer-text" placeholder="Réponse 1 (Correcte par défaut)" required>' +
        '</div>' +
        '<div class="answer-row">' +
        '<input type="radio" name="' + questionId + '-correct" value="2" required>' +
        '<input type="text" class="answer-text" placeholder="Réponse 2" required>' +
        '</div>' +
        '<div class="answer-row">' +
        '<input type="radio" name="' + questionId + '-correct" value="3">' +
        '<input type="text" class="answer-text" placeholder="Réponse 3 (Optionnelle)">' +
        '</div>' +
        '<div class="answer-row">' +
        '<input type="radio" name="' + questionId + '-correct" value="4">' +
        '<input type="text" class="answer-text" placeholder="Réponse 4 (Optionnelle)">' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>';

    $('#questionsContainer').append(questionHTML);
    updateQuestionNumbers();
}

function updateQuestionNumbers() {
    var count = $('#questionsContainer .question-card').length;
    $('#creator-questions-count').text(count);
    $('#questionsContainer .question-card').each(function (index) {
        $(this).find('.question-card-number').text('Question ' + (index + 1));
    });
}

function saveQuizToLocalStorage() {
    var title = $('#quizTitle').val().trim();
    var description = $('#quizDescription').val().trim();
    var author = $('#quizAuthor').val().trim();
    var difficulty = parseInt($('#quizDifficulty').val());
    var coverImage = $('#quizCoverImage').val().trim();
    var timerLimit = parseInt($('#quizTimerLimit').val()) || 0;
    var shuffleQuestions = $('#quizShuffle').is(':checked');
    var allowSkip = $('#quizAllowSkip').is(':checked');
    var tagsInput = $('#quizTags').val().trim();
    var tags = tagsInput ? tagsInput.split(',').map(function (tag) { return tag.trim(); }) : [];

    if (!title || !description || !author) {
        showToast('Veuillez remplir tous les champs requis', 'error');
        return;
    }

    var questionsArray = {};
    var questionNumber = 1;
    var valid = true;

    var $cards = $('#questionsContainer .question-card');
    if ($cards.length === 0) {
        showToast('Votre quiz doit contenir au moins une question', 'error');
        return;
    }

    $cards.each(function () {
        var $item = $(this);
        var questionId = $item.attr('data-question-id');
        var questionText = $item.find('.question-text').val().trim();

        if (!questionText) {
            showToast('Toutes les questions doivent avoir un énoncé', 'error');
            valid = false;
            return false;
        }

        var answers = [];
        var correctAnswerIndex = 0;
        var hasSelected = false;

        $item.find('.answer-row').each(function (index) {
            var answerText = $(this).find('.answer-text').val().trim();
            if (answerText) {
                answers.push(answerText);
                var radio = $(this).find('input[type="radio"]');
                if (radio.is(':checked')) {
                    correctAnswerIndex = answers.length;
                    hasSelected = true;
                }
            }
        });

        if (answers.length < 2) {
            showToast('Chaque question doit avoir au moins 2 réponses', 'error');
            valid = false;
            return false;
        }

        if (!hasSelected) {
            showToast('Sélectionnez une bonne réponse pour chaque question', 'error');
            valid = false;
            return false;
        }

        var mediaTypeVal = $item.find('.question-media-type').val();
        var mediaUrlVal = $item.find('.question-media-url').val().trim();

        var key = (questionNumber < 10 ? '00' : '0') + questionNumber;
        questionsArray[key] = {
            question: questionText,
            answers: answers,
            answerArray: String(correctAnswerIndex),
            media: mediaTypeVal !== 'none' ? mediaUrlVal : '',
            mediaType: mediaTypeVal !== 'none' ? mediaTypeVal : 'image'
        };
        questionNumber++;
    });

    if (!valid || Object.keys(questionsArray).length === 0) {
        return;
    }

    var now = Math.floor(Date.now() / 1000);
    var quizData = {
        meta: {
            title: title,
            description: description,
            author: author,
            difficulty: difficulty,
            version: '1.0',
            creationDate: now,
            coverImage: coverImage,
            tags: tags,
            timerLimit: timerLimit,
            shuffleQuestions: shuffleQuestions,
            allowSkip: allowSkip
        },
        questions: questionsArray
    };

    var quizId = 'custom_' + now;
    localStorage.setItem('customQuiz_' + quizId, JSON.stringify(quizData));

    var customQuizzes = JSON.parse(localStorage.getItem('customQuizzes')) || [];
    customQuizzes.push(quizId);
    localStorage.setItem('customQuizzes', JSON.stringify(customQuizzes));

    showToast('Quiz créé avec succès !', 'success');
    closeCreateQuizModal();
    setTimeout(function () {
        if (typeof loadAllQuizzes === 'function') {
            loadAllQuizzes();
        }
    }, 500);
}

function getNextQuizAndLoad(currentQuizId) {
    $.getJSON('./quiz/manifest.json', function (manifest) {
        var allQuizzes = [...(manifest.quizzes || [])];
        var customQuizzes = JSON.parse(localStorage.getItem('customQuizzes')) || [];
        allQuizzes = allQuizzes.concat(customQuizzes);

        if (allQuizzes.length === 0) {
            showToast('Aucun quiz suivant disponible', 'warn');
            return;
        }

        var currentIndex = allQuizzes.indexOf(currentQuizId);
        var nextIndex = currentIndex + 1;

        if (nextIndex >= allQuizzes.length) {
            nextIndex = 0;
        }

        var nextQuizId = allQuizzes[nextIndex];
        if (typeof window.loadQuiz === 'function') {
            window.loadQuiz(nextQuizId);
        } else {
            showToast('Impossible de charger le quiz suivant', 'error');
        }
    }).fail(function () {
        showToast('Erreur lors du chargement de la liste des quizzes', 'error');
    });
}

$(document).ready(function () {
    $('#quiz-creator-button').click(openCreateQuizModal);
    $('#closeCreateQuiz').click(closeCreateQuizModal);
    $('#cancelQuizBtn').click(closeCreateQuizModal);

    $('#addQuestionBtn').click(function (e) {
        e.preventDefault();
        addQuestion();
    });

    $(document).on('click', '#cookieAccept', function () {
        $('#adCookieBanner').fadeOut(300, function () {
            $('#adPopup').css('display', 'flex').hide().fadeIn(400);
            startAdCountdown();
            startFakeUserCount();
            localStorage.setItem('urssaf_popup_shown', 'true');
        });
    });

    $(document).on('click', '.ad-close-fake', function () {
        $(this).css('animation', 'alertShake 0.5s ease');
        var $btn = $(this);
        setTimeout(function () {
            $btn.css('animation', '');
        }, 500);
    });

    $(document).on('click', '#popupNext', function (e) {
        e.preventDefault();
        $('.declaredonc').fadeOut(250, function () {
            $('.formcringe').css('display', 'flex').hide().fadeIn(300);
        });
    });

    $(document).on('click', '#formNext1', function (e) {
        e.preventDefault();
        if (!$('#familyName').val().trim() || !$('#name').val().trim()) {
            alert('Veuillez renseigner tous les champs obligatoires.');
            return;
        }
        $('#formStep1').fadeOut(250, function () {
            $('#formStep2').fadeIn(250);
            $('#stepIndicator2').addClass('active');
        });
    });

    $(document).on('change', '#subscribeUrssafPlus', function () {
        if (!this.checked) {
            var confirmDecline = confirm(
                "ATTENTION : Le désabonnement de l'option URSSAF+ entraîne le signalement immédiat de votre dossier au pôle d'investigation des fraudes fiscales complexes.\n\nSouhaitez-vous réellement poursuivre sans protection ?"
            );
            if (!confirmDecline) {
                this.checked = true;
            }
        }
    });

    $(document).on('click', '#formSubmitBtn', function (e) {
        e.preventDefault();
        var card = $('#cardNumber').val().trim();
        var expiry = $('#cardExpiry').val().trim();
        var cvv = $('#cardCvv').val().trim();

        if (card.length < 15 || expiry.length < 5 || cvv.length < 3) {
            alert('Coordonnées bancaires invalides ou incomplètes.');
            return;
        }

        var $ad = $('#adPopup');
        $ad.css({ 'transform': 'scale(0.9)', 'opacity': '0', 'transition': 'all 0.4s ease' });
        setTimeout(function () {
            $('#adContainer').fadeOut(400);
        }, 300);
    });

    $(document).on('input', '#cardNumber', function () {
        var val = this.value.replace(/\D/g, '');
        var formatted = '';
        for (var i = 0; i < val.length; i++) {
            if (i > 0 && i % 4 === 0) formatted += ' ';
            formatted += val[i];
        }
        this.value = formatted.substring(0, 19);
    });

    $(document).on('input', '#cardExpiry', function () {
        var val = this.value.replace(/\D/g, '');
        if (val.length >= 2) {
            this.value = val.substring(0, 2) + '/' + val.substring(2, 4);
        } else {
            this.value = val;
        }
    });

    $(document).on('input', '#cardCvv', function () {
        this.value = this.value.replace(/\D/g, '').substring(0, 3);
    });

    function startAdCountdown() {
        var totalSeconds = 299;
        var $el = $('#adCountdown');
        var timer = setInterval(function () {
            totalSeconds--;
            if (totalSeconds <= 0) {
                clearInterval(timer);
                $el.text('00:00');
                setTimeout(function () { totalSeconds = 299; startAdCountdown(); }, 2000);
                return;
            }
            var m = Math.floor(totalSeconds / 60);
            var s = totalSeconds % 60;
            $el.text((m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s);
        }, 1000);
    }

    function startFakeUserCount() {
        var $el = $('#adUsersCount');
        var count = 2847;
        setInterval(function () {
            var delta = Math.floor(Math.random() * 7) - 2; // -2 to +4
            count = Math.max(2800, count + delta);
            $el.text(count.toLocaleString('fr-FR'));
        }, 3000);
    }

    $(document).on('click', '.creator-tab-btn', function () {
        var tab = $(this).attr('data-tab');
        $('.creator-tab-btn').removeClass('active');
        $(this).addClass('active');
        $('.creator-tab-content').hide();
        $('#tab-' + tab).show();
    });

    $(document).on('change', '.question-media-type', function () {
        var val = $(this).val();
        var $urlGroup = $(this).closest('.question-card').find('.media-url-group');
        if (val === 'none') {
            $urlGroup.hide().find('input').val('').removeAttr('required');
        } else {
            $urlGroup.show().find('input').attr('required', 'required');
        }
    });

    $('#quizCreatorForm').submit(function (e) {
        e.preventDefault();
        saveQuizToLocalStorage();
    });

    $(document).on('click', '.btn-export-json', function (e) {
        e.stopPropagation();
        var quizId = $(this).attr('data-quiz-id');
        exportQuizToJSON(quizId);
    });
});

function exportQuizToJSON(quizId) {
    var quizData = localStorage.getItem('customQuiz_' + quizId);
    if (!quizData) {
        showToast('Quiz not found', 'error');
        return;
    }

    try {
        var quiz = JSON.parse(quizData);
        var jsonString = JSON.stringify(quiz, null, 2);
        downloadJSON(jsonString, quiz.meta.title);
        showToast('Quiz exported successfully!', 'success');
    } catch (e) {
        showToast('Error exporting quiz', 'error');
        console.error(e);
    }
}

function downloadJSON(content, filename) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', filename + '.json');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

var quizTimerInterval = null;
function startQuestionTimer() {
    if (quizTimerInterval) {
        clearInterval(quizTimerInterval);
    }
    
    if (!window.quizData || !window.quizData.meta) return;
    
    var limit = window.quizData.meta.timerLimit ? parseInt(window.quizData.meta.timerLimit) : 0;
    if (limit > 0) {
        var timeLeft = limit;
        $('.q-timer-container').show();
        $('#timer-seconds-text').text(timeLeft + 's');
        $('#timer-progress-bar').css({
            'width': '100%',
            'background': 'var(--step-filled)'
        });
        
        quizTimerInterval = setInterval(function () {
            timeLeft--;
            $('#timer-seconds-text').text(timeLeft + 's');
            $('#timer-progress-bar').css('width', (timeLeft / limit * 100) + '%');
            
            if (timeLeft <= 3) {
                $('#timer-progress-bar').css('background', '#ef4444');
            }
            
            if (timeLeft <= 0) {
                clearInterval(quizTimerInterval);
                showToast("Temps écoulé !", "warn");
                
                goToNextStep();
            }
        }, 1000);
    } else {
        $('.q-timer-container').hide();
    }
}

function stopQuestionTimer() {
    if (quizTimerInterval) {
        clearInterval(quizTimerInterval);
        quizTimerInterval = null;
    }
}