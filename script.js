var questions = [];
var index = 0;
var answers = {};
var score = 0;
var skippedIndices = [];
var isFinishing = false;
var toastTimer = null;
var toastCount = 1;

$(document).ready(function () {
    var jsonUrl = 'questions.json';

    $.getJSON(jsonUrl, function (data) {
        var allQuestions = data.questions;
        var metaTitle = data.meta.title;
        var metaDescription = data.meta.description;
        var metaAuthor = data.meta.author;
        var metaDifficulty = data.meta.difficulty;
        var keys = Object.keys(allQuestions);

        $('#metaTitle').text(metaTitle);
        $('#metaDescription').text(metaDescription);
        $('#metaAuthorId').text(metaAuthor);
        $('#metaDifficulty').text(metaDifficulty);

        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var item = allQuestions[key];
            questions.push(item);
        }

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

function showToast(message, iconClass = 'hgi hgi-stroke hgi-next') {
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
    var $toast = $('<div>', { class: 'toast' });
    var $iconSpan = $('<span>', { class: 'toast-icon' });
    var $icon = $('<i>', { class: iconClass });
    var $messageSpan = $('<span>', { class: 'toast-message' }).text(message);

    $iconSpan.append($icon);
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
        showQuizStep();
    });
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
        $('.q-progress .p-step').eq(index).addClass('filled').removeClass('current pulse-step skipped');

        saveProgress();

        setTimeout(function () {
            goToNextStep();
        }, 300);
    });

    $('#btn-skip').off('click').click(function () {
        skippedIndices.push(index);
        saveProgress();
        showToast('Question mise de côté');
        goToNextStep();
    });
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
}

var easter_egg = new Konami(function() { 
    $('.debug-container').show();
});