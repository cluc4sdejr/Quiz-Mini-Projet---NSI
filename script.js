var questions = [];
var index = 0;
var answers = {};
var score = 0;

$(document).ready(function () {
    var jsonUrl = 'questions.json';

    $.getJSON(jsonUrl, function (data) {
        var allQuestions = data.questions;
        var keys = Object.keys(allQuestions);
        
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var item = allQuestions[key];
            questions.push(item);
        }

        var savedData = localStorage.getItem('quiz');
        
        if (savedData != null) {
            var parsedData = JSON.parse(savedData);
            
            if (parsedData.index > 0 && parsedData.index < questions.length) {
            $('.recovery-alert').removeClass('hidden');

            $('#btn-recovery').off('click').click(function() {
                index = parsedData.index;
                answers = parsedData.answers;
                score = parsedData.score;
                $('.recovery-alert').addClass('hidden');
                showQuizStep();
            });
        } else if (parsedData.index >= questions.length) {
                localStorage.removeItem('quiz');
            }
        }

        $('#loader').addClass('hide');

        if (index == 0) {
            showStartScreen();
        } else {
            showQuizStep();
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

        $('#closeZoom').off('click').click(function() {
            $('#zoomModal').addClass('hidden');
            setTimeout(resetZoom, 400);
        });

        $('#zoomModal').off('click').click(function(e) {
            if (e.target === this || $(e.target).hasClass('zoom-wrapper') || $(e.target).closest('.zoom-modal-content').length === 0 && e.target.id !== 'zoomImage' && !$(e.target).closest('.zoom-controls').length && e.target.id !== 'closeZoom') {
                $('#zoomModal').addClass('hidden');
                setTimeout(resetZoom, 400);
            }
        });

        $(document).off('keydown.zoommodal').on('keydown.zoommodal', function(e) {
            if (e.key === 'Escape') {
                $('#zoomModal').addClass('hidden');
                setTimeout(resetZoom, 400);
            }
        });

        $('#zoomInBtn').off('click').click(function(e) {
            e.stopPropagation();
            currentZoom = Math.min(currentZoom + 0.5, 5);
            updateZoomTransform();
        });

        $('#zoomOutBtn').off('click').click(function(e) {
            e.stopPropagation();
            currentZoom = Math.max(currentZoom - 0.5, 0.5);
            updateZoomTransform();
        });

        $('#zoomResetBtn').off('click').click(function(e) {
            e.stopPropagation();
            resetZoom();
        });

        $('#zoomImage').off('wheel').on('wheel', function(e) {
            e.preventDefault();
            if (e.originalEvent.deltaY < 0) {
                currentZoom = Math.min(currentZoom + 0.2, 5);
            } else {
                currentZoom = Math.max(currentZoom - 0.2, 0.5);
            }
            updateZoomTransform();
        });

        $('#zoomImage').off('mousedown touchstart').on('mousedown touchstart', function(e) {
            e.preventDefault();
            isDragging = true;
            var clientX = e.type === 'touchstart' ? e.originalEvent.touches[0].clientX : e.clientX;
            var clientY = e.type === 'touchstart' ? e.originalEvent.touches[0].clientY : e.clientY;
            
            startX = clientX - translateX;
            startY = clientY - translateY;
        });

        $(window).off('mousemove touchmove').on('mousemove touchmove', function(e) {
            if (!isDragging) return;
            var clientX = e.type === 'touchmove' ? e.originalEvent.touches[0].clientX : e.clientX;
            var clientY = e.type === 'touchmove' ? e.originalEvent.touches[0].clientY : e.clientY;
            
            translateX = clientX - startX;
            translateY = clientY - startY;
            updateZoomTransform();
        });

        $(window).off('mouseup touchend').on('mouseup touchend', function() {
            isDragging = false;
        });
    });
});

function updateButtonState() {
    if (answers[index]) {
        $('#btn-validate').prop('disabled', false);
    } else {
        $('#btn-validate').prop('disabled', true);
    }
}

function saveProgress() {
    var status = {
        index: index,
        answers: answers,
        score: score
    };
    var jsonString = JSON.stringify(status);
    localStorage.setItem('quiz', jsonString);
}

