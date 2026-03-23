var questions = [];
var index = 0;
var answers = {};
var score = 0;
var skippedIndices = [];
var isFinishing = false;
var toastTimer = null;
var toastCount = 1;

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
        } catch(e) {
            dataToLoad = null;
        }
    }
    
    if (dataToLoad) {
        processQuizData(dataToLoad, dataSource);
    } else {
        $.getJSON(jsonUrl, function (data) {
            processQuizData(data, 'original');
        });
    }
    
    function processQuizData(data, source) {
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

        // Source - https://stackoverflow.com/a/31316397
        // Posted by Finny Abraham
        // Retrieved 2026-03-23, License - CC BY-SA 3.0
        // Reworked on 23-03-2026 at 1:41PM

        var timestampInMilliSeconds = metaCreationDate*1000;
        var date = new Date(timestampInMilliSeconds);

        var day = (date.getDate() < 10 ? '0' : '') + date.getDate();
        var month = (date.getMonth() < 9 ? '0' : '') + (date.getMonth() + 1);
        var year = date.getFullYear();

        var hours = ((date.getHours() % 12 || 12) < 10 ? '0' : '') + (date.getHours() % 12 || 12);
        var minutes = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
        var meridiem = (date.getHours() >= 12) ? 'PM' : 'AM';

        var formattedDate = day + '-' + month + '-' + year + ' at ' + hours + ':' + minutes + ' ' + meridiem;

        var sourceLabel = dataSource === 'imported' ? ' (IMPORTED)' : '';
        $('#debugTitle').html('Fetched from: ' + '<span class="debugFileName">' + jsonUrl + '</span>' + sourceLabel);
        $('#metaTitle').text('Title: ' + metaTitle);
        $('#metaDescription').text('Description: ' + metaDescription);
        $('#metaAuthor').text('Author: ' + metaAuthor);
        $('#metaDifficulty').text('Difficulty (id): ' + metaDifficulty);
        $('#metaVersion').text('Version: ' + metaVersion)
        $('#metaCreationDate').text('[UNIX] Created on: ' + formattedDate)
        
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
        
        $('#btn-save-quiz').off('click').click(function() {
            $.getJSON('questions.json', function(data) {
                var dataStr = JSON.stringify(data, null, 2);
                var dataBlob = new Blob([dataStr], {type: 'application/json'});
                var url = URL.createObjectURL(dataBlob);
                var link = document.createElement('a');
                link.href = url;
                link.download = 'questions-backup-' + new Date().getTime() + '.json';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                showToast('Quiz téléchargé', 'success');
            });
        });
        
        $('#btn-import-quiz').off('click').click(function() {
            $('#quiz-file-input').click();
        });
        
        $('#quiz-file-input').off('change').on('change', function(e) {
            var file = e.target.files[0];
            if (file) {
                var reader = new FileReader();
                reader.onload = function(event) {
                    try {
                        var importedData = JSON.parse(event.target.result);
                        if (importedData.questions && importedData.meta) {
                            localStorage.setItem('importedQuizData', JSON.stringify(importedData));
                            showToast('Quiz Importé ! Actualise pour appliquer.', 'success');
                        } else {
                            showToast('Format de quizz invalide.', 'error');
                        }
                    } catch(err) {
                        showToast('Erreur lors de la lecture du fichier.', 'error');
                    }
                };
                reader.readAsText(file);
            }
            this.value = '';
        });
        
        $('#btn-reset-quiz').off('click').click(function() {
            localStorage.removeItem('importedQuizData');
            showToast('Les données ont étées supprimées avec succès !', 'success');
        });
    });



function saveProgress() {
    var status = {
        index: index,
        answers: answers,
        score: score,
        skippedIndices: skippedIndices,
        isFinishing: isFinishing
    };
    var jsonString = JSON.stringify(status);
    localStorage.setItem('quiz', jsonString);
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
    
    $('#gameState').text('State: ' + gameState);
    $('#currentQuestion').text('Current: ' + currentQIndex);
    $('#answered').text('Answered: ' + answerCount);
    $('#skipped').text('Skipped: ' + skippedIndices.length);
    $('#currentScore').text('Score: ' + score);
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
    $('.q-question').text('Bienvenue!');
    $('.q-options').text('Bienvenue dans ce Quiz de fou sur la NSI (t\'as vu le brother il fait une pub mdrr)');
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
    $('#btn-skip').removeClass('hidden');

    var currentQuestion = questions[index];

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
        showToast('Question mise de côté', 'warn');
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
    var total = questions.length;

    score = 0;
    for (var i = 0; i < total; i++) {
        if (answers[i] == questions[i].answerArray) {
            score++;
        }
    }

    var finalRatio = score / total;
    var finalPercent = Math.round(finalRatio * 100);

    var message = '';

    if (finalPercent === 100) {
        message = 'MAIS QUEL GOAT LUI';
    } else if (finalPercent >= 80) {
        message = 'Quasi perfect ça je reconnais ^^';
    } else if (finalPercent >= 60) {
        message = 'Ehh t\'es bon, t\'es bon ! (mais pas assez)';
    } else if (finalPercent >= 40) {
        message = 'Franchement pas mal';
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

    $('.q-question').empty().append($resultsContainer);
    $('.q-options').empty();
    $('.q-media').remove();

    $('#p-count').text('Question ' + total + '/' + total);
    $('#p-percent').text('100%');
    $('.q-progress .p-step').removeClass('current pulse-step').addClass('filled');

    $('.p-thing').css('width', '100%').text('100%');
    $('#btn-validate').text('Recommencer').removeClass('hidden');
    $('#btn-skip').addClass('hidden');

    $('#btn-validate').off('click');
    $('#btn-validate').click(function () {
        localStorage.removeItem('quiz');
        location.reload();
    });
    
    updateDebugInfo();
}

var easter_egg = new Konami(function() { 
    $('.debug-container').show();
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            $('.debug-container').hide();
        }
    })
});