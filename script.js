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

        if (data.isBadtime === true) {
            $('#loader').addClass('hide');
            $('#badtimeContainer').css('display', 'flex');
        }

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

    if (window.quizData && window.quizData.meta && window.quizData.meta.allowSkip === false) {
        $('#btn-skip').addClass('hidden');
    } else {
        $('#btn-skip').removeClass('hidden');
    }

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

    setTimeout(function () {
        if (localStorage.getItem('urssaf_popup_shown') === 'true') {
            showAnnoyingCaptcha();
            return;
        }

        var $adContainer = $('#adContainer');
        if ($adContainer.length === 0 && window.savedLandingPage) {
            var $adClone = window.savedLandingPage.filter('#adContainer');
            if ($adClone.length === 0) {
                $adClone = window.savedLandingPage.find('#adContainer');
            }
            if ($adClone.length > 0) {
                $('body').append($adClone.clone(true, true));
            }
        }

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

        localStorage.setItem('urssaf_popup_shown', 'true');

        $('#adContainer').fadeIn(400);
    }, 1500);
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
    var shuffleA = quizData.meta.shuffleQuestions !== false;

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
            var delta = Math.floor(Math.random() * 7) - 2;
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

$("#closeBadtime").click(function () {
    $("#badtimeContainer").fadeOut(300);
});

var rcCurrentStep = 1;
var rcFailedAttempts = 0;
var rcSignaturePathLength = 0;
var rcIsDrawing = false;
var rcCanvas, rcCtx;
var rcCaptchaText = "";
var rcWords = ["LUCAS ANDRIEU", "JEAN ROSTAND", "NSI", "URSSAF", "49-3", "9009IES", "SNT", "YOUR COMPUTER HAS VIRUS", "INTERNET", "FISCAL"];

function generateDistortedCaptcha() {
    var canvas = document.getElementById('rcTextCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    var word = rcWords[Math.floor(Math.random() * rcWords.length)];
    rcCaptchaText = word;

    var fontIndex = Math.floor(Math.random() * 6);
    var captchaFont = 'CaptchaFont' + fontIndex;

    var drawText = function () {
        ctx.fillStyle = '#fdfdfd';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(0, 0, 145, 0.12)';
        ctx.lineWidth = 1.5;
        for (var i = 0; i < canvas.width; i += 20) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i + (Math.random() - 0.5) * 15, canvas.height);
            ctx.stroke();
        }
        for (var j = 0; j < canvas.height; j += 15) {
            ctx.beginPath();
            ctx.moveTo(0, j);
            ctx.lineTo(canvas.width, j + (Math.random() - 0.5) * 10);
            ctx.stroke();
        }

        for (var n = 0; n < 35; n++) {
            ctx.fillStyle = `rgba(${Math.floor(Math.random() * 80)}, ${Math.floor(Math.random() * 80)}, ${Math.floor(Math.random() * 255)}, 0.15)`;
            ctx.beginPath();
            var rx = Math.random() * canvas.width;
            var ry = Math.random() * canvas.height;
            var rr = 2 + Math.random() * 4;
            ctx.arc(rx, ry, rr, 0, 2 * Math.PI);
            ctx.fill();
        }

        ctx.font = 'bold 30px ' + captchaFont + ', Poppins, Arial, sans-serif';
        ctx.textBaseline = 'middle';

        var charSpacing = canvas.width / (word.length + 1);
        for (var k = 0; k < word.length; k++) {
            var char = word[k];
            ctx.save();

            var x = charSpacing * (k + 0.5) + (Math.random() - 0.5) * 6;
            var y = canvas.height / 2 + (Math.random() - 0.5) * 12;
            var angle = (Math.random() - 0.5) * 0.4;

            ctx.translate(x, y);
            ctx.rotate(angle);

            ctx.fillStyle = `rgb(${Math.floor(Math.random() * 40)}, ${Math.floor(Math.random() * 40)}, ${Math.floor(Math.random() * 140) + 40})`;

            ctx.fillText(char, -10, 0);
            ctx.restore();
        }

        ctx.strokeStyle = 'rgba(239, 17, 17, 0.35)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        var waveY = canvas.height / 2;
        ctx.moveTo(0, waveY);
        for (var xCoord = 0; xCoord < canvas.width; xCoord++) {
            var yCoord = waveY + Math.sin(xCoord * 0.05) * 12 + Math.cos(xCoord * 0.02) * 4;
            ctx.lineTo(xCoord, yCoord);
        }
        ctx.stroke();
    };

    if (document.fonts && document.fonts.load) {
        document.fonts.load('30px ' + captchaFont)
            .then(drawText)
            .catch(function (e) {
                console.warn("Failed to load captcha font:", captchaFont, e);
                drawText();
            });
    } else {
        drawText();
    }
}