function showStartScreen() {
    $('.q-c-progress').addClass('hidden');
    $('.p-thing').css('width', '0%').text('0%');
    $('.q-question').text('Bienvenue!');
    $('.q-options').html('Bienvenue dans ce Quiz de fou sur la NSI (t\'as vu le brother il fait une pub mdrr)');
    $('#btn-validate').text('Commencer le quizz');
    $('.q-container').addClass('start-screen');

    $('#btn-validate').off('click');
    $('#btn-validate').click(function () {
        index = 0;
        answers = {};
        score = 0;
        $('.recovery-alert').addClass('hidden');
        saveProgress();
        showQuizStep();
    });
}

function showQuizStep() {
    var totalQuestions = questions.length;

    if (index >= totalQuestions) {
        showFinalResults();
        return;
    }

    $('.q-container').removeClass('start-screen');
    $('.q-c-progress').removeClass('hidden');
    var currentQuestion = questions[index];
    
    $('.q-media').remove();
    
    var progressRatio = (index + 1) / totalQuestions;
    var progressPercent = Math.round(progressRatio * 100);
    var percentText = progressPercent + '%';

    $('.p-thing').css('width', percentText).text(percentText);
    $('.q-question').text(currentQuestion.question);

    if (currentQuestion.image || (currentQuestion.media && currentQuestion.media.url)) {
        var imageUrl = currentQuestion.image || currentQuestion.media.url;
        var zoomSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>';
        var mediaHtml = '<div class="q-media"><img src="' + imageUrl + '" alt="Question media"><button class="zoom-btn">' + zoomSvg + ' Agrandir</button></div>';
        $('.q-question').after(mediaHtml);
        
        $('.q-media img, .zoom-btn').off('click').click(function(e) {
            e.stopPropagation();
            $('#zoomImage').attr('src', imageUrl);
            $('#zoomModal').removeClass('hidden');
        });
    }

    $('.q-options').html('');
    for (var j = 0; j < currentQuestion.answers.length; j++) {
        var answerId = j + 1;
        var answerLabel = currentQuestion.answers[j];
        
        var buttonHtml = '<button class="q-option" data-ans="' + answerId + '">';
        buttonHtml = buttonHtml + '<span class="code">' + answerLabel + '</span>';
        buttonHtml = buttonHtml + '</button>';
        
        var $button = $(buttonHtml);
        
        if (answers[index] == answerId) {
            $button.addClass('selected');
        }

        $('.q-options').append($button);
    }

    if (index == totalQuestions - 1) {
        $('#btn-validate').text('Terminer');
    } else {
        $('#btn-validate').text('Suivant');
    }

    updateButtonState();

    $('.q-option').off('click');
    $('.q-option').click(function () {
        var selectedValue = $(this).attr('data-ans');
        answers[index] = selectedValue;

        var correctAnswer = currentQuestion.answerArray;
        if (selectedValue == correctAnswer) {
            score = score + 1;
        }

        $('.q-option').removeClass('selected');
        $(this).addClass('selected');
        saveProgress();
        updateButtonState();
    });

    $('#btn-validate').off('click');
    $('#btn-validate').click(function () {
        if (!$(this).prop('disabled')) {
            index = index + 1;
            saveProgress();
            showQuizStep();
        }
    });
}

function showFinalResults() {
    var total = questions.length;
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
    
    var resultsHtml = '<div class="results-container">' +
        '<h2 class="results-title">Quiz terminé!</h2>' +
        '<div class="results-card">' +
            '<div class="score-display">' +
                '<div class="score-big">' +
                    '<div class="score-item-value">' + score + '/' + total + '</div>' +
                    '<div class="score-label">Bonnes réponses</div>' +
                '</div>' +
            '</div>' +
            '<p class="results-message">' + message + '</p>' +
        '</div>' +
    '</div>';
    
    $('.q-question').html(resultsHtml);
    $('.q-options').html('');
    $('.p-thing').css('width', '100%').text('100%');
    $('#btn-validate').text('Recommencer');

    $('#btn-validate').off('click');
    $('#btn-validate').click(function () {
        localStorage.removeItem('quiz');
        location.reload();
    });
}