let savedLandingPage = null;

async function loadAllQuizzes() {
  try {
    const manifest = await $.getJSON('./quiz/manifest.json');
    const $container = $('#quizCardsContainer');
    $container.empty();

    if (!manifest.quizzes || manifest.quizzes.length === 0) {
      $container.html('<p class="error-message">Aucun quiz disponible</p>');
      return;
    }

    for (const quizId of manifest.quizzes) {
      try {
        const quizData = await $.getJSON(`./quiz/${quizId}.json`);
        const $card = createQuizCard(quizId, quizData);
        $container.append($card);
      } catch (error) {
        console.warn(`Erreur ou Quiz ${quizId} non trouvé:`, error);
      }
    }

  } catch (error) {
    console.error('Erreur lors du chargement du manifest:', error);
    $('#quizCardsContainer').html(`<p class="error-message">Erreur: ${error.statusText || error.message || 'Erreur inconnue'}</p>`);
  }
}

function createQuizCard(quizId, quizData) {
  const meta = quizData.meta || {};
  const title = meta.title || 'Quiz sans titre';
  const description = meta.description || 'Oui';
  const difficulty = getDifficultyLabel(meta.difficulty);
  const headerStyle = meta.coverImage ? ` style="background-image: url('${meta.coverImage}'); background-size: cover; background-position: center;"` : '';

  const isCompleted = localStorage.getItem('quiz_completed_' + quizId) === 'true';
  const progressData = localStorage.getItem('quiz_progress_' + quizId);
  let statusBadge = '';
  let progressBar = '';

  if (isCompleted) {
    statusBadge = '<span class="status-badge completed">Terminé</span>';
  } else if (progressData) {
    try {
      const data = JSON.parse(progressData);
      const answeredCount = Object.keys(data.answers || {}).length;
      if (data.totalQuestions > 0) {
        const progressPercent = Math.round((answeredCount / data.totalQuestions) * 100);
        statusBadge = `<span class="status-badge in-progress">${progressPercent}%</span>`;
        progressBar = `
          <div class="card-progress-container">
            <div class="card-progress-bar" style="width: ${progressPercent}%"></div>
          </div>
        `;
      }
    } catch (e) {
      console.error('Error parsing progress data', e);
    }
  }

  const $card = $('<div>', {
    class: 'quiz-card',
    'data-quiz-id': quizId
  }).html(`
    <div class="card-header"${headerStyle}>
      ${statusBadge}
    </div>
    <div class="card-content">
      <div class="card-title-row">
        <h3>${title}</h3>
        <span class="difficulty-badge ${difficulty.class}">${difficulty.label}</span>
      </div>
      <p class="card-subtitle">${description}</p>
      ${progressBar}
    </div>
    <div class="card-footer">
      <button class="btn-primary">${progressData ? 'Continuer' : 'Commencer'}</button>
      <button class="btn-secondary">Détails</button>
    </div>
  `);

  $card.find('.btn-primary').on('click', function (e) {
    e.stopPropagation();
    const id = $card.attr('data-quiz-id');
    loadQuiz(id);
  });

  return $card;
}

function getDifficultyLabel(difficulty) {
  const difficultyMap = {
    1: { label: 'Facile', class: 'facile' },
    2: { label: 'Moyen', class: 'moyen' },
    3: { label: 'Difficile', class: 'difficile' }
  };
  return difficultyMap[difficulty] || { label: 'Moyen', class: 'moyen' };
}

async function loadQuiz(quizId) {
  try {
    const templateHtml = await $.get('./quiz-template.html');
    const quizData = await $.getJSON(`./quiz/${quizId}.json`);

    window.quizData = quizData;
    window.currentQuizId = quizId;

    const $landing = $('#landing-page');
    if ($landing.length && !savedLandingPage) {
      savedLandingPage = $landing.clone(true, true);
    }
    if ($landing.length) {
      $landing.remove();
    }

    $('body').html(templateHtml);

    const $backButton = $('<button>', {
      class: 'btn-back',
      text: '← Retour à l\'accueil'
    }).on('click', goBackToLanding);

    $('body').prepend($backButton);

    if (typeof initializeQuizFromData === 'function') {
      initializeQuizFromData(quizData);
    } else {
      console.error('❌ Fonction initializeQuizFromData non trouvée');
    }
  } catch (error) {
    console.error('❌ Erreur lors du chargement du quiz:', error);
    alert('Erreur : impossible de charger le quiz. ' + (error.statusText || error.message || 'Erreur inconnue'));
    goBackToLanding();
  }
}

function goBackToLanding() {
  if (savedLandingPage) {
    $('body').empty().append(savedLandingPage.clone(true, true));
  } else {
    location.href = './';
  }
}

$(document).ready(loadAllQuizzes);