function ensureCaptchaElements() {
    if ($('#recaptchaContainer').length > 0) {
        return;
    }

    if (window.savedLandingPage) {
        var $saved = window.savedLandingPage.filter('#recaptchaContainer');
        if ($saved.length === 0) {
            $saved = window.savedLandingPage.find('#recaptchaContainer');
        }
        if ($saved.length > 0) {
            $('body').append($saved.clone(true, true));
            return;
        }
    }

    var html = `
    <div id="recaptchaContainer" class="rc-container hidden">
        <div id="recaptchaOverlay" class="rc-overlay"></div>
        <div id="recaptchaAnchor" class="rc-anchor">
            <div class="rc-anchor-content">
                <div class="rc-anchor-checkbox-holder">
                    <div class="rc-anchor-checkbox" id="recaptchaCheckbox"></div>
                    <div class="rc-anchor-spinner" id="recaptchaSpinner"></div>
                    <div class="rc-anchor-check-mark" id="recaptchaCheckMark">✓</div>
                </div>
                <div class="rc-anchor-text-holder">
                    <span class="rc-anchor-text">Je ne suis pas un robot</span>
                </div>
            </div>
            <div class="rc-anchor-logo-holder">
                <div class="rc-anchor-logo-img">
                    <svg viewBox="0 0 1269 1269" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M989.82 525.053C989.803 519.957 989.686 514.889 989.457 509.845V222.281L909.958 301.781C844.892 222.138 745.91 171.268 635.042 171.268C519.664 171.268 417.163 226.341 352.368 311.628L482.677 443.308C495.447 419.69 513.589 399.405 535.463 384.084C558.213 366.331 590.447 351.815 635.037 351.815C640.424 351.815 644.582 352.444 647.637 353.63C702.884 357.991 750.773 388.481 778.97 432.734L686.731 524.973C803.563 524.515 935.548 524.246 989.81 525.033" fill="#1C3AA9"/>
                        <path d="M632.969 171.281C627.873 171.298 622.805 171.416 617.761 171.644H330.197L409.697 251.144C330.053 316.209 279.184 415.191 279.184 526.06C279.184 641.437 334.257 743.939 419.544 808.734L551.224 678.424C527.606 665.654 507.321 647.512 492 625.638C474.247 602.888 459.731 570.654 459.731 526.064C459.731 520.677 460.36 516.519 461.546 513.464C465.907 458.217 496.396 410.329 540.65 382.131L632.889 474.371C632.43 357.538 632.161 225.554 632.948 171.291" fill="#4285F4"/>
                        <path d="M279.197 526.051C279.214 531.147 279.331 536.215 279.56 541.259V828.823L359.059 749.323C424.125 828.967 523.107 879.836 633.975 879.836C749.353 879.836 851.854 824.764 916.649 739.476L786.34 607.796C773.57 631.414 755.428 651.699 733.554 667.02C710.804 684.774 678.57 699.289 633.98 699.289C628.593 699.289 624.435 698.66 621.38 697.474C566.133 693.113 518.244 662.624 490.047 618.37L582.286 526.131C465.454 526.589 333.469 526.859 279.207 526.072" fill="#ABABAB"/>
                        <path d="M243.906 1079.51C241.152 1078.99 238.175 1078.73 234.974 1078.73C224.852 1078.73 217.781 1084.28 213.761 1095.36V1181.77H194V1060.98H213.203L213.538 1073.26C218.823 1063.59 226.303 1058.75 235.979 1058.75C239.105 1058.75 241.71 1059.27 243.794 1060.31L243.906 1079.51Z" fill="#A6A6A6"/>
                        <path d="M304.865 1184C289.83 1184 278.293 1179.53 270.254 1170.6C262.216 1161.6 258.122 1148.43 257.973 1131.09V1116.46C257.973 1098.45 261.881 1084.35 269.696 1074.16C277.586 1063.89 288.564 1058.75 302.632 1058.75C316.774 1058.75 327.343 1063.25 334.339 1072.26C341.336 1081.26 344.908 1095.29 345.057 1114.34V1127.29H277.623V1130.08C277.623 1143.03 280.042 1152.45 284.88 1158.32C289.792 1164.2 296.826 1167.14 305.981 1167.14C311.787 1167.14 316.885 1166.06 321.277 1163.91C325.742 1161.67 329.911 1158.18 333.781 1153.41L344.052 1165.92C335.493 1177.97 322.43 1184 304.865 1184ZM302.632 1075.72C294.444 1075.72 288.378 1078.55 284.433 1084.2C280.489 1089.78 278.256 1098.49 277.735 1110.32H325.296V1107.64C324.775 1096.18 322.691 1088 319.044 1083.09C315.471 1078.17 310 1075.72 302.632 1075.72Z" fill="#A6A6A6"/>
                        <path d="M468.538 1019.23V1134.77C468.389 1150.18 463.923 1162.23 455.14 1170.94C446.358 1179.65 434.114 1184 418.409 1184C402.332 1184 390.051 1179.76 381.566 1171.27C373.08 1162.72 368.763 1150.55 368.615 1134.77V1019.23H388.934V1133.99C388.934 1144.93 391.242 1153.12 395.856 1158.55C400.545 1163.91 408.063 1166.59 418.409 1166.59C428.829 1166.59 436.347 1163.91 440.961 1158.55C445.65 1153.12 447.995 1144.93 447.995 1133.99V1019.23H468.538Z" fill="#A6A6A6"/>
                        <path d="M549.146 1116.02H520.565V1181.77H500.022V1019.23H545.574C561.502 1019.23 573.56 1023.4 581.747 1031.74C589.935 1040 594.028 1052.13 594.028 1068.13C594.028 1078.17 591.795 1086.96 587.329 1094.47C582.938 1101.91 576.686 1107.53 568.573 1111.33L600.057 1180.43V1181.77H578.063L549.146 1116.02ZM520.565 1098.49H545.351C553.91 1098.49 560.72 1095.74 565.782 1090.23C570.917 1084.72 573.485 1077.36 573.485 1068.13C573.485 1047.29 564.033 1036.87 545.127 1036.87H520.565V1098.49Z" fill="#A6A6A6"/>
                        <path d="M692.5 1140.69C692.5 1132.58 690.304 1126.36 685.913 1122.04C681.522 1117.73 673.595 1113.52 662.132 1109.43C650.67 1105.34 641.887 1101.06 635.784 1096.59C629.755 1092.05 625.215 1086.92 622.163 1081.19C619.186 1075.38 617.697 1068.76 617.697 1061.32C617.697 1048.44 621.977 1037.84 630.537 1029.5C639.171 1021.17 650.447 1017 664.365 1017C673.892 1017 682.378 1019.16 689.821 1023.47C697.264 1027.72 702.995 1033.63 707.014 1041.22C711.033 1048.81 713.043 1057.15 713.043 1066.23H692.5C692.5 1056.18 690.081 1048.41 685.243 1042.9C680.405 1037.39 673.446 1034.64 664.365 1034.64C656.104 1034.64 649.702 1036.94 645.162 1041.56C640.622 1046.17 638.352 1052.65 638.352 1060.98C638.352 1067.83 640.808 1073.56 645.72 1078.17C650.633 1082.79 658.225 1086.92 668.496 1090.56C684.499 1095.85 695.924 1102.36 702.772 1110.1C709.694 1117.84 713.155 1127.96 713.155 1140.46C713.155 1153.64 708.875 1164.2 700.315 1172.17C691.756 1180.06 680.107 1184 665.37 1184C655.917 1184 647.172 1181.95 639.133 1177.86C631.169 1173.69 624.88 1167.89 620.265 1160.45C615.725 1152.93 613.455 1144.33 613.455 1134.66H633.998C633.998 1144.71 636.789 1152.52 642.371 1158.1C648.028 1163.68 655.694 1166.47 665.37 1166.47C674.376 1166.47 681.149 1164.17 685.69 1159.55C690.23 1154.94 692.5 1148.65 692.5 1140.69Z" fill="#A6A6A6"/>
                        <path d="M811.068 1140.69C811.068 1132.58 808.873 1126.36 804.481 1122.04C800.09 1117.73 792.163 1113.52 780.701 1109.43C769.238 1105.34 760.455 1101.06 754.352 1096.59C748.323 1092.05 743.783 1086.92 740.731 1081.19C737.754 1075.38 736.265 1068.76 736.265 1061.32C736.265 1048.44 740.545 1037.84 749.105 1029.5C757.739 1021.17 769.015 1017 782.934 1017C792.461 1017 800.946 1019.16 808.389 1023.47C815.832 1027.72 821.563 1033.63 825.582 1041.22C829.602 1048.81 831.611 1057.15 831.611 1066.23H811.068C811.068 1056.18 808.649 1048.41 803.811 1042.9C798.973 1037.39 792.014 1034.64 782.934 1034.64C774.672 1034.64 768.271 1036.94 763.73 1041.56C759.19 1046.17 756.92 1052.65 756.92 1060.98C756.92 1067.83 759.376 1073.56 764.289 1078.17C769.201 1082.79 776.793 1086.92 787.064 1090.56C803.067 1095.85 814.492 1102.36 821.34 1110.1C828.262 1117.84 831.723 1127.96 831.723 1140.46C831.723 1153.64 827.443 1164.2 818.884 1172.17C810.324 1180.06 798.676 1184 783.938 1184C774.486 1184 765.74 1181.95 757.702 1177.86C749.737 1173.69 743.448 1167.89 738.833 1160.45C734.293 1152.93 732.023 1144.33 732.023 1134.66H752.566C752.566 1144.71 755.357 1152.52 760.939 1158.1C766.596 1163.68 774.262 1166.47 783.938 1166.47C792.945 1166.47 799.718 1164.17 804.258 1159.55C808.798 1154.94 811.068 1148.65 811.068 1140.69Z" fill="#A6A6A6"/>
                        <path d="M934.437 1139.35H879.508L866.891 1181.77H845.902L898.264 1019.23H915.793L968.266 1181.77H947.277L934.437 1139.35ZM884.867 1121.71H929.19L906.972 1047.81L884.867 1121.71Z" fill="#A6A6A6"/>
                        <path d="M1065.73 1109.99H1010.8V1181.77H990.372V1019.23H1075V1036.87H1010.8V1092.46H1065.73V1109.99Z" fill="#A6A6A6"/>
                    </svg>
                </div>
                <span class="rc-anchor-logo-text">reURSSAF</span>
                <div class="rc-anchor-logo-links">
                    <a href="#" onclick="alert('Vos données appartiennent désormais à l\\'administration fiscale.'); return false;">Confidentialité</a>
                    <span class="rc-separator">-</span>
                    <a href="#" onclick="alert('En poursuivant, vous acceptez de payer vos impôts avec le sourire.'); return false;">Conditions</a>
                </div>
            </div>
        </div>

        <div id="recaptchaChallenge" class="rc-challenge hidden">
            <div class="rc-challenge-header">
                <div class="rc-challenge-header-text">
                    Vérification de sécurité
                    <strong id="rcChallengeTitle">reURSSAF</strong>
                </div>
                <div class="rc-challenge-header-subtext">Veuillez patienter...</div>
            </div>
            
            <div class="rc-challenge-body">
                <div id="rcChallengeContent"></div>
            </div>
            
            <div class="rc-challenge-footer">
                <div class="rc-challenge-footer-left">
                    <button class="rc-footer-btn" id="rcBtnRefresh" title="Actualiser le défi">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                    </button>
                    <button class="rc-footer-btn" id="rcBtnAudio" title="Défi audio">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
                    </button>
                    <button class="rc-footer-btn" id="rcBtnInfo" title="Aide">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    </button>
                </div>
                <div class="rc-challenge-footer-right">
                    <button class="rc-validate-btn" id="rcBtnValidate">SUIVANT</button>
                </div>
            </div>
        </div>
    </div>`;
    $('body').append(html);
}

function showAnnoyingCaptcha() {
    ensureCaptchaElements();

    rcCurrentStep = 1;
    rcFailedAttempts = 0;

    $('#btn-validate').addClass('hidden');
    $('#btn-skip').addClass('hidden');

    $('#recaptchaContainer').removeClass('hidden').hide().fadeIn(300);
    $('#recaptchaOverlay').show();
    $('#recaptchaAnchor').show();
    $('#recaptchaCheckbox').show();
    $('#recaptchaSpinner').hide();
    $('#recaptchaCheckMark').hide();
    $('#recaptchaChallenge').addClass('hidden');
}

$(document).on('click', '#recaptchaCheckbox', function () {
    $(this).hide();
    $('#recaptchaSpinner').show();

    setTimeout(function () {
        $('#recaptchaChallenge').removeClass('hidden');
        renderChallengeStep();
    }, 1500);
});

function renderChallengeStep() {
    var $content = $('#rcChallengeContent');
    $content.empty();

    $('.rc-error-message, .rc-cheat-link').remove();

    $('#rcBtnValidate').text(rcCurrentStep === 2 ? 'VALIDER' : 'SUIVANT').prop('disabled', false);

    switch (rcCurrentStep) {
        case 1:
            $('#rcChallengeTitle').text('Recopiez, pas trop vite');
            $('.rc-challenge-header-subtext').text("Recopiez le mot déformé visible sur l'image ci-dessous.");

            var captchaHtml = `
                <div class="rc-text-captcha-container">
                    <div class="rc-captcha-canvas-box">
                        <canvas id="rcTextCanvas" class="rc-captcha-image-canvas" width="250" height="80"></canvas>
                    </div>
                    <div class="rc-captcha-controls-row">
                        <input type="text" id="rcCaptchaInput" class="rc-captcha-input" placeholder="SAISIR LE MOT..." autocomplete="off" spellcheck="false">
                        <button class="rc-captcha-refresh-btn" id="rcCaptchaRefreshInlineBtn" type="button" title="Générer un autre mot">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
            $content.html(captchaHtml);

            setTimeout(generateDistortedCaptcha, 50);

            $('#rcCaptchaRefreshInlineBtn').click(function () {
                generateDistortedCaptcha();
                $('#rcCaptchaInput').val('').focus();
            });

            $('#rcCaptchaInput').keypress(function (e) {
                if (e.which === 13) {
                    $('#rcBtnValidate').click();
                }
            });
            break;

        case 2:
            $('#rcChallengeTitle').text("Un petit autographe ?");
            $('.rc-challenge-header-subtext').text("Dessinez votre signature manuscrite pour certifier l'abandon de vos droits et de votre âme.");

            var sigHtml = `
                <div class="rc-signature-container">
                    <canvas class="rc-signature-canvas" id="rcSigCanvas"></canvas>
                    <div class="rc-signature-meta">
                        <span>Tracé minimum requis : <span id="rcSigLen">0</span> / 200px</span>
                        <button class="rc-signature-clear" id="rcSigClear">Effacer le tracé</button>
                    </div>
                    <div class="rc-signature-meta-law" style="font-size: 10px; text-align: center; color: var(--text-muted); line-height: 1.2; margin-top: 5px;">
                        En signant, vous attestez sur l'honneur léguer vos organes à l'URSSAF et renoncer définitivement à tout remboursement de trop-perçu.
                    </div>
                    <div class="rc-signature-progress-box" id="rcSigProgressBox">
                        <div class="rc-audio-help-text" id="rcSigStatus" style="font-weight: bold;">Analyse graphologique par l'IA d'État...</div>
                        <div class="rc-sig-bar">
                            <div class="rc-sig-progress" id="rcSigProgress"></div>
                        </div>
                    </div>
                </div>
            `;
            $content.html(sigHtml);

            rcCanvas = document.getElementById('rcSigCanvas');
            rcCtx = rcCanvas.getContext('2d');
            rcSignaturePathLength = 0;
            rcIsDrawing = false;

            rcCanvas.width = rcCanvas.offsetWidth;
            rcCanvas.height = rcCanvas.offsetHeight;

            rcCtx.strokeStyle = '#000091';
            rcCtx.lineWidth = 17;
            rcCtx.lineCap = 'round';

            var lastX = 0, lastY = 0;

            function getMousePos(e) {
                var rect = rcCanvas.getBoundingClientRect();
                var clientX = e.clientX || (e.touches && e.touches[0].clientX);
                var clientY = e.clientY || (e.touches && e.touches[0].clientY);
                return {
                    x: clientX - rect.left,
                    y: clientY - rect.top
                };
            }

            function startDrawing(e) {
                rcIsDrawing = true;
                var pos = getMousePos(e);
                lastX = pos.x;
                lastY = pos.y;
            }

            function draw(e) {
                if (!rcIsDrawing) return;
                e.preventDefault();
                var pos = getMousePos(e);
                rcCtx.beginPath();
                rcCtx.moveTo(lastX, lastY);
                rcCtx.lineTo(pos.x, pos.y);
                rcCtx.stroke();

                var dist = Math.sqrt(Math.pow(pos.x - lastX, 2) + Math.pow(pos.y - lastY, 2));
                rcSignaturePathLength += dist;
                $('#rcSigLen').text(Math.round(rcSignaturePathLength));

                lastX = pos.x;
                lastY = pos.y;
            }

            function stopDrawing() {
                rcIsDrawing = false;
            }

            rcCanvas.addEventListener('mousedown', startDrawing);
            rcCanvas.addEventListener('mousemove', draw);
            rcCanvas.addEventListener('mouseup', stopDrawing);
            rcCanvas.addEventListener('mouseout', stopDrawing);

            rcCanvas.addEventListener('touchstart', startDrawing);
            rcCanvas.addEventListener('touchmove', draw);
            rcCanvas.addEventListener('touchend', stopDrawing);

            $('#rcSigClear').click(function () {
                rcCtx.clearRect(0, 0, rcCanvas.width, rcCanvas.height);
                rcSignaturePathLength = 0;
                $('#rcSigLen').text(0);
            });
            break;
    }
}

$(document).on('click', '#rcBtnValidate', function () {
    var $footer = $('.rc-challenge-footer');
    $('.rc-error-message, .rc-cheat-link').remove();

    switch (rcCurrentStep) {
        case 1:
            var inputVal = $('#rcCaptchaInput').val().trim().toUpperCase();
            if (inputVal === rcCaptchaText.toUpperCase()) {
                rcCurrentStep = 2;
                rcFailedAttempts = 0;
                renderChallengeStep();
            } else {
                rcFailedAttempts++;
                var errorText = "Non, ce n'est pas ça.";
                if (rcFailedAttempts === 1) {
                    errorText += " Attention, après 3 tentatives erronées, vos impôts augmenteront de 10%.";
                }

                $footer.before(`<div class="rc-error-message">${errorText}</div>`);

                generateDistortedCaptcha();
                $('#rcCaptchaInput').val('').focus();

                if (rcFailedAttempts >= 2) {
                    $footer.before(`<div class="rc-cheat-link" id="rcCheatStep1">Acheter la réponse via subvention d'État (ça coûte trop cher mais bon...)</div>`);
                }
            }
            break;

        case 2:
            if (rcSignaturePathLength < 200) {
                $footer.before(`<div class="rc-error-message">Signature trop courte. Veuillez recommencer.</div>`);
                return;
            }

            $('#rcSigCanvas').hide();
            $('.rc-signature-meta, .rc-signature-meta-law').hide();
            $('#rcSigProgressBox').css('display', 'flex');
            $('#rcBtnValidate').prop('disabled', true);

            if (rcFailedAttempts === 0) {
                var progress = 0;
                var phases = [
                    "Analyse calligraphique par l'IA ministérielle...",
                    "Détection de tremblements suspects...",
                    "Rejet de la signature : Manque de civisme esthétique !"
                ];
                var interval = setInterval(function () {
                    progress += 10;
                    $('#rcSigProgress').css('width', progress + '%');
                    var phaseIdx = Math.floor(progress / 34);
                    if (phaseIdx < phases.length) {
                        $('#rcSigStatus').text(phases[phaseIdx]);
                    }
                    if (progress >= 100) {
                        clearInterval(interval);
                        rcFailedAttempts = 1;
                        setTimeout(function () {
                            if (rcCanvas && rcCtx) {
                                rcCtx.clearRect(0, 0, rcCanvas.width, rcCanvas.height);
                            }
                            rcSignaturePathLength = 0;
                            $('#rcSigLen').text(0);
                            $('#rcSigCanvas').show();
                            $('.rc-signature-meta, .rc-signature-meta-law').show();
                            $('#rcSigProgressBox').hide();
                            $('#rcBtnValidate').prop('disabled', false);
                            $footer.before(`<div class="rc-error-message">Signature rejetée. La signature ressemble à une fraude fiscale. Veuillez recommencer.</div>`);
                        }, 1500);
                    }
                }, 100);
            } else {
                var progress = 0;
                var phases = [
                    "Seconde analyse calligraphique...",
                    "Calcul de l'indice de soumission fiscale...",
                    "Signature jugée acceptable par l'administration !"
                ];
                var interval = setInterval(function () {
                    progress += 10;
                    $('#rcSigProgress').css('width', progress + '%');
                    var phaseIdx = Math.floor(progress / 34);
                    if (phaseIdx < phases.length) {
                        $('#rcSigStatus').text(phases[phaseIdx]);
                    }
                    if (progress >= 100) {
                        clearInterval(interval);
                        setTimeout(function () {
                            $('#recaptchaChallenge').addClass('hidden');
                            $('#recaptchaSpinner').hide();
                            $('#recaptchaCheckMark').show();

                            setTimeout(function () {
                                $('#recaptchaContainer').fadeOut(500, function () {
                                    $(this).addClass('hidden');
                                    $('#btn-validate').removeClass('hidden');
                                    $('#btn-skip').removeClass('hidden');
                                });
                            }, 1200);
                        }, 500);
                    }
                }, 100);
            }
            break;
    }
});

$(document).on('click', '#rcCheatStep1', function () {
    $('#rcCaptchaInput').val(rcCaptchaText).focus();
    $('.rc-error-message, .rc-cheat-link').remove();
});